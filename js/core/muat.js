/* Stivora — Pemuat aplikasi (5.33.0)
   Data disimpan di IndexedDB yang dibaca secara asinkron. Agar seluruh fitur tetap bisa membaca data
   seketika (store.get), skrip fitur baru dijalankan SETELAH data selesai dimuat ke memori.
   Urutan skrip sama persis seperti sebelumnya (async = false menjaga urutan eksekusi). */
'use strict';
var MUAT_SKRIP = [
  'js/core/state.js',
  'js/core/ui.js',
  'js/core/geser-chip.js',
  'js/core/hitung.js',
  'js/core/router.js',
  'js/features/media-lihat.js',
  'js/services/auth.js',
  'js/services/enkripsi.js',
  'js/services/sync.js',
  'js/services/media.js',
  'js/services/gambar-mini.js',
  'js/services/cadangan-harian.js',
  'js/features/akun.js',
  'js/features/mode.js',
  'js/services/backup.js',
  'js/features/bahasa.js',
  'js/features/cadangan.js',
  'js/features/tema.js',
  'js/features/pengaturan.js',
  'js/features/cadangan-ringkas.js',
  'js/features/kunci.js',
  'js/features/sistem.js',
  'js/data/wilayah.js',
  'js/features/peta.js',
  'js/features/peta-marker.js',
  'js/features/peta-tempat.js',
  'js/features/peta-peristiwa.js',
  'js/features/peta-kendaraan.js',
  'js/features/peta-jalur.js',
  'js/features/peta-area.js',
  'js/features/peta-lokasi.js',
  'js/features/impian-tab.js',
  'js/features/impian-profil.js',
  'js/features/sumberdaya-waktu.js',
  'js/features/impian-progress.js',
  'js/features/impian-proyek.js',
  'js/features/impian-rencana.js',
  'js/features/keuangan.js',
  'js/data/ikon-badge.js',
  'js/features/galery.js',
  'js/features/galery-pola.js',
  'js/features/galery-lainnya.js',
  'js/features/galery-bersama.js',
  'js/features/galery-lagu.js',
  'js/features/galery-film.js',
  'js/features/galery-buku.js',
  'js/features/galery-tempat.js',
  'js/features/galery-channel.js',
  'js/features/galery-tokoh.js',
  'js/features/galery-link.js',
  'js/features/galery-folder.js',
  'js/features/galery-tab.js',
  'js/platform/input.js',
  'js/main.js'
];
(function () {
  function jalankan() {
    var sisa = MUAT_SKRIP.length;
    MUAT_SKRIP.forEach(function (src) {
      var el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = el.onerror = function () {
        if (--sisa === 0) {
          window.STIVORA_SIAP = true;
          document.dispatchEvent(new Event('stivora:siap'));
        }
      };
      document.body.appendChild(el);
    });
  }
  store.siap().then(jalankan, jalankan);
})();
