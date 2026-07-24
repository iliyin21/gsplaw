require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const SEED_PATH = path.join(__dirname, 'data', 'db.seed.json');

// ---- First-run setup: seed database & default admin password ----
if (!fs.existsSync(DB_PATH)) {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'gsp@admin123';
  seed.admin.username = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  seed.admin.passwordHash = bcrypt.hashSync(defaultPassword, 10);
  fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  console.log('==================================================');
  console.log(' Database baru dibuat: data/db.json');
  console.log(' Login admin default:');
  console.log('   Username : ' + seed.admin.username);
  console.log('   Password : ' + defaultPassword);
  console.log(' -> Segera login ke /admin dan ganti password di menu Pengaturan.');
  console.log('==================================================');
}

const adapter = new FileSync(DB_PATH);
const db = low(adapter);

// ---- Migration: make sure newer settings fields exist for sites created with an older version ----
(function migrateSettings() {
  const settings = db.get('settings').value() || {};
  const defaults = {
    totalCasesHandled: 1000, statsYear: new Date().getFullYear(), ongoingCases: 0,
    heroImage: '', mapEmbedUrl: '', mapUrl: ''
  };
  const missing = {};
  Object.keys(defaults).forEach((key) => {
    if (settings[key] === undefined) missing[key] = defaults[key];
  });
  if (Object.keys(missing).length) db.get('settings').assign(missing).write();
  if (!db.has('messages').value()) db.set('messages', []).write();
})();

const app = express();
const PORT = process.env.PORT || 3000;

// ---- View engine ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---- Core middleware ----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'gsp-associates-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 hours
}));
app.use(flash());

// Make settings & flash messages available to every view
app.use((req, res, next) => {
  res.locals.settings = db.get('settings').value();
  res.locals.currentAdmin = req.session.admin || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentPath = req.path;
  res.locals.unreadMessages = req.session && req.session.admin
    ? db.get('messages').filter({ read: false }).size().value()
    : 0;
  next();
});

// ---- Upload handling ----
function makeUploader(subfolder) {
  const dir = path.join(__dirname, 'public', 'uploads', subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = slugify(path.basename(file.originalname, ext), { lower: true, strict: true }).slice(0, 40);
      cb(null, `${Date.now()}-${base || 'file'}${ext}`);
    }
  });
  const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(ok ? null : new Error('Format file harus JPG, PNG, WEBP, GIF, atau SVG.'), ok);
  };
  return multer({ storage, fileFilter, limits: { fileSize: 6 * 1024 * 1024 } });
}
const uploadTeam = makeUploader('team');
const uploadArticle = makeUploader('articles');
const uploadGallery = makeUploader('gallery');
const uploadPartner = makeUploader('partners');
const uploadHero = makeUploader('hero');

function removeFileIfLocal(urlPath) {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return;
  const full = path.join(__dirname, 'public', urlPath);
  fs.unlink(full, () => {});
}

// ---- Auth guard ----
function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  req.flash('error', 'Silakan login terlebih dahulu.');
  res.redirect('/admin/login');
}

function nowISO() { return new Date().toISOString(); }
function newId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// =====================================================================
// PUBLIC ROUTES
// =====================================================================
app.get('/', (req, res) => {
  const team = db.get('team').orderBy('order').value();
  const services = db.get('services').orderBy('order').value();
  const articles = db.get('articles').filter({ published: true }).orderBy('date', 'desc').take(3).value();
  const gallery = db.get('gallery').orderBy('date', 'desc').take(6).value();
  const partners = db.get('partners').value();
  res.render('index', {
    title: null,
    team: team.filter(t => t.role !== 'associate').slice(0, 4),
    services,
    articles,
    gallery,
    partners
  });
});

app.get('/tentang-kami', (req, res) => {
  res.render('about', { title: 'Tentang Kami' });
});

app.get('/layanan', (req, res) => {
  const services = db.get('services').orderBy('order').value();
  res.render('services', { title: 'Layanan Hukum', services });
});

