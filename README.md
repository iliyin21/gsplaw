# Website GANANG SUKMA PERMANA, S.H. AND ASSOCIATES

Website profil kantor hukum lengkap dengan panel admin (CMS) untuk mengelola
tim, artikel/berita, galeri kegiatan, dan mitra perusahaan — semuanya tanpa
perlu mengedit kode di VSCode.

## Fitur

- Desain mewah bertema merah–hitam, terinspirasi referensi yang diberikan
- Halaman: Beranda, Tentang Kami, Layanan, Tim Kami, Berita, Galeri, Mitra, Kontak
- Tombol WhatsApp mengambang + tautan Instagram & TikTok
- Panel admin (`/admin`) untuk:
  - Tambah/edit/hapus anggota tim beserta foto
  - Kelola daftar layanan hukum
  - Tulis & publikasikan artikel berita beserta gambar sampul
  - Unggah foto/video kegiatan ke galeri (upload langsung atau link YouTube)
  - Tambah mitra perusahaan (misalnya FIFGROUP) beserta logo
  - Lihat pesan masuk dari formulir kontak
  - Ubah info kantor, kontak, sosial media, statistik perkara, dan password admin
- **Data disimpan di database MySQL** — aman dari kehilangan data saat
  redeploy di platform seperti Railway atau Hostinger Web Apps (lihat
  penjelasan di bagian "Kenapa MySQL?" di bawah)
- Favicon otomatis dari logo kantor

## Kenapa MySQL? (baca ini dulu kalau sebelumnya pakai versi lama)

Versi awal website ini menyimpan data di file `data/db.json`. Masalahnya,
di platform hosting seperti **Railway** atau **Hostinger Web Apps**, disk
aplikasi bersifat *ephemeral* (sementara) — setiap kali kode di-deploy ulang
(misalnya lewat `git push`), seluruh isi server dibangun ulang dari nol, dan
file yang tidak ada di GitHub (termasuk `data/db.json`) ikut hilang.

Solusinya: seluruh data (tim, artikel, layanan, galeri, mitra, pesan,
pengaturan) sekarang disimpan di **database MySQL** yang terpisah dari
server aplikasi. Database MySQL **tidak ikut ter-reset** saat redeploy,
jadi konten yang Anda kelola lewat panel admin aman selamanya — tidak
peduli berapa kali Anda push kode baru.

**Catatan:** file yang diupload (foto/video) tetap tersimpan di disk lokal
server (folder `storage/uploads/`), bukan di database. Kalau platform hosting
Anda juga mereset disk saat redeploy, foto/video yang diupload *bisa* tetap
hilang meski datanya (nama, keterangan, dll) di database aman. Untuk Railway,
pasang **Volume** (lihat bagian Deploy). Untuk Hostinger VPS, disknya memang
permanen jadi otomatis aman.

## Menjalankan di Komputer (VSCode)

### 1. Siapkan MySQL

