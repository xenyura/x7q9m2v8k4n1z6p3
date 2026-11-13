/* Stivora — Pengaturan › Sistem: Versi & pembaruan (PWA) dan Log error */
'use strict';

/* =========================================================
   PEMBARUAN (PWA / service worker)
   - sw.js menyimpan semua file aplikasi agar bisa dibuka offline.
   - Saat versi baru dirilis (VERSI di sw.js berubah), browser mengunduhnya
     di latar belakang lalu aplikasi menampilkan "Versi baru tersedia".
   - Pembaruan dipasang hanya setelah pengguna menekan "Perbarui".
   ========================================================= */
var swReg = null,
  swMenunggu = null,
  swStatus = 'belum'; // belum | aktif | tidak-didukung | gagal
function renderVersiRow() {
  $('#versiSub').textContent = 'Versi ' + APP_VERSI + (swMenunggu ? ' · versi baru tersedia' : '');
  $('#updateBadge').hidden = !swMenunggu;
  var t = $('#versiTentang');
  if (t) t.textContent = APP_VERSI;
}
function tampilkanUpdate(worker) {
  swMenunggu = worker;
  renderVersiRow();
  $('#updateBar').hidden = false;
  if (pageKind === 'versi') buildVersiForm();
}
function pasangUpdate() {
  if (!swMenunggu) return;
  $('#updateBar').hidden = true;
  toast('Memperbarui…');
  swMenunggu.postMessage({ type: 'LEWATI' });
}
function daftarkanSW() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    swStatus = 'tidak-didukung';
    return;
  }
  navigator.serviceWorker
    .register('sw.js')
    .then(function (reg) {
      swReg = reg;
      swStatus = 'aktif';
      if (reg.waiting && navigator.serviceWorker.controller) tampilkanUpdate(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) tampilkanUpdate(w);
        });
      });
      if (pageKind === 'versi') buildVersiForm();
    })
    .catch(function () {
      swStatus = 'gagal';
    });
  /* Setelah versi baru aktif, muat ulang sekali */
  var sudah = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (sudah) return;
    sudah = true;
    location.reload();
  });
  /* Periksa pembaruan saat aplikasi dibuka lagi (paling sering 1 jam sekali) */
  var terakhirCek = Date.now();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && swReg && Date.now() - terakhirCek > 3600000) {
      terakhirCek = Date.now();
      swReg.update().catch(function () {});
    }
  });
}
function periksaUpdate() {
  if (!swReg) {
    toast(swStatus === 'tidak-didukung' ? 'Pembaruan otomatis butuh https (GitHub Pages)' : 'Layanan pembaruan belum siap');
    return;
  }
  toast('Memeriksa pembaruan…');
  swReg
    .update()
    .then(function () {
      setTimeout(function () {
        if (swMenunggu || (swReg && swReg.installing)) return;
        toast('Kamu sudah memakai versi terbaru');
      }, 1500);
    })
    .catch(function () {
      toast('Tidak bisa memeriksa — periksa internet');
    });
}
function buildVersiForm() {
  $('#subTitle').textContent = 'Versi & pembaruan';
  var status = swMenunggu
    ? 'Versi baru sudah diunduh dan siap dipasang.'
    : swStatus === 'aktif'
      ? 'Aplikasi bisa dibuka offline dan memeriksa pembaruan otomatis.'
      : swStatus === 'tidak-didukung'
        ? 'Pembaruan otomatis dan mode offline hanya aktif saat dibuka lewat https (GitHub Pages).'
        : swStatus === 'gagal'
          ? 'Layanan pembaruan gagal dipasang di browser ini.'
          : 'Menyiapkan layanan pembaruan…';
  $('#subBody').innerHTML =
    '<div class="sync-card">' +
    '<div class="info-head"><span class="row-ic">' +
    IKON_VERSI +
    '</span>' +
    '<div class="info-title"><b>Stivora ' +
    APP_VERSI +
    '</b><span class="info-sub">' +
    status +
    '</span></div></div>' +
    (swMenunggu
      ? '<button type="button" class="btn primary" id="btnPasangUpdate">Perbarui sekarang</button>'
      : '<button type="button" class="btn ghost" id="btnCekUpdate">' + ICON.sync + 'Periksa pembaruan</button>') +
    '</div>' +
    '<p class="sub-note">Pembaruan diunduh otomatis di latar belakang. Data impian dan media tidak berubah saat aplikasi diperbarui.</p>';
  return true;
}
var IKON_VERSI = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/><path d="M12 8v4l2.5 2"/></svg>';
function versiClick(e) {
  if (e.target.closest('#btnPasangUpdate')) pasangUpdate();
  else if (e.target.closest('#btnCekUpdate')) periksaUpdate();
}

