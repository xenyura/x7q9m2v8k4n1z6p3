# Catatan perubahan Stivora

Format versi: `UTAMA.FITUR.PERBAIKAN`. Versi terbaru di atas.

## 5.75.0 — Tab Progress 3 ubin, Rencana cadangan banyak buku
- **Tab Progress**: "Kenapa aku yakin mampu" tetap di atas. Di bawahnya 3 ubin ringkasan yang sekaligus jadi tab — Peta jalan (fase + bar progres), Proyek (jumlah + tahap), Rencana (jumlah buku + titik merah bila ada yang perlu dicek). Ketuk ubin = hanya bagian itu yang tampil; pilihan diingat per HP.
- **Rencana cadangan: banyak buku** (satu buku per tujuan), tampil sebagai **jalur kereta**: tiap buku satu baris A → B → C (stasiun dijalankan besar, cadangan putus-putus hijau, arsip abu-abu), sisa hari ke tanggal cek atau "cek hari ini" merah. Ketuk baris = lembar rencana buku itu; ketuk stasiun = langsung ke rencana itu.
- Buku ditambah / diganti nama / dihapus lewat ikon pensil (hapus pakai konfirmasi, isinya ikut terhapus setelah Simpan). Rencana lama otomatis masuk buku "Rencana utama". Pengingat tanggal cek berlaku untuk semua buku.
- Daftar buku ikut sinkron (kepala dokumen urutan rencana), cadangan harian, ekspor/impor, dan E2E. Firestore rules & Worker tidak berubah.

## 5.74.0 — Folder lebih mudah diakses, ubin topik Channel
- **Galery › Foto & Video › di dalam folder**: subfolder tampil sebagai kotak pratinjau 4 media (seperti kartu folder di daftar Folder), menggantikan tombol kecil. Di bawahnya hanya media yang langsung ada di folder itu (isi subfolder tidak lagi tercampur; dibuka lewat kotaknya). Tetap per tanggal dan "Disematkan" tetap ada. Pencarian di dalam folder tetap mencakup subfolder.
- **Koleksi Link**: folder jadi kartu 2 kolom (ikon berwarna otomatis, nama, ikon 3 situs terakhir, jumlah link & baca nanti), tampil 4 dulu lalu "Lihat semua folder", plus kartu "Tanpa folder". Ketuk kartu = masuk folder (jejak "Folder › nama", tombol/gestur kembali naik ke daftar folder, saringan status khusus isi folder). Kelola folder lewat ikon pensil; jenis & label pindah ke ikon saring di judul LINK.
- **Channel Favorit**: topik jadi ubin berwarna 3 kolom dengan wajah kreator (maks 3), jumlah kreator, dan titik merah bila ada video baru. Tampil 6 dulu lalu "Semua topik". Ketuk ubin = saring daftar (judul "TOPIK · n kreator" + ×). Kreator dengan video baru naik paling atas. Kelola topik lewat ikon pensil.
- **Hexagon**: judul "Dendam karena pengalaman buruk apa?" diganti "Apa alasannya?" (form & halaman detail; isi poin tetap).

## 5.73.0 — Konfirmasi aksi penting, peringatan data penuh, edit Impian lebih ringan
- **Konfirmasi baru** sebelum: Catat transaksi berulang (menampilkan nama, jumlah, dompet, tanggal), Tandai semua video channel sudah dilihat, Lepas tautan tokoh (Channel), Lepas kaitan impian (Tempat).
- **Pengingat berulang muncul lagi** bila transaksi yang dicatat dari pengingat itu dihapus di bulan yang sama. Transaksi dari pengingat kini menyimpan asalnya (`br`), tetap ada walau transaksinya diedit.
- **Peringatan data sinkron hampir penuh**: bila satu dokumen cloud mencapai 70% dari batas 1 MB Firestore, muncul peringatan merah di Cadangkan & pulihkan dan tercatat di Log error (dicatat lagi tiap naik 10%). Hilang sendiri bila ukurannya turun.
- **Peta dibekukan saat tidak terlihat**: tertutup halaman/penampil foto, di tab lain, atau digulir keluar layar → berhenti menggambar, berhenti berputar, tidak bereaksi ke keyboard. Terlihat lagi → lanjut dari posisi terakhir, orbit ikut lanjut.
- **Edit Impian tidak menggambar ulang per huruf**: mengetik nama pita / nama & alasan impian utama tetap langsung tersimpan, tapi grid hexagon dan Progress di belakangnya digambar sekali saat halaman ditutup (`renderNanti` di `js/core/ui.js`).

## 5.72.0 — Deretan chip tidak lagi "mental" ke kiri
- Saat mengetuk chip/tab di deretan yang digeser ke kanan, deretan kini **tetap di posisinya** dan chip yang dipilih tetap terlihat. Sebelumnya deretan digambar ulang dan kembali ke paling kiri.
- Berlaku di semua deretan: Koleksi Link (status, folder/jenis/label), Channel (topik), Tempat (status, kategori, koleksi), Buku, Tokoh, Film, Lagu, tab Lainnya, Pola Pikir, pilih ikon banner (bidang), Peta Perjalanan (model kendaraan), dan deretan baru di masa depan.
- Satu penjaga bersama: `js/core/geser-chip.js` (baru).

## 5.71.1 — Jenis peta Google & label diperbaiki
- **Default** kini benar-benar peta jalan Google (sebelumnya tetap foto satelit), **Medan** kini peta kontur Google.
- **Label jalan & tempat** kini tampil (sebelumnya gagal: "Styles can only be specified for the roadmap map type").
- Penyebab: pemuat Google di Cesium memakai jenis "satellite" untuk semua aset bila tidak diisi; kini jenisnya diisi per aset (satellite / roadmap / terrain). Label dalam Bahasa Indonesia.
- Saat sumber Google gagal, penggantian lapisan ditunda sesaat agar tidak bertabrakan dengan proses Cesium.

## 5.71.0 — Token Cesium disembunyikan di Worker
- Token Cesium ion kini bisa disimpan sebagai **Secret di Cloudflare Worker** (`CESIUM_ION_TOKEN`), tidak lagi di `js/config.js`/GitHub. Peta meminta akses lewat rute baru Worker `/ion/v1/assets/<id>/endpoint` memakai tanda login Google; Worker memeriksa login + `ALLOWED_EMAILS`, lalu menukarnya dengan token asli. Potongan peta tetap diambil langsung dari Cesium/Google.
- Sebelum login: peta memakai sumber gratis. Setelah login: Google Maps 2D + relief 3D. Sambungan diperbarui otomatis tiap 45 menit; keluar akun → kembali ke sumber gratis.
- Kalau Worker belum punya Secret atau gagal: peta tetap tampil dengan sumber gratis, pesan menjelaskan penyebabnya, tercatat di Log error.
- Cara lama (token di `config.js`) tetap didukung; dipakai bila `CESIUM_ION_TOKEN` di config.js diisi.
- Menu Layer: keterangan detail tidak lagi membingungkan ("detail 18 dari 14") — kini "foto sumber hanya sampai level 14, di sini diperbesar (buram)".
- **Server (wajib dipasang)**: `worker-ringkas.js` baru + Secret `CESIUM_ION_TOKEN` (opsional Variable `CESIUM_REFERER`). Lalu kosongkan `CESIUM_ION_TOKEN` di `js/config.js`.

## 5.70.0 — Peta lebih jernih dari dekat (Google Maps lewat Cesium ion)
- Dengan token Cesium ion, peta kini memakai **Google Maps 2D** (aset bawaan akun ion): Satelit = Google Satellite (3830182), Default = Google Roadmap (3830184), Medan = Google Contour (3830186). Foto yang sama dipakai di mode 2D dan 3D.
- **Label jalan & tempat Google** (3830185) sebagai lapisan terpisah di Satelit dan Medan; bisa dinyalakan/dimatikan di menu Layer (bawaan nyala, disimpan per HP).
- Kalau aset Google gagal atau kuota habis: otomatis memakai Bing, lalu peta gratis (EOX/OpenStreetMap/OpenTopoMap), dengan pesan singkat. Tercatat di Log error.
- Semua jenis peta di 2D & 3D bisa didekati sampai **20 m** (dulu Medan & tanpa token 60–300 m). Di bawah ±100 m foto satelit memang mulai buram.
- **Kualitas gambar**: bagian dekat kini sama tajamnya di Hemat, Seimbang, dan Tajam. Yang dihemat hanya resolusi layar (Hemat maks. 1,5×, Seimbang 2×, Tajam asli) dan detail bagian jauh ke arah cakrawala. Cache foto diperbesar (Tajam 400 potongan) agar foto tajam tidak diganti yang buram saat digeser.
- Menu Layer menampilkan **sumber foto & detail yang sedang tampil**, mis. "Sumber: Google + label · detail 19 dari 22 · tinggi kamera 150 m".

## 5.69.0 — Keuangan lebih rapi (desain A: sub-tab)
- Tab Keuangan dipendekkan dari ±2.600px jadi kira-kira satu layar: di bawah kartu saldo ada sub-tab **Bulan ini · Riwayat · Kantong · Hutang**; hanya satu bagian yang tampil. Sub-tab terakhir diingat per HP.
- Tiga tombol pastel diganti dua: **Catat** (pilih Masuk/Keluar/Pindah/Kantong di form) dan **Pindah**.
- Pengingat transaksi berulang jadi satu baris ringkas (Catat / Lewati) dan hanya muncul saat jatuh tempo. Kartu "Berulang" di halaman dihapus karena dobel; daftarnya tetap diatur lewat pensil pengaturan.
- Grafik 6 bulan dipindah: lihat halaman **Laporan** (grafik 12 bulan). Riwayat kini punya tombol ganti bulan sendiri.
- Tidak ada fitur yang hilang; data tidak berubah.

## 5.68.0 — Cadangan harian 30 hari, ringkasan cadangan, Proyek software, Rencana cadangan
- **Cadangan harian** (Pengaturan › Cadangkan & pulihkan › Cadangan harian): dibuat otomatis sekali sehari saat Stivora pertama dibuka (sudah masuk Google + Worker terpasang), disimpan 30 hari di R2 lalu terhapus sendiri. Isinya semua data kecuali foto & video Galery dari folder HP. Terenkripsi bila enkripsi end-to-end aktif (kalau enkripsi aktif tapi belum dibuka di HP itu, cadangan tidak dibuat agar tidak terkirim tanpa enkripsi). Tombol "Cadangkan hari ini sekarang".
- **Pulihkan ke tanggal tertentu**: pilih tanggal → lihat perbandingan isi HP ini vs cadangan → Pulihkan (dengan konfirmasi). Semua data di HP dan cloud kembali seperti tanggal itu, termasuk media.
- **Media yang dihapus ditahan 30 hari di cloud** (sebelumnya langsung hilang), sehingga cadangan harian bisa mengembalikan filenya. Setelah 30 hari terhapus permanen otomatis. Teks konfirmasi hapus media diperbarui.
- **Ringkasan cadangan** (jumlah per jenis data + ukuran): di daftar cadangan harian (ketuk untuk rincian), setelah Ekspor (kartu "Ekspor terakhir"), dan **sebelum Impor** — halaman baru "Periksa sebelum impor" membandingkan isi HP ini dengan isi file, baru kemudian konfirmasi Pulihkan. Riwayat cadangan juga mencatat ringkasannya.
- **Impian › Progress › Proyek software**: daftar proyek dengan tahap Ide, Rencana, Desain, Bangun, Uji, Rilis, Rawat, dan "Yang sering terlupa". Tiap langkah bawaan punya penjelasan "kenapa & caranya" (ikon ?). Langkah bisa dicentang, diberi catatan, diubah wajib/opsional, disembunyikan, atau ditambah sendiri. Bangun–Uji–Rilis diulang per versi. Berdiri sendiri (tidak terhubung hexagon).
- **Impian › Progress › Rencana cadangan** (desain lembar minimalis): deret lingkaran A/B/C… (aktif besar berwarna, cadangan siap hijau putus-putus, arsip abu-abu, yang lama dilipat jadi "+n") dan satu lembar catatan: nama, catatan bebas, Beralih kalau, Dicek tanggal (sisa hari), Bekal dari rencana sebelumnya, Kalau beralih lanjut ke. Beralih wajib menulis refleksi (yang terjadi, pelajaran, yang dibawa); arsip "Pelajaran & keberhasilan". Pengingat kecil saat tanggal cek tiba.
- Kedua fitur baru: halaman hanya untuk dibaca, semua perubahan lewat **satu ikon pensil**; ikut sinkron per item, cadangan harian, ekspor/impor, enkripsi end-to-end, dan konfirmasi hapus.
- **Perbaikan**: halaman Cadangkan & pulihkan error untuk akun yang sudah login di 5.67.0 (ikon "Pulihkan dari cloud" ikut terhapus bersama Sampah).
- **Server (wajib dipasang)**: `worker-ringkas.js` baru (rute `/cadangan`, `/media-pulihkan`, penahanan file 30 hari) dan `firestore.rules` baru (dokumen proyek & rencana) — isi lagi `daftarEmail()` dengan emailmu.

## 5.67.0 — Peta pulih sendiri, orbit, kualitas peta, keamanan akun, Sampah dihapus
- **Galery › Channel Favorit & Tokoh Favorit**: tombol **Kelola** di pilihan Topik/Bidang untuk menghapus topik/bidang tambahan (dengan konfirmasi). Hanya hilang dari daftar pilihan; kreator/tokoh yang sudah memakainya tetap menyimpannya. Topik bawaan tidak bisa dihapus.
- **Impian**: tab terakhir yang dipakai dibuka lagi saat aplikasi dibuka (seperti Galery). Urutan hexagon bisa diubah dengan tombol ▲ ▼ di halaman Edit impian.
- **Peta**: saat sambungan grafis HP (GPU) terputus, peta dibuat ulang sendiri tanpa refresh — posisi kamera, marker, area, dan jalur kembali; kualitas tidak diturunkan; Log error cukup sekali per kejadian. Tombol **Coba lagi** kini benar-benar membuat peta baru.
- **Peta**: setelah mengetuk marker atau **Lokasi saya**, kamera langsung berputar pelan mengelilingi titik (hanya 3D, ±40 detik per putaran) sampai peta disentuh.
- **Peta**: pilihan **Kualitas gambar** di menu Layer — Hemat / Seimbang / **Tajam** (bawaan). Disimpan per HP. Tajam = resolusi asli layar dan detail jauh lebih tinggi (lebih jernih, lebih berat).
- **Peta**: menghapus marker kini ikut menghapus lampirannya (konfirmasi menyebut jumlahnya). Dulu lampiran dilepas tapi tidak tampil di mana pun dan tetap memakan ruang.
- **Fitur Sampah dihapus** beserta kodenya. Semua penghapusan tetap wajib konfirmasi lalu permanen; teks konfirmasi media menyebut "dihapus permanen dari HP dan cloud". Sisa isi Sampah lama di perangkat dibersihkan.
- **Keamanan akun**: akun Google yang tidak terdaftar mendapat pesan "Akun ini tidak diizinkan memakai Stivora" lalu otomatis keluar — data di HP tidak disentuh.
- **Server (wajib dipasang)**: Worker kini memberlakukan `ALLOWED_EMAILS` juga untuk upload/unduh/hapus file R2. `firestore.rules` punya daftar email (`daftarEmail()`) yang harus kamu isi sendiri. Zip server kini berisi `worker-ringkas.js`.