app.get('/tim-kami', (req, res) => {
  const team = db.get('team').orderBy('order').value();
  res.render('team', {
    title: 'Tim Kami',
    managingPartner: team.filter(t => t.role === 'managing-partner'),
    partners: team.filter(t => t.role === 'partner'),
    associates: team.filter(t => t.role === 'associate')
  });
});

app.get('/berita', (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const perPage = 6;
  const all = db.get('articles').filter({ published: true }).orderBy('date', 'desc').value();
  const total = all.length;
  const articles = all.slice((page - 1) * perPage, page * perPage);
  res.render('news', {
    title: 'Berita & Artikel',
    articles,
    page,
    totalPages: Math.max(Math.ceil(total / perPage), 1)
  });
});

app.get('/berita/:slug', (req, res) => {
  const article = db.get('articles').find({ slug: req.params.slug, published: true }).value();
  if (!article) return res.status(404).render('404', { title: 'Halaman Tidak Ditemukan' });
  const related = db.get('articles')
    .filter(a => a.published && a.slug !== article.slug)
    .orderBy('date', 'desc').take(3).value();
  res.render('news-detail', { title: article.title, article, related });
});

app.get('/galeri', (req, res) => {
  const gallery = db.get('gallery').orderBy('date', 'desc').value();
  res.render('gallery', { title: 'Galeri Kegiatan', gallery });
});

app.get('/mitra', (req, res) => {
  const partners = db.get('partners').value();
  res.render('partners', { title: 'Mitra Kerja Sama', partners });
});

app.get('/kontak', (req, res) => {
  res.render('contact', { title: 'Kontak Kami' });
});

app.post('/kontak', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !message) {
    req.flash('error', 'Nama dan pesan wajib diisi.');
    return res.redirect('/kontak');
  }
  db.get('messages').push({
    id: newId('msg'),
    name, email, phone, subject, message,
    date: nowISO(),
    read: false
  }).write();
  req.flash('success', 'Pesan Anda berhasil dikirim. Tim kami akan segera menghubungi Anda.');
  res.redirect('/kontak');
});

// =====================================================================
// ADMIN AUTH
// =====================================================================
app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { title: 'Login Admin', layout: false });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.get('admin').value();
  if (admin && username === admin.username && bcrypt.compareSync(password || '', admin.passwordHash)) {
    req.session.admin = { username };
    req.flash('success', 'Berhasil masuk. Selamat datang kembali!');
    return res.redirect('/admin');
  }
  req.flash('error', 'Username atau password salah.');
  res.redirect('/admin/login');
});

app.post('/admin/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAuth, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Dashboard',
    counts: {
      team: db.get('team').size().value(),
      services: db.get('services').size().value(),
      articles: db.get('articles').size().value(),
      gallery: db.get('gallery').size().value(),
      partners: db.get('partners').size().value(),
      messages: db.get('messages').filter({ read: false }).size().value()
    }
  });
});

// =====================================================================
// ADMIN: TEAM (identitas anggota)
// =====================================================================
app.get('/admin/team', requireAuth, (req, res) => {
  res.render('admin/team', { title: 'Kelola Tim', team: db.get('team').orderBy('order').value() });
});

app.post('/admin/team', requireAuth, uploadTeam.single('photo'), (req, res) => {
  const { name, title, role, bio, order } = req.body;
  db.get('team').push({
    id: newId('team'),
    name, title, role: role || 'associate',
    bio: bio || '',
    photo: req.file ? `/uploads/team/${req.file.filename}` : '',
    order: parseInt(order) || (db.get('team').size().value() + 1)
  }).write();
  req.flash('success', 'Anggota tim baru berhasil ditambahkan.');
  res.redirect('/admin/team');
});

