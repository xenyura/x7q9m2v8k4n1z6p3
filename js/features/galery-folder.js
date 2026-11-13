/* ============================================================
   Stivora — Galery · Folder di HP (5.50.0)
   Tab Foto & Video menampilkan isi folder di HP yang diizinkan (hanya-lihat):
   - Tidak disalin, tidak diunggah, tidak dicadangkan (keputusan 1a).
   - Subfolder ikut dipindai.
   - "Pegangan" folder (izin Chrome) hanya bisa disimpan di perangkat ini
     (IndexedDB 'stivora-folder'). Yang ikut akun/cloud hanya catatan foldernya:
     nama, subfolder, jumlah foto & video, tanda isi ('stivora.galery.folder' ⇄ 'galery-folder').
   - Setelah pasang ulang + login: folder muncul sebagai "pernah dihubungkan",
     cukup ketuk sekali untuk mengizinkan lagi.
   - Perubahan isi folder (baru/hilang/subfolder hilang/folder berbeda) diberi keterangan.
   ============================================================ */
'use strict';

var K_GF = 'stivora.galery.folder';
var K_GF_LAMA = 'stivora.galery.lamaDipindah';
var GF_MAKS = 20,
  GF_MAKS_FILE = 5000,
  GF_KEDALAMAN = 8,
  GF_SUB_MAKS = 200;
var GF_EKS = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
  mkv: 'video/x-matroska'
};
var GF_IKON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
var GF_IKON_TAMBAH =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10.5v6M9 13.5h6"/></svg>';