## 5.66.2 — Jarak di bawah kartu Usia/Berat/Tinggi
- Kartu Usia/Berat/Tinggi dan foto profil tidak lagi menempel ke baris tab Foto/Video/Pola Pikir/Lainnya: kini berjarak 14px (sebelumnya 0 karena margin bertumpuk saat badge & bio kosong). Bila ada badge/bio, kotaknya juga berjarak 14px dari kartu.

## 5.66.1 — Simulasi login dihapus
- Tombol "Simulasi sudah login" di Pengaturan beserta seluruh kodenya dihapus (alat uji tampilan dari masa sebelum Firebase tersambung). Simulasi membuat fitur YouTube/Film/Buku gagal tanpa penjelasan karena akun pura-pura tidak bisa memakai Worker. Login Google asli tidak berubah.

## 5.66.0 — Key API dipindah ke Worker
- Key YouTube (juga untuk Google Books) dan TMDB tidak lagi ada di aplikasi (`js/config.js`). Disimpan sebagai **Secret** di Cloudflare Worker; aplikasi meminta data lewat rute baru Worker `/api/youtube`, `/api/books`, `/api/tmdb` (wajib login, hanya jalur baca tertentu).
- Worker: variabel baru opsional `ALLOWED_EMAILS` — hanya akun ini yang boleh memakai `/api` & `/pratinjau` (agar akun Google lain tidak bisa memakai kuota key-mu).
- Pesan di Lagu, Film, Channel, dan Link kini menjelaskan alasannya: Worker belum dipasang / belum masuk Google / akun tidak diizinkan / key belum diisi di Worker. Tanpa Worker: lagu tetap bisa diputar, film diisi manual, buku tetap dicari langsung (kuota umum Google).
- CSP: `api.themoviedb.org` dihapus dari connect-src (tidak dipanggil langsung lagi).
- **Wajib**: deploy ulang `worker.js`, isi Secret `YOUTUBE_API_KEY` & `TMDB_API_KEY` di Worker, lalu hapus nilai kedua key itu dari `js/config.js`-mu. Lihat README › Key API di Worker.

## 5.65.0 — Kode dirapikan
- Semua file JavaScript & CSS dirapikan dengan format yang sama (Prettier: lebar 140, kutip tunggal) — baris panjang dipecah agar mudah dibaca di SPCK.
- `css/features.css` (3.400 baris) dipecah jadi 11 file di `css/fitur/` (01-umum … 11-link), dimuat berurutan sesuai nomor; isinya sama persis.
- Kode yang sama di beberapa fitur disatukan di `js/features/galery-bersama.js`: simpan per item (Tempat, Channel, Tokoh, Link), pengecil foto profil (Channel, Tokoh), dan pemutar YouTube di dalam aplikasi (Channel, Link).
- Dihapus: 5 fungsi yang tidak pernah dipakai dan ±25 gaya CSS dari tampilan lama (tombol + lama, kartu impian lama, galeri lama, daftar marker lama, penampil lama).
- Tampilan & fungsi tidak berubah (dibandingkan piksel per piksel dengan versi sebelumnya di 64 layar).

## 5.64.1 — Hasil uji menyeluruh
- Diuji: semua 64 layar di lebar 320/360/390/768/1280 terang & gelap (tanpa error, tanpa elemen meluber), XSS di semua koleksi, cadangan ekspor→impor (data kembali utuh), offline lewat service worker, sinkron dua perangkat.
- Teks halaman Ekspor & impor dan konfirmasi impor kini menyebut data Galery (banner, Pola Pikir, koleksi Lainnya) dan keuangan yang memang ikut dicadangkan; foto & video dari folder HP disebut tidak ikut.

## 5.64.0 — Gradasi banner Galery
- Banner Galery yang berfoto kini punya gradasi hitam pekat dari bawah yang memudar sampai tengah banner (tulisan lebih terbaca). Banner tanpa foto tidak berubah. Pratinjau di halaman "Banner & profil Galery" ikut sama.

## 5.63.0 — Koleksi Link
- Koleksi Link dirombak: tempel link → pratinjau otomatis (judul, gambar, deskripsi lewat Worker bila aktif & login; tanpa Worker: ikon situs + domain + judul YouTube). Cek duplikat (abaikan utm/si dll.).
- Bagikan → Stivora: link dari YouTube/Chrome/TikTok dll. langsung masuk (aplikasi harus dipasang dari Chrome).
- Folder, label, jenis otomatis (Video, Artikel, Dokumen, Kode, Alat, Medsos), Baca nanti / Sudah dibuka, Sematkan, penanda "Lama belum dibuka" & "Link mati?".
- Detail: putar YouTube di dalam aplikasi, salin/bagikan, jumlah dibuka, kenapa disimpan, poin penting (Jadikan Pola Pikir), terhubung dengan Impian/Tokoh/Buku/Channel/Tempat, cek link aktif.
- Impor bookmark Chrome (.html): pilih folder, duplikat dilewati. Kelola folder (ganti nama/hapus dengan konfirmasi).
- Worker: rute baru /pratinjau (wajib login) — deploy ulang worker.js. Sinkron per link (`link-urutan` + `link-l-*`) — wajib Publish firestore.rules.

## 5.62.0 — Tokoh Favorit
- Tokoh Favorit dirombak: tiga jenis tokoh — Publik (info otomatis dari Wikipedia: foto, ringkasan, lahir/wafat), Fiksi (dengan "dari karya"), dan Orang dekat (pribadi, foto dari HP).
- Halaman tokoh: nilai & alasan, kutipan favorit (bisa diubah, Jadikan Pola Pikir, penanda "Sudah di Pola Pikir"), "Yang mau aku tiru" dengan centang & progres, perjalanan hidup / momen penting, bidang, arsip.
- Terhubung dengan Impian, Buku, Film, Channel, dan Tempat (bisa dibuka langsung). Channel Favorit kini menaut ke Tokoh Favorit yang baru.
- Daftar: "Kutipan hari ini" (berganti tiap hari, tombol Lain), filter jenis & bidang.
- Semua hapus/lepas pakai konfirmasi. Tokoh lama otomatis dipindah (tautan dari Channel tetap).
- Sinkron per tokoh (`tokoh-urutan` + `tokoh-t-*`) — wajib Publish firestore.rules.

## 5.61.0 — Channel Favorit
- Channel Favorit dirombak: satu kreator bisa punya banyak platform (YouTube, Instagram, TikTok, X, Facebook, Threads, Twitch, Telegram, Spotify, website); platform & username dikenali otomatis dari link.
- YouTube (pakai YOUTUBE_API_KEY): foto, banner, subscriber, deskripsi, video terbaru, penanda "video baru" + rak "Ada video baru" di daftar; video diputar di dalam aplikasi.
- Detail kreator: foto profil sendiri (untuk platform tanpa foto), nilai bintang, alasan mengikuti (autosave), Jadikan Pola Pikir, konten favorit, tautan ke Tokoh Favorit, topik, arsip.
- Lepas link / hapus konten / hapus kreator selalu pakai konfirmasi. Data lama otomatis dipindah.
- Sinkron per kreator (`channel-urutan` + `channel-c-*`) — wajib Publish firestore.rules.

## 5.60.0 — Tempat Favorit (satu data dengan Peta)

- **Galery › Lainnya › Tempat Favorit**: setiap tempat sekaligus **marker di Peta 3D** — nama, kategori (ikon & warna)
  dan catatan diubah di satu tempat, ikut berubah di tempat lain.
- **Tambah**: cari nama tempat (OpenStreetMap, urut terdekat), **Saya di sini** (lokasi HP + alamat otomatis),
  **Pilih di peta** (tekan lama di Peta 3D), **Tempel link Google Maps** (link panjang / koordinat), **Dari marker** yang sudah ada.
- **Daftar**: chip Semua / ❤️ Favorit / Ingin / Sudah dikunjungi + chip kategori, **Koleksi** (buat & saring), urutan
  terdekat / terbaru / nilai / nama, kartu dengan peta kecil OpenStreetMap, jarak, status, nilai, Buka/Tutup, impian;
  **Lihat semua di Peta 3D**.
- **Detail**: peta + **Buka di Peta 3D**, favorit, jam buka (Buka sekarang / Tutup), **Rute** (Google Maps), Telepon,
  Website, Bagikan, Salin koordinat, status, **riwayat kunjungan** (tanggal, nilai, harga, yang disukai, dengan siapa,
  catatan; hapus dengan konfirmasi), **kaitkan ke Impian**, koleksi, catatan, info (ubah nama/alamat/kategori/telepon/website/jam).
- **Hapus**: pilih *Hapus dari Tempat Favorit saja* (marker tetap) atau *Hapus tempat & marker-nya*.
- Tempat lama (tanpa lokasi) dipindah otomatis; tombol **Tentukan lokasi** (memakai link tersimpan bila ada).
- Data di kunci sendiri `stivora.galery.tempat`, sinkron dipecah per tempat (`tempat-t-<id>` + `tempat-urutan`), ikut cadangan.
- **Server**: firestore.rules mengizinkan `galery-tempat`, `tempat-urutan`, `tempat-t-*` — wajib Publish.

## 5.59.0 — Readlist Buku (Google Books)

- **Galery › Lainnya › Readlist Buku**: kotak **Target tahunan** (rentetan hari membaca, halaman bulan ini, sisa buku),
  bagian **Sedang dibaca** dengan tombol **+ Halaman**, rak sampul dengan chip Ingin / Sedang / Selesai / **Berhenti** dan urutan.
- **Tambah**: cari judul/penulis/ISBN lewat Google Books, **Scan barcode** dengan kamera (senter bila ada),
  **Upload barcode** dari gambar; Tambah manual tetap ada. Sampul cadangan dari Open Library.
- **Halaman detail**: Baca sampel, Cari di toko (Google Play Books, Gramedia, Tokopedia, Shopee), status, kemajuan
  (+10 / +25 / Ke hlm…, ubah jumlah halaman), perkiraan tanggal selesai, tanggal mulai & selesai, **sesi baca** 7 hari,
  **kutipan & catatan** dengan halaman (hapus dengan konfirmasi) dan **Jadikan Pola Pikir** (formulir Pola Pikir terisi,
  asal: Buku), nilai & ulasan, format (cetak / e-book / audiobook), kepemilikan (milik sendiri / pinjam dari siapa / ingin beli),
  deskripsi, hapus dengan konfirmasi. Buku manual: Ubah info & **Cocokkan ke Google Books** (kemajuan tetap).
- Data Readlist pindah ke kunci sendiri `stivora.galery.buku` — sinkron dipecah satu dokumen per buku
  (`buku-b-<id>` + `buku-urutan`), ikut cadangan; jumlah buku sampai 5.000. Buku lama dipindah otomatis.
- Google Books memakai `YOUTUBE_API_KEY` yang sama (aktifkan Books API); tanpa key tetap jalan.
- **Server**: firestore.rules mengizinkan `galery-buku`, `buku-urutan`, `buku-b-*` — wajib Publish.

## 5.58.0 — Playlist Film (TMDB)

- **Galery › Lainnya › Playlist Film** jadi rak poster: chip status (Ingin / Sedang / Sudah), chip Film & serial,
  urutan (terbaru, judul, tahun, nilai saya), ikon status & label Serial di poster, garis kemajuan serial.
- **Tambah**: cari film & serial lewat TMDB (poster, tahun, judul asli, genre), tanda "Sudah di koleksi";
  **Tambah manual** tetap ada. Status baru **Sedang ditonton** (juga untuk film manual).
- **Halaman detail**: latar & poster, tahun, durasi, skor TMDB, genre, **Trailer** (YouTube, tombol kembali menutup trailer),
  sinopsis (bahasa Indonesia, cadangan bahasa Inggris), sutradara/pembuat, bahasa, pemain,
  **Tonton di Indonesia** (langganan, gratis, sewa, beli — data dari JustWatch).
- **Catatanku**: status, kemajuan serial Musim · Episode dengan **+1 episode** (otomatis pindah musim & otomatis
  Sudah di episode terakhir), nilai 1–5 bintang & tanggal nonton (saat Sudah), catatan tersimpan otomatis.
- **Hapus dari koleksi** dengan konfirmasi. Film lama/manual: tombol **Cocokkan ke TMDB** di halaman edit
  (status & catatan tetap).
- `TMDB_API_KEY` baru di config.js (kosong secara bawaan; API key v3 atau Read Access Token). Cara membuat di README › TMDB.
  Data film tetap di dokumen `galery-lainnya` (ikut sinkron & cadangan); detail diambil saat dibuka.

## 5.57.0 — Playlist Lagu YouTube

- **Galery › Lainnya › Playlist Lagu**: tombol **Tempel link** untuk link playlist atau 1 lagu YouTube
  (youtube.com, youtu.be, m./music.youtube.com, shorts). Link lagu yang diputar dari playlist bisa
  disimpan sebagai playlist-nya atau lagunya saja. Link selain YouTube disimpan sebagai **link lain**
  (isi manual seperti sebelumnya); lagu lama yang link-nya YouTube otomatis bisa diputar.
- **Pemutar**: pemutar YouTube resmi di dalam aplikasi, judul & penyanyi, bar waktu bisa digeser,
  putar/jeda, sebelumnya/berikutnya, acak, ulang (semua / 1 lagu), daftar lagu (ketuk untuk memutar),
  **Buka di YouTube** (di detik yang sama), **Salin link**, **Hapus**. Layar lebar: video kiri, daftar kanan.
- **Mini player**: tetap berputar saat halaman ditutup; ketuk untuk kembali, X untuk berhenti.
- Video yang tidak diizinkan pemiliknya diputar di luar YouTube: keterangan + tombol Buka di YouTube,
  lalu lagu berikutnya otomatis setelah 5 detik.
- **Hapus**: tekan lama playlist/lagu (menu Buka di YouTube · Salin link · Hapus) atau tombol Hapus di
  pemutar, selalu dengan konfirmasi. Hanya menghapus simpanan di Stivora; di YouTube tetap ada.
