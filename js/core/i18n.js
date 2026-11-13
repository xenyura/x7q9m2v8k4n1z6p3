/* Stivora — Sistem bahasa: menerjemahkan tampilan ke Bahasa Aceh */
'use strict';

/* =========================================================
   CARA KERJA
   - Teks aplikasi ditulis dalam Bahasa Indonesia (sumber).
   - Jika bahasa = Aceh, setiap teks yang tampil (termasuk toast & dialog)
     dicari di kamus js/i18n/ace.js lalu diganti.
       1. KAMUS_ACE  : teks persis → terjemahan
       2. POLA_ACE   : teks dengan angka/nama (regex) → templat {1}, [1], ...
          {n} ikut diterjemahkan lagi; [n] ditampilkan apa adanya (nama, judul, email).
   - Teks buatan pengguna (judul impian, langkah, keterangan, nama file,
     profil) TIDAK diterjemahkan — lihat LEWATI di bawah.
   - Teks yang belum ada di kamus tetap tampil dalam Bahasa Indonesia.
   Menambah/memperbaiki terjemahan cukup di js/i18n/ace.js.
   ========================================================= */
var LEWATI =
  '[translate="no"], .dc-title, .dc-why, .d-head h2, .d-why:not(.muted), .step-text, .g-cap, .link-dream, ' +
  '#fDream option:not([value=""]), #profileName, #profileEmail, .g-file small, .viewer-file b, .pick-file b, .galat-detail, .galat-item b, ' +
  'script, style';
/* Isi kolom isian (value) tidak pernah disentuh: hanya teks node & atribut placeholder/aria-label/title */
var ATRIBUT = ['placeholder', 'aria-label', 'title'];

function bahasaKode() {
  try {
    return localStorage.getItem('stivora.lang') === 'ace' ? 'ace' : 'id';
  } catch (e) {
    return 'id';
  }
}
var i18nAktif = bahasaKode() === 'ace' && typeof KAMUS_ACE !== 'undefined';

/* Terjemahkan satu teks (tanpa spasi tepi). Kembalikan teks asli bila tidak dikenal. */
function terjemah(t) {
  if (!i18nAktif || !t) return t;
  if (Object.prototype.hasOwnProperty.call(KAMUS_ACE, t)) return KAMUS_ACE[t];
  for (var i = 0; i < POLA_ACE.length; i++) {
    var m = POLA_ACE[i][0].exec(t);
    if (m)
      return POLA_ACE[i][1].replace(/\{(\d)\}|\[(\d)\]/g, function (_, a, b) {
        return a ? terjemah(m[a] || '') : m[b] || ''; // {n} diterjemahkan, [n] apa adanya (nama, judul, email)
      });
  }
  return t;
}
function lewati(el) {
  return !el || (el.closest && el.closest(LEWATI));
}
function terjemahNode(n) {
  var s = n.data,
    t = s.trim();
  if (!t || lewati(n.parentElement)) return;
  var h = terjemah(t);
  if (h !== t) n.data = s.replace(t, h);
}
function terjemahAtribut(el) {
  if (lewati(el)) return;
  for (var i = 0; i < ATRIBUT.length; i++) {
    var v = el.getAttribute(ATRIBUT[i]);
    if (v) {
      var h = terjemah(v.trim());
      if (h !== v.trim()) el.setAttribute(ATRIBUT[i], h);
    }
  }
}
function terjemahPohon(root) {
  if (root.nodeType === 3) {
    terjemahNode(root);
    return;
  }
  if (root.nodeType !== 1 || lewati(root)) return;
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
    n;
  while ((n = w.nextNode())) terjemahNode(n);
  terjemahAtribut(root);
  var els = root.querySelectorAll('[placeholder],[aria-label],[title]');
  for (var i = 0; i < els.length; i++) terjemahAtribut(els[i]);
}

if (i18nAktif) {
  document.documentElement.lang = 'ace';
  terjemahPohon(document.body);
  document.title = terjemah(document.title);
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'characterData') terjemahNode(m.target);
      else if (m.type === 'attributes') terjemahAtribut(m.target);
      else m.addedNodes.forEach(terjemahPohon);
    });
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUT });
}
document.documentElement.classList.remove('i18n-tunggu');