function gfDidukung() {
  return typeof window.showDirectoryPicker === 'function';
}
function gfTipe(nama) {
  var m = /\.([a-z0-9]+)$/i.exec(nama || '');
  return m ? GF_EKS[m[1].toLowerCase()] || '' : '';
}
function gfHash(t) {
  var h = 2166136261;
  for (var i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + t.length.toString(36);
}

/* ---------- Catatan folder (ikut akun) ---------- */
function gfMeta() {
  var d = store.get(K_GF, []);
  if (!Array.isArray(d)) return [];
  return d
    .filter(function (x) {
      return x && typeof x.id === 'string' && x.nama;
    })
    .slice(0, GF_MAKS)
    .map(function (x) {
      return {
        id: x.id.slice(0, 64),
        nama: String(x.nama).slice(0, 200),
        dibuat: +x.dibuat || 0,
        dipindai: +x.dipindai || 0,
        foto: +x.foto || 0,
        video: +x.video || 0,
        tanda: String(x.tanda || '').slice(0, 40),
        sub: Array.isArray(x.sub)
          ? x.sub
              .filter(function (s) {
                return typeof s === 'string';
              })
              .slice(0, GF_SUB_MAKS)
              .map(function (s) {
                return s.slice(0, 200);
              })
          : []
      };
    });
}
function gfMetaSimpan(d) {
  store.set(K_GF, d.slice(0, GF_MAKS));
}
function gfMetaCari(id) {
  return (
    gfMeta().filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function gfMetaUbah(id, ubah) {
  var d = gfMeta(),
    ada = false;
  d = d.map(function (x) {
    if (x.id !== id) return x;
    ada = true;
    Object.keys(ubah).forEach(function (k) {
      x[k] = ubah[k];
    });
    return x;
  });
  if (!ada) {
    var b = { id: id, nama: '', dibuat: Date.now(), dipindai: 0, foto: 0, video: 0, tanda: '', sub: [] };
    Object.keys(ubah).forEach(function (k) {
      b[k] = ubah[k];
    });
    d.push(b);
  }
  gfMetaSimpan(d);
}

/* ---------- Pegangan folder (hanya di perangkat ini) ---------- */
var gfDbJanji = null;
function gfDb() {
  if (!gfDbJanji)
    gfDbJanji = new Promise(function (res, rej) {
      var r = indexedDB.open('stivora-folder', 1);
      r.onupgradeneeded = function () {
        r.result.createObjectStore('folder', { keyPath: 'id' });
      };
      r.onsuccess = function () {
        res(r.result);
      };
      r.onerror = function () {
        rej(r.error);
      };
    });
  return gfDbJanji;
}
function gfDbJalan(mode, fn) {
  return gfDb().then(function (db) {
    return new Promise(function (res, rej) {
      var tx = db.transaction('folder', mode),
        st = tx.objectStore('folder'),
        r = fn(st);
      tx.oncomplete = function () {
        res(r && r.result);
      };
      tx.onerror = function () {
        rej(tx.error);
      };
      tx.onabort = function () {
        rej(tx.error);
      };
    });
  });
}
function gfDbSemua() {
  return gfDbJalan('readonly', function (st) {
    return st.getAll();
  }).catch(function () {
    return [];
  });
}
function gfDbSimpan(rec) {
  return gfDbJalan('readwrite', function (st) {
    return st.put(rec);
  }).catch(function () {});
}
function gfDbHapus(id) {
  return gfDbJalan('readwrite', function (st) {
    return st.delete(id);
  }).catch(function () {});
}

/* ---------- Keadaan selama aplikasi terbuka ---------- */
var gfLokal = {}; /* id -> { id, handle, snap: { path: 'ukuran|waktu' }, pesan } */
var gfRun = {}; /* id -> { status: 'siap'|'izin'|'tanpa'|'memindai'|'galat', media: [], subs: [] } */
var gfMulaiJanji = null;

function gfMedia(j) {
  var o = [];
  gfMeta().forEach(function (m) {
    var r = gfRun[m.id];
    if (r && r.media)
      r.media.forEach(function (x) {
        if (!j || jenisMedia(x) === j) o.push(x);
      });
  });
  return o;
}
function gfCariMedia(id) {
  if (typeof id !== 'string' || id.indexOf('f:') !== 0) return null;
  var fid = id.split(':')[1],
    r = gfRun[fid];
  if (!r || !r.media) return null;
  for (var i = 0; i < r.media.length; i++) if (r.media[i].id === id) return r.media[i];
  return null;
}

function gfMulai() {
  if (gfMulaiJanji) return gfMulaiJanji;
  gfMulaiJanji = gfDbSemua().then(function (list) {
    (list || []).forEach(function (rec) {
      if (rec && rec.id && rec.handle) gfLokal[rec.id] = rec;
    });
    return gfSegarkan();
  });
  return gfMulaiJanji;
}
/* Cocokkan catatan (akun) dengan pegangan (perangkat). Dipanggil saat mulai & setelah data cloud masuk. */
function gfSegarkan() {
  var meta = gfMeta(),
    ids = {};
  meta.forEach(function (m) {
    ids[m.id] = 1;
  });
  /* Folder yang sudah diputus (di perangkat ini atau perangkat lain): buang pegangannya */
  Object.keys(gfLokal).forEach(function (id) {
    if (!ids[id]) {
      gfBuangMedia(id);
      delete gfLokal[id];
      delete gfRun[id];
      gfDbHapus(id);
    }
  });
  var kerja = meta.map(function (m) {
    var L = gfLokal[m.id],
      r = gfRun[m.id];
    if (r && (r.status === 'siap' || r.status === 'memindai')) return Promise.resolve();
    if (!L) {
      gfRun[m.id] = { status: 'tanpa', media: [], subs: [] };
      return Promise.resolve();
    }
    var q = L.handle.queryPermission ? L.handle.queryPermission({ mode: 'read' }) : Promise.resolve('granted');
    return Promise.resolve(q)
      .then(function (s) {
        if (s === 'granted') return gfPindai(m.id);
        gfRun[m.id] = { status: 'izin', media: [], subs: [] };
      })
      .catch(function () {
        gfRun[m.id] = { status: 'izin', media: [], subs: [] };
      });
  });
  gfTampil();
  return Promise.all(kerja).then(gfTampil);
}
function gfTampil() {
  if (typeof renderGaleryTab === 'function') renderGaleryTab();
  if (pageKind === 'galery-folder' && opened.page === 'page:galery-folder') gfRenderHal();
}
function gfBuangMedia(id) {
  var r = gfRun[id];
  if (r && r.media)
    r.media.forEach(function (x) {
      dropUrl(x.id);
    });
}

/* ---------- Memindai folder ---------- */
async function gfJelajah(dir, awalan, out, subs, dalam) {
  for await (var pasang of dir.entries()) {
    if (out.length >= GF_MAKS_FILE) return;
    var nama = pasang[0],
      h = pasang[1];
    if (!nama || nama.charAt(0) === '.') continue;
    if (h.kind === 'directory') {
      if (dalam < GF_KEDALAMAN) {
        subs.push(awalan + nama);
        await gfJelajah(h, awalan + nama + '/', out, subs, dalam + 1);
      }
    } else {
      var t = gfTipe(nama);
      if (!t) continue;
      try {
        out.push({ path: awalan + nama, file: await h.getFile(), tipe: t });
      } catch (e) {}
    }
  }
}
function gfPindai(id) {
  var L = gfLokal[id],
    m = gfMetaCari(id);
  if (!L || !m) return Promise.resolve();
  var lama = gfRun[id];
  gfRun[id] = { status: 'memindai', media: (lama && lama.media) || [], subs: (lama && lama.subs) || [] };
  gfTampil();
  var out = [],
    subs = [];
  return gfJelajah(L.handle, '', out, subs, 1)
    .then(function () {
      gfBuangMedia(id);
      var media = out.map(function (x) {
        var f = x.file,
          t = f.type && /^(image|video)\//.test(f.type) ? f.type : x.tipe;
        return {
          id: 'f:' + id + ':' + x.path,
          folderId: id,
          path: x.path,
          blob: f,
          name: f.name,
          type: t,
          size: f.size,
          createdAt: f.lastModified || 0,
          updatedAt: f.lastModified || 0,
          caption: '',
          markerId: null,
          dariFolder: true
        };
      });
      /* Bandingkan dengan pemindaian terakhir */
      var snap = {},
        baris = [];
      out.forEach(function (x) {
        var v = x.file.size + '|' + (x.file.lastModified || 0);
        snap[x.path] = v;
        baris.push(x.path + '|' + v);
      });
      baris.sort();
      var tanda = gfHash(baris.join('\n')),
        foto = media.filter(function (x) {
          return jenisMedia(x) === 'foto';
        }).length,
        video = media.length - foto;
      var pesan = [];
      if (L.beda) {
        pesan.push('Folder yang dipilih ("' + L.handle.name + '") berbeda dari yang dulu ("' + L.beda + '").');
        delete L.beda;
      }
      if (L.snap) {
        var baru = Object.keys(snap).filter(function (p) {
            return !L.snap[p];
          }).length,
          hilang = Object.keys(L.snap).filter(function (p) {
            return !snap[p];
          }).length;
        if (baru || hilang)
          pesan.push(
            [baru ? baru + ' file baru' : '', hilang ? hilang + ' file hilang' : ''].filter(Boolean).join(', ') +
              ' sejak terakhir dipindai.'
          );
      } else if (m.tanda && m.tanda !== tanda) {
        pesan.push(
          'Isi folder berubah sejak terakhir dipindai: dulu ' +
            m.foto +
            ' foto · ' +
            m.video +
            ' video, sekarang ' +
            foto +
            ' foto · ' +
            video +
            ' video.'
        );
      }
      var subHilang = m.sub.filter(function (s) {
        return subs.indexOf(s) < 0;
      });
      if (subHilang.length)
        pesan.push(
          'Subfolder tidak ditemukan: ' +
            subHilang.slice(0, 3).join(', ') +
            (subHilang.length > 3 ? ' dan ' + (subHilang.length - 3) + ' lainnya' : '') +
            '.'
        );
      if (out.length >= GF_MAKS_FILE) pesan.push('Hanya ' + GF_MAKS_FILE + ' file pertama yang ditampilkan.');
      L.snap = snap;
      if (pesan.length) L.pesan = pesan.join('\n');
      gfDbSimpan(L);
      gfRun[id] = { status: 'siap', media: media, subs: subs };
      gfMetaUbah(id, {
        nama: L.handle.name,
        dipindai: Date.now(),
        foto: foto,
        video: video,
        tanda: tanda,
        sub: subs.slice(0, GF_SUB_MAKS)
      });
      gfTampil();
    })
    .catch(function () {
      gfRun[id] = { status: 'galat', media: [], subs: [] };
      gfTampil();
    });
}

/* ---------- Menghubungkan / izin ---------- */
function gfHubungkan(targetId) {
  if (!gfDidukung()) {
    toast('Chrome di perangkat ini belum bisa memilih folder');
    return;
  }
  if (!targetId && gfMeta().length >= GF_MAKS) {
    toast('Maksimal ' + GF_MAKS + ' folder');
    return;
  }
  var opsi = { mode: 'read', id: 'stivora-galery' };
  try {
    opsi.startIn = 'pictures';
  } catch (e) {}
  window
    .showDirectoryPicker(opsi)
    .then(function (h) {
      /* Folder yang sama tidak boleh dihubungkan dua kali */
      var cek = Object.keys(gfLokal)
        .filter(function (id) {
          return id !== targetId;
        })
        .map(function (id) {
          return Promise.resolve(gfLokal[id].handle.isSameEntry ? gfLokal[id].handle.isSameEntry(h) : false).catch(function () {
            return false;
          });
        });
      return Promise.all(cek).then(function (sama) {
        if (sama.some(Boolean)) {
          toast('Folder ini sudah terhubung');
          return;
        }
        var m = targetId ? gfMetaCari(targetId) : null;
        if (m && m.nama && m.nama !== h.name) {
          askConfirm({
            title: 'Folder berbeda?',
            text: 'Dulu terhubung ke folder "' + m.nama + '", sekarang kamu memilih "' + h.name + '". Tetap pakai folder ini?',
            ok: 'Pakai',
            tone: 'primary',
            action: function () {
              back(1, function () {
                gfPasang(targetId, h, m.nama);
              });
            }
          });
          return;
        }
        gfPasang(targetId, h, '');
      });
    })
    .catch(function (e) {
      if (e && e.name === 'AbortError') return;
      toast('Folder tidak bisa dibuka' + (e && e.name === 'SecurityError' ? ' (folder ini dibatasi Android)' : ''));
    });
}
function gfPasang(targetId, h, namaLama) {
  var id = targetId || uid();
  gfBuangMedia(id);
  gfLokal[id] = { id: id, handle: h, snap: null, pesan: '' };
  if (namaLama) gfLokal[id].beda = namaLama;
  if (!targetId) gfMetaUbah(id, { nama: h.name, dibuat: Date.now() });
  delete gfRun[id];
  gfDbSimpan(gfLokal[id])
    .then(function () {
      return gfPindai(id);
    })
    .then(function () {
      var r = gfRun[id];
      if (r && r.status === 'siap') toast('Folder "' + h.name + '" terhubung · ' + r.media.length + ' file');
    });
}
function gfIzinkan(id) {
  var L = gfLokal[id];
  if (!L) {
    gfHubungkan(id);
    return;
  }
  var q = L.handle.requestPermission ? L.handle.requestPermission({ mode: 'read' }) : Promise.resolve('granted');
  Promise.resolve(q)
    .then(function (s) {
      if (s === 'granted') gfPindai(id);
      else toast('Izin folder belum diberikan');
    })
    .catch(function () {
      gfHubungkan(id);
    });
}
function gfPutuskan(id) {
  var m = gfMetaCari(id);
  if (!m) return;
  askConfirm({
    title: 'Putuskan folder?',
    text: 'Foto & video dari folder "' + m.nama + '" tidak tampil lagi di Stivora. File di HP tidak dihapus.',
    ok: 'Putuskan',
    action: function () {
      back(1, function () {
        gfBuangMedia(id);
        delete gfLokal[id];
        delete gfRun[id];
        gfDbHapus(id);
        gfMetaSimpan(
          gfMeta().filter(function (x) {
            return x.id !== id;
          })
        );
        var awal = 'f:' + id + ':',
          s = gtSematan(),
          s2 = s.filter(function (x) {
            return x.indexOf(awal) !== 0;
          });
        if (s2.length !== s.length) gbSimpanSemua({ sematan: s2 });
        gfTampil();
        toast('Folder diputus');
      });
    }
  });
}
function gfTutupPesan(id) {
  var L = gfLokal[id];
  if (L && L.pesan) {
    L.pesan = '';
    gfDbSimpan(L);
  }
  gfTampil();
}

/* ---------- Keterangan di tab Foto & Video ---------- */
function gfInfoHtml() {
  var h = '';
  gfMeta().forEach(function (m) {
    var r = gfRun[m.id] || {},
      L = gfLokal[m.id];
    if (r.status === 'tanpa')
      h +=
        '<div class="gf-info">' +
        GF_IKON +
        '<span>Folder <b>' +
        esc(m.nama) +
        '</b> pernah dihubungkan. Izinkan lagi untuk menampilkan isinya di HP ini.</span><button type="button" class="btn primary" data-gf-izin="' +
        esc(m.id) +
        '">Hubungkan</button></div>';
    else if (r.status === 'izin')
      h +=
        '<div class="gf-info">' +
        GF_IKON +
        '<span>Izin folder <b>' +
        esc(m.nama) +
        '</b> perlu diberikan lagi.</span><button type="button" class="btn primary" data-gf-izin="' +
        esc(m.id) +
        '">Izinkan</button></div>';
    else if (r.status === 'galat')
      h +=
        '<div class="gf-info gf-warn">' +
        GF_IKON +
        '<span>Folder <b>' +
        esc(m.nama) +
        '</b> tidak bisa dibaca. Mungkin sudah dipindah atau dihapus.</span><button type="button" class="btn ghost" data-gf-izin="' +
        esc(m.id) +
        '">Pilih lagi</button></div>';
    else if (r.status === 'memindai')
      h += '<div class="gf-info">' + GF_IKON + '<span>Memindai <b>' + esc(m.nama) + '</b>…</span><i class="spin"></i></div>';
    if (L && L.pesan)
      h +=
        '<div class="gf-info gf-warn">' +
        GF_IKON +
        '<span><b>' +
        esc(m.nama) +
        '</b>: ' +
        esc(L.pesan).replace(/\n/g, '<br>') +
        '</span><button type="button" class="gf-x" data-gf-tutup="' +
        esc(m.id) +
        '" aria-label="Tutup keterangan">×</button></div>';
  });
  return h;
}
function gfKlikUmum(e) {
  var el;
  if ((el = e.target.closest('[data-gf-izin]'))) {
    gfIzinkan(el.dataset.gfIzin);
    return true;
  }
  if ((el = e.target.closest('[data-gf-tutup]'))) {
    gfTutupPesan(el.dataset.gfTutup);
    return true;
  }
  if ((el = e.target.closest('[data-gf-pindai]'))) {
    gfPindai(el.dataset.gfPindai);
    return true;
  }
  if ((el = e.target.closest('[data-gf-putus]'))) {
    gfPutuskan(el.dataset.gfPutus);
    return true;
  }
  if (e.target.closest('[data-gf-baru]')) {
    gfHubungkan(null);
    return true;
  }
  return false;
}
$('#gtIsi').addEventListener('click', function (e) {
  var a = gtAktif();
  if (a !== 'foto' && a !== 'video') return;
  if (e.target.closest('#gtFolder')) {
    openLayer('page:galery-folder');
    return;
  }
  gfKlikUmum(e);
});

/* ---------- Halaman kelola folder ---------- */
function gfWaktu(t) {
  if (!t) return 'belum pernah';
  var d = new Date(t);
  return (
    d.getDate() +
    ' ' +
    GT_BULAN[d.getMonth()] +
    ' ' +
    d.getFullYear() +
    ', ' +
    ('0' + d.getHours()).slice(-2) +
    ':' +
    ('0' + d.getMinutes()).slice(-2)
  );
}
function gfRenderHal() {
  var meta = gfMeta(),
    dukung = gfDidukung();
  var h =
    '<div class="gf-hal"><p class="ie-bantu gf-intro">Foto &amp; video di folder ini hanya ditampilkan dari HP — tidak disalin, tidak diunggah, dan tidak ikut cadangan. Subfolder ikut dipindai. Yang ikut akunmu hanya daftar foldernya.</p>';
  if (!dukung)
    h +=
      '<div class="gf-info gf-warn">' +
      GF_IKON +
      '<span>Chrome di perangkat ini belum bisa memilih folder. Perbarui Chrome, lalu buka Stivora lewat alamat https (GitHub Pages).</span></div>';
  if (!meta.length) h += '<p class="gt-kosong">Belum ada folder yang terhubung.</p>';
  meta.forEach(function (m) {
    var r = gfRun[m.id] || {},
      L = gfLokal[m.id],
      st;
    if (r.status === 'siap')
      st =
        r.media.filter(function (x) {
          return jenisMedia(x) === 'foto';
        }).length +
        ' foto · ' +
        r.media.filter(function (x) {
          return jenisMedia(x) === 'video';
        }).length +
        ' video · ' +
        r.subs.length +
        ' subfolder';
    else if (r.status === 'memindai') st = 'Memindai…';
    else if (r.status === 'izin') st = 'Perlu izin lagi';
    else if (r.status === 'galat') st = 'Tidak bisa dibaca';
    else st = 'Belum terhubung di HP ini · terakhir ' + m.foto + ' foto · ' + m.video + ' video';
    h +=
      '<section class="gf-kartu" data-gf-id="' +
      esc(m.id) +
      '">' +
      '<div class="gf-kepala"><span class="gf-ikon">' +
      GF_IKON +
      '</span><span class="gf-teks"><b>' +
      esc(m.nama) +
      '</b><small>' +
      st +
      '</small><small>Dipindai: ' +
      gfWaktu(m.dipindai) +
      '</small></span></div>' +
      (L && L.pesan ? '<p class="gf-pesan">' + esc(L.pesan).replace(/\n/g, '<br>') + '</p>' : '') +
      '<div class="gf-aksi">' +
      (r.status === 'tanpa' || r.status === 'izin' || r.status === 'galat'
        ? '<button type="button" class="btn primary" data-gf-izin="' +
          esc(m.id) +
          '"' +
          (dukung ? '' : ' disabled') +
          '>' +
          (r.status === 'izin' ? 'Izinkan lagi' : 'Hubungkan lagi') +
          '</button>'
        : '') +
      (r.status === 'siap' ? '<button type="button" class="btn ghost" data-gf-pindai="' + esc(m.id) + '">Pindai ulang</button>' : '') +
      (L && L.pesan ? '<button type="button" class="btn ghost" data-gf-tutup="' + esc(m.id) + '">Tandai sudah dibaca</button>' : '') +
      '<button type="button" class="btn ghost gf-putus" data-gf-putus="' +
      esc(m.id) +
      '">Putuskan</button>' +
      '</div></section>';
  });
  h +=
    '<button type="button" class="btn primary gf-baru" data-gf-baru' +
    (!dukung || meta.length >= GF_MAKS ? ' disabled' : '') +
    '>' +
    GF_IKON_TAMBAH +
    'Hubungkan folder</button>' +
    '<p class="ie-bantu">Maks. ' +
    GF_MAKS +
    ' folder. Pilih folder buatanmu sendiri (mis. di dalam Pictures) — Android tidak mengizinkan folder utama penyimpanan atau Download.</p></div>';
  $('#subBody').innerHTML = h;
}
PAGES['galery-folder'] = function () {
  $('#subTitle').textContent = 'Folder di HP';
  gfRenderHal();
  return true;
};
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'galery-folder') gfKlikUmum(e);
});