- Judul, durasi & jumlah lagu diambil lewat **YouTube Data API** (`YOUTUBE_API_KEY` baru di config.js,
  kosong secara bawaan; cara membuat key di README › YouTube). Tanpa key tetap bisa diputar.
- Data lagu tetap di dokumen `galery-lainnya` (ikut sinkron & cadangan). CSP mengizinkan pemutar YouTube.

## 5.56.0 — 2026-11-13

- Pola Pikir tanpa batas jumlah: di cloud setiap kartu kini satu dokumen sendiri ('pola-i-<id>'), urutan + koneksi + kartu hari ini di 'pola-urutan'. Hanya kartu yang berubah yang dikirim saat sinkron.
- Batas isian dinaikkan: teks pendek 300 karakter, teks panjang 5.000 karakter, model sampai 12 bagian × 60 karakter, nama asal-usul 150 karakter. Bukti lapangan dan catatan renungan tidak dibatasi jumlahnya (tidak ada lagi yang terbuang otomatis).
- Satu-satunya batas: ±600 KB per kartu (dokumen cloud maks 1 MB termasuk enkripsi) — bila terlampaui, simpan ditolak dengan pemberitahuan.
- Daftar kartu dimuat bertahap (60 kartu, sisanya otomatis saat digulir). Peta menampilkan maks. 150 pola pikir dengan koneksi terbanyak bila hasil saringan lebih banyak.
- Server: Firestore rules mengizinkan dokumen 'pola-urutan' dan 'pola-i-*' — wajib Publish rules.

## 5.55.0 — 2026-11-13

- Pola Pikir: fitur sematkan kembali. Tahan kartu ±½ detik atau ketuk ikon pin di halaman detail. Kartu tersemat tampil di bagian "Disematkan" paling atas (tanda pin di kartu), sisanya di "Pola pikir lain". Saat pola pikir dihapus, sematannya ikut dilepas. Sematan ikut sinkron & cadangan.

## 5.54.0 — 2026-11-13

- Galery: tab Buku Catatan dihapus (perannya diambil alih Pola Pikir). Bilah tab kini Foto, Video, Pola Pikir, Lainnya.
- Lainnya: kotak Kutipan dihapus — kutipan dicatat di Pola Pikir jenis Perumpamaan (dengan asal-usul tokoh/buku). Tinggal 7 kotak; kotak terakhir dilebarkan agar baris rapi.
- Kode Buku Catatan dibersihkan (tampilan, halaman, sinkron, cadangan). Penjaga ruang data dipindah ke galery-tab.js.
- Server: Firestore rules tidak lagi mengizinkan dokumen 'galery-catatan' — wajib Publish rules.

## 5.53.1 — 2026-11-13

- Pola Pikir: tampilan saat masih kosong disederhanakan — hanya teks ajakan dan tombol +. Pilihan 7 jenis tetap muncul setelah menekan +.

## 5.53.0 — 2026-11-13

- Galery tab Pola Pikir dirombak total, dengan 7 jenis: Prinsip, Nilai, Model, Pelajaran, Perumpamaan, Renungan, Paradoks. Setiap jenis punya warna, ikon, dan bentuk kartu sendiri.
- Kartu hari ini: 3 kartu per hari (kematangan rendah & yang lama tidak diulang didahulukan). "Sudah meresap" → muncul lagi 7, 14, 30, 60, lalu 120 hari kemudian; "Ulangi besok" → besok.
- Tampilan Kartu | Peta. Peta koneksi: titik berwarna per jenis (makin besar = makin banyak koneksi), garis putus merah = bertentangan, geser, cubit/tombol untuk zoom, ketuk titik untuk detail.
- Detail: rincian, tingkat kematangan (Renungan → Mulai yakin → Pegangan), bukti lapangan untuk Prinsip (+ Terbukti / + Tidak berhasil dengan situasi), catatan pemikiran untuk Renungan, koneksi (mendukung / turunan dari / bertentangan) yang bisa dibuka, ditambah, dan diputus dengan konfirmasi; edit dan hapus dengan konfirmasi.
- Tambah: pilih jenis dulu, isian menyesuaikan jenis. Model punya 6 bentuk gambar otomatis (siklus, tangga, rumus, timbangan, matriks 2×2, corong) dengan pratinjau langsung. Asal-usul (pengalaman, buku, tokoh, orang tua, teman) untuk semua jenis.
- Cari mencakup semua isian & catatan; saringan per jenis; urutan terbaru/terlama. Fitur sematkan dihapus dari Pola Pikir (perannya diganti Kartu hari ini & kematangan).
- Semua data ikut sinkron ke cloud (dokumen 'galery-pola') dan cadangan; rules tidak berubah.

## 5.52.0 — 2026-11-13

- Galery tab Foto & Video: pilihan tampilan **Semua | Folder** (diingat).
- Tampilan Folder: "Disematkan" di atas, lalu kartu folder dengan sampul 4 foto/video terbaru, jumlah isi, dan jumlah subfolder. Folder yang perlu izin tetap tampil dan bisa diketuk.
- Masuk folder: jejak alamat (Folder › Stivora › Liburan › …) yang bisa diketuk untuk lompat balik, tombol kembali, subfolder berjajar (geser), lalu semua media folder itu termasuk subfoldernya, tercampur per tanggal dengan "Disematkan" di atas.
- Tombol/gestur kembali di HP naik satu level folder. Cari, urutan, sematkan, dan penampil (geser hanya di dalam folder itu) tetap berlaku.
- Tab Video hanya menampilkan folder/subfolder yang berisi video.

## 5.51.0 — 2026-11-13

- Penampil foto & video baru (Galery, marker, dan tempat di peta):
  - Geser kiri/kanan untuk ganti item (urutan sama dengan daftar yang dibuka), penanda posisi "3 / 78", dan strip gambar kecil untuk lompat cepat.
  - Zoom: cubit dua jari (sampai 5×) atau ketuk dua kali (2,5×), geser saat di-zoom. Tarik ke bawah untuk menutup. Ketuk sekali = mode bersih (semua tombol & info disembunyikan).
  - Nama file & keterangan tampil penuh. Letak info menyesuaikan ukuran media: di ruang kosong bawah bila cukup, selain itu melayang di atas media. HP dimiringkan → info di samping.
  - Tombol ⓘ: info lengkap (jenis, nama file, folder/asal, tanggal & jam, ukuran piksel & file, durasi, status sematan).
- Pemutar video dengan kontrol sendiri: tombol putar besar, ketuk dua kali sisi kiri/kanan = mundur/maju 10 detik, tahan layar = 2×, bilah waktu dengan gambar pratinjau saat digeser, sebelumnya/berikutnya, kecepatan 0,5–2×, suara, ulang, jendela mengambang, putar layar, layar penuh. Tombol hilang sendiri setelah 3 detik saat video diputar.
- Media dari folder di HP tetap hanya-lihat (tanpa tombol hapus); media marker tetap bisa dihapus ke Sampah dengan konfirmasi.

## 5.50.0 — 2026-11-13

- Galery: tab Foto & Video sekarang menampilkan isi **folder di HP** yang kamu izinkan (hanya-lihat). File tidak disalin, tidak diunggah, dan tidak ikut cadangan. Subfolder ikut dipindai (maks. 20 folder, 5.000 file per folder).
- Tombol + di tab Foto & Video diganti tombol folder → halaman "Folder di HP": Hubungkan folder, Pindai ulang, Izinkan lagi, Putuskan (dengan konfirmasi; file di HP tidak dihapus).
- Daftar folder (nama, subfolder, jumlah foto & video) ikut akun lewat cloud. Setelah pasang ulang + login, folder muncul sebagai "pernah dihubungkan" — ketuk Hubungkan dan pilih foldernya lagi (izin Chrome hanya tersimpan di HP).
- Keterangan otomatis bila isi folder berubah: file baru/hilang, subfolder tidak ditemukan, folder yang dipilih berbeda dari yang dulu, izin perlu diberikan lagi, atau folder tidak bisa dibaca.
- Media dari folder diberi tanda ikon folder; bisa disematkan (tahan atau lewat penampil), dicari berdasarkan nama file/subfolder. Di penampil tidak ada tombol hapus.
- Foto & video Galery lama (yang dulu ditambah lewat tombol +) dipindah ke Sampah sekali saja.
- Perbaikan: penampil media kini menerima id yang mengandung titik dua.
- Server: Firestore rules mengizinkan dokumen 'galery-folder' — wajib Publish rules.

## 5.49.0 — 2026-11-13

- Galery: tab Lainnya aktif dengan 8 kotak koleksi — Playlist Lagu, Playlist Film, Readlist Buku, Tempat Favorit, Channel Favorit, Tokoh Favorit, Koleksi Link, Kutipan. Tiap kotak menampilkan jumlah isinya.
- Ketuk kotak untuk membuka daftarnya: cari, tambah (+), ketuk item untuk mengedit, hapus lewat konfirmasi, Batal dengan perubahan meminta konfirmasi. Maksimal 200 item per koleksi.
- Isian menyesuaikan koleksi (mis. Judul lagu + Penyanyi, Judul buku + Penulis, Nama tempat + Lokasi). Semua punya catatan opsional.
- Status: Film (Ingin/Sudah ditonton), Buku (Ingin/Sedang dibaca/Selesai), Tempat (Ingin/Sudah dikunjungi) — bisa disaring per status.
- Link dibuka di tab baru lewat tombol di kanan item; alamat tanpa https:// dilengkapi otomatis. Koleksi Link wajib berisi alamat.
- Kutipan tampil sebagai kartu kutipan bergaris samping.
- Data ikut sinkron ke cloud (dokumen 'galery-lainnya', sudah diizinkan rules 5.47.0) dan ikut cadangan.

## 5.48.0 — 2026-11-13

- Galery: tab Buku Catatan aktif. Catatan bebas berisi judul (boleh kosong, maks 100 karakter), isi (maks 5.000 karakter), dan warna kartu (Polos, Kuning, Hijau, Biru, Ungu, Merah muda). Maksimal 100 catatan.
- Tampilan kartu bertumpuk 2–4 kolom; isi panjang dipotong 8 baris. Urutan berdasarkan waktu terakhir diubah (terbaru/terlama), cari judul/isi.
- Ketuk kartu untuk mengedit; hapus selalu lewat konfirmasi; Batal saat ada perubahan meminta konfirmasi. Tahan kartu ±½ detik untuk menyematkan.
- Penjaga ruang: Buku Catatan dan Pola Pikir menolak simpan bila total datanya melewati ±600 KB, agar dokumen cloud (maks 1 MB, termasuk enkripsi) tidak gagal tersimpan.
- Data ikut sinkron ke cloud (dokumen 'galery-catatan', sudah diizinkan rules 5.47.0) dan ikut cadangan.

## 5.47.0 — 2026-11-13

- Galery: tab Pola Pikir aktif. Tulis pola pikir sebagai kartu berisi kategori (Prinsip, Keyakinan, Pelajaran, Afirmasi, Lainnya), judul (maks 80 karakter), dan isi (maks 2.000 karakter). Maksimal 300 kartu.
- Saring per kategori lewat chip di atas daftar, cari judul/isi, urutkan terbaru/terlama. Ketuk kartu untuk mengedit; hapus selalu lewat konfirmasi; Batal saat ada perubahan meminta konfirmasi.
- Tahan kartu ±½ detik untuk menyematkan; kartu tersemat tampil paling atas.
- Data Pola Pikir ikut sinkron ke cloud (dokumen 'galery-pola') dan ikut cadangan.
- Server: Firestore rules mengizinkan dokumen 'galery-pola', 'galery-catatan', dan 'galery-lainnya' (dua terakhir disiapkan untuk tab berikutnya) — wajib Publish rules.

## 5.46.0 — 2026-11-13

- Galery: tab Video aktif. Tampilan sama dengan tab Foto — kisi per tanggal, bagian "Disematkan" paling atas, cari keterangan, urutan terbaru/terlama, tombol + untuk menambah banyak video sekaligus.
- Batas ukuran video mengikuti MAX_VIDEO_MB di config.js (bawaan 100 MB); video yang terlalu besar dilewati dengan pemberitahuan.
- Tahan video ±½ detik atau ketuk pin di penampil untuk menyematkan. Video marker peta tidak ditampilkan di tab ini.

## 5.45.0 — 2026-11-13

- Galery: bilah tab baru di bawah info — Foto, Video, Pola Pikir, Buku Catatan, Lainnya. Bilah tab menempel di atas saat digulir; tab terakhir yang dibuka diingat.
- Tab Foto: kisi foto (3–6 kolom sesuai lebar layar), dikelompokkan per tanggal (Hari ini, Kemarin, lalu tanggal lengkap), pencarian keterangan, urutan terbaru/terlama, tombol + untuk menambah banyak foto sekaligus.
- Sematkan foto: tahan foto ±½ detik atau ketuk tombol pin di penampil. Foto tersemat tampil paling atas di bagian "Disematkan". Ikut sinkron ke cloud dan cadangan.
- Foto yang terpasang di marker peta tidak ditampilkan di tab Foto.
- Tab Video, Pola Pikir, Buku Catatan, dan Lainnya masih disiapkan.

## 5.44.0 — 2026-11-12
- **Ikon badge diperbanyak jadi 126 ikon garis dalam 15 bidang**: Umum, Teknologi, Desain & Seni, Bisnis & Keuangan, Pendidikan & Sains, Bahasa & Komunikasi, Olahraga, Musik, Game & Hiburan, Kesehatan, Agama & Spiritual, Kuliner, Travel & Alam, Otomotif & Teknik, Sosial & Keluarga. Warnanya tetap mengikuti warna kategori badge.
- **Pilihan emoji**: 183 emoji per bidang, plus isian untuk mengetik/menempel emoji apa saja.
- Pemilih ikon baru: tab **Ikon / Emoji**, pilihan **bidang** (bisa digeser), dan **kotak cari** (nama ikon atau bidang).
- Data ikon dipisah ke file baru `js/data/ikon-badge.js`. Badge lama tetap memakai ikonnya.

## 5.43.1 — 2026-11-12
- Galery: **badge dan bio yang belum diisi tidak ditampilkan sama sekali** (kapsul "+ Tambah badge" dan kotak "Tulis bio…" dihapus). Begitu diisi lewat ikon pensil, langsung muncul; kalau dikosongkan lagi, hilang lagi.

