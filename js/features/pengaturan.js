/* Stivora — Halaman-halaman fitur Pengaturan */
'use strict';

/* ---------- Halaman pengaturan (bukan popup) ---------- */
var pageKind = null;
var PAGES = {
  mode: buildModeForm,
  bahasa: buildLangForm,
  backup: buildBackupForm,
  transfer: buildTransferForm,
  trash: buildTrashForm,
  e2e: buildE2EForm,
  riwayat: buildRiwayatForm,
  tema: function () {
    temaTab = null;
    return buildTemaForm();
  }
};
function buildPage(kind) {
  if (!PAGES[kind]) return false;
  var ok = PAGES[kind]();
  if (ok === false) return false;
  pageKind = kind;
  $('#subBody').scrollTop = 0;
  return true;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'bahasa') langClick(e);
  else if (pageKind === 'backup') backupClick(e);
  else if (pageKind === 'transfer') transferClick(e);
  else if (pageKind === 'trash') trashClick(e);
  else if (pageKind === 'tema') temaClick(e);
  else if (pageKind === 'kunci') kunciClick(e);
  else if (pageKind === 'e2e') e2eClick(e);
  else if (pageKind === 'versi') versiClick(e);
  else if (pageKind === 'galat') galatClick(e);
  else if (pageKind === 'mode') {
    var opt = e.target.closest('.theme-opt');
    if (opt) {
      store.raw(K_THEME, opt.dataset.themeMode);
      applyTheme();
    }
  }
});

$('#btnBahasa').addEventListener('click', function () {
  openLayer('page:bahasa');
});
$('#btnBackup').addEventListener('click', function () {
  openLayer('page:backup');
});
$('#btnTransfer').addEventListener('click', function () {
  openLayer('page:transfer');
});
$('#btnTrash').addEventListener('click', function () {
  openLayer('page:trash');
});
