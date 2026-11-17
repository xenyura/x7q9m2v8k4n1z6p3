/* Stivora — UI bersama: toast dan dialog konfirmasi */
'use strict';

/* ---------- Toast ---------- */
var toastTimer;
function toast(msg) {
  var t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    t.classList.remove('show');
  }, 2200);
}

/* =========================================================
   KONFIRMASI
   ========================================================= */
var pendingConfirm = null;
function askConfirm(opt) {
  pendingConfirm = opt;
  openLayer('confirm');
}
function buildConfirm() {
  if (!pendingConfirm) return false;
  $('#confirmTitle').textContent = pendingConfirm.title;
  $('#confirmText').textContent = pendingConfirm.text;
  $('#confirmOk').textContent = pendingConfirm.ok || 'Ya';
  /* tone: 'danger' (bawaan, merah) atau 'primary' (warna aksen) untuk pilihan yang tidak berbahaya */
  $('#confirmOk').className = 'btn ' + (pendingConfirm.tone === 'primary' ? 'primary' : 'danger');
  return true;
}
$('#confirmOk').addEventListener('click', function () {
  var p = pendingConfirm;
  pendingConfirm = null;
  if (p && p.action) p.action();
  else back(1);
});

/* ---------- Gambar ulang tertunda (5.73.0) ----------
   Isi tab di bawah halaman yang sedang terbuka tidak perlu digambar ulang di setiap ketikan.
   renderNanti(fn): langsung jalan kalau tidak ada lapisan terbuka; kalau ada, sekali saja saat semua lapisan ditutup. */
var RENDER_TUNDA = [];
function renderNanti(fn) {
  if (typeof cur !== 'undefined' && cur && cur.layers.length) {
    if (RENDER_TUNDA.indexOf(fn) < 0) RENDER_TUNDA.push(fn);
  } else fn();
}
function jalankanRenderTunda() {
  if (!RENDER_TUNDA.length || (typeof cur !== 'undefined' && cur && cur.layers.length)) return;
  var l = RENDER_TUNDA;
  RENDER_TUNDA = [];
  l.forEach(function (fn) {
    try {
      fn();
    } catch (e) {
      if (window.catatGalat) catatGalat({ pesan: 'Gambar ulang tertunda: ' + ((e && e.message) || e), stack: e && e.stack });
    }
  });
}