## 5.43.0 — 2026-11-12
- **Galery: badge** di bawah kartu Usia · Berat · Tinggi.
  - Berkategori dengan warna sendiri (bawaan: Skill ungu, Hobi hijau, Lainnya oranye; nama & warna bisa diatur, maks. 6 kategori), legenda kategori tampil di bawahnya.
  - Ikon kecil opsional (16 pilihan) di depan teks. Maks. 30 badge, 24 karakter.
  - Lebih dari 2 baris → sisanya diringkas jadi "+N" (ketuk untuk melihat semua / "Ringkas").
  - Urutan bisa dinaikkan/diturunkan; hapus badge & hapus kategori dengan konfirmasi (badge di kategori yang dihapus pindah ke kategori lain).
- **Bio** di bawah badge: kotak dengan garis aksen kiri, maks. 500 karakter, boleh baris baru, link https bisa diketuk; lebih dari 3 baris → "Selengkapnya".
- **Belum diisi**: kapsul putus-putus "+ Tambah badge" dan kotak "Tulis bio singkat tentang dirimu" — keduanya langsung membuka bagian edit-nya.
- Halaman **Banner & profil Galery** mendapat bagian *Badge*, *Kategori badge*, dan *Bio*.
- Ikut sinkron cloud dan cadangan (dokumen `galery-banner` yang sama) — server tidak berubah.

## 5.42.0 — 2026-11-12
- **Galery: kartu Usia · Berat · Tinggi** di bawah banner sebelah kiri; batas bawahnya sejajar batas bawah lingkaran profil. Tiga kartu kecil berwarna tema (latar kartu, angka teks utama, label aksen) dengan satuan **th / kg / cm**; belum diisi → "–".
- **Usia dihitung otomatis** dari tanggal lahir (naik sendiri saat ulang tahun). Berat & tinggi diisi manual (boleh 1 desimal, mis. 65,5; batas 1–500 kg dan 30–300 cm, isian tidak sah ditolak dengan pesan).
- Halaman **Banner & profil Galery** mendapat bagian **Usia, berat & tinggi** (tanggal lahir, berat badan, tinggi badan); pratinjau ikut menampilkan kartunya.
- Ikut sinkron cloud dan cadangan (dokumen `galery-banner` yang sama) — server tidak berubah.

## 5.41.0 — 2026-11-12
- **Galery: sapaan di kiri atas banner**, sejajar ikon pensil — label kecil menempel di tepi kiri (sisi kanan membulat), warna ikut tema. Berganti otomatis: "Hi, Selamat pagi!" (05.00–10.59), "siang" (11.00–14.59), "sore" (15.00–17.59), "malam" (18.00–04.59).
- **Huruf seperti referensi**: sapaan memakai **Comfortaa**, nama memakai **Archivo Black**. File huruf disimpan di `assets/font/` (diperkecil ke huruf Latin, WOFF) supaya tetap jalan tanpa internet; lisensi SIL OFL 1.1 (`assets/font/LISENSI.txt`).
- Di HP sangat sempit (<360 px) ukuran sapaan & nama sedikit diperkecil supaya tidak bertumpuk.

## 5.40.0 — 2026-11-12
- **Galery: nama, jam, dan tanggal di kiri banner** (putih, bayangan halus), tersusun:
  - **Nama** besar dan tebal (default "Nama kamu", maks. 40 karakter; kalau terlalu panjang hurufnya mengecil sampai 60%, lalu dipotong "…").
  - **Jam** 12 jam yang berjalan sendiri, mis. "Pukul 09:41 pagi". Keterangan: dini hari 00.00–04.59, pagi 05.00–10.59, siang 11.00–14.59, sore 15.00–17.59, malam 18.00–23.59.
  - **Tanggal**, mis. "Senin, 26 Oktober 2026".
  - Semua teks di dalam banner; baris tanggal berakhir dekat garis bawah banner dan tidak menabrak lingkaran profil maupun pensil.
- Halaman **Banner & profil Galery** mendapat isian **Nama** (langsung tersimpan sambil mengetik; pratinjau ikut berubah).
- Tulisan "Belum ada banner" dihapus; banner kosong kini berwarna tema (ungu) supaya teks putih tetap terbaca.
- Nama ikut sinkron cloud dan cadangan (dokumen `galery-banner` yang sama) — server tidak berubah.

## 5.39.1 — 2026-11-12
- **Perbaikan: logo Stivora di atas tidak lagi muncul sekilas** saat membuka aplikasi di halaman Impian atau Galery. Penyebabnya: sejak 5.33.0 skrip fitur menunggu data siap dari IndexedDB (±0,1–0,4 detik), dan selama itu halaman belum ditandai sehingga header belum disembunyikan.
  - Header kini disembunyikan sejak awal sampai halaman diketahui, dan halaman ditandai segera (`js/core/dom.js`) sebelum data selesai dimuat. Judul halaman Pengaturan juga langsung benar.

## 5.39.0 — 2026-11-12
- **Galery: lingkaran foto profil** di tepi bawah banner, sisi kanan (menjorok 20 px di HP, 24 px di tablet/laptop). Titik tengahnya tepat di garis bawah banner: setengah di banner, setengah di bawahnya. Ukuran 96 px (HP) / 128 px (tablet/laptop), berbingkai warna latar.
- Belum ada foto → ikon orang. Foto profil Galery terpisah dari foto profil tab Impian.
- Ikon pensil (atau ketuk lingkaran profil) membuka halaman **Banner & profil Galery**: pratinjau gabungan, lalu bagian *Banner* dan *Foto profil* masing-masing dengan Dari galeri / Dari link / Hapus (dengan konfirmasi). Foto profil dari galeri dipotong persegi (maks. 320 px).
- Tulisan "Belum ada banner" digeser agar tidak tertutup lingkaran profil.
- Ikut sinkron cloud (dokumen `galery-banner` yang sama) dan cadangan — server tidak berubah.

## 5.38.1 — 2026-11-12
- **Ukuran tombol pensil diseragamkan 36 px** di seluruh aplikasi: banner Galery (sebelumnya 40 px di HP, 44 px di tablet/laptop) dan pensil di samping profil tab Impian (sebelumnya 40 px). Kini sama dengan pensil peta, Sumberdaya, Progress, dan Keuangan.

## 5.38.0 — 2026-11-12
- **Galery: banner 3:1** di bagian atas, selebar layar di HP, tablet, dan laptop. Kalau belum ada gambar, tampil "Belum ada banner".
- **Ikon pensil** di pojok kanan atas banner membuka halaman *Banner Galery*: pratinjau, **Dari galeri** (dipotong 3:1 di tengah, diperkecil maks. 1500×500), **Dari link** (https), dan **Hapus banner** (dengan konfirmasi).
- Ikut sinkron cloud (dokumen `galery-banner`, ikut terenkripsi bila E2E aktif) dan file cadangan.
- **Server berubah**: `firestore.rules` menerima dokumen `galery-banner` → Publish ulang.

## 5.37.0 — 2026-11-12
- **Halaman Galery dikosongkan untuk tampilan baru**: header (Stivora + judul), "Papan Visi", grid media, dan tombol + dihapus. Yang tersisa hanya navigasi.
- **Kode lama dihapus (bukan disembunyikan)**:
  - Tampilan Galery lama (`js/features/galery.js`) dan form tambah media/impian (`js/features/form.js`).
  - Fitur impian lama (`js/features/impian.js`): daftar impian, kategori, detail & langkah, form, sinkron koleksi `dreams`, impian di Sampah, tautan media ke impian, serta CSS-nya.
  - Sisa data impian lama di HP dibuang otomatis; dokumen `dreams` lama di cloud dibersihkan sekali saat sinkron.
- **Mesin media dipertahankan** di `js/features/media-lihat.js` (penampil foto/video/audio/dokumen, jenis file, perkecil foto) + penyimpanan HP, sinkron R2, cadangan, dan Sampah media. Dipakai marker & tempat di peta.
- Cadangan: file baru tanpa bagian impian lama; file cadangan lama tetap bisa diimpor (bagian impian lamanya diabaikan).
- Pengingat cadangan & ganti akun kini memeriksa semua data (hexagon, peta jalan, keuangan, peta, media), bukan hanya impian lama.

## 5.36.0 — 2026-11-12
- **Hexagon impian: judul baru di posisi pertama — "Dendam karena pengalaman buruk apa?"** (ikon api). Muncul di halaman detail hexagon dan halaman edit impian, di atas Cara mencapai. Batasnya sama: 100 poin, masing-masing 300 karakter.
- Impian lama otomatis menampilkan bagian ini sebagai "Belum diisi." sampai diisi lewat pensil.
- Ikut sinkron cloud (per hexagon), cadangan, dan terjemahan Aceh.

## 5.35.0 — 2026-11-12
- **Peta jalan: maksimal 100 fase** (sebelumnya 20). Batas lain tetap: 100 langkah per fase, nama fase 40, keterangan 80, teks langkah 160 karakter, tahun sampai ke-60.
- **Pita garis waktu** di halaman edit tetap tampilan lama; kalau fase lebih dari 20, garis tiap fase otomatis menipis (10 px → 5 px) supaya pita tidak terlalu tinggi (100 fase ±700 px).
- **Sinkron cloud per fase**: setiap fase jadi dokumen Firestore sendiri (`impian-f-<id>`) + `impian-progress-urutan` (urutan fase & tanggal mulai). 100 fase penuh (±2,2 juta karakter) aman dari batas 1 MB per dokumen; hanya fase yang berubah yang dikirim; edit fase berbeda di dua HP tidak saling menimpa.
- Data lama dipindah otomatis: dokumen `impian-progress` dibaca, dikirim ulang per fase, lalu dihapus dari cloud.
- Sistem pecahan sinkron hexagon & fase kini memakai satu mekanisme yang sama.
- **Server berubah**: `firestore.rules` → Publish ulang.

## 5.34.0 — 2026-11-12
- **Hexagon impian maksimal 200** (sebelumnya 60). Nama impian **50** karakter, satuan **100** karakter, poin di Cara mencapai / Sumberdaya / Dukungan **100 poin per bagian** (masing-masing 300 karakter).
- **Sinkron cloud per hexagon**: setiap hexagon disimpan sebagai dokumen Firestore sendiri (`impian-h-<id>`) + urutannya (`impian-urutan`), jadi 200 hexagon berisi penuh tidak melewati batas 1 MB per dokumen. Hanya hexagon yang berubah yang dikirim (lebih hemat kuota). Mengedit hexagon berbeda di dua HP sekaligus tidak saling menimpa.
- Data lama dipindah otomatis: dokumen lama `impian-daftar` dibaca, dikirim ulang dalam format baru, lalu dihapus dari cloud. Kirim ke cloud dipecah per batch supaya tidak melewati batas Firestore.
- Tampilan: satuan yang panjang di hexagon dipotong rapi (maks. 2 baris), di daftar edit 1 baris.
- Pesan "Perubahan besar disimpan langsung" hanya muncul sekali per sesi; jurnal lama kunci yang sama dibuang supaya tidak menimpa data baru.
- **Server berubah**: `firestore.rules` → Publish ulang.

## 5.33.0 — 2026-11-11
- **Penyimpanan data pindah ke IndexedDB** — tidak lagi dibatasi ±5 MB localStorage, jadi aman untuk data yang terus bertambah (impian, keuangan, peta, peristiwa).
- **Sistem jurnal anti-hilang**: setiap perubahan langsung ditulis dulu ke jurnal kecil di localStorage, lalu disimpan ke IndexedDB; jurnal dihapus setelah IndexedDB benar-benar tersimpan. Kalau aplikasi tertutup/HP mati tepat saat menyimpan, sisa jurnal diputar ulang saat aplikasi dibuka lagi — perubahan terakhir tidak hilang.
- **Pindah otomatis sekali** saat pertama dibuka: data lama disalin ke IndexedDB, dibaca ulang untuk dicek, disimpan juga salinan cadangannya, baru dihapus dari localStorage. Kalau ada yang gagal, data lama tidak disentuh.
- Meminta penyimpanan **persisten** ke browser supaya data tidak dibersihkan otomatis saat memori HP penuh.
- Dua tab/jendela Stivora yang terbuka bersamaan tetap sinkron.
- Kalau IndexedDB tidak tersedia, aplikasi otomatis tetap memakai localStorage seperti sebelumnya.
- Pengaturan kecil (tema, bahasa, kunci sidik jari, catatan galat, waktu sinkron) tetap di localStorage supaya terbaca seketika.
- Skrip fitur kini dimuat lewat `js/core/muat.js` setelah data siap. Sinkron cloud dan cadangan tidak berubah.

## 5.32.1 — 2026-11-09
- Keuangan · Riwayat: pilihan **"Semua dompet" tidak terpotong lagi** di HP (tinggi kotak kini mengikuti ukuran huruf). Kolom cari dan pilihan dompet ditata bertumpuk selebar kartu di HP; petunjuk cari dipersingkat jadi "Cari transaksi".

## 5.32.0 — 2026-11-09
- **Tab Keuangan** (tulisan "Keuangan" dihapus). Semua angka dihitung dari transaksi:
  - **Saldo total** gabungan semua dompet + saldo per dompet; tombol 👁 sembunyikan angka; pensil → Pengaturan keuangan.
  - Tombol cepat **Pemasukan / Pengeluaran / Pindah dana**.
  - **Pengingat transaksi berulang** (gaji, langganan, cicilan): tercatat hanya setelah ketuk **Catat**, atau **Lewati** (konfirmasi).
  - **Ringkasan bulan** (‹ ›): masuk, keluar, selisih, porsi per kategori, grafik 6 bulan; **Laporan** 12 bulan + per kategori + per bulan.
  - **Anggaran** per kategori (kuning ≥80%, merah bila lewat).
  - **Dana darurat** dan **Tabungan impian** sebagai **kantong terpisah** (Setor mengurangi dompet, Tarik menambah). Target darurat otomatis 6× rata-rata pengeluaran atau manual. Tabungan bisa dihubungkan ke hexagon impian (nilai hexagon mengikuti saldo, dalam Rp).
  - **Hutang**: Hutangku / Hutang orang ke aku, jatuh tempo (merah bila lewat), pembayaran sebagian, Lunasi sisa; terpisah dari saldo.
  - **Riwayat** per tanggal dengan cari, saring jenis & dompet; **setiap transaksi bisa diketuk untuk diedit atau dihapus** (konfirmasi).
  - Pengaturan: dompet (saldo awal), kategori + emoji + anggaran, target darurat, tabungan impian, transaksi berulang. Semua hapus memakai konfirmasi; dompet yang masih dipakai transaksi tidak bisa dihapus.
- **Sinkron cloud, enkripsi end-to-end, dan file cadangan** langsung mencakup keuangan. Transaksi disimpan per tahun (`keuangan-tx-TAHUN`) agar aman dari batas ukuran dokumen.
- Server: `firestore.rules` diperbarui untuk dokumen keuangan — **Publish ulang Rules**.