/* ---------- Bersihkan saat data lokal dikosongkan (ganti akun) ---------- */
function gfBersihkanLokal() {
  Object.keys(gfLokal).forEach(function (id) {
    gfBuangMedia(id);
    gfDbHapus(id);
  });
  gfLokal = {};
  gfRun = {};
}

/* ---------- Foto & video Galery lama (lewat tombol +) dipindah ke Sampah — sekali (5.50.0) ---------- */
function gfPindahLama() {
  if (store.get(K_GF_LAMA, false)) return;
  var lama = images.filter(function (im) {
    return !im.markerId && (jenisMedia(im) === 'foto' || jenisMedia(im) === 'video');
  });
  store.set(K_GF_LAMA, true);
  if (!lama.length) return;
  lama.forEach(function (im) {
    trashImage(im).catch(function () {});
  });
  var ids = {};
  lama.forEach(function (im) {
    ids[im.id] = 1;
  });
  images = images.filter(function (im) {
    return !ids[im.id];
  });
  if (typeof schedulePush === 'function') schedulePush();
  refreshAll();
  toast(lama.length + ' foto/video Galery lama dipindah ke Sampah');
}
imagesReady.then(gfPindahLama);
gfMulai();

/* =========================================================
   Tampilan Folder di tab Foto & Video (5.52.0)
   - Akar: "Disematkan" lalu kartu folder (sampul 4 terbaru, jumlah isi & subfolder).
   - Dalam folder: jejak alamat, subfolder langsung (geser), lalu semua media folder itu
     termasuk subfoldernya (tercampur), "Disematkan" di atas, per tanggal.
   - Masuk folder = satu langkah riwayat, jadi tombol/gestur kembali naik satu level.
   ========================================================= */
