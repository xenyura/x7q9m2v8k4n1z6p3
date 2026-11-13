/* Stivora — Sampah: simpan 30 hari, pulihkan, hapus permanen */
'use strict';

var TRASH_DAYS = 30;

/* ---------- Sampah ----------
   Media (foto/video/audio/dokumen): tetap di IndexedDB dengan tanda trashedAt. */
var trashMedia = [];
function findTrashMedia(id) {
  for (var i = 0; i < trashMedia.length; i++) if (trashMedia[i].id === id) return trashMedia[i];
  return null;
}
function trashTotal() {
  return trashMedia.length;
}
function renderTrashCount() {
  var n = trashTotal(),
    el = $('#trashCount');
  el.textContent = n > 99 ? '99+' : String(n);
  el.hidden = !n;
}

function trashImage(rec) {
  rec.trashedAt = Date.now();
  trashMedia.unshift(rec);
  renderTrashCount();
  return idb.put(rec);
}

/* Hapus otomatis isi Sampah yang lebih tua dari 30 hari */
function purgeTrash() {
  var limit = Date.now() - TRASH_DAYS * 86400000;
  trashMedia = trashMedia.filter(function (r) {
    if (r.trashedAt > limit) return true;
    idb.del(r.id).catch(function () {});
    dropUrl(r.id);
    return false;
  });
  renderTrashCount();
}

function restoreMedia(rec) {
  trashMedia = trashMedia.filter(function (x) {
    return x !== rec;
  });
  rec.trashedAt = null;
  if (rec.blob) rec.uploaded = false; /* unggah ulang ke cloud */
  rec.updatedAt = Date.now();
  images.push(rec);
  images.sort(function (a, b) {
    return b.createdAt - a.createdAt;
  });
  renderTrashCount();
  return idb.put(rec).then(schedulePush);
}
function deleteMediaForever(rec) {
  trashMedia = trashMedia.filter(function (x) {
    return x !== rec;
  });
  dropUrl(rec.id);
  renderTrashCount();
  return idb
    .del(rec.id)
    .catch(function () {})
    .then(schedulePush);
}

function ago(t) {
  var m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return m + ' menit lalu';
  var h = Math.round(m / 60);
  if (h < 24) return h + ' jam lalu';
  return Math.round(h / 24) + ' hari lalu';
}
function daysLeftTrash(t) {
  return Math.max(0, Math.ceil((t + TRASH_DAYS * 86400000 - Date.now()) / 86400000));
}

var RESTORE_ICON = '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/></svg>';

function buildTrashForm() {
  purgeTrash();
  var items = trashMedia
    .map(function (r) {
      return { r: r, at: r.trashedAt };
    })
    .sort(function (a, b) {
      return b.at - a.at;
    });
  $('#subTitle').textContent = 'Sampah';
  var html = '<p class="sheet-note">Item di sini dihapus permanen otomatis setelah ' + TRASH_DAYS + ' hari.</p>';
  if (!items.length) {
    html +=
      '<div class="trash-empty"><span class="auth-ic">' +
      '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6 7l1 12.2a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7"/></svg></span>' +
      '<b>Sampah kosong</b><small>Media yang kamu hapus akan muncul di sini.</small></div>';
  } else {
    html +=
      '<div class="trash-list">' +
      items
        .map(function (it) {
          var key = 'media:' + it.r.id;
          var thumb = '<span class="trash-thumb">' + thumbHTML(it.r) + '</span>';
          var kind = JENIS_NAMA[jenisMedia(it.r)],
            title = it.r.caption || it.r.name || kind;
          return (
            '<div class="trash-item" data-key="' +
            esc(key) +
            '">' +
            thumb +
            '<span class="trash-text"><b translate="no">' +
            esc(title) +
            '</b><small>' +
            kind +
            ' · dihapus ' +
            ago(it.at) +
            ' · sisa ' +
            daysLeftTrash(it.at) +
            ' hari</small></span>' +
            '<button type="button" class="icon-btn sm" data-restore aria-label="Pulihkan">' +
            RESTORE_ICON +
            '</button>' +
            '<button type="button" class="icon-btn sm danger" data-forever aria-label="Hapus permanen">' +
            ICON.trash +
            '</button>' +
            '</div>'
          );
        })
        .join('') +
      '</div>' +
      '<button type="button" class="btn soft-danger" id="btnEmptyTrash">' +
      ICON.trash +
      'Kosongkan sampah</button>';
  }
  $('#subBody').innerHTML = html;
  return true;
}

function trashFind(key) {
  var r = findTrashMedia(key.split(':')[1]);
  return r ? { r: r } : null;
}

function trashClick(e) {
  var row = e.target.closest('.trash-item');
  if (row && e.target.closest('[data-restore]')) {
    var it = trashFind(row.dataset.key);
    if (!it) return;
    var done = function () {
      buildTrashForm();
      refreshAll();
      toast('Dipulihkan');
    };
    restoreMedia(it.r).then(done);
    return;
  }
  if (row && e.target.closest('[data-forever]')) {
    var it2 = trashFind(row.dataset.key);
    if (!it2) return;
    askConfirm({
      title: 'Hapus permanen?',
      text: 'File ini akan dihapus selamanya dan tidak bisa dipulihkan.',
      ok: 'Hapus permanen',
      action: function () {
        var after = function () {
          back(1, function () {
            buildTrashForm();
            toast('Dihapus permanen');
          });
        };
        deleteMediaForever(it2.r).then(after);
      }
    });
    return;
  }
  if (e.target.closest('#btnEmptyTrash')) {
    askConfirm({
      title: 'Kosongkan sampah?',
      text: 'Semua ' + trashTotal() + ' item di Sampah akan dihapus selamanya.',
      ok: 'Kosongkan',
      action: function () {
        var all = trashMedia.slice();
        Promise.all(all.map(deleteMediaForever)).then(function () {
          back(1, function () {
            buildTrashForm();
            toast('Sampah dikosongkan');
          });
        });
      }
    });
  }
}