## 5.31.1 — 2026-11-09
- **Sinkron cloud untuk semua data tab Impian** (sebelumnya hanya tersimpan di perangkat): profil & pita, daftar impian (hexagon), impian utama & Hari H, peta jalan, keyakinan, sumberdaya waktu (blok, tampilan, keterangan), dan catatan peristiwa.
  - Disimpan di Firestore `users/{uid}/data/{nama}`, satu dokumen per jenis data; perubahan terbaru yang menang.
  - Ikut **enkripsi end-to-end** bila aktif, ikut dikirim ulang saat enkripsi dinyalakan/dimatikan, dan ikut **Pulihkan dari cloud**.
  - Sinkron antar perangkat memakai pengaturan yang sama seperti impian dan peta.
- **File cadangan (ekspor/impor) kini membawa semua data tab Impian.** Cadangan lama tanpa data ini tidak mengubah tab Impian.
- Server: `firebase/firestore.rules` diperbarui (izin `users/{uid}/data/{nama}`) — **wajib Publish ulang di Firebase Console**.

## 5.31.0 — 2026-11-09
- **Tab Progress: kartu "Kenapa aku yakin mampu"** di atas peta jalan:
  - Pernyataan keyakinan (tampil besar seperti kutipan, sampai 5000 karakter).
  - Tiga pilar: **Bukti**, **Bekal**, **Cara berpikir** (masing-masing daftar poin, 0/300 per poin). Pilar kosong tidak ditampilkan; bertumpuk di HP, menyamping di layar lebar.
  - **Bukti otomatis** "Sejauh ini: N langkah selesai · N fase tuntas · N impian tercapai" dari data nyata.
  - Kartu ajakan bila belum diisi.
- **Ikon pensil dipindah** dari kartu peta jalan ke kartu keyakinan. Halaman edit berganti nama "Edit progress" dengan bagian Keyakinan di atas Tujuan/Pratinjau/Fase; satu Batal/Simpan untuk semuanya. Hapus poin keyakinan memakai konfirmasi.
- Terjemahan Aceh untuk semua teks baru.

## 5.30.1 — 2026-11-09
- Impian utama: batas **nama dan alasan jadi 5000 karakter** (sebelumnya 60 dan 160). Kolom nama kini kotak teks yang memanjang otomatis; baris baru ikut tampil.
- Kartu impian utama meringkas nama (3 baris) dan alasan (4 baris) dengan tombol **Selengkapnya / Ringkas** bila teksnya panjang.
- Perbaikan: ikon bintang saat impian utama belum punya foto tampil kecil, miring, dan di pojok — sekarang di tengah.
- Perbaikan: titik kecil di cincin progres saat 0% tidak tampil lagi.

## 5.30.0 — 2026-11-09
- **Impian utama** di tab Impian (di bawah pita profil, di atas hexagon):
  - Kartu kaca dengan lencana "★ Impian utama", foto di dalam **cincin progres**, nama, dan alasan.
  - **Hitung mundur Hari H** dalam kotak tahun · bulan · hari (atau "Hari ini Hari H!" / "Hari H sudah lewat").
  - Progres = jumlah impian (hexagon) yang sudah 100%, mis. "1 dari 3 · 33%".
  - Judul "Bagian dari impian utama" di atas grid hexagon.
  - Bila belum diisi: kartu ajakan "Belum ditentukan".
- Pengaturannya lewat **pensil di samping profil** → bagian baru "Impian utama": foto (galeri / link, hapus dengan konfirmasi), nama (0/60), alasan (0/160), Hari H (Atur / ubah / hapus dengan konfirmasi). Tersimpan otomatis.
- **Hari H kini milik Impian utama** dan dipakai tab Progress. Di Edit peta jalan, Hari H terkunci ("Ubah di Impian utama"). Hari H lama dari peta jalan otomatis dipindahkan.
- Terjemahan Aceh untuk semua teks baru.

## 5.29.2 — 2026-11-09
- **Semua tombol hapus kini memakai konfirmasi** (agar tidak terhapus karena kepencet):
  - Edit peta jalan: hapus langkah di fase.
  - Edit impian: hapus poin (cara mencapai / sumberdaya / dukungan).
  - Detail impian: hapus langkah kecil (sebelumnya langsung terhapus permanen).
  - Edit perjalanan: keluarkan titik dari rute.
  - Marker: buang foto/video yang baru dipilih.
- Terjemahan Aceh untuk teks konfirmasi baru.

## 5.29.1 — 2026-11-09
- Tab Progress: simpul fase yang sedang berjalan kini memakai **ikon lokasi** (sebelumnya angka). Fase selesai tetap ikon centang, fase terkunci tetap ikon gembok.

## 5.29.0 — 2026-11-09
- **Halaman Edit peta jalan** (ikon pensil di tab Progress):
  - **Tujuan**: tanggal mulai (patokan "Tahun 1") dan Hari H, dengan pemilih Tanggal · Bulan · Tahun (ketik atau −/+); tampil "Rentang N tahun · sisa waktu".
  - **Pratinjau**: tiap fase digambar sebagai pita berwarna per tahun, dengan garis kuning penanda Hari H.
  - **Fase** (akordeon, satu terbuka): nama (0/40), keterangan singkat (0/80), tahun ke- dari/sampai (−/+), daftar langkah, naik/turun, hapus fase (konfirmasi).
  - **Langkah**: centang selesai (tanggal otomatis hari ini, bisa diubah manual lewat label tanggal hijau), teks (0/160), naik/turun, hapus.
  - Peringatan: fase melewati Hari H, tahun bertabrakan antar-fase, fase tanpa langkah.
  - Batas: 20 fase, 100 langkah per fase.
  - "Hapus semua peta jalan" (konfirmasi), Batal (konfirmasi bila ada perubahan), Simpan.
- Terjemahan Aceh untuk semua teks baru.

## 5.28.0 — 2026-11-09
- **Impian · tab Progress**: tulisan "Progress" dihapus, diganti **peta jalan bertahap** menuju Hari H.
  - Bar total di atas (mis. "6 dari 12 langkah · 50%").
  - Tiap fase: simpul (nomor / centang hijau bila selesai / gembok bila terkunci), tahun saran, bar progres, "N dari M langkah".
  - Fase aktif: label "Kamu di sini", status jadwal (Sesuai jadwal / Tertinggal / Lebih awal / Lewat jadwal), dan "Berikutnya: …".
  - Fase berikutnya terkunci sampai fase sebelumnya selesai; fase selesai hijau dengan tanggal selesai.
  - Ketuk kartu fase untuk melihat daftar langkahnya (tanda centang + tanggal).
  - Hari H dengan hitung mundur (mis. "6 thn 11 bln lagi").
  - Ikon pensil di kanan atas (halaman edit menyusul). Data awal kosong.
- Perbaikan: penomoran poin di Edit impian tidak lagi error karena penghitung karakter.
- File baru: `js/features/impian-progress.js`.

## 5.27.1 — 2026-11-09
- Keterangan di Edit sumberdaya waktu: batas **5000 karakter** (sebelumnya 1000).
- **Penghitung karakter "jumlah/batas"** (mis. 0/5000) kini otomatis tampil di bawah **semua kolom teks yang punya batas**: Impian baru (judul 0/120, alasan 0/1000), keterangan foto Galery (0/100), langkah kecil (0/160), marker (nama 0/60, catatan 0/2000), area (0/60, 0/2000), perjalanan (0/60), Edit impian (nama pita 0/40, nama 0/40, satuan 0/16, tiap poin 0/300), Edit sumberdaya waktu (keterangan 0/5000, nama blok 0/30, kalimat 0/120). Merah saat penuh. Tambah peristiwa tetap memakai penghitungnya sendiri (0/2000).
- Tidak diberi penghitung: kolom cari, link, tahun/angka, dan kolom emoji.
- File baru: `js/core/hitung.js` (masuk cache service worker).

## 5.27.0 — 2026-11-09
- **Halaman Edit sumberdaya waktu** (ikon pensil di samping "1. Sumberdaya waktu"), kartu kaca dari atas ke bawah:
  - **Pratinjau**: pita 24 jam yang langsung berubah saat blok diedit + "Terpakai …j dari 24j · bebas …" (merah bila bertabrakan / lebih dari 24 jam).
  - **Keterangan**: teks bebas (maks 1000) — tampil di halaman ikon ?.
  - **Blok waktu**: daftar ringkas (warna, nama, jam, durasi); ketuk untuk membuka isian (satu per satu): nama, warna (8 pilihan + warna bebas), jam mulai, durasi jam + menit, **kalimat saat berjalan** & **kalimat saat menunggu** (kosong = kalimat bawaan), **Hapus blok** (konfirmasi). **Tambah blok** otomatis di waktu bebas pertama (maks 8 blok). **Kembalikan ke bawaan** (konfirmasi).
  - **Tampilan**: saklar Jam analog / Pita hari ini / Buku mini.
  - Tombol **Batal / Simpan** menempel di dasar layar. Simpan ditolak bila blok bertabrakan atau total > 24 jam. Batal dengan perubahan → konfirmasi "Buang perubahan?".
- Tab Sumberdaya memakai kalimat buatan sendiri bila diisi, dan mengikuti saklar tampilan.
- Data lokal baru: `stivora.sumberdaya.tampil`; blok kini menyimpan `k1`/`k2` (kalimat).

## 5.26.0 — 2026-11-09
- Tab Sumberdaya — penyajian pembagian waktu baru (gabungan konsep 1 + 2), di bawah jam analog:
  - **Pita hari ini**: batang 24 jam terbagi sesuai blok (warna masing-masing), **penanda "sekarang"** bergerak (ikon bulan saat malam, matahari saat siang), skala 00·06·12·18·24, keterangan warna, dan jam + bagian hari (pagi/siang/sore/malam).
  - **Satu buku besar** hanya untuk blok yang **sedang berjalan** (bila tidak ada blok berjalan: blok yang paling dekat dimulai). Berpindah otomatis saat blok berganti.
  - **Buku mini** 2 kolom untuk blok lainnya: nama, hitung mundur jam & menit "Mulai dalam", rentang jam, bar tipis; diurutkan dari yang paling dekat.
- Isi tab Sumberdaya dibatasi lebar maks 620px agar tidak melebar di layar besar.

## 5.25.2 — 2026-11-08
- Ikon **?** di samping "1. Sumberdaya waktu" kini membuka **halaman sendiri** ("Sumberdaya waktu") berisi keterangan, bukan kotak yang melebar di kartu jam. Kotak keterangan lama beserta kodenya dihapus.

## 5.25.1 — 2026-11-08
- Tab Sumberdaya: **ikon ?** di samping judul "1. Sumberdaya waktu". Ketuk = kotak keterangan muncul di bawah judul; ketuk lagi / ketuk di luar = tertutup. Isinya diambil dari `stivora.sumberdaya.info` (nanti diisi lewat ikon pensil); bila kosong tertulis "Belum ada keterangan. Nanti bisa diisi lewat ikon pensil."

## 5.25.0 — 2026-11-08
- Tab Sumberdaya: judul **"1. Sumberdaya waktu"** di atas jam analog, dengan **ikon pensil** di pojok kanan (halaman pengaturannya dibuat nanti; sementara menampilkan pesan).
- **Jam 24 jam berisi blok waktu dihapus** beserta seluruh kodenya: lingkaran/busur/teks melengkung/bar progres luar/jam digital, pensil lama, halaman "Pembagian waktu", CSS, dan teks terjemahannya.
- Data blok waktu (`stivora.sumberdaya.waktu`, bawaan 3 × 8 jam) tetap dipakai oleh 3 kotak buku hitung mundur.

## 5.24.1 — 2026-11-08
- Tab Sumberdaya: **jam analog diperkecil** (250px → maks 176px) dan **3 kotak buku diperkecil** (angka 66px → maks 42px, pita, teks, jarak & bar lebih ringkas). Tinggi kartu jam analog ±286px → ±202px, tiap kotak buku ±360px → ±230px.

## 5.24.0 — 2026-11-08
- **Kotak buku hitung mundur** di bawah jam analog (tab Sumberdaya) — 1 kotak per blok waktu (ikut berubah bila blok diedit lewat pensil):
  - Buku terbuka: halaman kiri **JAM**, halaman kanan **MENIT** (angka besar), **pita detik** di tengah atas; semua menghitung mundur tiap detik.
  - Blok **sedang berjalan** → hitung mundur ke jam selesai; **belum berjalan** → "Dimulai dalam" (hitung mundur ke jam mulai).
  - Keterangan: "▶ Mulai" (jam mulai) & "🏁 Selesai" (jam selesai); kalimat penyemangat sesuai blok & status; **bar progres** blok + "% berjalan".
  - Warna mengikuti tema aplikasi (kertas bernuansa tema, angka & pita warna aksen), terang & gelap.

## 5.23.0 — 2026-11-08
- **Jam analog klasik** di atas jam 24 jam (tab Sumberdaya), dalam kartu kaca: angka 1–12, garis menit & penanda 5 menit, jarum jam & menit, **jarum detik merah berdetak** tiap detik, dan **hari & tanggal** di muka jam (mis. "Min, 8 Nov"). Bingkai mengikuti warna tema; terang & gelap.

## 5.22.0 — 2026-11-08
- Jam 24 jam (tab Sumberdaya): **info tiap blok kini di dalam busur warnanya** — teks melengkung mengikuti busur: nama, jam mulai–selesai, dan durasi (mis. "Istirahat · 22:00–06:00 · 8j"). Teks di bagian bawah lingkaran otomatis dibalik agar tidak terbaca terbalik. Busur dipertebal.
  - Blok cukup panjang: nama + jam & durasi · agak pendek: nama saja · sangat pendek: kosong (detailnya tampil di tengah saat blok berjalan).
- **Bar progres di luar busur** (mengelilingi lingkaran): tiap blok punya bar sendiri yang terisi sesuai waktu yang sudah lewat hari ini (selesai = penuh, berjalan = sebagian, belum = kosong).
- **Kartu-kartu di bawah jam dihapus** — semua info kini ada di jam.

## 5.21.1 — 2026-11-08
- Jam 24 jam (tab Sumberdaya): kini menampilkan **semua 24 angka jam** (00–23; 00/06/12/18 lebih tebal) di sekeliling lingkaran.
- **Jarum bergerak tiap detik**: jarum jam 24-jam bergeser halus, ditambah **jarum detik** merah tipis yang berputar; jam digital di tengah menampilkan **detik** (mis. 20:10:45).
- Angka diberi bingkai warna latar sehingga tetap terbaca saat dilewati jarum. Pembaruan per detik hanya berjalan saat tab Sumberdaya tampil (hemat baterai).