/* =========================================================
   LOG ERROR (halaman)
   ========================================================= */
function renderGalatRow() {
  var n = bacaGalat().length;
  $('#galatSub').textContent = n ? 'Error terakhir ' + waktuRiwayat(bacaGalat()[0].t) : 'Tidak ada error';
  var c = $('#galatCount');
  c.hidden = !n;
  c.textContent = n;
  if (pageKind === 'galat') buildGalatForm();
}
function buildGalatForm() {
  $('#subTitle').textContent = 'Log error';
  var r = bacaGalat();
  $('#subBody').innerHTML =
    (r.length
      ? '<div class="card list-card riwayat">' +
        r
          .map(function (x, i) {
            var lokasi = x.sumber ? x.sumber + (x.baris ? ':' + x.baris : '') : x.jenis === 'promise' ? 'Promise' : 'Tidak diketahui';
            return (
              '<button type="button" class="row riwayat-item galat-item" data-galat="' +
              i +
              '"><span class="sync-dot err"></span>' +
              '<span class="row-text"><b>' +
              esc(x.pesan) +
              '</b><small>' +
              esc(lokasi) +
              (x.kali > 1 ? ' · ' + x.kali + ' kali' : '') +
              '</small>' +
              '<span class="galat-detail" hidden>' +
              esc('Halaman: ' + (x.halaman || '-') + '\nVersi: ' + (x.versi || '-') + '\n' + (x.stack || '')) +
              '</span></span>' +
              '<span class="riwayat-waktu">' +
              waktuRiwayat(x.t) +
              '</span></button>'
            );
          })
          .join('') +
        '</div>' +
        '<div class="lock-actions"><button type="button" class="btn ghost" id="btnSalinGalat">Salin laporan</button>' +
        '<button type="button" class="btn soft-danger" id="btnHapusGalat">Hapus log</button></div>'
      : '<div class="auth-info"><span class="auth-ic"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg></span><h3>Tidak ada error</h3><p>Jika aplikasi mengalami kesalahan, catatannya muncul di sini.</p></div>') +
    '<p class="sub-note">Ketuk sebuah error untuk melihat detailnya. Jika kamu masuk dengan Google, error juga dikirim ke Firebase Console › Firestore › users › (akunmu) › galat.</p>';
  return true;
}
function galatClick(e) {
  var it = e.target.closest('[data-galat]');
  if (it) {
    var d = it.querySelector('.galat-detail');
    d.hidden = !d.hidden;
    return;
  }
  if (e.target.closest('#btnSalinGalat')) {
    var teks = bacaGalat()
      .map(function (x) {
        return (
          new Date(x.t).toLocaleString('id-ID') +
          ' · ' +
          x.pesan +
          ' (' +
          (x.sumber || x.jenis) +
          (x.baris ? ':' + x.baris : '') +
          ')' +
          (x.kali > 1 ? ' ×' + x.kali : '') +
          '\n  Versi ' +
          x.versi +
          ' · ' +
          x.halaman +
          '\n  ' +
          (x.stack || '').split('\n').slice(0, 4).join('\n  ')
        );
      })
      .join('\n\n');
    (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(
      function () {
        toast('Laporan disalin');
      },
      function () {
        toast('Tidak bisa menyalin di browser ini');
      }
    );
    return;
  }
  if (e.target.closest('#btnHapusGalat')) {
    askConfirm({
      title: 'Hapus log error?',
      ok: 'Hapus',
      text: 'Catatan error di perangkat ini dihapus. Laporan yang sudah terkirim ke Firebase tidak ikut terhapus.',
      action: function () {
        back(1, function () {
          simpanGalat([]);
          renderGalatRow();
          toast('Log error dihapus');
        });
      }
    });
  }
}

PAGES.versi = buildVersiForm;
PAGES.galat = buildGalatForm;
$('#btnVersi').addEventListener('click', function () {
  openLayer('page:versi');
});
$('#btnGalat').addEventListener('click', function () {
  openLayer('page:galat');
});
$('#btnUpdateBar').addEventListener('click', pasangUpdate);
$('#btnUpdateTutup').addEventListener('click', function () {
  $('#updateBar').hidden = true;
});
renderVersiRow();
renderGalatRow();
daftarkanSW();
