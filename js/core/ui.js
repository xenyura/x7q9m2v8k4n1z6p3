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