## 5.21.0 — 2026-11-08
- **Tab Sumberdaya**: judul "Sumberdaya" dihapus, diganti **jam 24 jam** (kartu kaca):
  - Lingkaran 24 jam dengan busur warna per blok waktu, penanda tiap jam (00 · 06 · 12 · 18), dan **jarum jam sekarang**.
  - Tengah lingkaran: **jam digital** (HH:MM), blok yang sedang berjalan, dan **sisa waktunya**. Diperbarui otomatis.
  - Di bawahnya **kartu pembagian waktu**: warna, nama, rentang jam, durasi; blok yang berjalan disorot + bar progres + "Sedang berjalan".
  - Bawaan: Kerja cari makan 06:00–14:00 (8j), Kerja cari modal bisnis 14:00–22:00 (8j), Istirahat 22:00–06:00 (8j).
- **Ikon pensil → halaman Pembagian waktu**: ubah nama, warna (8 pilihan cepat + bebas), jam mulai, durasi (jam + 0/15/30/45 menit); tambah blok (maks 8); hapus blok (dengan konfirmasi); "Kembalikan ke bawaan" (dengan konfirmasi). Dicek: total ≤ 24 jam dan blok tidak boleh bertabrakan; sisa waktu ditampilkan sebagai "Waktu bebas".
- File baru: `js/features/sumberdaya-waktu.js` (masuk cache service worker). Data lokal: `stivora.sumberdaya.waktu`.

## 5.20.1 — 2026-11-08
- Header atas (tulisan **Stivora** di Pengaturan dan halaman lain di HP): ikon bintang ungu diganti **logo aplikasi** (`assets/ikon/ikon-192.png`).

## 5.20.0 — 2026-11-08
- **Form Tambah/Edit impian**: 3 isian baru berbentuk **daftar poin** (tambah poin satu per satu, hapus dengan ×, maks 30 poin × 300 karakter):
  **Cara mencapai**, **Sumberdaya yang diperlukan**, **Dukungan dari orang lain**. Poin kosong diabaikan saat disimpan.
- **Hexagon di tab Impian bisa diketuk**: ketuk **1×** → lapisan transparan dengan tulisan **"Buka"** di atas hexagon; ketuk **1× lagi** → halaman detail. Lapisan hilang bila mengetuk di luar hexagon atau berpindah ke hexagon lain.
- **Halaman detail impian**: judul = nama impian; isi **hanya 3 bagian** (cara, sumberdaya, dukungan) berupa daftar bernomor; bagian kosong bertuliskan "Belum diisi.".

## 5.19.2 — 2026-11-08
- **Ikon aplikasi baru** (globe + jalan berbentuk S menuju bintang & gunung) menggantikan ikon lama di semua ukuran: `ikon-192.png`, `ikon-512.png` (latar transparan), `ikon-maskable-512.png` (latar putih, area aman 80% untuk Android), `apple-touch-icon.png` (latar putih untuk iPhone).
- Ikon tab browser (favicon) kini memakai ikon aplikasi baru (sebelumnya bintang ungu).

## 5.19.1 — 2026-11-08
- Perbaikan halaman Edit impian: tombol **Pakai** (foto dari link) melebar keluar layar dan menekan kolom link — sekarang selebar isinya saja.
- Pilihan emoji kini rata memenuhi lebar kotak (tidak menyisakan ruang kosong di kanan).
- Dicek di lebar 320–1280px (terang & gelap), termasuk nama/angka/satuan sangat panjang: tidak ada elemen yang keluar dari layar.

## 5.19.0 — 2026-11-08
- **Tab Impian — glassmorphism**: lingkaran profil, tombol pensil, pita (warna tema, bening), dan hexagon memakai efek kaca.
- **Halaman Edit impian** (ikon pensil di samping profil):
  - **Foto profil**: pilih dari **galeri HP** (otomatis dipotong persegi & diperkecil 320px agar ringan) atau dari **link https** mana pun (dicek dulu bisa dimuat). Tombol **Hapus foto** (dengan konfirmasi) mengembalikan ke ikon bawaan.
  - **Nama pita**: langsung tersimpan saat diketik; kosong = "Impianku".
  - **Daftar impian**: tambah / edit / hapus (hapus dengan konfirmasi). Isi: emoji (ketik/tempel atau pilih dari 24 emoji), nama, angka sekarang, target, satuan; ada pratinjau hexagon.
- **Hexagon impian** di tab Impian: emoji di tengah, **bar di sekeliling hexagon** terisi sesuai persentase (sekarang ÷ target), **angka urutan** di lingkaran kecil (impian ke-5 → 5), nama, dan "sekarang / target satuan · %". Hijau saat 100%. Grid 2 kolom di HP, 3 di tablet, 4 di layar lebar.
- File baru: `js/features/impian-profil.js` (sudah masuk daftar cache service worker).
- CSP `img-src` kini mengizinkan gambar dari semua alamat **https** (untuk foto profil dari link).
- Data lokal: `stivora.impian.profil`, `stivora.impian.daftar`.

## 5.18.0 — 2026-11-08
- **Tab Impian** (halaman Impian): judul "Impian" dihapus, diganti tampilan profil:
  - **Lingkaran profil** di tengah (ikon orang bawaan; nanti bisa diisi gambar lewat halaman edit).
  - **Ikon pensil** di samping profil (pintu ke halaman edit — dibuat nanti; sementara menampilkan pesan).
  - **Pita** di bawah profil, warna mengikuti tema; berisi judul (bawaan "Impianku", nanti diubah di halaman edit; judul panjang dipotong rapi).
  - Wadah grid hexagon sudah disiapkan (2 kolom di HP, 3 di tablet, 4 di layar lebar) — baru tampil setelah impian ditambah di halaman edit.
  - Data disiapkan di `stivora.impian.profil` = { foto, judul } (lokal).

## 5.17.0 — 2026-11-08
- **Pin catatan peristiwa**: di halaman Tambah peristiwa → Catatan peristiwa, tiap catatan punya ikon **pin** di atas ikon pensil. Ketuk = pin; ketuk lagi = **lepas pin lewat konfirmasi**.
- Catatan yang di-pin **selalu tampil paling atas** di kedua tempat (halaman Tambah peristiwa & tab Peristiwa), apa pun tahun/bulan/pencarian yang dipilih; boleh banyak; urut waktu kejadian (paling lama di atas, paling baru di bawah); tidak tampil dua kali. Dipisah garis putus-putus dari daftar biasa.
- Di tab Peristiwa catatan pin diberi tanda pin kecil (tanpa tombol). Pin tetap tersimpan saat catatan diedit.

## 5.16.1 — 2026-11-08
- Kotak indeks (di tab Peristiwa & halaman Tambah peristiwa): tulisan "Ada catatan" dan kotak hijau "Jan" diganti **jumlah catatan** — mis. "7 catatan"; bila kosong "Belum ada catatan"; saat mencari "2 catatan ditemukan". Angka ikut berubah otomatis saat tambah/ubah/hapus.

## 5.16.0 — 2026-11-08
- Halaman **Tambah peristiwa → Catatan peristiwa**: tiap catatan punya **ikon edit** (pensil). Mengetuknya membuka isian di atas (judul "Edit peristiwa") yang sudah terisi waktu & keterangan catatan itu; tombol jadi **Simpan perubahan**, plus tombol **Hapus peristiwa**.
- Hapus selalu lewat **konfirmasi** ("Hapus peristiwa?").
- Perubahan/penghapusan langsung berlaku di semua tempat: kalender tahunan (nama bulan & tanggal hijau), kotak indeks, catatan peristiwa di tab Peristiwa, dan pencarian. Bila bulan yang dipilih tidak punya catatan lagi, pilihannya dilepas.
- Catatan yang sedang diedit ditandai di daftar. Ikon edit hanya di halaman Tambah peristiwa (tab Peristiwa tetap tanpa ikon).

## 5.15.0 — 2026-11-08
- Halaman **Tambah peristiwa** kini juga memuat kotak **indeks (Ada catatan)** dan **Catatan peristiwa** di bawah tombol/isian — jadi tampil di 2 tempat (tab Peristiwa & halaman Tambah peristiwa), sebagai dasar fitur edit nanti.
- Keduanya memakai data & status yang sama: kolom cari selalu sinkron, pilih bulan (ketuk lagi = batal) berlaku di keduanya, dan peristiwa baru langsung muncul di keduanya.

## 5.14.4 — 2026-11-08
- Pencarian peristiwa kini mencakup **seluruh informasi catatan**: tanggal (4, 04, 4/11, 4/11/2025, 04-11-2025, 2025-11-04, 4 nov, 4 november), bulan (11, nov, november, nov 2025, 11/2025), tahun (2025 atau awalan 202), nama hari (selasa), jam (16, 16.19, 16:19), dan isi catatan. Beberapa kata sekaligus juga bisa (mis. "mar 2024 magang").

## 5.14.3 — 2026-11-08
- Kalender tahunan: nama bulan yang ada catatan kini **berwarna hijau**; titik hijau di samping nama bulan dihapus. Titik hijau di tanggal kejadian tetap.

## 5.14.2 — 2026-11-08
- Indeks peristiwa: bulan yang ada catatan diberi **bungkus hijau** (latar hijau tipis + teks hijau); bulan yang dipilih bungkus hijau penuh. Keterangan "Jan Ada catatan" ikut memakai bungkus hijau. Kalender tahunan tetap tanpa bingkai.

## 5.14.1 — 2026-11-08
- Kalender tahunan: bingkai/latar hijau pada kotak bulan yang dipilih dihapus. Penanda cukup titik hijau di nama bulan dan tanggal kejadian.

## 5.14.0 — 2026-11-08
- Indeks peristiwa: penanda bulan yang ada catatan diganti jadi **teks hijau tebal** (titik di bawah bulan dihapus); bulan yang dipilih cukup diberi latar hijau tipis. Keterangan: "Jan = Ada catatan".
- Indeks peristiwa: baris tahun lebih rapat (40px → 28px), kotak tetap memuat 3 tahun.
- Catatan peristiwa lebih ringkas: tanpa kotak per catatan; tiap catatan satu baris — kiri tanggal (hijau) + tahun · jam, kanan isi catatan, dipisah garis tipis. Informasi tetap lengkap.

## 5.13.0 — 2026-11-08
- Indeks peristiwa: ketuk bulan bertitik hijau **sekali** = kalender ke bulan itu; ketuk **lagi** bulan yang sama = **batal pilih** (tanda hilang, catatan kembali ke tahun yang dilihat).
- Tambah peristiwa: pemilih waktu baru — **Tanggal**, **Bulan**, **Tahun** (ketik langsung atau tombol −/+), **Jam**, dan tombol **Sekarang**. Tidak perlu menggulir jauh untuk memilih tahun. Jumlah tanggal menyesuaikan bulan & tahun kabisat; tahun dibatasi 1900–2100.

## 5.12.1 — 2026-11-08
- Tab Peristiwa: kolom pencarian di samping "Ada catatan" diperkecil (lebar maks 170px, tinggi 30px, teks 12px).

## 5.12.0 — 2026-11-08
- **Tab Peristiwa — indeks peristiwa** di bawah kalender tahunan:
  - Kotak berisi baris **tahun × 12 bulan**; bulan yang punya catatan bertanda **titik hijau**, bulan berjalan disorot. Tinggi kotak cukup untuk **3 tahun**, sisanya digulir di dalam kotak (awal: tahun terbaru terlihat).
  - Kolom **cari tahun / isi catatan** (angka = tahun, teks = isi catatan).
  - Ketuk bulan bertitik hijau → kalender pindah ke tahun itu; **bulan ditandai** (bingkai hijau + titik di nama bulan) dan **tanggal kejadian ditandai** (hijau + titik); catatannya tampil di area catatan.
- **Area catatan peristiwa**: tanggal & jam + isi catatan. Menampilkan bulan yang dipilih, hasil pencarian, atau (bila tidak memilih) seluruh catatan pada tahun yang sedang dilihat.
- Peristiwa baru langsung muncul di indeks, kalender, dan catatan setelah disimpan.

## 5.11.0 — 2026-11-08
- **Halaman Tambah peristiwa** (pensil di kalender tab Peristiwa): tombol **Tambahkan peristiwa** → di bawahnya muncul isian **Waktu** (tanggal & jam, otomatis terisi sekarang) dan **Keterangan** (maks. **2000 karakter**, ada penghitung; merah saat penuh), dengan tombol Batal & Simpan.
- Peristiwa tersimpan di perangkat (`stivora.peristiwa`). Belum tampil di kalender dan belum ikut sinkron/cadangan.

## 5.10.2 — 2026-11-08
- Halaman Impian: **geser jari (atau roda mouse) di atas peta tidak lagi menggulir halaman** — termasuk saat mulai dari tombol-tombol di atas peta. Gerakan di peta hanya untuk menggeser/zoom peta.
- Halaman tetap tergulir bila jari di barisan tab dan di bawahnya. Menu di atas peta yang isinya panjang (layer, mode, kecepatan/pilih perjalanan, hasil cari) tetap bisa digulir di dalamnya.

## 5.10.1 — 2026-11-08
- Journey (Putar perjalanan): info di atas kendaraan kini **tanpa latar** (tanpa kotak, bayangan kotak, dan ekor panah). Tulisan putih dengan bayangan huruf tegas agar tetap terbaca di atas peta terang maupun gelap, tanpa menutup kendaraan & peta. Isi dan posisinya tidak berubah.

## 5.10.0 — 2026-11-08
- **Kalender peristiwa (tab Peristiwa):**
  - Panah **‹ ›** di kiri & kanan tahun: lihat tahun sebelumnya / berikutnya (1900–2100).
  - **Pilih tahun:** ketuk angka tahun → daftar 12 tahun (geser per 12 tahun dengan panah) → ketuk tahun yang mau dilihat. Tahun berjalan bertanda, tahun yang dilihat disorot.
  - Ikon **pensil** di pojok kanan atas kartu → halaman **Tambah peristiwa** (masih kerangka, isi menyusul).
  - Tahun lalu tampil pudar, tahun depan normal; hari ini hanya ditandai di tahun berjalan.

## 5.9.3 — 2026-11-08
- Tab Peristiwa: angka **2026** kini bagian dari kalender — berada di dalam kartu kaca, paling atas, di atas 12 bulan. Garis di kiri & kanan angka dihapus. Gaya angka dan kalender tidak berubah.

## 5.9.2 — 2026-11-08
- Tab Peristiwa: **kalender bulanan dihapus**, hanya kalender tahunan.
- **2025 dan 2027 dihapus**; tersisa **2026** di paling atas dengan desain baru: angka besar bergradasi warna aksen, kilau tipis di bagian atas, cahaya lembut, diapit garis tipis di kiri & kanan.
- Kode & gaya kalender bulanan yang tidak terpakai ikut dibersihkan.

