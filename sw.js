/* Stivora — Service worker: mode offline + sistem pembaruan
   =========================================================
   CARA MERILIS VERSI BARU
   1. Naikkan VERSI di bawah, DAN APP_VERSI di js/core/versi.js (harus sama).
   2. Jika menambah/menghapus file, perbarui daftar ASET.
   3. Unggah ke GitHub. Aplikasi yang terbuka akan menampilkan
      "Versi baru Stivora tersedia" lalu pengguna menekan "Perbarui".
   Jika VERSI tidak dinaikkan, perubahan TIDAK akan sampai ke pengguna
   yang sudah pernah membuka aplikasi (mereka tetap memakai salinan lama).
   ========================================================= */
const VERSI = '5.72.0';
const CACHE = 'stivora-v' + VERSI;
const CACHE_RUNTIME = 'stivora-runtime'; // gambar tema, dimuat saat dipakai

const ASET = [
  './',
  './index.html',
  './assets/ikon/apple-touch-icon.png',
  './assets/ikon/ikon-192.png',
  './assets/ikon/ikon-512.png',
  './assets/ikon/ikon-maskable-512.png',
  './css/base.css',
  './css/components.css',
  './css/fitur/01-umum.css',
  './css/fitur/02-peta.css',
  './css/fitur/03-impian.css',
  './css/fitur/04-galery.css',
  './css/fitur/05-lagu.css',
  './css/fitur/06-film.css',
  './css/fitur/07-buku.css',
  './css/fitur/08-tempat.css',
  './css/fitur/09-channel.css',
  './css/fitur/10-tokoh.css',
  './css/fitur/11-link.css',
  './css/fitur/12-proyek.css',
  './css/fitur/13-rencana.css',
  './css/layout.css',
  './css/responsive.css',
  './js/config.js',
  './js/core/dom.js',
  './js/data/wilayah.js',
  './js/core/galat.js',
  './js/core/i18n.js',
  './js/core/router.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/core/muat.js',
  './js/core/ui.js',
  './js/core/geser-chip.js',
  './js/core/hitung.js',
  './js/core/versi.js',
  './js/features/akun.js',
  './js/features/bahasa.js',
  './js/features/cadangan.js',
  './js/features/media-lihat.js',
  './js/features/kunci.js',
  './js/features/mode.js',
  './js/features/pengaturan.js',
  './js/features/cadangan-ringkas.js',
  './js/features/peta.js',
  './js/features/peta-marker.js',
  './js/features/peta-tempat.js',
  './js/features/peta-peristiwa.js',
  './js/features/peta-kendaraan.js',
  './js/features/peta-jalur.js',
  './js/features/peta-area.js',
  './js/features/peta-lokasi.js',
  './js/features/impian-tab.js',
  './js/features/impian-profil.js',
  './js/features/sumberdaya-waktu.js',
  './js/features/impian-progress.js',
  './js/features/impian-proyek.js',
  './js/features/impian-rencana.js',
  './js/features/keuangan.js',
  './js/data/ikon-badge.js',
  './js/features/galery.js',
  './js/features/galery-pola.js',
  './js/features/galery-lainnya.js',
  './js/features/galery-bersama.js',
  './js/features/galery-lagu.js',
  './js/features/galery-film.js',
  './js/features/galery-buku.js',
  './js/features/galery-tempat.js',
  './js/features/galery-channel.js',
  './js/features/galery-tokoh.js',
  './js/features/galery-link.js',
  './js/features/galery-folder.js',
  './js/features/galery-tab.js',
  './assets/font/Comfortaa.woff',
  './assets/font/ArchivoBlack-Regular.woff',
  './js/features/sistem.js',
  './js/features/tema.js',
  './js/i18n/ace.js',
  './js/main.js',
  './js/platform/input.js',
  './js/services/auth.js',
  './js/services/backup.js',
  './js/services/enkripsi.js',
  './js/services/media.js',
  './js/services/cadangan-harian.js',
  './js/services/sync.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASET)));
  /* Tidak langsung aktif: tunggu pengguna menekan "Perbarui" */
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('stivora-v') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'LEWATI') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, Worker R2, dll: langsung ke jaringan
  if (url.pathname.includes('/__')) return;

  /* Halaman: selalu index.html dari versi yang terpasang */
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(
    caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      /* Di luar daftar ASET (mis. gambar tema): ambil dari jaringan, simpan untuk offline */
      return caches.open(CACHE_RUNTIME).then((c) =>
        c.match(req).then((lama) => {
          const baru = fetch(req)
            .then((res) => {
              if (res.ok) c.put(req, res.clone());
              return res;
            })
            .catch(() => lama);
          return lama || baru;
        })
      );
    })
  );
});