app.put('/admin/team/:id', requireAuth, uploadTeam.single('photo'), (req, res) => {
  const item = db.get('team').find({ id: req.params.id }).value();
  if (!item) { req.flash('error', 'Data tidak ditemukan.'); return res.redirect('/admin/team'); }
  const { name, title, role, bio, order } = req.body;
  const update = { name, title, role, bio, order: parseInt(order) || item.order };
  if (req.file) {
    removeFileIfLocal(item.photo);
    update.photo = `/uploads/team/${req.file.filename}`;
  }
  db.get('team').find({ id: req.params.id }).assign(update).write();
  req.flash('success', 'Data anggota tim berhasil diperbarui.');
  res.redirect('/admin/team');
});

app.delete('/admin/team/:id', requireAuth, (req, res) => {
  const item = db.get('team').find({ id: req.params.id }).value();
  if (item) removeFileIfLocal(item.photo);
  db.get('team').remove({ id: req.params.id }).write();
  req.flash('success', 'Anggota tim dihapus.');
  res.redirect('/admin/team');
});

// =====================================================================
// ADMIN: SERVICES (layanan hukum)
// =====================================================================
app.get('/admin/services', requireAuth, (req, res) => {
  res.render('admin/services', { title: 'Kelola Layanan Hukum', services: db.get('services').orderBy('order').value() });
});

app.post('/admin/services', requireAuth, (req, res) => {
  const { title, icon, desc, order } = req.body;
  db.get('services').push({
    id: newId('svc'),
    title, icon: icon || 'document', desc: desc || '',
    order: parseInt(order) || (db.get('services').size().value() + 1)
  }).write();
  req.flash('success', 'Layanan hukum baru berhasil ditambahkan.');
  res.redirect('/admin/services');
});

app.put('/admin/services/:id', requireAuth, (req, res) => {
  const item = db.get('services').find({ id: req.params.id }).value();
  if (!item) { req.flash('error', 'Layanan tidak ditemukan.'); return res.redirect('/admin/services'); }
  const { title, icon, desc, order } = req.body;
  db.get('services').find({ id: req.params.id }).assign({
    title, icon: icon || item.icon, desc, order: parseInt(order) || item.order
  }).write();
  req.flash('success', 'Layanan hukum berhasil diperbarui.');
  res.redirect('/admin/services');
});

app.delete('/admin/services/:id', requireAuth, (req, res) => {
  db.get('services').remove({ id: req.params.id }).write();
  req.flash('success', 'Layanan hukum dihapus.');
  res.redirect('/admin/services');
});

// =====================================================================
// ADMIN: ARTICLES (artikel berita)
// =====================================================================
app.get('/admin/articles', requireAuth, (req, res) => {
  res.render('admin/articles', { title: 'Kelola Artikel', articles: db.get('articles').orderBy('date', 'desc').value() });
});

app.get('/admin/articles/new', requireAuth, (req, res) => {
  res.render('admin/article-form', { title: 'Tulis Artikel', article: null });
});

app.get('/admin/articles/:id/edit', requireAuth, (req, res) => {
  const article = db.get('articles').find({ id: req.params.id }).value();
  if (!article) { req.flash('error', 'Artikel tidak ditemukan.'); return res.redirect('/admin/articles'); }
  res.render('admin/article-form', { title: 'Edit Artikel', article });
});

app.post('/admin/articles', requireAuth, uploadArticle.single('image'), (req, res) => {
  const { title, excerpt, content, author, published } = req.body;
  let slug = slugify(title, { lower: true, strict: true });
  let uniqueSlug = slug, i = 1;
  while (db.get('articles').find({ slug: uniqueSlug }).value()) uniqueSlug = `${slug}-${i++}`;
  db.get('articles').push({
    id: newId('art'),
    title, slug: uniqueSlug,
    excerpt: excerpt || '',
    content: content || '',
    author: author || res.locals.settings.officeName,
    image: req.file ? `/uploads/articles/${req.file.filename}` : '',
    date: nowISO(),
    published: published === 'on'
  }).write();
  req.flash('success', 'Artikel berhasil dipublikasikan.');
  res.redirect('/admin/articles');
});

