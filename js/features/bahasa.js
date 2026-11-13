/* Stivora — Bahasa: pilihan bahasa dan bendera */
'use strict';

/* =========================================================
   PENGATURAN: Bahasa · Cadangkan & pulihkan · Ekspor & impor · Sampah
   ========================================================= */
var K_LANG = 'stivora.lang';
/* Bendera: Indonesia (merah-putih) dan Aceh (Bulan Bintang, Qanun Aceh No. 3/2013) */
var FLAG_ID =
  '<svg class="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="10" fill="#E70011"/><rect y="10" width="30" height="10" fill="#fff"/></svg>';
var FLAG_ACE =
  '<svg class="flag" viewBox="0 0 30 20" aria-hidden="true">' +
  '<rect width="30" height="20" fill="#C8102E"/>' +
  '<rect y="2" width="30" height="0.7" fill="#fff"/><rect y="2.7" width="30" height="1.6" fill="#111"/><rect y="4.3" width="30" height="0.7" fill="#fff"/>' +
  '<rect y="15" width="30" height="0.7" fill="#fff"/><rect y="15.7" width="30" height="1.6" fill="#111"/><rect y="17.3" width="30" height="0.7" fill="#fff"/>' +
  '<path d="M14.2 6.6a3.6 3.6 0 1 0 0 6.8a2.9 2.9 0 1 1 0-6.8z" fill="#fff"/>' +
  '<path d="M17.4 8.4l.46 1.4h1.47l-1.19.87.46 1.4-1.2-.87-1.19.87.46-1.4-1.2-.87h1.48z" fill="#fff"/></svg>';
var LANGS = [
  { code: 'id', name: 'Bahasa Indonesia', short: 'Indonesia', flag: FLAG_ID, ready: true },
  { code: 'ace', name: 'Bahasa Aceh', short: 'Aceh', flag: FLAG_ACE, ready: true }
];

/* ---------- Bahasa ---------- */
function langCode() {
  var c = store.raw(K_LANG);
  return c === 'ace' ? 'ace' : 'id';
}
function renderLang() {
  var l =
    LANGS.filter(function (x) {
      return x.code === langCode();
    })[0] || LANGS[0];
  $('#bahasaValue').innerHTML = l.flag + '<span>' + l.short + '</span>';
}
var CHECK_ICON = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
function buildLangForm() {
  var c = langCode();
  $('#subTitle').textContent = 'Bahasa';
  $('#subBody').innerHTML =
    '<div class="choice-list">' +
    LANGS.map(function (l) {
      var on = l.code === c;
      return (
        '<button type="button" class="choice' +
        (on ? ' active' : '') +
        '" data-lang="' +
        l.code +
        '"' +
        (l.ready ? '' : ' aria-disabled="true"') +
        '>' +
        '<span class="choice-flag">' +
        l.flag +
        '</span>' +
        '<span class="choice-text"><b>' +
        l.name +
        '</b>' +
        (l.ready ? '' : '<small>Segera hadir</small>') +
        '</span>' +
        (on ? '<span class="choice-check">' + CHECK_ICON + '</span>' : '') +
        '</button>'
      );
    }).join('') +
    '</div>';
  return true;
}
function langClick(e) {
  var b = e.target.closest('[data-lang]');
  if (!b) return;
  var l = LANGS.filter(function (x) {
    return x.code === b.dataset.lang;
  })[0];
  if (!l.ready) {
    toast(l.name + ' segera hadir');
    return;
  }
  if (l.code === langCode()) return;
  store.raw(K_LANG, l.code);
  renderLang();
  buildLangForm();
  /* Muat ulang agar semua teks memakai bahasa baru (halaman yang terbuka tetap sama) */
  setTimeout(function () {
    location.reload();
  }, 150);
}
