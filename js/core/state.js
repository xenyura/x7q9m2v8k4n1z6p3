/* Stivora — Data aplikasi: media dan bantuan tampilannya */
'use strict';

/* ---------- Data media ---------- */
var images = []; // {id, blob, caption, markerId, type, name, createdAt, updatedAt}
var urls = {}; // id -> objectURL

/* 5.37.0: fitur impian lama (daftar impian + Sampah impian) dihapus — buang sisa datanya sekali */
if (store.ada('stivora.dreams')) store.hapus('stivora.dreams');
if (store.ada('stivora.trash')) store.hapus('stivora.trash');
/* Ada data di perangkat ini? (dipakai pengingat cadangan & saat ganti akun) */
function adaDataLokal() {
  if (images.length) return true;
  if (typeof petaMarker !== 'undefined' && (petaMarker.length || petaJalur.length || petaArea.length)) return true;
  return (
    store.kunci('stivora.impian.').length > 0 ||
    store.kunci('stivora.keuangan.').length > 0 ||
    store.ada('stivora.peristiwa') ||
    store.ada('stivora.sumberdaya.info')
  );
}
/* ---------- Jenis media: foto, video, audio, dokumen ---------- */
var JENIS_NAMA = { foto: 'Foto', video: 'Video', audio: 'Audio', dokumen: 'Dokumen' };
function tipeMedia(rec) {
  return rec.type || (rec.blob && rec.blob.type) || '';
}
function jenisMedia(rec) {
  var t = tipeMedia(rec);
  if (/^image\//.test(t)) return 'foto';
  if (/^video\//.test(t)) return 'video';
  if (/^audio\//.test(t)) return 'audio';
  return 'dokumen';
}
function ekstensi(rec) {
  var m = /\.([a-z0-9]{1,5})$/i.exec(rec.name || '');
  if (m) return m[1].toUpperCase();
  var t = tipeMedia(rec);
  if (/pdf/.test(t)) return 'PDF';
  if (/^text\//.test(t)) return 'TXT';
  return jenisMedia(rec) === 'audio' ? 'AUDIO' : 'FILE';
}
function ukuranFile(n) {
  n = n || 0;
  if (n < 1024) return n + ' B';
  if (n < 1048576) return Math.round(n / 1024) + ' KB';
  return (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
}
var IKON_JENIS = {
  audio:
    '<svg viewBox="0 0 24 24"><path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  dokumen:
    '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>'
};
/* Isi kotak kecil (marker peta, Sampah) */
function thumbHTML(rec, cls) {
  var j = jenisMedia(rec);
  if (j === 'audio' || j === 'dokumen') {
    /* Tidak perlu mengunduh file hanya untuk menampilkan ikon */
    return (
      '<span class="g-file g-' +
      j +
      (cls ? ' ' + cls : '') +
      '">' +
      IKON_JENIS[j] +
      '<b>' +
      esc(ekstensi(rec)) +
      '</b><small>' +
      esc(rec.name || JENIS_NAMA[j]) +
      '</small></span>'
    );
  }
  if (!rec.blob) {
    requestBlob(rec);
    return '<span class="g-ph' + (cls ? ' ' + cls : '') + '">' + (user ? '<i class="spin"></i>' : ICON.cloudOff) + '</span>';
  }
  var u = imgUrl(rec);
  if (j === 'video')
    return '<video src="' + u + '#t=0.1" muted playsinline preload="metadata"></video><span class="g-play">' + ICON.play + '</span>';
  return '<img src="' + u + '" alt="' + esc(rec.caption || '') + '" loading="lazy">';
}
function findImg(id) {
  for (var i = 0; i < images.length; i++) if (images[i].id === id) return images[i];
  return typeof gfCariMedia === 'function' ? gfCariMedia(id) : null; /* media dari folder di HP (5.50.0) */
}
function imgUrl(rec) {
  if (!urls[rec.id]) urls[rec.id] = URL.createObjectURL(rec.blob);
  return urls[rec.id];
}
function dropUrl(id) {
  if (urls[id]) {
    URL.revokeObjectURL(urls[id]);
    delete urls[id];
  }
}