Anda butuh server MySQL/MariaDB yang menyala. Cara termudah di Windows:
pasang **[XAMPP](https://www.apachefriends.org/)** atau **[Laragon](https://laragon.org/)**,
nyalakan modul MySQL-nya, lalu buat database baru bernama `gsp_lawfirm`
(bisa lewat phpMyAdmin yang sudah termasuk di XAMPP/Laragon, tinggal klik
"New" dan ketik nama database-nya, tidak perlu bikin tabel apa pun — nanti
otomatis dibuat sendiri oleh aplikasi).

### 2. Atur file `.env`

Salin `.env.example` menjadi `.env`, lalu sesuaikan bagian database:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gsp_lawfirm
```

(Kalau pakai XAMPP/Laragon default, biasanya `DB_USER=root` dan
`DB_PASSWORD` dikosongkan saja seperti contoh di atas.)

### 3. Install & jalankan

```
npm install
npm start
```

Buka **http://localhost:3000** untuk website, dan
**http://localhost:3000/admin/login** untuk panel admin.

### Login Admin Pertama Kali

Saat pertama kali dijalankan (database masih kosong), sistem otomatis
mengisi data awal dan membuat akun admin dengan:

```
Username : admin
Password : gsp@admin123
```

Password ini muncul juga di terminal saat server pertama kali dijalankan.
**Segera login dan ganti password** melalui menu **Pengaturan** di panel admin.

Untuk mengatur username/password default sendiri, ubah `ADMIN_DEFAULT_USERNAME`
dan `ADMIN_DEFAULT_PASSWORD` di `.env` **sebelum** menjalankan server untuk
pertama kalinya (setelah database terisi, mengubah nilai ini di `.env` tidak
berpengaruh lagi — ganti password lewat menu Pengaturan saja).

## Mengelola Konten Tanpa Coding

Semua ini dilakukan langsung dari panel admin di browser:

| Kebutuhan | Menu Admin |
|---|---|
| Tambah advokat/anggota baru + foto | Tim Kami |
| Kelola daftar layanan hukum | Layanan Hukum |
| Tulis berita/artikel baru | Artikel & Berita |
| Unggah foto/video kegiatan | Galeri Kegiatan |
| Tambah mitra perusahaan (co. FIFGROUP) | Mitra Perusahaan |
| Update jumlah total perkara & perkara berjalan | Pengaturan → Statistik Perkara |
| Ganti foto latar Beranda | Pengaturan → Foto Latar Beranda |
| Ganti nomor HP, email, alamat, IG/TikTok, Google Maps | Pengaturan |
| Ganti password admin | Pengaturan |
| Lihat pesan dari formulir kontak | Pesan Masuk |

Foto/video yang diunggah tersimpan otomatis di folder `storage/uploads/...`
dan langsung tampil di website — tidak perlu deploy ulang.

## Deploy ke Server / Hosting

Website ini adalah aplikasi Node.js standar (Express) yang butuh koneksi
ke database MySQL. Cocok dijalankan di VPS, Railway, Hostinger Web Apps,
Render, atau layanan sejenis.

### Dapatkan Database MySQL

**Railway:** di dashboard project, klik "New +" → "Database" → "Add MySQL".
Setelah aktif, klik plugin MySQL itu → tab "Variables" → salin nilai
`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` ke
Environment Variables service aplikasi Anda (isi sebagai `DB_HOST`,
`DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

**Hostinger:** buka hPanel → Databases → MySQL Databases → buat database
dan user baru. Salin host, nama database, username, dan password ke
Environment Variables aplikasi Node.js Anda di menu Web Apps.

**VPS:** install MySQL/MariaDB sendiri di server (`sudo apt install mysql-server`),
buat database dan user seperti biasa.

### Penyimpanan foto/video (folder `storage/uploads/`)

- **Railway**: pasang **Volume** dengan Mount Path `/app/storage` (Command
  Palette `Ctrl+K` → cari "Volume") supaya foto/video yang diupload tidak
  ikut hilang saat redeploy. Database-nya sendiri sudah aman otomatis
  karena di MySQL, terpisah dari volume ini.
- **Hostinger VPS / VPS lain**: tidak perlu langkah tambahan, disk VPS
  memang permanen.
- **Hostinger Web Apps**: disk-nya kemungkinan tetap ephemeral untuk file
  upload meski database sudah aman di MySQL. Kalau ini jadi masalah,
  solusinya adalah memindahkan penyimpanan foto/video ke layanan object
  storage eksternal (di luar cakupan setup default ini) — tanyakan ke saya
  kalau butuh bantuan langkah ini nanti.

### Langkah umum deploy

1. Upload/push seluruh folder project (**kecuali** `node_modules` dan `storage/`).
2. Siapkan database MySQL (lihat di atas), catat kredensialnya.
3. Di server/platform, atur Environment Variables: `PORT`, `SESSION_SECRET`,
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, dan opsional
   `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD`.
4. Jalankan `npm install` lalu `npm start` (atau biarkan platform
   menjalankannya otomatis, seperti Railway/Hostinger Web Apps).
5. **Kalau pakai Railway**: pasang Volume dengan mount path `/app/storage`
   (lihat di atas) SEBELUM mulai mengisi konten lewat admin.
6. Kalau pakai VPS manual, gunakan **PM2** agar server tetap berjalan:
   ```
   npm install -g pm2
   pm2 start server.js --name gsp-website
   pm2 save
   ```
7. Arahkan domain Anda ke server (biasanya lewat reverse proxy Nginx)
   menuju port yang dipakai aplikasi (default 3000).

**Penting:** cadangkan (backup/export) database MySQL Anda secara berkala —
di situlah seluruh konten yang Anda kelola tersimpan.

## Struktur Folder

```
lawfirm/
├── server.js              # Server utama Express (routing & logic)
├── db.js                   # Modul koneksi & query MySQL
├── package.json
├── data/
│   ├── db.seed.json        # Data awal/template (jangan diubah manual)
│   └── seed-uploads/        # Foto default (tim, hero) yang disalin otomatis saat pertama kali jalan
├── storage/                # Foto/video yang diupload lewat admin (tidak ikut ke GitHub)
│   └── uploads/
├── public/
│   ├── css/                # style.css (website), admin.css (panel admin)
│   ├── js/                 # main.js, admin.js
│   └── images/logo.png     # Logo kantor
└── views/                  # Template halaman (EJS)
    ├── admin/               # Halaman panel admin
    └── partials/            # Header, footer, ikon
```

## Mengganti Data yang Masih Kosong

Anggota tim berikut belum memiliki foto (sesuai permintaan awal), silakan
unggah melalui menu **Tim Kami** di panel admin kapan saja:
- Hidayah Pembayun, S.Sos (Partner)
- Ahmad Syahrul Iliyin (Associate)
- Dwi Putri Lestari (Associate)

Data mitra perusahaan (misalnya FIFGROUP) dan foto galeri kegiatan juga
belum diisi — silakan tambahkan melalui menu **Mitra Perusahaan** dan
**Galeri Kegiatan**.

## Catatan Keamanan

- Ganti `SESSION_SECRET` di `.env` sebelum digunakan secara publik/produksi.
- Segera ganti password admin default setelah instalasi pertama.
- Jangan pernah commit file `.env` ke GitHub (sudah otomatis diabaikan lewat `.gitignore`).
- File yang diunggah dibatasi maksimal 300MB untuk video dan 6MB untuk foto,
  hanya menerima format umum (JPG, PNG, WEBP, GIF, SVG untuk foto; MP4, WEBM,
  MOV, MKV, AVI untuk video).
