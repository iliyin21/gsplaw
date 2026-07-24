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
  - Tulis & publikasikan artikel berita beserta gambar sampul
  - Unggah foto kegiatan ke galeri
  - Tambah mitra perusahaan (misalnya FIFGROUP) beserta logo
  - Lihat pesan masuk dari formulir kontak
  - Ubah info kantor, kontak, sosial media, dan password admin
- Data disimpan otomatis di `data/db.json` (tidak perlu database eksternal)
- Favicon otomatis dari logo kantor

## Menjalankan di Komputer (VSCode)

1. Pastikan **Node.js versi 18 ke atas** sudah terpasang.
2. Buka folder ini di VSCode, lalu buka terminal.
3. Pasang dependensi:
   ```
   npm install
   ```
4. Jalankan server:
   ```
   npm start
   ```
5. Buka browser ke **http://localhost:3000**
6. Panel admin ada di **http://localhost:3000/admin/login**

### Login Admin Pertama Kali

Saat pertama kali dijalankan, sistem otomatis membuat akun admin dengan:

```
Username : admin
Password : gsp@admin123
```

Password ini muncul juga di terminal saat server pertama kali dijalankan.
**Segera login dan ganti password** melalui menu **Pengaturan** di panel admin.

Jika ingin mengatur username/password default sendiri sebelum menjalankan
server pertama kali, buat file `.env` (contoh ada di `.env.example`):

```
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=passwordAndaSendiri
SESSION_SECRET=ganti-dengan-teks-acak-yang-panjang
PORT=3000
```

## Mengelola Konten Tanpa Coding

Semua ini dilakukan langsung dari panel admin di browser:

| Kebutuhan | Menu Admin |
|---|---|
| Tambah advokat/anggota baru + foto | Tim Kami |
| Tulis berita/artikel baru | Artikel & Berita |
| Unggah foto kegiatan | Galeri Kegiatan |
| Tambah mitra perusahaan (co. FIFGROUP) | Mitra Perusahaan |
| **Update jumlah total perkara & perkara berjalan** | **Pengaturan → Statistik Perkara** |
| Ganti nomor HP, email, alamat, IG/TikTok | Pengaturan |
| Ganti password admin | Pengaturan |
| Lihat pesan dari formulir kontak | Pesan Masuk |

Foto yang diunggah tersimpan otomatis di folder `public/uploads/...` dan
langsung tampil di website — tidak perlu deploy ulang.

## Deploy ke Server / Hosting

Website ini adalah aplikasi Node.js standar (Express), bisa dijalankan di
berbagai layanan hosting yang mendukung Node.js, misalnya VPS, Railway,
Render, atau layanan sejenis.

Langkah umum:

1. Upload seluruh folder project (**kecuali** `node_modules` dan `data/db.json`
   jika Anda ingin mulai dengan data bersih).
2. Di server, jalankan `npm install`.
3. Atur environment variable `PORT`, `SESSION_SECRET`, dan (opsional)
   `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD`.
4. Jalankan dengan `npm start`, atau gunakan process manager seperti **PM2**
   agar server tetap berjalan:
   ```
   npm install -g pm2
   pm2 start server.js --name gsp-website
   pm2 save
   ```
5. Arahkan domain Anda ke server (biasanya melalui reverse proxy seperti
   Nginx) menuju port yang dipakai aplikasi (default 3000).

**Penting:** cadangkan (backup) folder `data/db.json` dan `public/uploads/`
secara berkala — di situlah seluruh konten yang Anda kelola tersimpan.

## Struktur Folder

```
lawfirm/
├── server.js              # Server utama Express
├── package.json
├── data/
│   ├── db.seed.json        # Data awal (jangan diubah manual)
│   └── db.json             # Data aktif website (dibuat otomatis)
├── public/
│   ├── css/                # style.css (website), admin.css (panel admin)
│   ├── js/                 # main.js, admin.js
│   ├── images/logo.png     # Logo kantor
│   └── uploads/             # Foto tim, artikel, galeri, mitra (otomatis)
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
- File yang diunggah dibatasi maksimal 6MB dan hanya menerima format
  JPG, PNG, WEBP, GIF, atau SVG.