## 5.9.1 — 2026-11-08
- Kalender tampilan tahun (2025 · **2026** · 2027 + 12 bulan kaca) dipindah dari tab Impian ke **tab Peristiwa**, di bawah kalender bulanan. Tab Impian kembali kosong (kerangka, hanya judul).

## 5.9.0 — 2026-11-08
- **Tab Impian: kalender tampilan tahun** (judul "Impian" di panel diganti).
  - Atas: **2026** besar; di atasnya siluet **2025** samar yang separuh tertutup (waktu yang sudah lewat); di bawahnya **2027** bergaris tepi memudar (masa yang akan datang).
  - Bawah: 12 bulan dalam satu kartu **glassmorphism** — 3 kolom di HP, 4 di tablet, 6 di laptop. Bulan berjalan disorot, bulan yang sudah lewat lebih pudar, hari ini dilingkari, hari Minggu merah.
  - Otomatis berganti saat tanggal/tahun berganti.

## 5.8.7 — 2026-11-08
- Kalender tab Peristiwa — sisi kiri disusun ulang: **tanggal** paling besar di kiri atas, **nama hari** kecil di kanan atas, **bulan** ukuran sedang di tengah, **tahun** besar di tengah. Tinggi kalender tetap 127 px; kotak tanggal, efek kaca, dan warna tidak berubah.

## 5.8.6 — 2026-11-08
- Kalender tab Peristiwa: tanggal hari ini di sisi kiri dibuat besar & tebal (26 px, sangat tebal), sebaris dengan nama hari ("Minggu **8**"). Tinggi kalender tetap 127 px; bagian lain tidak berubah.

## 5.8.5 — 2026-11-08
- Kalender tab Peristiwa diberi **efek glassmorphism** (kaca buram tembus pandang dari warna tema, blur + saturasi, kilau tipis di tepi atas, bayangan lembut). Bentuk, ukuran (358 × 127 px di HP), sudut, isi, dan susunan tidak berubah.

## 5.8.4 — 2026-11-08
- Kalender tab Peristiwa — bagian kiri ditata ulang dengan urutan ukuran: **tahun** paling besar (30 px), lalu **bulan** (14 px, huruf kapital), lalu **hari + tanggal** satu baris ("Minggu, 8", 12 px, warna aksen); tersusun rapi di tengah secara vertikal. Tinggi kalender tetap 127 px; font, warna, dan kotak tanggal tidak berubah.

## 5.8.3 — 2026-11-08
- Kalender tab Peristiwa dibuat ringkas: tinggi di HP 177 → 127 px (bulan 6 baris: 146 px). Kotak tanggal 25 → 19 px, angka tanggal besar 42 → 32 px, huruf & jarak lebih rapat; di layar lebar maks. 420 px. Latar, isi, dan susunan tidak berubah.

## 5.8.2 — 2026-11-08
- Latar kalender tab Peristiwa kini mengikuti tema aplikasi (`--surface`, sama seperti kartu lain); gradasi bergaya referensi dihapus. Ukuran, isi, dan susunan tidak berubah.

## 5.8.1 — 2026-11-08
- Kalender tab Peristiwa diperkecil: tinggi di HP 224 → 177 px (angka tanggal besar 56 → 42 px, kotak tanggal 30 → 25 px, jarak & huruf sedikit lebih kecil); di layar lebar maks. 520 px (sebelumnya 640 px).

## 5.8.0 — 2026-11-08
- **Tab Peristiwa: kalender bulanan** (tulisan judul "Peristiwa" dihapus).
  - Kiri: tahun, bulan, hari, dan tanggal hari ini (besar).
  - Kanan: kotak tanggal 1 bulan (Min–Sab, minggu dimulai hari Minggu); hari ini ditandai lingkaran ungu, hari Minggu berwarna merah.
  - Kartu berlatar gradasi lembut sesuai warna aplikasi; layar sempit (<380 px) memakai inisial hari (M S S R K J S), <360 px kiri & kanan bersusun.
  - Kalender otomatis berganti saat tanggal berganti.

## 5.7.5 — 2026-11-08
- Bentuk penampung tab halaman Impian dikembalikan seperti 5.7.3 (penuh selebar layar, tanpa sudut membulat, menempel di paling atas). Yang dipertahankan hanya **efek glassmorphism**: kaca buram (blur + saturasi), kilau halus di tepi atas, garis bawah tipis, bayangan lembut.

## 5.7.4 — 2026-11-08
- Penampung tab halaman Impian bergaya **glassmorphism**: kaca buram melayang (blur + saturasi), sudut membulat, garis tepi tipis, kilau halus di tepi atas, dan bayangan lembut. Saat menempel di atas, isi di belakangnya tampak samar melalui kaca.

## 5.7.3 — 2026-11-08
- Penampung tab halaman Impian lebih pendek (67 → 53 px di HP): jarak atas-bawah dan tinggi tombol dikurangi, ikon sedikit lebih kecil.

## 5.7.2 — 2026-11-08
- Ikon tab baru: **Impian** = gunung dengan bendera di puncak (tujuan yang dicapai), **Progress** = lingkaran kemajuan dengan tanda centang.

## 5.7.1 — 2026-11-08
- Tab halaman Impian: tanpa latar pada tab aktif — penanda hanya garis bawah; setiap ikon kini diberi nama (Peristiwa, Impian, Sumberdaya, Progress, Keuangan).

## 5.7.0 — 2026-11-08
- **Halaman Impian: 5 tab ikon di bawah peta** — Peristiwa · Impian · Sumberdaya · Progress · Keuangan.
  - Isi tab tampil di bawah barisan tab (bukan halaman penuh); peta & tab tetap terlihat.
  - Satu halaman: isi panjang digulir bersama peta; barisan tab **menempel di atas layar** saat digulir.
  - Saat aplikasi dibuka selalu tab pertama (Peristiwa). Ganti tab saat tergulir jauh → isi baru mulai tepat di bawah tab.
  - Isi tiap tab masih kerangka (kosong, hanya judul).
- File baru: `js/features/impian-tab.js`.

## 5.6.0 — 2026-11-08
- **Journey — panel ringkas di kiri peta** (tegak): pilih perjalanan · kecepatan · Putar/Berhenti (+ kemajuan "2/3" saat diputar). Bar lebar di bawah dihapus agar peta tidak tertutup.
- **Kecepatan:** 0,2× · 0,3× · 0,5× · 1× · 2× · 4× (menu pilihan, tersimpan).
- **Waktu berangkat** per bagian perjalanan (tanggal & jam) di halaman perjalanan; tampil di kartu info di atas kendaraan: "Berangkat 20 Agu 2019 · 07.30", plus asal "dari …".
- **Kendaraan bergambar (Canvas), 11 jenis · 37 model**, dipilih per bagian perjalanan:
  Jalan kaki (jalan, ransel, rombongan) · Sepeda (biasa, gunung, listrik) · Motor (bebek, sport, skuter, ojek) · Mobil (sedan, taksi, SUV, pikap) · Bus (bus kota, pariwisata, minibus) · Truk (boks, tangki, bak) · Kereta (kereta api, KRL, kereta cepat) · Perahu (perahu motor, speedboat, kapal layar, sampan) · Kapal (feri, kapal pesiar, kargo) · Pesawat (jet, baling-baling, jet pribadi, helikopter) · Tradisional (becak, bajaj, delman).
  Kendaraan menghadap arah gerak (ke barat otomatis dicerminkan).
- File baru: `js/features/peta-kendaraan.js`.
- **Server:** `firestore.rules` — perjalanan boleh punya kolom `berangkat` (daftar, maks. 50). **Wajib deploy ulang rules.**

## 5.5.2 — 2026-11-08
- Jelajahi Indonesia (Kelola peta): daftar provinsi dan daftar kota diurutkan menurut nama (A–Z) agar mudah dicari. Ibu kota provinsi tetap bertanda.

## 5.5.1 — 2026-11-08
- Tekan lama untuk menaruh/memindah marker dipercepat: **1 detik** (sebelumnya 2 detik).
- Banner di atas peta dibuat ringkas: keterangan panjang dipindah ke ikon **?** (ketuk untuk membaca, ketuk lagi/di tempat lain untuk menutup), tombol Batal diganti ikon **X**.
  - Mode tambah/pindah marker: [?] [X].
  - Mode gambar area: [?] jumlah titik & luas, [↶ urungkan] [X] [Selesai].
- Ketukan biasa saat memilih titik memunculkan bantuan yang sama; gelembung bantuan tidak menghalangi peta.

## 5.5.0 — 2026-11-08
- **Putar perjalanan baru:**
  - Kendaraan bergerak di garis dari titik ke titik; **garis baru muncul di belakang kendaraan** (rute belum dilewati tidak tampil). Pin tempat muncul satu per satu sesuai urutan.
  - **Kendaraan per bagian perjalanan:** Jalan kaki, Sepeda, Motor, Mobil, Bus, Kereta, Perahu, Kapal, Pesawat — dipilih di halaman perjalanan di antara dua titik (default otomatis: >600 km pesawat, selain itu mobil).
  - **Kartu info di atas kendaraan:** saat berangkat "Menuju X · kendaraan · jarak"; saat tiba: nama tempat, tanggal, dan catatan/peristiwa marker.
  - **Kecepatan animasi** 0,5× / 1× / 2× / 4× (tombol di bar bawah, bisa diganti saat sedang diputar, tersimpan).
- Kendaraan ikut tersinkron (biasa & E2E) dan ikut file cadangan.
- **Server:** `firebase/firestore.rules` — perjalanan boleh punya kolom `kendaraan` (daftar, maks. 50). **Wajib deploy ulang rules**; tanpa itu perjalanan baru gagal tersinkron.

## 5.4.0 — 2026-11-08
- **Tambah / pindah marker dengan tekan lama:** tekan lama 2 detik di lokasi (ada lingkaran penanda waktu) → muncul ikon lokasi "Tambah di sini" yang ikut bergerak bersama peta → ketuk ikon itu → halaman marker. Ketukan biasa tidak lagi menaruh titik, jadi peta bebas digeser/di-zoom. Tekan lalu geser atau dua jari membatalkan.
- **Ikon marker:** dari 12 menjadi 53 ikon (sekolah, kantor, masjid, rumah sakit, toko, kendaraan, alam, keluarga, hadiah, dll.), grid bisa digulir.
- **Ikon custom:** kotak pertama di grid ikon — ketik 1 emoji (atau 1–2 huruf); tampil di pin peta, daftar, dan filter layer ("Ikon custom").
- **Warna:** 18 warna siap pakai + **warna custom** (lingkaran pelangi, pilih warna apa saja) di halaman marker, perjalanan, dan area.

## 5.3.0 — 2026-11-08
- Halaman **Kelola peta** ditata ulang seperti aplikasi profesional:
  - Atas: 3 aksi cepat — Tambah marker, Buat perjalanan, Buat area.
  - Koleksiku: Marker saya, Perjalanan, Area — masing-masing membuka halaman sendiri berisi daftar rapi dalam satu kartu, tombol tambah kecil di kanan atas, dan tombol "Lihat di peta" bulat.
  - Jelajahi Indonesia punya halaman sendiri.
  - Keadaan kosong (belum ada data) dengan penjelasan singkat dan tombol aksi.
- "Lihat di peta" dari halaman mana pun langsung kembali ke peta.
- Terjemahan Bahasa Aceh untuk teks baru.

## 5.2.6 — 2026-11-08
- Peta bisa di-zoom jauh lebih dekat. Dengan token Cesium (Satelit/Default dari Bing), kamera boleh turun sampai ±20 m dari permukaan, cukup untuk melihat atap rumah. Tanpa token: Default (OpenStreetMap) ±60 m, Satelit gratis & Medan tetap ±300 m karena citranya memang tidak lebih tajam. Batas ikut berubah saat ganti jenis peta atau saat token ditolak.

## 5.2.5 — 2026-11-08
- CSP: gambar Bing (satelit & jalan dari Cesium ion) juga diizinkan lewat `http://*.virtualearth.net`. Cesium meminta gambar Bing dengan protokol yang sama dengan halaman, sehingga saat uji coba di `http://localhost` (SPCK) gambarnya diminta lewat http dan sebelumnya terblokir. Di GitHub Pages (https) tetap lewat https.

## 5.2.4 — 2026-11-08
Perbaikan peta hitam (hanya bintang) saat token Cesium diisi:
- Jika Cesium ion menolak token (token salah/terhapus, alamat belum ada di Allowed URLs, atau kuota habis), relief 3D dan satelit Bing gagal dimuat sehingga bola bumi tidak tergambar. Sekarang kegagalan itu ditangkap: peta otomatis kembali ke peta gratis (EOX / OpenStreetMap / OpenTopoMap, tanpa relief) dan muncul pesan "Token Cesium ditolak (alasan)…".
- Alasan penolakan (mis. HTTP 401 · Invalid access token) dicatat di Pengaturan → Log error.

## 5.2.3 — 2026-11-08
- `CESIUM_ION_TOKEN` di `js/config.js` dikosongkan lagi (diisi sendiri oleh pemilik). Isian konfigurasi (Firebase, Worker, token) tidak diisi otomatis.

## 5.2.1 — 2026-11-08
- Tombol **mode peta** (Eksplore / My Places / Events & Stories / Journey) dipindah dari kiri atas ke **barisan alat bawah**, ikut tersembunyi di balik panah. Bentuknya kini tombol bulat berikon bola dunia.
- Menu mode melayang di atas semua tombol & bar bawah dan memakai seluruh tinggi peta, jadi semua pilihan bisa diketuk di HP kecil juga. Ketuk peta untuk menutupnya.
- Karena nama mode tidak lagi tertulis di peta, saat berganti mode muncul pemberitahuan singkat "Mode …".

## 5.2.0 — 2026-11-08
Fitur peta baru:
- **Jenis peta** (seperti Google Maps) di tombol Jenis peta & layer: **Default** (peta jalan OpenStreetMap), **Satelit** (Sentinel-2/EOX), **Medan** (OpenTopoMap, garis kontur). Dengan token Cesium ion: Default = Bing jalan, Satelit = Bing udara. Pilihan diingat.
- **Alat peta di kanan bawah disembunyikan** di balik tombol panah agar peta tidak tertutup. Ketuk panah → Lokasi saya, Jenis peta & layer, Indonesia, 2D/3D keluar; ketuk lagi → masuk. Keadaan terakhir diingat; awalnya tertutup.
- CSP: izin gambar ubin dari tile.openstreetmap.org dan *.tile.opentopomap.org.