app.put('/admin/articles/:id', requireAuth, uploadArticle.single('image'), (req, res) => {
  const item = db.get('articles').find({ id: req.params.id }).value();
  if (!item) { req.flash('error', 'Artikel tidak ditemukan.'); return res.redirect('/admin/articles'); }
  const { title, excerpt, content, author, published } = req.body;
  const update = { title, excerpt, content, author, published: published === 'on' };
  if (title && title !== item.title) {
    let slug = slugify(title, { lower: true, strict: true });
    let uniqueSlug = slug, i = 1;
    while (db.get('articles').find(a => a.slug === uniqueSlug && a.id !== item.id).value()) uniqueSlug = `${slug}-${i++}`;
    update.slug = uniqueSlug;
  }
  if (req.file) {
    removeFileIfLocal(item.image);
    update.image = `/uploads/articles/${req.file.filename}`;
  }
  db.get('articles').find({ id: req.params.id }).assign(update).write();
  req.flash('success', 'Artikel berhasil diperbarui.');
  res.redirect('/admin/articles');
});

app.delete('/admin/articles/:id', requireAuth, (req, res) => {
  const item = db.get('articles').find({ id: req.params.id }).value();
  if (item) removeFileIfLocal(item.image);
  db.get('articles').remove({ id: req.params.id }).write();
  req.flash('success', 'Artikel dihapus.');
  res.redirect('/admin/articles');
});

// =====================================================================
// ADMIN: GALLERY (foto kegiatan)
// =====================================================================
app.get('/admin/gallery', requireAuth, (req, res) => {
  res.render('admin/gallery', { title: 'Kelola Galeri', gallery: db.get('gallery').orderBy('date', 'desc').value() });
});

app.post('/admin/gallery', requireAuth, uploadGallery.single('image'), (req, res) => {
  if (!req.file) { req.flash('error', 'Pilih foto terlebih dahulu.'); return res.redirect('/admin/gallery'); }
  const { caption } = req.body;
  db.get('gallery').push({
    id: newId('gal'),
    caption: caption || '',
    image: `/uploads/gallery/${req.file.filename}`,
    date: nowISO()
  }).write();
  req.flash('success', 'Foto kegiatan berhasil diunggah.');
  res.redirect('/admin/gallery');
});

app.delete('/admin/gallery/:id', requireAuth, (req, res) => {
  const item = db.get('gallery').find({ id: req.params.id }).value();
  if (item) removeFileIfLocal(item.image);
  db.get('gallery').remove({ id: req.params.id }).write();
  req.flash('success', 'Foto dihapus.');
  res.redirect('/admin/gallery');
});

// =====================================================================
// ADMIN: PARTNERS (mitra perusahaan)
// =====================================================================
app.get('/admin/partners', requireAuth, (req, res) => {
  res.render('admin/partners', { title: 'Kelola Mitra', partners: db.get('partners').value() });
});

app.post('/admin/partners', requireAuth, uploadPartner.single('logo'), (req, res) => {
  const { name, description, url } = req.body;
  db.get('partners').push({
    id: newId('ptn'),
    name, description: description || '', url: url || '',
    logo: req.file ? `/uploads/partners/${req.file.filename}` : ''
  }).write();
  req.flash('success', 'Mitra perusahaan berhasil ditambahkan.');
  res.redirect('/admin/partners');
});

app.put('/admin/partners/:id', requireAuth, uploadPartner.single('logo'), (req, res) => {
  const item = db.get('partners').find({ id: req.params.id }).value();
  if (!item) { req.flash('error', 'Mitra tidak ditemukan.'); return res.redirect('/admin/partners'); }
  const { name, description, url } = req.body;
  const update = { name, description, url };
  if (req.file) {
    removeFileIfLocal(item.logo);
    update.logo = `/uploads/partners/${req.file.filename}`;
  }
  db.get('partners').find({ id: req.params.id }).assign(update).write();
  req.flash('success', 'Data mitra diperbarui.');
  res.redirect('/admin/partners');
});

