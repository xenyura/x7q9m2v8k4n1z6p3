/* Stivora — Monitoring error: tangkap error, simpan log, kirim ke Firebase */
'use strict';

/* =========================================================
   MONITORING ERROR
   - Menangkap error JavaScript (window 'error') dan promise yang gagal
     tanpa ditangani ('unhandledrejection').
   - Disimpan di perangkat: localStorage 'stivora.galat' (maks. 50, error sama digabung).
   - Jika sudah masuk Google, juga dikirim ke Firestore:
       users/{uid}/galat/{id}  → bisa dilihat di Firebase Console › Firestore.
     Maks. 10 laporan per sesi agar tidak boros kuota.
   - File ini dimuat paling awal (setelah config.js) agar error di file lain ikut tertangkap.
   ========================================================= */
var K_GALAT = 'stivora.galat';
var galatTerkirim = 0,
  galatAntrean = [];
var GALAT_MAKS_KIRIM = 10;

function bacaGalat() {
  try {
    var r = JSON.parse(localStorage.getItem(K_GALAT) || '[]');
    return Array.isArray(r) ? r : [];
  } catch (e) {
    return [];
  }
}
function simpanGalat(r) {
  try {
    localStorage.setItem(K_GALAT, JSON.stringify(r.slice(0, 50)));
  } catch (e) {}
}
function potong(s, n) {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}
function namaFile(u) {
  return String(u || '')
    .replace(location.origin, '')
    .replace(/[?#].*$/, '');
}

function catatGalat(info) {
  var e = {
    t: Date.now(),
    pesan: potong(info.pesan || 'Error tanpa pesan', 300),
    sumber: potong(namaFile(info.sumber), 200),
    baris: info.baris | 0,
    kolom: info.kolom | 0,
    stack: potong(info.stack, 1500),
    jenis: info.jenis || 'error',
    versi: typeof APP_VERSI !== 'undefined' ? APP_VERSI : '',
    halaman: potong(typeof cur !== 'undefined' && cur ? cur.tab + (cur.layers.length ? ' › ' + cur.layers.join(' › ') : '') : '', 200),
    perangkat: potong(navigator.userAgent, 300),
    kali: 1
  };
  var r = bacaGalat(),
    a = r[0];
  if (a && a.pesan === e.pesan && a.sumber === e.sumber && a.baris === e.baris && e.t - a.t < 60000) {
    a.kali = (a.kali || 1) + 1;
    a.t = e.t;
  } else {
    r.unshift(e);
    kirimGalat(e);
  }
  simpanGalat(r);
  if (typeof renderGalatRow === 'function') renderGalatRow();
}

/* Kirim ke Firestore (jika sudah masuk); kalau belum, antrekan sampai login */
function kirimGalat(e) {
  if (galatTerkirim >= GALAT_MAKS_KIRIM) return;
  var siap = typeof user !== 'undefined' && user && typeof fb !== 'undefined' && fb;
  if (!siap) {
    if (galatAntrean.length < GALAT_MAKS_KIRIM) galatAntrean.push(e);
    return;
  }
  galatTerkirim++;
  var F = fb.F,
    id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  var data = {
    t: e.t,
    pesan: e.pesan,
    sumber: e.sumber,
    baris: e.baris,
    kolom: e.kolom,
    stack: e.stack,
    jenis: e.jenis,
    versi: e.versi,
    halaman: e.halaman,
    perangkat: e.perangkat
  };
  F.setDoc(F.doc(fb.db, 'users', user.uid, 'galat', id), data).catch(function () {
    /* jangan sampai error melapor error */
  });
}
function kirimAntreanGalat() {
  var q = galatAntrean;
  galatAntrean = [];
  q.forEach(kirimGalat);
}

window.addEventListener('error', function (ev) {
  /* Abaikan error dari ekstensi browser dan peringatan ResizeObserver yang tidak berbahaya */
  if (ev.filename && ev.filename.indexOf(location.origin) !== 0 && !/gstatic\.com/.test(ev.filename)) return;
  if (/ResizeObserver loop/.test(ev.message || '')) return;
  if (!ev.error && ev.target && ev.target !== window) return; // gagal memuat gambar/video: bukan bug kode
  catatGalat({
    pesan: ev.message,
    sumber: ev.filename,
    baris: ev.lineno,
    kolom: ev.colno,
    stack: ev.error && ev.error.stack,
    jenis: 'error'
  });
});
window.addEventListener('unhandledrejection', function (ev) {
  var r = ev.reason || {};
  catatGalat({ pesan: (r && r.message) || String(r), stack: r && r.stack, jenis: 'promise' });
});

/* Pelanggaran Content Security Policy (misalnya skrip asing yang diblokir) ikut dicatat */
document.addEventListener('securitypolicyviolation', function (ev) {
  catatGalat({
    pesan: 'CSP memblokir ' + ev.effectiveDirective + ': ' + (ev.blockedURI || 'inline'),
    sumber: ev.sourceFile,
    baris: ev.lineNumber,
    jenis: 'csp'
  });
});
