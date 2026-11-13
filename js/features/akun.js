/* Stivora — Tampilan akun di Pengaturan, status sinkron, tombol Keluar */
'use strict';

/* ---------- Tampilan akun ---------- */
function userName() {
  return user ? user.displayName || String(user.email || '').split('@')[0] : '';
}
function initials(name) {
  var w = String(name || '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!w.length) return '?';
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
}
function avatarHTML() {
  return user && user.photoURL ? '<img src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">' : esc(initials(userName()));
}
function renderAccount() {
  var on = !!user;
  $('#profileRow').hidden = !on;
  $('#logoutGroup').hidden = !on;
  if (on) $('#logoutSub').textContent = user.email || 'Akun Google';
  $('#loginGrid').hidden = on;
  $('#loginTitle').hidden = on;
  renderBackupRow();
  if (opened.page === 'page:backup') buildBackupForm();
  if (on) {
    $('#profileAvatar').innerHTML = avatarHTML();
    $('#profileName').textContent = userName();
    $('#profileEmail').textContent = user.email || '';
  }
}

function syncLabel() {
  if (!navigator.onLine && sync.state !== 'syncing') return { cls: 'warn', text: 'Offline — perubahan dikirim saat online' };
  if (sync.state === 'syncing') return { cls: 'busy', text: 'Menyinkronkan…' };
  if (sync.state === 'error') return { cls: 'err', text: sync.err || 'Gagal sinkron' };
  if (sync.state === 'ok') {
    return { cls: 'ok', text: 'Tersinkron · ' + new Date(sync.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) };
  }
  return { cls: '', text: 'Belum disinkronkan' };
}
function mediaLabel() {
  if (!mediaConfigured()) return 'Penyimpanan media belum diatur — media hanya di perangkat ini';
  var up = images.filter(function (i) {
    return i.uploaded;
  }).length;
  var wait = images.filter(function (i) {
    return !i.uploaded;
  }).length;
  return up + ' media di cloud' + (wait ? ' · ' + wait + ' menunggu diunggah' : '');
}

function refreshAccountSheet() {
  if (!$('#syncText')) return;
  var s = syncLabel();
  $('#syncDot').className = 'sync-dot ' + s.cls;
  $('#syncText').textContent = s.text;
  $('#mediaText').textContent = atur().media ? mediaLabel() : 'Media tidak disertakan ke cloud';
  $('#btnSyncNow').disabled = sync.state === 'syncing';
}

/* Tombol Keluar akun di bawah halaman Pengaturan (dengan konfirmasi) */
$('#btnLogoutMain').addEventListener('click', function () {
  if (!user) return;
  askConfirm({
    title: 'Keluar dari akun?',
    text: 'Perubahan terakhir dikirim dulu ke cloud. Data tetap tersimpan di perangkat ini.',
    ok: 'Keluar',
    action: logout
  });
});
$('#btnLoginGoogle').addEventListener('click', loginGoogle);

window.addEventListener('online', function () {
  refreshAccountSheet();
  if (user && atur().otomatis) syncNow(false);
});
window.addEventListener('offline', refreshAccountSheet);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden && user && atur().antar && Date.now() - sync.lastPull > 5 * 60 * 1000) syncNow(true);
});

function initAuth() {
  renderAccount();
  if (fbConfigured())
    loadFirebase().catch(function () {
      /* offline: aplikasi tetap jalan */
    });
}