app.delete('/admin/partners/:id', requireAuth, (req, res) => {
  const item = db.get('partners').find({ id: req.params.id }).value();
  if (item) removeFileIfLocal(item.logo);
  db.get('partners').remove({ id: req.params.id }).write();
  req.flash('success', 'Mitra dihapus.');
  res.redirect('/admin/partners');
});

// =====================================================================
// ADMIN: MESSAGES (pesan dari form kontak)
// =====================================================================
app.get('/admin/messages', requireAuth, (req, res) => {
  db.get('messages').forEach(m => { m.read = true; }).write();
  res.render('admin/messages', { title: 'Pesan Masuk', messages: db.get('messages').orderBy('date', 'desc').value() });
});

app.delete('/admin/messages/:id', requireAuth, (req, res) => {
  db.get('messages').remove({ id: req.params.id }).write();
  req.flash('success', 'Pesan dihapus.');
  res.redirect('/admin/messages');
});

// =====================================================================
// ADMIN: SETTINGS (info kantor, sosial media, password)
// =====================================================================
app.get('/admin/settings', requireAuth, (req, res) => {
  res.render('admin/settings', { title: 'Pengaturan' });
});

app.post('/admin/settings', requireAuth, uploadHero.single('heroImage'), (req, res) => {
  const {
    officeName, shortName, tagline, heroTitle, heroSubtitle,
    aboutText, visionText, missionText,
    phone, phoneDisplay, whatsapp, email, address, operationalHours,
    instagram, tiktok, facebook, mapEmbedUrl, mapUrl,
    totalCasesHandled, statsYear, ongoingCases
  } = req.body;
  const update = {
    officeName, shortName, tagline, heroTitle, heroSubtitle,
    aboutText, visionText, missionText,
    phone, phoneDisplay, whatsapp, email, address, operationalHours,
    instagram, tiktok, facebook, mapEmbedUrl, mapUrl,
    totalCasesHandled: parseInt(totalCasesHandled) || 0,
    statsYear: parseInt(statsYear) || new Date().getFullYear(),
    ongoingCases: parseInt(ongoingCases) || 0
  };
  if (req.file) {
    const current = db.get('settings').value();
    removeFileIfLocal(current.heroImage);
    update.heroImage = `/uploads/hero/${req.file.filename}`;
  }
  db.get('settings').assign(update).write();
  req.flash('success', 'Pengaturan berhasil disimpan.');
  res.redirect('/admin/settings');
});

app.post('/admin/settings/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const admin = db.get('admin').value();
  if (!bcrypt.compareSync(currentPassword || '', admin.passwordHash)) {
    req.flash('error', 'Password saat ini salah.');
    return res.redirect('/admin/settings');
  }
  if (!newPassword || newPassword.length < 6) {
    req.flash('error', 'Password baru minimal 6 karakter.');
    return res.redirect('/admin/settings');
  }
  if (newPassword !== confirmPassword) {
    req.flash('error', 'Konfirmasi password baru tidak sama.');
    return res.redirect('/admin/settings');
  }
  db.get('admin').assign({ passwordHash: bcrypt.hashSync(newPassword, 10) }).write();
  req.flash('success', 'Password berhasil diganti.');
  res.redirect('/admin/settings');
});

// ---- Error / 404 handling ----
app.use((req, res) => {
  res.status(404).render('404', { title: 'Halaman Tidak Ditemukan' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.originalUrl.startsWith('/admin')) {
    req.flash('error', err.message || 'Terjadi kesalahan.');
    return res.redirect('back');
  }
  res.status(500).send('Terjadi kesalahan pada server.');
});

app.listen(PORT, () => {
  console.log(`GSP & Associates website berjalan di http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/login`);
});