## 5.1.0 — 2026-11-08
Fitur baru — **Lokasi saya** di peta:
- Tombol baru di kanan bawah peta (ikon target). Ketuk → kamera terbang ke posisimu + titik biru, dengan info akurasi.
- Pertama kali dipakai muncul dialog konfirmasi, lalu browser meminta izin lokasi.
- Posisi tidak disimpan dan tidak dikirim ke mana pun (hanya tanda "sudah setuju" yang disimpan di perangkat).
- Pesan jelas jika izin ditolak, GPS mati, atau lokasi terlalu lama didapat.
- File baru: js/features/peta-lokasi.js.

## 5.0.3 — 2026-11-08
Perbaikan "An error occurred while rendering. Rendering has stopped" (TypeError … reading 'toFixed'):
- Penyebab: posisi kamera disimpan setiap kamera berhenti; saat peta berganti 2D ↔ 3D, Cesium mengembalikan arah kamera kosong (undefined) sehingga penyimpanan error di tengah proses menggambar dan Cesium menghentikan peta.
- Penyimpanan posisi kamera kini melewati masa pergantian 2D/3D dan tidak pernah bisa menghentikan peta.
- Jika ada error lain saat menggambar: kotak error bawaan Cesium tidak muncul lagi; error dicatat di Log error dan peta otomatis jalan lagi (maks. 3× per menit, lalu muncul tombol Coba lagi).

## 5.0.2 — 2026-11-08
Perbaikan peta "Cesium tidak lengkap" (peta tidak pernah tampil):
- Penyebab: CesiumJS 1.139+ menjalankan `eval` saat dimuat, sedangkan CSP aplikasi memblokir `eval`, sehingga Cesium berhenti di tengah (dilaporkan juga di CesiumGS/cesium#13412).
- CSP `script-src` sekarang memuat `'unsafe-eval'`. Skrip inline dan domain asing tetap diblokir; kode aplikasi sendiri tidak memakai `eval`.
- Sumber Cesium cadangan "versi 1.x terbaru" dihapus agar versi tetap terkunci di 1.146 (versi baru bisa mengubah API).
- Jika Cesium error saat dijalankan, pesan error aslinya ikut tampil di bawah "Peta gagal dimuat".

## 5.0.1 — 2026-11-07
Perbaikan peta yang "gagal dimuat":
- Cesium sekarang dicoba dari 4 sumber berurutan: jsDelivr → CDN resmi cesium.com → unpkg → jsDelivr 1.x terbaru (CSP ikut diizinkan untuk cesium.com & unpkg.com).
- Label wilayah, marker, area, dan layer tidak lagi bisa menggagalkan seluruh peta: jika salah satu error, peta tetap tampil dan error-nya dicatat di Log error.
- Saat peta gagal, alasannya tampil kecil di bawah "Peta gagal dimuat" (mis. sumber mana yang tidak bisa diunduh), selain tercatat di Log error.

## 5.0.0 — 2026-11-07
Peta selesai — Tahap 5c: perjalanan & area ikut cloud dan cadangan.
- Perjalanan tersinkron ke Firestore `users/{uid}/jalur/{id}`, area ke `users/{uid}/area/{id}` (tambah, ubah, hapus; antar perangkat).
- Enkripsi end-to-end berlaku untuk perjalanan & area (nama, titik, catatan tersimpan sebagai `e`).
- File ekspor berisi marker, perjalanan, dan area; impor menggantinya. Pulihkan dari cloud dan ganti akun ikut mengganti/mengosongkan keduanya.
- Teks Cadangan, Enkripsi, dan Ekspor & impor: "marker peta" → "data peta" (marker, perjalanan, area); ringkasan file menampilkan jumlah ketiganya.
- **Server:** firestore.rules diperbarui (koleksi `jalur` dan `area`). Wajib dipasang ulang.

## 4.12.0 — 2026-11-07
Peta Tahap 5b — Area:
- Pensil → bagian **Area** → **Buat area**: ketuk sudut-sudut wilayah di peta (minimal 3, maks 100), dengan Urungkan / Batal / Selesai; luas tampil langsung.
- Isi nama, warna, catatan; luas (m², ha, km²) dan keliling dihitung otomatis (perkiraan). Bisa **Gambar ulang**, edit, dan hapus (dengan konfirmasi).
- Area tampil sebagai bidang berwarna transparan + garis tepi di mode Eksplore, My Places, dan Journey (tidak di Events & Stories); bisa dimatikan lewat Layer → **Area saya**.
- Ketuk area di peta → kartu info → **Detail area** (luas, keliling, catatan, Lihat di peta).
- Perbaikan: menu mode di HP tidak lagi tertutup bar bawah peta (pilihan Journey bisa diketuk).
- Data area baru tersimpan di perangkat ini (`stivora.peta.area`); sinkron cloud & cadangan di Tahap 5c.
- File baru: js/features/peta-area.js.

## 4.11.0 — 2026-11-07
Peta Tahap 5a — Journey (perjalanan):
- Mode **Journey** aktif. Perjalanan = beberapa marker berurutan + nama + warna garis.
- Buat/edit lewat pensil → bagian **Perjalanan**: susun titik (tambah, naik/turun, keluarkan), lihat jarak tiap ruas & total (garis lurus), Hapus (dengan konfirmasi; marker tetap ada).
- Di peta: garis lengkung berwarna antar titik + pin titik-titiknya; bar bawah untuk memilih perjalanan dan **Putar** (kamera terbang dari titik ke titik, bisa **Berhenti**). Perjalanan terpilih diingat.
- Ketuk pin di mode Journey → Detail tempat. Putar berhenti otomatis saat halaman lain dibuka.
- Data perjalanan baru tersimpan di perangkat ini (`stivora.peta.jalur`); sinkron cloud & cadangan di Tahap 5c.
- File baru: js/features/peta-jalur.js.

## 4.10.0 — 2026-11-07
Peta Tahap 4 — Events & Stories:
- Mode **Events & Stories** aktif. Peristiwa = marker yang punya Tanggal; ceritanya = catatan + media marker (halaman Detail tempat).
- Garis waktu di bawah peta: ‹ sebelumnya · tanggal & nama (ketuk → cerita) · berikutnya ›, urut dari yang terlama; kamera terbang ke tiap peristiwa.
- Saring per tahun (ketuk angka 1/4): Semua tahun atau tahun tertentu; pin di peta ikut tersaring. Tahun diingat.
- Ketuk pin di mode ini memilih peristiwa itu di garis waktu. Layer jenis marker tetap berlaku.
- Tidak ada data baru di cloud (memakai tanggal marker), jadi server tidak berubah.
- File baru: js/features/peta-peristiwa.js.

## 4.9.0 — 2026-11-07
Peta Tahap 3 — My Places:
- Mode **My Places** aktif di menu mode: nama provinsi/kota disembunyikan dan kamera menampilkan semua marker. Mode terakhir diingat.
- Tombol **Layer** (kanan bawah peta): nyala/mati Nama provinsi & kota (mode Eksplore), Marker saya, dan tiap jenis ikon marker. Pilihan diingat.
- Ketuk pin → **kartu info** di dalam peta (nama, tanggal, jumlah media, tanda catatan) → **Detail**.
- Halaman **Detail tempat**: lokasi, tanggal, catatan, media (ketuk → penampil), Lihat di peta, Petunjuk arah (Google Maps).
- Ketuk area kosong di peta menutup kartu info dan menu.
- File baru: js/features/peta-tempat.js.

## 4.8.0 — 2026-11-07
Peta Tahap 2c — marker ikut cloud & cadangan:
- Marker tersinkron ke Firestore `users/{uid}/marker/{id}` (tambah, ubah, hapus) dan diterima perangkat lain yang login dengan akun sama.
- Enkripsi end-to-end berlaku juga untuk marker (nama, lokasi, catatan tersimpan sebagai `e`).
- Hubungan media ↔ marker (`markerId`) ikut tersimpan di catatan media cloud, termasuk saat terenkripsi.
- Ekspor file berisi marker; impor mengganti marker (cadangan lama tanpa marker tidak mengubah marker di perangkat).
- Pulihkan dari cloud dan ganti akun ikut mengganti/mengosongkan marker.
- Teks di Cadangkan & pulihkan, Enkripsi, dan Ekspor & impor disesuaikan ("impian, media, dan marker peta").
- **Server:** firestore.rules diperbarui (koleksi `marker` + kolom `markerId` di media). Wajib dipasang ulang.

## 4.7.0 — 2026-11-07
Peta Tahap 2b — isi marker:
- Halaman marker punya Tanggal (opsional), Catatan (opsional, maks 2000 huruf), dan Media (foto, video, audio, dokumen; bisa pilih banyak sekaligus).
- File baru tampil dengan label "Baru" dan bisa dibatalkan (×) sebelum Simpan; tersimpan saat Simpan.
- Media marker juga tampil di Galery; ketuk media di halaman marker → penampil. Hapus media dari penampil → masuk Sampah.
- Daftar "Marker saya" menampilkan tanggal, tanda catatan, dan jumlah media.
- Pindahkan marker sekarang kembali ke halaman marker (isian tidak hilang); lokasi baru tersimpan saat Simpan.
- Hapus marker: media-nya tidak ikut terhapus, tetap ada di Galery.
- Belum ikut sinkron/backup/ekspor (Tahap 2c).

## 4.6.0 — 2026-11-07
Peta Tahap 2a — marker sendiri (lewat ikon pensil):
- Tambah marker: pensil → Tambah marker → ketuk lokasi di peta → isi nama, pilih ikon (12) dan warna (8) → Simpan.
- Marker tampil di peta sebagai pin berwarna + nama; ketuk pin → kamera mendekat.
- Daftar "Marker saya" di halaman pensil: edit, Lihat di peta, Pindahkan (ketuk lokasi baru), Hapus (dengan konfirmasi, permanen).
- Data marker disimpan di perangkat ini saja (localStorage `stivora.peta.marker`); belum ikut sinkron, backup, dan ekspor (Tahap 2c).
- File baru: js/features/peta-marker.js.

## 4.5.2 — 2026-11-07
- Perbaikan: saat peta sedang dimuat atau gagal dimuat, pesan di bingkai tidak lagi menutupi tombol. Pensil, cari, dan mode tetap tampil dan bisa diketuk.

## 4.5.1 — 2026-11-07
- Halaman Impian kini hanya menampilkan peta; daftar Jelajahi (38 provinsi → kota) dipindah ke halaman pensil (Kelola peta).
- Pilih kota atau "Lihat provinsi ini di peta" di halaman pensil → kembali ke peta lalu kamera terbang ke sana.
- Hasil pencarian tampil melayang di dalam peta (di bawah kolom cari), tidak lagi di bawah peta.

## 4.5.0 — 7 November 2026 — Peta Tahap 1 (CesiumJS)
- Peta di halaman Impian diganti dari Leaflet ke **CesiumJS** (globe 3D, satelit Sentinel-2 / Cesium ion).
- Eksplore: 38 provinsi & 113 kota — ketuk di peta atau di daftar *Jelajahi* → kamera terbang halus.
- Ikon cari (data sendiri + OpenStreetMap), tombol 3D/2D, tombol kembali ke Indonesia.
- Pilihan mode (My Places, Events & Stories, Journey: segera hadir) dan ikon pensil → halaman *Kelola peta*.
- Posisi kamera, 3D/2D, dan jejak lokasi diingat. `CESIUM_ION_TOKEN` (opsional) di `js/config.js`.
- CSP disesuaikan untuk CesiumJS, EOX, Cesium ion, dan Nominatim.

## 4.4.1 — 7 November 2026
- Peta di halaman Impian selebar layar (HP) atau selebar area di samping navigasi (tablet, laptop, monitor), tetap 16:9. Di TV tetap di dalam tepi aman.

## 4.4.0 — 7 November 2026
- Halaman Impian: bingkai peta 16:9 di atas (Leaflet 1.9.4 + OpenStreetMap). Leaflet dimuat dari unpkg dengan kunci SRI, hanya saat halaman Impian dibuka. Posisi & zoom terakhir diingat.
- CSP: mengizinkan unpkg.com (Leaflet) dan tile.openstreetmap.org (gambar peta).

## 4.3.1 — 7 November 2026
- Halaman Impian dikosongkan sementara: header Stivora, ringkasan (analisis), kategori, daftar, dan tombol + disembunyikan. Hanya navigasi yang tampil. Data impian tetap tersimpan.

## 4.3.0 — 7 November 2026
### Baru
- Galery menyimpan **audio dan dokumen** (PDF, Word, Excel, PowerPoint, TXT) selain foto dan video; audio bisa diputar, dokumen bisa dibuka/diunduh.
- **Bahasa Aceh** aktif (kamus di `js/i18n/ace.js`).
- **PWA**: bisa dipasang ke layar utama, dibuka offline, dan memberi tahu "Versi baru tersedia".
- **Pengaturan › Sistem**: Versi & pembaruan, Log error.
- **Monitoring error**: error dicatat di perangkat dan dikirim ke Firestore (`users/{uid}/galat`).
- **Pembersihan file cloud yatim** di R2 (otomatis seminggu sekali + tombol manual).
- **Content Security Policy** sebagai lapisan anti-XSS tambahan.
- Dokumentasi: README.md dan CHANGELOG.md.
### Server (perlu dipasang ulang)
- `firestore.rules`: koleksi `galat`.
- `worker.js`: jenis file audio, rute daftar file `GET /media`.

## 4.2.0
- Ikon di kartu informasi Cadangkan & pulihkan dan Ekspor & impor.

## 4.1.0
- Label "Sertakan media" (siap untuk audio & dokumen).

## 4.0.0
- Ekspor dengan pilihan **Sertakan media** dan **Enkripsi file** (AES-256, kata sandi).
- Impor file terenkripsi; impor file tanpa media tidak menyentuh media di perangkat.

## 3.9.0
- Keterangan Ekspor & impor disembunyikan di balik tombol "Lihat detail".

## 3.8.0
- Halaman Ekspor & impor menjelaskan isi file sesuai kenyataan, dengan perkiraan ukuran.

## 3.7.0
- Fitur "Hapus data" dihapus. Pengingat cadangan menjadi 2 hari.

## 3.5.0
- Cadangan otomatis, sinkron antar perangkat, sertakan media, pengingat, riwayat cadangan.
- **Enkripsi end-to-end** untuk cadangan cloud.

## 3.3.0 – 3.4.0
- **Kunci sidik jari** (WebAuthn) dengan dialog konfirmasi.

## 3.0.0 – 3.2.0
- Tema bergambar: Taman Sakura dan 9 tema lain.

## 2.9.0
- Struktur folder dirapikan: CSS dipecah 5 file, JS dipecah per fitur.

## 1.0 – 2.8
- Aplikasi awal: Impian, Galery, Pengaturan, login Google, Firestore, R2, Sampah, bahasa, responsif, mode TV.