var gfJalur = null; /* null = daftar folder; { fid, path } path '' = akar folder */
function gfDalam(j) {
  return j ? 1 + (j.path ? j.path.split('/').length : 0) : 0;
}
function gfJalurKe(baru) {
  var dulu = gfDalam(gfJalur),
    nanti = gfDalam(baru);
  if (nanti > dulu) {
    gfJalur = baru;
    try {
      history.pushState({ tab: cur.tab, fromRoot: cur.fromRoot, layers: [], gtj: baru }, '');
    } catch (e) {}
    renderGaleryTab();
    scrollKeIsi();
  } else if (nanti < dulu) {
    try {
      history.go(nanti - dulu);
    } catch (e) {
      gfJalur = baru;
      renderGaleryTab();
    }
  }
}
function scrollKeIsi() {
  var t = $('#gtTab');
  if (t && t.getBoundingClientRect().top < 0) t.scrollIntoView();
}
window.addEventListener('popstate', function (e) {
  var st = e.state;
  if (!st || st.tab !== 'galery' || (st.layers && st.layers.length)) return;
  var baru = st.gtj && st.gtj.fid ? st.gtj : null;
  if (JSON.stringify(baru) !== JSON.stringify(gfJalur)) {
    gfJalur = baru;
    setTimeout(renderGaleryTab, 0);
  }
});
function gfSetMode(m) {
  var jadi = function () {
    store.set(K_GT_MODE, m);
    renderGaleryTab();
  };
  if (gfJalur) {
    var d = gfDalam(gfJalur);
    gfJalur = null;
    try {
      history.go(-d);
    } catch (e) {}
    setTimeout(jadi, 60);
  } else jadi();
}
function gfMediaDi(fid, path, j) {
  var r = gfRun[fid];
  if (!r || !r.media) return [];
  var awal = path ? path + '/' : '';
  return r.media.filter(function (x) {
    return (!j || jenisMedia(x) === j) && (!awal || x.path.indexOf(awal) === 0);
  });
}
function gfAnak(fid, path) {
  var r = gfRun[fid];
  if (!r || !r.subs) return [];
  return r.subs
    .filter(function (s) {
      var i = s.lastIndexOf('/');
      return (i < 0 ? '' : s.slice(0, i)) === path;
    })
    .sort(function (a, b) {
      return a.localeCompare(b, 'id');
    });
}
function gfSampul(list) {
  var x = list
      .slice()
      .sort(function (a, b) {
        return b.createdAt - a.createdAt;
      })
      .slice(0, 4),
    h = '';
  for (var i = 0; i < 4; i++) h += '<span class="gfs-sel">' + (x[i] ? thumbHTML(x[i]) : '') + '</span>';
  return '<span class="gfs-sampul">' + h + '</span>';
}
function gfFolderHtml(j, M, cari) {
  var meta = gfMeta(),
    h = '';
  if (
    gfJalur &&
    !meta.some(function (m) {
      return m.id === gfJalur.fid;
    })
  )
    gfJalur = null;
  if (!gfJalur) {
    if (cari) return gtDaftarHtml(gtSaring(gfMedia(j), cari), M);
    var pin = gtSematan(),
      dipin = gfMedia(j)
        .filter(function (im) {
          return pin.indexOf(im.id) >= 0;
        })
        .sort(function (x, y) {
          return pin.indexOf(x.id) - pin.indexOf(y.id);
        });
    if (dipin.length)
      h += '<h3 class="gt-judul">' + GT_IKON_PIN + 'Disematkan</h3><div class="gt-grid">' + dipin.map(gtKotak).join('') + '</div>';
    var kartu = meta
      .map(function (m) {
        var r = gfRun[m.id] || {};
        if (r.status !== 'siap') {
          var ket =
            r.status === 'memindai'
              ? 'Memindai…'
              : r.status === 'izin'
                ? 'Perlu izin'
                : r.status === 'galat'
                  ? 'Tidak bisa dibaca'
                  : 'Belum terhubung di HP ini';
          return (
            '<button type="button" class="gfs-kartu gfs-mati" data-gf-izin="' +
            esc(m.id) +
            '"><span class="gfs-sampul gfs-kosong">' +
            GF_IKON +
            '</span><b>' +
            esc(m.nama) +
            '</b><small class="gfs-warn">' +
            ket +
            '</small></button>'
          );
        }
        var isi = gfMediaDi(m.id, '', j);
        if (!isi.length) return '';
        var sub = r.subs.filter(function (s) {
          return gfMediaDi(m.id, s, j).length;
        }).length;
        return (
          '<button type="button" class="gfs-kartu" data-gf-buka="' +
          esc(m.id) +
          '" data-gf-path="">' +
          gfSampul(isi) +
          '<b>' +
          GF_IKON +
          esc(m.nama) +
          '</b><small>' +
          isi.length +
          ' ' +
          M.kata +
          (sub ? ' · ' + sub + ' subfolder' : '') +
          '</small></button>'
        );
      })
      .join('');
    h += kartu
      ? '<h3 class="gt-judul">' + GF_IKON + 'Folder</h3><div class="gfs-grid">' + kartu + '</div>'
      : '<p class="gt-kosong">Tidak ada folder yang berisi ' + M.kata + '.</p>';
    return h;
  }
  var m = meta.filter(function (x) {
      return x.id === gfJalur.fid;
    })[0],
    bag = gfJalur.path ? gfJalur.path.split('/') : [];
  h +=
    '<nav class="gfs-jejak" aria-label="Lokasi folder"><button type="button" class="gfs-kembali" data-gf-naik aria-label="Kembali"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<button type="button" data-gf-ke="-1">Folder</button>' +
    '<i>›</i><button type="button" data-gf-ke="0"' +
    (!bag.length ? ' class="on"' : '') +
    '>' +
    esc(m.nama) +
    '</button>' +
    bag
      .map(function (b, i) {
        return (
          '<i>›</i><button type="button" data-gf-ke="' +
          (i + 1) +
          '"' +
          (i === bag.length - 1 ? ' class="on"' : '') +
          '>' +
          esc(b) +
          '</button>'
        );
      })
      .join('') +
    '</nav>';
  var anak = gfAnak(m.id, gfJalur.path)
    .map(function (s) {
      return { s: s, n: gfMediaDi(m.id, s, j).length };
    })
    .filter(function (x) {
      return x.n;
    });
  if (anak.length)
    h +=
      '<div class="gfs-sub">' +
      anak
        .map(function (x) {
          return (
            '<button type="button" data-gf-buka="' +
            esc(m.id) +
            '" data-gf-path="' +
            esc(x.s) +
            '">' +
            GF_IKON +
            '<span><b>' +
            esc(x.s.split('/').pop()) +
            '</b><small>' +
            x.n +
            ' ' +
            M.kata +
            '</small></span></button>'
          );
        })
        .join('') +
      '</div>';
  var isi = gtSaring(gfMediaDi(m.id, gfJalur.path, j), cari);
  if (!gfMediaDi(m.id, gfJalur.path, j).length) return h + '<p class="gt-kosong">Tidak ada ' + M.kata + ' di folder ini.</p>';
  return h + gtDaftarHtml(isi, M);
}
$('#gtIsi').addEventListener('click', function (e) {
  var a = gtAktif();
  if (a !== 'foto' && a !== 'video') return;
  var el;
  if ((el = e.target.closest('[data-gt-mode]'))) {
    if (el.dataset.gtMode !== gtMode()) gfSetMode(el.dataset.gtMode);
    return;
  }
  if ((el = e.target.closest('[data-gf-buka]'))) {
    gfJalurKe({ fid: el.dataset.gfBuka, path: el.dataset.gfPath || '' });
    return;
  }
  if (e.target.closest('[data-gf-naik]')) {
    try {
      history.back();
    } catch (x) {}
    return;
  }
  if ((el = e.target.closest('[data-gf-ke]')) && gfJalur) {
    var n = +el.dataset.gfKe,
      bag = gfJalur.path ? gfJalur.path.split('/') : [];
    gfJalurKe(n < 0 ? null : { fid: gfJalur.fid, path: bag.slice(0, n).join('/') });
  }
});
