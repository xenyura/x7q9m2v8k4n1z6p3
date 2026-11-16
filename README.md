# Stivora

Aplikasi web pribadi untuk mencapai impian, selangkah demi selangkah.
Berjalan di browser (HP, tablet, laptop, PC, TV), bisa dipasang sebagai aplikasi (PWA), dan bisa dibuka offline.

- **Versi:** lihat `js/core/versi.js` dan [CHANGELOG.md](CHANGELOG.md)
- **Hosting:** GitHub Pages (file statis, tanpa build)
- **Server pendukung:** Firebase (login + database) dan Cloudflare R2 + Worker (file media), lihat bagian [Pemasangan server](#pemasangan-server)

---

## Fitur

| Bagian | Isi |
|---|---|
| Impian | Peta 3D CesiumJS 16:9 (Eksplore Indonesia → provinsi → kota, cari, 3D/2D); daftar impian sementara disembunyikan |
| Galery | Foto, video, audio, dan dokumen (PDF, Word, Excel, PowerPoint, TXT) |
| Tampilan | Mode terang/gelap/sistem, 12 tema (10 bergambar), responsif HP sampai TV |
| Bahasa | Indonesia dan Aceh |
| Keamanan | Kunci sidik jari, enkripsi end-to-end, Content Security Policy |
| Cadangan | Cadangan otomatis & manual, sinkron antar perangkat, pulihkan dari cloud, **cadangan harian 30 hari** (pulihkan ke tanggal mana pun), ringkasan isi cadangan, riwayat, pengingat 2 hari |
| Progress | Peta jalan, Kenapa aku yakin mampu, **Proyek software** (Ide → Rawat, per versi), **Rencana cadangan** (A/B/C dengan refleksi) |
| File | Ekspor/impor `.json`, bisa dengan/tanpa media, bisa terenkripsi |
| Hapus | Setiap hapus wajib konfirmasi. Media yang dihapus ditahan 30 hari di cloud agar bisa kembali lewat cadangan harian (5.68.0) |
| Sistem | Pembaruan otomatis (PWA), log error, pembersihan file cloud yatim |

---

## Struktur folder

```
index.html                 Kerangka halaman; urutan <script> penting
manifest.webmanifest       Data aplikasi PWA (nama, ikon, warna)
sw.js                      Service worker: offline + pembaruan
css/
  base.css                 Warna, tema terang/gelap, dasar
  layout.css               Header, halaman, navigasi, toast
  components.css           Tombol, kartu, input, dialog, daftar
  fitur/01-umum.css … 13-rencana.css   Gaya per fitur, dimuat berurutan sesuai nomor (umum, peta, impian, galery, lagu, film, buku, tempat, channel, tokoh, link, proyek, rencana)
  responsive.css           Tablet, laptop, PC, TV
js/
  config.js                ⚙️ Pengaturan yang kamu isi: Firebase, Worker, batas ukuran file
  core/versi.js            Nomor versi aplikasi
  core/galat.js            Monitoring error
  i18n/ace.js              📖 Kamus Bahasa Aceh (boleh diedit langsung)
  data/wilayah.js          🗺️ 38 provinsi + kota utama (koordinat untuk peta)
  core/i18n.js             Mesin terjemahan
  core/dom.js              Bantuan DOM, ikon, escape teks (anti-XSS)
  core/storage.js          localStorage + IndexedDB
  core/state.js            Data impian & media di memori, jenis media
  core/ui.js               Toast & dialog konfirmasi
  core/router.js           Halaman & tombol kembali (History API)
  features/*.js            Impian, Galery, Akun, Mode, Bahasa,
                           Cadangan, Tema, Pengaturan, Kunci, Sistem, Peta
  features/galery-bersama.js  Alat bersama koleksi Lainnya (simpan per item, foto kecil, pemutar YouTube)
  features/galery-*.js     Lagu, Film, Buku, Tempat, Channel, Tokoh, Link, Pola Pikir, Folder HP
  features/impian-proyek.js   Progress › Proyek software (5.68.0)
  features/impian-rencana.js  Progress › Rencana cadangan (5.68.0)
  features/cadangan-ringkas.js  Halaman cadangan harian, rincian, dan Periksa sebelum impor (5.68.0)
  services/auth.js         Login Google (Firebase Auth)
  services/enkripsi.js     Pengaturan cadangan, riwayat, enkripsi end-to-end
  services/sync.js         Sinkron semua data ⇄ Firestore (per item untuk data besar)
  services/media.js        Unggah/unduh media ⇄ Worker ⇄ R2, pembersihan file yatim
  services/backup.js       Ekspor & impor file
  services/cadangan-harian.js  Cadangan harian ke R2 (30 hari) + ringkasan isi cadangan (5.68.0)
  platform/input.js        Navigasi D-pad / keyboard (TV)
  main.js                  Mulai aplikasi
assets/
  ikon/                    Ikon aplikasi (PWA)
  tema/                    Gambar tema
```

Semua file JavaScript adalah skrip biasa (bukan ES module) agar tetap jalan di pratinjau SPCK Editor.

---

## Menjalankan

**GitHub Pages:** unggah semua file ke repo → *Settings › Pages* → pilih branch → buka `https://<nama>.github.io/<repo>/`.

**SPCK Editor:** buka `index.html` lewat pratinjau. Catatan: login Google, sidik jari, dan pembaruan otomatis hanya jalan lewat `https` (GitHub Pages).

Tanpa pengaturan Firebase/Worker, aplikasi tetap jalan penuh dan semua data tersimpan di perangkat.

---

## Pemasangan server

File server ada di folder terpisah **`stivora-server/`** (jangan diunggah ke GitHub Pages).

### 1. Firebase (login + database)

1. Buat proyek di [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication › Sign-in method** → aktifkan **Google**.
3. **Authentication › Settings › Authorized domains** → tambahkan `<nama>.github.io`.
4. **Firestore Database** → buat database (mode produksi).
5. **Firestore › Rules** → buka `stivora-server/firebase/firestore.rules`, isi daftar email di fungsi `daftarEmail()` (huruf kecil, mis. `return ['emailmu@gmail.com'];`) → tempel → **Publish**. Daftar kosong `[]` = semua akun Google yang login boleh memakai (tidak disarankan).
6. **Project settings › Your apps › Web** → salin konfigurasi ke `FIREBASE_CONFIG` di `js/config.js`.
7. (Disarankan) Di [Google Cloud Console › Credentials](https://console.cloud.google.com/apis/credentials), batasi API key ke referrer `https://<nama>.github.io/*`.

> `apiKey` Firebase memang boleh terlihat publik. Yang melindungi data adalah **Firestore Rules** (setiap akun hanya bisa membaca/menulis datanya sendiri).

### 2. Cloudflare R2 + Worker (file media)

1. **R2** → buat bucket (misalnya `stivora-media`).
2. **Workers & Pages** → buat Worker → tempel isi `stivora-server/cloudflare-worker/worker-ringkas.js` (versi satu baris, aman ditempel dari HP; isinya sama dengan `worker.js`) → **Deploy**.
3. Worker › **Settings**:
   - Binding R2: nama `BUCKET` → bucket tadi
   - Variable: `FIREBASE_PROJECT_ID` = id proyek Firebase
   - Variable: `ALLOWED_ORIGINS` = `https://<nama>.github.io`
   - Variable: `ALLOWED_EMAILS` = email Google-mu (pisahkan koma bila lebih dari satu) — sama dengan daftar di `firestore.rules`
   - Variable (opsional): `MAX_UPLOAD_MB` = `100`
4. Salin alamat Worker (`https://....workers.dev`) ke `MEDIA_WORKER_URL` di `js/config.js`.
5. Jika memakai domain sendiri untuk Worker, tambahkan domain itu di `connect-src` pada tag Content-Security-Policy di `index.html`.

> **Access Key / Secret Key R2 tidak pernah dipakai di aplikasi.** Worker memeriksa token login Firebase sendiri, lalu mengakses R2 lewat binding.

---

## Keamanan

| Lapisan | Cara |
|---|---|
| Database | Firestore Rules: hanya pemilik akun **dan** email di `daftarEmail()`, bentuk & ukuran data diperiksa |
| File | Worker memverifikasi ID token Firebase (RS256), membatasi jenis & ukuran file, CORS |
| Enkripsi end-to-end | AES-256-GCM, kunci dari kata sandi (PBKDF2 310.000×); kata sandi tidak pernah dikirim |
| XSS | Semua teks pengguna di-escape + Content Security Policy (skrip inline & domain asing diblokir). CSP memuat `'unsafe-eval'` karena CesiumJS 1.139+ membutuhkannya saat dimuat; kode aplikasi sendiri tidak memakai `eval` |
| Kunci aplikasi | Sidik jari / kunci layar HP lewat WebAuthn |
| Kunci rahasia | Tidak ada di kode aplikasi: key YouTube/Books & TMDB disimpan sebagai Secret di Worker (5.66.0); R2 diakses lewat binding |
| Pemakai Worker | Wajib login; `ALLOWED_EMAILS` berlaku untuk `/api`, `/pratinjau`, dan file R2 (5.67.0) |
| Token Cesium | Disimpan sebagai Secret `CESIUM_ION_TOKEN` di Worker (5.71.0); peta memakainya lewat `/ion/…` setelah login. `CESIUM_ION_TOKEN` di config.js dikosongkan |
| Akun asing | Akun yang tidak terdaftar mendapat pesan "Akun ini tidak diizinkan memakai Stivora" lalu otomatis keluar; data di HP tidak disentuh |

**Jika skrip kecil di `<head>` `index.html` diubah**, hash `sha256-…` di CSP harus diganti. Cara termudah: buka aplikasi di Chrome → *DevTools › Console* → pesan error CSP menampilkan hash yang benar → salin ke `script-src`.

---

## Merilis versi baru

1. Naikkan versi di **`js/core/versi.js`** (`APP_VERSI`) **dan** **`sw.js`** (`VERSI`) — harus sama.
2. Jika menambah/menghapus file, perbarui daftar `ASET` di `sw.js`.
3. Catat perubahan di `CHANGELOG.md`.
4. Unggah ke GitHub. Pengguna akan melihat **"Versi baru Stivora tersedia"** → **Perbarui**.

> Jika `VERSI` di `sw.js` tidak dinaikkan, pengguna yang sudah pernah membuka aplikasi tetap memakai versi lama (tersimpan untuk offline).

---

## Bahasa Aceh

Semua terjemahan ada di **`js/i18n/ace.js`**:

```js
'Teks Bahasa Indonesia': 'Terjemahan Bahasa Aceh',
```

Kiri harus sama persis dengan teks di aplikasi. Teks yang belum ada tetap tampil dalam Bahasa Indonesia.
Teks berisi angka/nama memakai `POLA_ACE` (`{1}` diterjemahkan, `[1]` apa adanya).

---

## Peta (CesiumJS)

Halaman Impian menampilkan globe 3D 16:9 (`js/features/peta.js`, data wilayah `js/data/wilayah.js`).

**5.67.0:**
- **Kualitas gambar** (menu Layer): Hemat / Seimbang / Tajam (bawaan), disimpan per HP di `localStorage` (`stivora.peta.kualitas`, tidak disinkron). Tajam = resolusi asli layar + `maximumScreenSpaceError` 1,5; Seimbang = resolusi maks. 2× + 2; Hemat = resolusi CSS + 2,5.
- **Pemulihan GPU**: `webglcontextlost` atau error "Compile log: null" → peta lama dibuang dan dibuat ulang (`bangunUlangPeta`), kamera & isi kembali. Maks. 3× per 5 menit, lalu tombol Coba lagi (yang juga membuat ulang).
- **Orbit**: setelah ketuk marker / Lokasi saya, kamera berputar mengelilingi titik (3D, ±40 detik per putaran) sampai peta disentuh, kamera dipindah, atau aplikasi ke latar belakang.

Semua fitur peta lengkap (v5.0.0). Ikon pensil di pojok kanan atas peta membuka halaman *Kelola peta* untuk membuat
dan mengubah data; halaman Impian sendiri hanya untuk melihat.

| Mode / fitur | File | Isi |
|---|---|---|
| Eksplore | `peta.js` | Satelit Indonesia, 3D/2D, kembali ke Indonesia, cari (data sendiri + OpenStreetMap), daftar *Jelajahi* 38 provinsi → kota di halaman pensil |
| Jenis peta | `peta.js` | Default (OpenStreetMap), Satelit (EOX / Bing dengan token), Medan (OpenTopoMap); dipilih di tombol Jenis peta & layer; tersimpan di `stivora.peta.jenis` |
| Alat kanan bawah | `peta.js` | Mode peta, Lokasi saya, Jenis peta & layer, Indonesia, 2D/3D — tersembunyi di balik tombol panah; keadaan tersimpan di `stivora.peta.alat` |
| Marker | `peta-marker.js` | Tambah (ketuk peta), nama, 12 ikon, 8 warna, tanggal, catatan, media (foto/video/audio/dokumen, ikut tampil di Galery), pindah, hapus |
| My Places | `peta-tempat.js` | Hanya tempatmu + kamera menampilkan semuanya; tombol Layer; kartu info saat pin diketuk; halaman Detail tempat + petunjuk arah |
| Events & Stories | `peta-peristiwa.js` | Marker bertanggal sebagai peristiwa; garis waktu ‹ › urut tanggal; saring per tahun; ketuk → cerita (catatan + media) |
| Journey | `peta-jalur.js` | Perjalanan = marker berurutan + warna; garis lengkung, jarak; **Putar Perjalanan** (kamera terbang titik demi titik) |
| Area | `peta-area.js` | Poligon dari sudut-sudut yang diketuk; nama, warna, catatan; luas & keliling otomatis; tampil di Eksplore, My Places, Journey |
| Lokasi saya | `peta-lokasi.js` | Tombol target di kanan bawah: terbang ke posisimu + titik biru. Konfirmasi dulu saat pertama; posisi tidak disimpan/dikirim. Butuh https atau localhost |

**Data & cloud:** marker, perjalanan, dan area tersimpan di localStorage (`stivora.peta.marker`, `stivora.peta.jalur`,
`stivora.peta.area`), tersinkron ke Firestore `users/{uid}/marker`, `/jalur`, `/area` (ikut enkripsi end-to-end), dan ikut
file ekspor/impor. Media marker ditandai `markerId` (juga di catatan media cloud). Butuh **firestore.rules versi 5.0.0**.
Area disimpan di cloud sebagai daftar datar `koordinat: [bujur, lintang, bujur, lintang, …]` karena Firestore tidak menerima larik di dalam larik.

**Pengaturan tampilan** (hanya di perangkat): mode (`stivora.peta.mode`), layer (`stivora.peta.layer`), tahun peristiwa
(`stivora.peta.tahun`), perjalanan terpilih (`stivora.peta.jalur.pilih`).

| Bagian | Sumber |
|---|---|
| Mesin peta | CesiumJS 1.146 (dikunci) — dicoba berurutan dari `cdn.jsdelivr.net`, `cesium.com` (CDN resmi), `unpkg.com`. Hanya `CesiumWidget`, tanpa widget bawaan |
| Satelit tanpa token | Sentinel-2 cloudless 2024 © EOX (`tiles.maps.eox.at`), atribusi tampil di pojok peta |
| Peta jalan (Default) | © OpenStreetMap contributors (`tile.openstreetmap.org`) — pakai wajar sesuai kebijakan ubin OSM |
| Peta medan | © OpenTopoMap (CC-BY-SA), data © OpenStreetMap & SRTM (`a/b/c.tile.opentopomap.org`) |
| Dengan Cesium ion (5.70.0) | Google Maps 2D: Satellite + label (3830182 + 3830185), Roadmap (3830184), Contour (3830186) + Cesium World Terrain; cadangan Bing lalu peta gratis |
| Pencarian | Data sendiri (38 provinsi, 113 kota) lalu Nominatim / OpenStreetMap |

**Token Cesium ion (opsional, gratis) — disimpan di Worker sejak 5.71.0:**
1. Daftar di **cesium.com/ion** (bisa masuk dengan Google).
2. **Access Tokens** → buat token (scope cukup `assets:read`; Allowed URLs boleh diisi `https://<nama>.github.io`).
3. Cloudflare › Worker › Settings › Variables and Secrets → **Secret** `CESIUM_ION_TOKEN` = token itu (opsional **Text** `CESIUM_REFERER` = `https://<nama>.github.io`).
4. Biarkan `CESIUM_ION_TOKEN` di `js/config.js` **kosong**. Peta memakai Cesium ion setelah login Google.
   (Cara lama — token diisi di `config.js` — masih bisa, tapi token terlihat di kode.)

Catatan:
- Peta butuh internet dan WebGL. Tanpa internet muncul pesan + tombol **Coba lagi**. Jika gagal, alasannya tampil kecil di bawah pesan dan dicatat di Log error.
- Cesium dimuat **tanpa** kunci SRI (hash resmi tidak tersedia), tetapi versinya dikunci. Saat menaikkan versi Cesium, ubah ketiga alamat di `CESIUM_CDN` (`js/features/peta.js`).
- Disimpan di perangkat: posisi kamera (`stivora.peta.kamera`), 3D/2D (`stivora.peta.dimensi`), jejak lokasi yang dibuka (`stivora.peta.jejak`).
- Dengan token Cesium ion (relief 3D), area memakai `GroundPrimitive` agar menempel di permukaan; garis perjalanan dibuat melengkung agar tidak menembus bumi.

## Koleksi Link

Di Galery › Lainnya › Koleksi Link. Pratinjau link (judul, gambar, deskripsi, cek link mati) diambil lewat rute
`/pratinjau` di Worker Cloudflare — **deploy ulang `cloudflare-worker/worker.js` versi 5.63.0** — dan hanya untuk akun yang login.
Tanpa Worker baru aplikasi tetap jalan: hanya ikon situs, domain, dan judul YouTube.
Menu **Bagikan → Stivora** di Android aktif setelah aplikasi dipasang dari Chrome (manifest `share_target`).
Data per link (`link-urutan` + `link-l-<id>`) — **wajib Publish firestore.rules versi 5.63.0**. Maks. 3000 link.

## Tokoh Favorit (Wikipedia)

Di Galery › Lainnya › Tokoh Favorit ada tiga jenis tokoh: **Publik** (dicari di Wikipedia bahasa Indonesia, lalu Inggris bila tidak ada;
tanpa API key), **Fiksi**, dan **Orang dekat** (tidak dicari di internet). Foto sendiri disimpan kecil (±10 KB) dan ikut sinkron.
Data per tokoh (`tokoh-urutan` + `tokoh-t-<id>`) — **wajib Publish firestore.rules versi 5.62.0**.
CSP `connect-src` perlu `https://id.wikipedia.org https://en.wikipedia.org https://www.wikidata.org` (sudah ada di index.html).

## Channel Favorit

Di Galery › Lainnya › Channel Favorit: satu kreator bisa punya banyak platform. Tempel link profil dari YouTube,
Instagram, TikTok, X, Facebook, Threads, Twitch, Telegram, Spotify, atau website — platform & username dikenali otomatis.
YouTube memakai `YOUTUBE_API_KEY` di Worker (profil, subscriber, video terbaru + penanda "video baru"); platform lain
tidak menyediakan foto & jumlah pengikut, jadi foto profil bisa dipasang sendiri (disimpan kecil ±10 KB, ikut sinkron).
Data per kreator (`channel-urutan` + `channel-c-<id>`) — **wajib Publish firestore.rules versi 5.61.0**.

## Tempat Favorit (OpenStreetMap)

Di Galery › Lainnya › Tempat Favorit: cari tempat, **Saya di sini**, **Pilih di peta**, **Tempel link Google Maps**
(link panjang / koordinat; link pendek `maps.app.goo.gl` harus dibuka dulu di browser lalu salin alamat lengkapnya),
atau **Dari marker** yang sudah ada. Setiap tempat juga marker di Peta 3D (nama, kategori, catatan saling ikut).
Pencarian & alamat dari Nominatim, peta kecil dari ubin OpenStreetMap — tanpa key. Lokasi HP hanya dipakai saat itu.
Data disimpan per tempat (`tempat-urutan` + `tempat-t-<id>`) — **wajib Publish firestore.rules versi 5.60.0**.

## Key API di Worker (YouTube, Google Books, TMDB) — 5.66.0

Key YouTube/Google Books dan TMDB **tidak lagi ditaruh di `js/config.js`** (semua isi config.js bisa dilihat siapa pun
yang membuka situsmu). Key disimpan sebagai **Secret** di Cloudflare Worker, lalu aplikasi meminta data lewat Worker
(`/api/youtube`, `/api/books`, `/api/tmdb`). Syaratnya: `MEDIA_WORKER_URL` terisi dan sudah **masuk dengan Google**.

1. Deploy `stivora-server/cloudflare-worker/worker.js` versi 5.66.0.
2. Cloudflare › Workers › (worker-mu) › **Settings › Variables and Secrets** › **Add** › tipe **Secret**:
   - `YOUTUBE_API_KEY` = key Google (lihat bagian YouTube di bawah)
   - `TMDB_API_KEY` = key TMDB (lihat bagian TMDB di bawah)
3. **Sangat disarankan** — tambahkan **Variable** `ALLOWED_EMAILS` = email Google-mu (pisahkan koma bila lebih dari satu).
   Tanpa ini, akun Google mana pun yang login di situsmu bisa memakai kuota key-mu lewat Worker.
4. Di Google Cloud Console, karena key kini dipakai dari server (bukan browser): **Application restrictions: None**,
   **API restrictions: Restrict key** › centang **YouTube Data API v3** dan **Books API**.
5. Hapus nilai `YOUTUBE_API_KEY` dan `TMDB_API_KEY` dari `js/config.js` lama-mu (baris itu sudah tidak dipakai).
   Kalau key lama pernah ter-upload ke GitHub, sebaiknya **buat key baru** dan hapus yang lama.

## Google Books (Readlist Buku)

Di Galery › Lainnya › Readlist Buku, ketuk **Tambah** lalu cari judul/penulis/ISBN, **scan barcode** di sampul belakang
(Chrome di Android), atau **upload gambar barcode**. Info buku diambil dari Google Books; sampul cadangan dari Open Library.

- Memakai `YOUTUBE_API_KEY` di Worker. Di Google Cloud Console project yang sama buka
  **APIs & Services › Library** › cari **Books API** › **Enable**.
- Tanpa Worker / belum login / Books API belum aktif: pencarian tetap jalan langsung dengan kuota umum Google yang lebih kecil.
- Data Readlist disimpan di dokumen sendiri (`buku-urutan` + satu dokumen `buku-b-<id>` per buku) —
  **wajib Publish firestore.rules versi 5.59.0**.

## TMDB (Playlist Film)

Di Galery › Lainnya › Playlist Film, ketuk **Tambah** lalu ketik judul film atau serial. Poster, sinopsis, pemain,
trailer, dan tempat menonton di Indonesia diambil dari TMDB lewat Worker. Cara membuat key:

1. Daftar gratis di https://www.themoviedb.org/signup lalu verifikasi email.
2. Buka **Settings › API** (https://www.themoviedb.org/settings/api) › **Create / Request an API key** › pilih **Developer**,
   isi formulir singkat (jenis: Personal / Website, alamat: GitHub Pages-mu).
3. Salin **API Key** (v3, pendek) — atau **API Read Access Token** (panjang, diawali `eyJ`); keduanya bisa dipakai.
4. Simpan sebagai Secret `TMDB_API_KEY` di Worker (lihat **Key API di Worker**).

Tanpa Worker/login, film tetap bisa ditambah manual. Film lama/manual bisa dicocokkan ke TMDB lewat tombol
**Cocokkan ke TMDB** di halaman edit-nya. Data tempat menonton berasal dari JustWatch (dicantumkan di aplikasi).
Produk ini menggunakan TMDB API tetapi tidak didukung atau disertifikasi oleh TMDB.

## YouTube (Playlist Lagu, Channel Favorit, Koleksi Link)

Di Galery › Lainnya › Playlist Lagu, tempel link playlist atau lagu YouTube, lalu putar langsung di aplikasi.
Supaya judul & durasi semua lagu dalam playlist langsung tampil (dan profil/video terbaru di Channel Favorit):

1. Buka https://console.cloud.google.com › pilih project (boleh project Firebase yang sama).
2. **APIs & Services › Library** › cari **YouTube Data API v3** › **Enable** (sekalian **Books API**).
3. **APIs & Services › Credentials** › **Create credentials › API key**.
4. Klik key tersebut › **Application restrictions: None** › **API restrictions: Restrict key** ›
   centang **YouTube Data API v3** dan **Books API** › Save.
5. Simpan sebagai Secret `YOUTUBE_API_KEY` di Worker (lihat **Key API di Worker**).

Kuota gratis 10.000 unit/hari; membuka playlist 100 lagu memakai ±4 unit.
Tanpa Worker/login, lagu tetap bisa diputar (judul muncul saat lagu diputar).
Catatan: suara berhenti saat layar mati / pindah aplikasi (aturan pemutar YouTube), dan sebagian video
tidak diizinkan pemiliknya diputar di luar YouTube (ada tombol **Buka di YouTube**).

## Monitoring error

- Di aplikasi: **Pengaturan › Sistem › Log error** (bisa disalin).
- Di Firebase (jika sudah masuk): **Firestore › users › (uid) › galat**.

---

## Data tersimpan

| Tempat | Isi |
|---|---|
| localStorage `stivora.*` | impian, mode, tema, bahasa, kunci, pengaturan cadangan, riwayat, log error |
| IndexedDB `stivora` › `images` | file media di perangkat |
| Firestore `users/{uid}/dreams` | impian (biasa atau terenkripsi) |
| Firestore `users/{uid}/media` | catatan media |
| Firestore `users/{uid}/pengaturan/e2e` | salt + cek enkripsi (bukan kata sandi) |
| Firestore `users/{uid}/galat` | laporan error |
| R2 `users/<uid>/media/<id>` | file media |
| R2 `users/<uid>/terhapus/<id>` | file media yang dihapus, ditahan 30 hari (5.68.0) |
| R2 `users/<uid>/cadangan/<YYYY-MM-DD>.json` | cadangan harian, 30 hari (5.68.0) |
