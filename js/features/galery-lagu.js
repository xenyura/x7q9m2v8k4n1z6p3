/* ============================================================
   Stivora — Galery · Lainnya · Playlist Lagu YouTube (5.57.0)
   - Tempel link playlist / 1 lagu dari YouTube → disimpan sebagai item 'lagu'
     di 'stivora.galery.lainnya' (ikut sinkron & cadangan; hanya teks: judul, kanal, ID).
     Item: { ..., yt: { t: 'pl'|'v', id, v?: video awal, n?: jumlah lagu, tv?: video sampul } }
   - Daftar lagu playlist & durasi diambil lewat YouTube Data API, melalui Worker (key disimpan di Worker, bukan di aplikasi).
     Tanpa key: daftar diambil dari pemutar YouTube, judul muncul saat lagu diputar.
   - Diputar dengan pemutar YouTube resmi (IFrame API). Pemutar tetap jalan saat halaman ditutup
     (mini player), berhenti kalau layar mati / pindah aplikasi (aturan YouTube).
   - Hapus hanya menghapus simpanan di Stivora; di YouTube tetap ada.
   ============================================================ */
'use strict';

var LG_ID = /^[A-Za-z0-9_-]{6,64}$/;
var LG_HAL_MAKS = 20; /* maks 20 × 50 = 1000 lagu per playlist */
var LG_GALAT_BLOK = { 2: 1, 5: 1, 100: 1, 101: 1, 150: 1, 153: 1 };
var lgF = '',
  lgCache = {},
  lgQ = null,
  lgYT = null,
  lgApiJanji = null,
  lgCuedJanji = null;
var lgBlokT = null,
  lgJam = null,
  lgLoop = null;

/* Judul & isi playlist lewat Worker (key YouTube disimpan di Worker, 5.66.0) */
function lgApiSiap() {
  return typeof glApiSiap === 'function' && glApiSiap();
}
function lgDur(s) {
  s = Math.max(0, Math.floor(+s || 0));
  var j = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    d = s % 60;
  return (j ? j + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + d).slice(-2);
}
function lgIso(iso) {
  var m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  return m ? (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0) : 0;
}
function lgThumb(v) {
  return v && LG_ID.test(v) ? 'https://i.ytimg.com/vi/' + v + '/mqdefault.jpg' : '';
}

/* ---------- Mengurai link ---------- */
function lgUrai(u) {
  u = String(u || '').trim();
  if (!u) return null;
  var x;
  try {
    x = new URL(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u);
  } catch (e) {
    return null;
  }
  var h = x.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  if (!/^(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(h)) return null;
  var v = '',
    list = x.searchParams.get('list') || '',
    m;
  if (h === 'youtu.be') v = x.pathname.slice(1).split('/')[0];
  else if (x.pathname === '/watch') v = x.searchParams.get('v') || '';
  else if ((m = x.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/))) v = m[2];
  if (!LG_ID.test(v)) v = '';
  if (!LG_ID.test(list)) list = '';
  if (!v && !list) return { salah: true };
  return { v: v, list: list };
}
function lgYtSah(y) {
  if (!y || typeof y !== 'object' || (y.t !== 'pl' && y.t !== 'v') || !LG_ID.test(y.id || '')) return null;
  var o = { t: y.t, id: y.id };
  if (LG_ID.test(y.v || '')) o.v = y.v;
  if (LG_ID.test(y.tv || '')) o.tv = y.tv;
  if (+y.n > 0) o.n = Math.min(99999, Math.floor(+y.n));
  return o;
}
/* Item lagu → info YouTube (juga untuk lagu lama yang disimpan manual dengan link YouTube) */
function lgYt(x) {
  if (!x) return null;
  var y = lgYtSah(x.yt);
  if (y) return y;
  var p = lgUrai(x.url);
  if (!p || p.salah) return null;
  return p.list ? { t: 'pl', id: p.list, v: p.v || undefined, tv: p.v || undefined } : { t: 'v', id: p.v, tv: p.v };
}
function lgUrlKanonik(y) {
  return y.t === 'pl' ? 'https://www.youtube.com/playlist?list=' + y.id : 'https://www.youtube.com/watch?v=' + y.id;
}
function lgCariItem(id) {
  return (
    glSemua().lagu.filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}

/* ---------- YouTube Data API ---------- */
function lgApi(jalur, q) {
  return glApi('youtube', jalur, q);
}
function lgInfoVideo(ids) {
  var hasil = {},
    kelompok = [];
  for (var i = 0; i < ids.length; i += 50) kelompok.push(ids.slice(i, i + 50));
  return kelompok
    .reduce(function (p, g) {
      return p.then(function () {
        return lgApi('videos', { part: 'snippet,contentDetails,status', id: g.join(','), maxResults: 50 }).then(function (j) {
          (j.items || []).forEach(function (v) {
            hasil[v.id] = {
              j: (v.snippet && v.snippet.title) || '',
              p: (v.snippet && v.snippet.channelTitle) || '',
              d: lgIso(v.contentDetails && v.contentDetails.duration),
              ok: !(v.status && v.status.embeddable === false)
            };
          });
        });
      });
    }, Promise.resolve())
    .then(function () {
      return hasil;
    });
}
function lgInfoPlaylist(id) {
  return lgApi('playlists', { part: 'snippet,contentDetails', id: id }).then(function (j) {
    var p = j.items && j.items[0];
    if (!p) throw new Error('kosong');
    return { j: p.snippet.title || '', p: p.snippet.channelTitle || '', n: (p.contentDetails && p.contentDetails.itemCount) || 0 };
  });
}
function lgIsiPlaylist(id) {
  var ids = [],
    info = {},
    hal = 0;
  function ambil(token) {
    var q = { part: 'snippet,contentDetails', playlistId: id, maxResults: 50 };
    if (token) q.pageToken = token;
    return lgApi('playlistItems', q).then(function (j) {
      (j.items || []).forEach(function (it) {
        var v = it.contentDetails && it.contentDetails.videoId,
          sn = it.snippet || {};
        if (!v || !LG_ID.test(v) || sn.title === 'Private video' || sn.title === 'Deleted video' || ids.indexOf(v) >= 0) return;
        ids.push(v);
        info[v] = { j: sn.title || '', p: sn.videoOwnerChannelTitle || '' };
      });
      hal++;
      if (j.nextPageToken && hal < LG_HAL_MAKS) return ambil(j.nextPageToken);
    });
  }
  return ambil('')
    .then(function () {
      return lgInfoVideo(ids);
    })
    .then(function (det) {
      return ids.map(function (v) {
        var d = det[v] || {};
        return { id: v, j: d.j || info[v].j, p: d.p || info[v].p, d: d.d || 0, ok: d.ok !== false };
      });
    });
}

/* ---------- Daftar di halaman Playlist Lagu ---------- */
var LG_IK = {
  tempel:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M8 5v14l11-7z"/></svg>',
  jeda: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
  acak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  ulang:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path class="isi" d="M10 9.2v5.6l4.8-2.8z"/></svg>',
  salin:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  hapus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  blok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/></svg>',
  luar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h0M11 12h1v5h1"/></svg>',
  musik:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>'
};
function lgGambar(v, kelas) {
  var u = lgThumb(v);
  return '<span class="' + kelas + '">' + (u ? '<img src="' + u + '" alt="" loading="lazy" decoding="async">' : LG_IK.musik) + '</span>';
}
function lgSedang(id) {
  return lgQ && lgQ.item.id === id;
}
function lgGel() {
  return '<span class="lg-gel' + (lgQ && !lgQ.main ? ' jeda' : '') + '"><i></i><i></i><i></i></span>';
}

function lgRenderDaftar(box, semua, q) {
  var j = glJenis('lagu');
  var cocok = semua.filter(function (x) {
    return !q || (x.a + ' ' + x.b + ' ' + x.c).toLowerCase().indexOf(q) >= 0;
  });
  var pl = [],
    lg = [],
    lain = [];
  cocok.forEach(function (x) {
    var y = lgYt(x);
    (y ? (y.t === 'pl' ? pl : lg) : lain).push(x);
  });
  var nPl = 0,
    nLg = 0,
    nLain = 0;
  semua.forEach(function (x) {
    var y = lgYt(x);
    if (!y) nLain++;
    else if (y.t === 'pl') nPl++;
    else nLg++;
  });
  if ((lgF === 'pl' && !nPl) || (lgF === 'v' && !nLg) || (lgF === 'lain' && !nLain)) lgF = '';
  var h = '';
  if (!semua.length) {
    box.innerHTML =
      '<div class="lg-kosong">' +
      LG_IK.musik +
      '<p>Belum ada lagu.<br>Salin link playlist atau lagu dari YouTube, lalu ketuk <b>Tempel link</b>.</p></div>';
    return;
  }
  h +=
    '<div class="gp-filter gl-filter"><button type="button" data-lg-f=""' +
    (!lgF ? ' class="on"' : '') +
    '>Semua <small>' +
    semua.length +
    '</small></button>' +
    (nPl
      ? '<button type="button" data-lg-f="pl"' + (lgF === 'pl' ? ' class="on"' : '') + '>Playlist <small>' + nPl + '</small></button>'
      : '') +
    (nLg ? '<button type="button" data-lg-f="v"' + (lgF === 'v' ? ' class="on"' : '') + '>Lagu <small>' + nLg + '</small></button>' : '') +
    (nLain
      ? '<button type="button" data-lg-f="lain"' +
        (lgF === 'lain' ? ' class="on"' : '') +
        '>Link lain <small>' +
        nLain +
        '</small></button>'
      : '') +
    '</div>';
  if (!pl.length && !lg.length && !lain.length) {
    box.innerHTML = h + '<p class="gt-kosong">Tidak ada yang cocok.</p>';
    return;
  }
  if (pl.length && (!lgF || lgF === 'pl')) {
    h +=
      '<h3 class="lg-judul">Playlist</h3><div class="lg-pl-grid">' +
      pl
        .map(function (x) {
          var y = lgYt(x),
            n = y.n || (lgCache[y.id] ? lgCache[y.id].length : 0);
          return (
            '<button type="button" class="lg-pl' +
            (lgSedang(x.id) ? ' main' : '') +
            '" data-lg="' +
            esc(x.id) +
            '">' +
            '<span class="lg-pl-sampul">' +
            lgGambar(y.tv, 'lg-tb') +
            '<span class="lg-pl-n">' +
            (n ? '<b>' + n + '</b><small>lagu</small>' : '') +
            '</span>' +
            (lgSedang(x.id) ? lgGel() : '') +
            '</span>' +
            '<b>' +
            esc(x.a) +
            '</b>' +
            (x.b ? '<small>' + esc(x.b) + '</small>' : '') +
            '</button>'
          );
        })
        .join('') +
      '</div>';
  }
  if (lg.length && (!lgF || lgF === 'v')) {
    h +=
      '<h3 class="lg-judul">Lagu</h3><div class="lg-baris-daftar">' +
      lg
        .map(function (x) {
          var y = lgYt(x);
          return (
            '<button type="button" class="lg-baris' +
            (lgSedang(x.id) ? ' main' : '') +
            '" data-lg="' +
            esc(x.id) +
            '">' +
            '<span class="lg-tb-wrap">' +
            lgGambar(y.tv || y.id, 'lg-tb') +
            (lgSedang(x.id) ? lgGel() : '') +
            '</span>' +
            '<span class="lg-tx"><b>' +
            esc(x.a) +
            '</b>' +
            (x.b ? '<small>' + esc(x.b) + '</small>' : '') +
            '</span></button>'
          );
        })
        .join('') +
      '</div>';
  }
  if (lain.length && (!lgF || lgF === 'lain')) {
    h +=
      '<h3 class="lg-judul">Link lain</h3><div class="gl-daftar">' +
      lain
        .map(function (x) {
          return glItemHtml(j, x);
        })
        .join('') +
      '</div>' +
      '<p class="gp-catatan">Link selain YouTube (Spotify, dll.) dibuka di aplikasinya. Ketuk untuk mengubah.</p>';
  }
  if (!lgF || lgF === 'pl' || lgF === 'v')
    h += '<p class="gp-catatan lg-tip">Tekan lama playlist atau lagu untuk Buka di YouTube, Salin link, atau Hapus.</p>';
  if (semua.length >= GL_ITEM_MAKS) h += '<p class="gp-catatan">Sudah ' + GL_ITEM_MAKS + ' lagu (batas maksimal).</p>';
  box.innerHTML = h;
}

/* Thumbnail yang tidak ada (video dihapus) → tampilkan ikon musik */
document.addEventListener(
  'error',
  function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('lg-tb')) {
      var p = t.parentNode;
      t.remove();
      p.innerHTML = LG_IK.musik;
    }
  },
  true
);

/* Klik & tekan lama di daftar */
var lgTahan = null,
  lgTahanJadi = false,
  lgTahanXY = null;
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'lagu') return;
  var el;
  if ((el = e.target.closest('[data-lg-f]'))) {
    lgF = el.dataset.lgF;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#lgTempelBtn')) {
    openLayer('page:lagu-tempel');
    return;
  }
  if ((el = e.target.closest('[data-lg]'))) {
    if (lgTahanJadi) {
      lgTahanJadi = false;
      return;
    }
    openLayer('page:lagu-putar:' + el.dataset.lg);
  }
});
$('#subBody').addEventListener('pointerdown', function (e) {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'lagu') return;
  var k = e.target.closest('[data-lg]');
  if (!k) return;
  lgTahanJadi = false;
  lgTahanXY = [e.clientX, e.clientY];
  clearTimeout(lgTahan);
  lgTahan = setTimeout(function () {
    lgTahanJadi = true;
    if (navigator.vibrate)
      try {
        navigator.vibrate(15);
      } catch (x) {}
    lgMenu(k.dataset.lg);
  }, 500);
});
$('#subBody').addEventListener('pointermove', function (e) {
  if (lgTahanXY && Math.hypot(e.clientX - lgTahanXY[0], e.clientY - lgTahanXY[1]) > 10) {
    clearTimeout(lgTahan);
    lgTahanXY = null;
  }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
  $('#subBody').addEventListener(n, function () {
    clearTimeout(lgTahan);
    lgTahanXY = null;
  });
});
$('#subBody').addEventListener('contextmenu', function (e) {
  if (pageKind === 'galery-koleksi' && e.target.closest('[data-lg]')) e.preventDefault();
});

/* Menu tekan lama */
function lgMenu(id) {
  var x = lgCariItem(id),
    y = lgYt(x);
  if (!x || !y) return;
  lgMenuTutup();
  var m = document.createElement('div');
  m.className = 'lg-menu-wrap';
  m.id = 'lgMenu';
  m.innerHTML =
    '<div class="lg-menu-tirai" data-lgm="tutup"></div><div class="lg-menu" role="menu">' +
    '<div class="lg-menu-kp">' +
    lgGambar(y.tv || (y.t === 'v' ? y.id : ''), 'lg-tb') +
    '<span><b>' +
    esc(x.a) +
    '</b><small>' +
    (y.t === 'pl' ? 'Playlist' : 'Lagu') +
    (x.b ? ' · ' + esc(x.b) : '') +
    '</small></span></div>' +
    '<button type="button" role="menuitem" data-lgm="yt">' +
    LG_IK.yt +
    'Buka di YouTube</button>' +
    '<button type="button" role="menuitem" data-lgm="salin">' +
    LG_IK.salin +
    'Salin link</button>' +
    '<button type="button" role="menuitem" class="bahaya" data-lgm="hapus">' +
    LG_IK.hapus +
    'Hapus</button></div>';
  m.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lgm]');
    if (!b) return;
    var a = b.dataset.lgm;
    lgMenuTutup();
    if (a === 'yt') lgBukaYoutube(x, null);
    else if (a === 'salin') lgSalin(x);
    else if (a === 'hapus') lgTanyaHapus(x, 1);
  });
  document.body.appendChild(m);
}
function lgMenuTutup() {
  var m = $('#lgMenu');
  if (m) m.remove();
}
window.addEventListener('popstate', lgMenuTutup);

/* ---------- Halaman Tempel link ---------- */
var lgBaru = null,
  lgCekT = null,
  lgCekNo = 0;
PAGES['lagu-tempel'] = function () {
  lgBaru = null;
  $('#subTitle').textContent = 'Tempel link YouTube';
  $('#subBody').innerHTML =
    '<div class="se lg-tempel"><section class="ie-bagian se-kartu">' +
    '<p class="lg-ket">Salin link playlist atau lagu dari aplikasi YouTube (<b>Bagikan → Salin link</b>), lalu tempel di sini.</p>' +
    '<div class="lg-masuk"><input class="input" id="lgUrl" type="url" inputmode="url" autocomplete="off" maxlength="' +
    GL_URL_MAKS +
    '" placeholder="https://youtube.com/playlist?list=…" data-tanpa-hitung>' +
    '<button type="button" class="btn ghost" id="lgTempelClip">Tempel</button></div>' +
    '<div id="lgPra" aria-live="polite"></div></section>' +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-back>Batal</button><button type="button" class="btn primary" id="lgSimpan" disabled>Simpan</button></div></div>';
  return true;
};
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'lagu-tempel' && e.target.id === 'lgUrl') {
    clearTimeout(lgCekT);
    lgCekT = setTimeout(lgCek, 350);
  }
});
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'lagu-tempel') return;
  if (e.target.closest('#lgTempelClip')) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      toast('Tekan lama kolom link, lalu pilih Tempel');
      $('#lgUrl').focus();
      return;
    }
    navigator.clipboard
      .readText()
      .then(function (t) {
        $('#lgUrl').value = String(t || '')
          .trim()
          .slice(0, GL_URL_MAKS);
        lgCek();
      })
      .catch(function () {
        toast('Izin papan klip ditolak. Tekan lama kolom link, lalu pilih Tempel');
        $('#lgUrl').focus();
      });
    return;
  }
  if (e.target.closest('#lgSimpan')) lgSimpanBaru();
});
function lgPra(h, bisa, teksTombol) {
  var p = $('#lgPra'),
    s = $('#lgSimpan');
  if (!p || !s) return;
  p.innerHTML = h;
  s.disabled = !bisa;
  s.textContent = teksTombol || 'Simpan';
}
function lgCek() {
  if (pageKind !== 'lagu-tempel' || !$('#lgUrl')) return;
  var no = ++lgCekNo,
    u = $('#lgUrl').value.trim();
  lgBaru = null;
  if (!u) {
    lgPra('', false);
    return;
  }
  var p = lgUrai(u);
  if (!p) {
    if (!glUrlSah(u)) {
      lgPra('<p class="lg-salah">Link tidak dikenali.</p>', false);
      return;
    }
    lgBaru = { lain: glUrlSah(u) };
    lgPra(
      '<p class="lg-salah">Ini bukan link YouTube. Simpan sebagai <b>link lain</b>? Judul diisi sendiri dan link dibuka di aplikasinya.</p>',
      true,
      'Isi manual'
    );
    return;
  }
  if (p.salah) {
    lgPra('<p class="lg-salah">Link YouTube ini tidak berisi lagu atau playlist.</p>', false);
    return;
  }
  var ada = glSemua().lagu.filter(function (x) {
    var y = lgYt(x);
    return y && ((p.list && y.t === 'pl' && y.id === p.list) || (!p.list && y.t === 'v' && y.id === p.v));
  })[0];
  lgPra('<div class="lg-muat"><i></i>Mengambil info dari YouTube…</div>', false);
  var kerja = [];
  kerja.push(
    p.list
      ? lgInfoPlaylist(p.list).catch(function () {
          return null;
        })
      : Promise.resolve(null)
  );
  kerja.push(
    p.v
      ? lgInfoVideo([p.v])
          .then(function (m) {
            return m[p.v] || null;
          })
          .catch(function () {
            return null;
          })
      : Promise.resolve(null)
  );
  Promise.all(kerja).then(function (r) {
    if (no !== lgCekNo || pageKind !== 'lagu-tempel') return;
    var ip = r[0],
      iv = r[1],
      tanpaKey = !lgApiSiap();
    lgBaru = { p: p, ip: ip, iv: iv };
    var h = '<div class="lg-pra">';
    if (p.list && p.v) {
      h +=
        '<div class="lg-pra-atas">' +
        lgGambar(p.v, 'lg-tb') +
        '<span><em class="lg-lb">Lagu dari playlist</em><b>' +
        esc(iv ? iv.j : 'Lagu YouTube') +
        '</b>' +
        '<small>' +
        esc(iv ? iv.p : '') +
        (ip ? ' · dalam playlist "' + esc(ip.j) + '"' + (ip.n ? ' (' + ip.n + ' lagu)' : '') : '') +
        '</small></span></div>' +
        '<div class="lg-opsi" role="radiogroup"><label><input type="radio" name="lgO" value="pl" checked><span><b>Simpan playlist-nya</b><small>' +
        (ip && ip.n ? ip.n + ' lagu, ' : '') +
        'mulai dari lagu ini</small></span></label>' +
        '<label><input type="radio" name="lgO" value="v"><span><b>Simpan lagu ini saja</b><small>1 lagu</small></span></label></div>';
    } else if (p.list) {
      h +=
        '<div class="lg-pra-atas">' +
        lgGambar('', 'lg-tb') +
        '<span><em class="lg-lb">Playlist' +
        (ip && ip.n ? ' · ' + ip.n + ' lagu' : '') +
        '</em><b>' +
        esc(ip ? ip.j : 'Playlist YouTube') +
        '</b><small>' +
        esc(ip ? ip.p : '') +
        '</small></span></div>' +
        '<p class="lg-ket">Kalau pemilik playlist menambah atau menghapus lagu di YouTube, daftar di sini ikut berubah.</p>';
    } else {
      h +=
        '<div class="lg-pra-atas">' +
        lgGambar(p.v, 'lg-tb') +
        '<span><em class="lg-lb">Lagu' +
        (iv && iv.d ? ' · ' + lgDur(iv.d) : '') +
        '</em><b>' +
        esc(iv ? iv.j : 'Lagu YouTube') +
        '</b><small>' +
        esc(iv ? iv.p : '') +
        '</small></span></div>';
      if (iv && !iv.ok)
        h += '<p class="lg-salah">Pemilik video tidak mengizinkan diputar di luar YouTube. Tetap bisa disimpan dan dibuka di YouTube.</p>';
    }
    if (tanpaKey)
      h +=
        '<p class="lg-ket">' + esc(glApiAlasan() || 'Info YouTube belum bisa diambil') + ', jadi judul baru muncul saat lagu diputar.</p>';
    else if ((p.list && !ip) || (p.v && !iv))
      h +=
        '<p class="lg-ket">Info dari YouTube tidak bisa diambil (playlist pribadi, mix otomatis, atau koneksi). Tetap bisa disimpan.</p>';
    h += '</div>';
    if (ada && !(p.list && p.v)) {
      lgPra(h + '<p class="lg-salah">Sudah ada di daftar: "' + esc(ada.a) + '".</p>', false);
      return;
    }
    lgPra(h, true);
  });
}
function lgSimpanBaru() {
  if (!lgBaru) return;
  if (lgBaru.lain) {
    var u = lgBaru.lain;
    back(1, function () {
      glItemId = null;
      glIsiUrl = u;
      openLayer('page:galery-koleksi-item');
    });
    return;
  }
  var p = lgBaru.p,
    ip = lgBaru.ip,
    iv = lgBaru.iv,
    pilih = p.list && p.v ? ($('input[name="lgO"]:checked') || {}).value : p.list ? 'pl' : 'v';
  var y, a, b;
  if (pilih === 'pl') {
    y = { t: 'pl', id: p.list };
    if (p.v) {
      y.v = p.v;
      y.tv = p.v;
    }
    if (ip && ip.n) y.n = ip.n;
    a = ip ? ip.j : 'Playlist YouTube';
    b = ip ? ip.p : '';
  } else {
    y = { t: 'v', id: p.v, tv: p.v };
    a = iv ? iv.j : 'Lagu YouTube';
    b = iv ? iv.p : '';
  }
  var o = glSemua(),
    d = o.lagu,
    kini = Date.now();
  if (
    d.some(function (x) {
      var z = lgYt(x);
      return z && z.t === y.t && z.id === y.id;
    })
  ) {
    toast('Sudah ada di daftar');
    return;
  }
  if (d.length >= GL_ITEM_MAKS) {
    toast('Maksimal ' + GL_ITEM_MAKS + ' lagu');
    return;
  }
  d.unshift({
    id: uid(),
    a: String(a || 'Lagu YouTube').slice(0, GL_A_MAKS),
    b: String(b || '').slice(0, GL_B_MAKS),
    url: lgUrlKanonik(y),
    s: '',
    c: '',
    dibuat: kini,
    diubah: kini,
    yt: y
  });
  if (glPenuh(o)) {
    toast('Ruang tab Lainnya penuh. Hapus beberapa item dulu.');
    return;
  }
  glSimpanSemua(o);
  back(1, function () {
    lgF = '';
    renderGaleryTab();
    glRenderDaftar();
    toast(pilih === 'pl' ? 'Playlist disimpan' : 'Lagu disimpan');
  });
}

/* ---------- Halaman pemutar ---------- */
function lgIdHalaman() {
  var L = layerOf('page');
  return L ? L.name.split(':').slice(2).join(':') : '';
}
PAGES['lagu-putar'] = function () {
  var x = lgCariItem(lgIdHalaman()),
    y = lgYt(x);
  if (!x || !y) return false;
  $('#subTitle').textContent = x.a;
  $('#subBody').innerHTML =
    '<div class="lg-putar">' +
    '<div class="lg-kiri">' +
    '<div class="lg-layar" id="lgLayar"><div class="lg-layar-isi" id="lgLayarIsi"></div></div>' +
    '<div class="lg-info"><h3 id="lgJ"></h3><p id="lgS"></p></div>' +
    '<div class="lg-maju"><div class="lg-rel" id="lgRel"><span id="lgRelIsi"></span></div><div class="lg-waktu"><span id="lgNow">0:00</span><span id="lgTot">0:00</span></div></div>' +
    '<div class="lg-kontrol">' +
    '<button type="button" class="lg-ib" id="lgAcak" aria-label="Acak" aria-pressed="false">' +
    LG_IK.acak +
    '</button>' +
    '<button type="button" class="lg-ib tebal" id="lgPrev" aria-label="Sebelumnya">' +
    LG_IK.prev +
    '</button>' +
    '<button type="button" class="lg-ib besar" id="lgMain" aria-label="Putar">' +
    LG_IK.play +
    '</button>' +
    '<button type="button" class="lg-ib tebal" id="lgNext" aria-label="Berikutnya">' +
    LG_IK.next +
    '</button>' +
    '<button type="button" class="lg-ib" id="lgUlang" aria-label="Ulang">' +
    LG_IK.ulang +
    '</button>' +
    '</div>' +
    '<div class="lg-aksi">' +
    '<button type="button" class="lg-aksi-yt" id="lgKeYt">' +
    LG_IK.yt +
    '<span>YouTube</span></button>' +
    '<button type="button" id="lgSalin">' +
    LG_IK.salin +
    '<span>Salin link</span></button>' +
    '<button type="button" class="bahaya" id="lgHapus">' +
    LG_IK.hapus +
    '<span>Hapus</span></button>' +
    '</div>' +
    '<p class="lg-catat">' +
    LG_IK.info +
    '<span>Suara berhenti kalau layar mati atau pindah aplikasi. Ini aturan YouTube. Untuk mendengar sambil layar mati, pakai <b>Buka di YouTube</b>.</span></p>' +
    '</div>' +
    '<div class="lg-kanan" id="lgKanan"></div></div>';
  if (!lgQ || lgQ.item.id !== x.id) lgMulai(x, y);
  else lgRender();
  lgLoopMulai();
  return true;
};
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'lagu-putar' || !lgQ) return;
  var el;
  if (e.target.closest('#lgMain')) lgToggle();
  else if (e.target.closest('#lgNext')) lgKe(1);
  else if (e.target.closest('#lgPrev')) lgSebelum();
  else if (e.target.closest('#lgAcak')) {
    lgQ.acak = !lgQ.acak;
    toast(lgQ.acak ? 'Acak aktif' : 'Acak mati');
    lgRender();
  } else if (e.target.closest('#lgUlang')) {
    lgQ.ulang = (lgQ.ulang + 1) % 3;
    toast(['Ulang mati', lgQ.y.t === 'pl' ? 'Ulang semua lagu' : 'Ulang lagu ini', 'Ulang 1 lagu'][lgQ.ulang]);
    lgRender();
  } else if (e.target.closest('#lgKeYt') || e.target.closest('#lgBlokYt')) lgBukaYoutube(lgQ.item, lgQ.list[lgQ.idx]);
  else if (e.target.closest('#lgSalin')) lgSalin(lgQ.item);
  else if (e.target.closest('#lgHapus')) lgTanyaHapus(lgQ.item, 2);
  else if (e.target.closest('#lgUlangMuat')) lgMulai(lgQ.item, lgQ.y);
  else if ((el = e.target.closest('[data-lg-i]'))) lgPutarIdx(+el.dataset.lgI);
  else if ((el = e.target.closest('#lgRel'))) {
    var r = el.getBoundingClientRect(),
      dur = lgDurasiKini();
    if (lgYT && dur) {
      lgYT.seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur, true);
      lgJalan();
    }
  }
});

function lgRender() {
  if (!lgQ) return;
  var s = lgQ.list[lgQ.idx],
    pl = lgQ.y.t === 'pl';
  if (opened.page && pageKind === 'lagu-putar' && $('#lgJ')) {
    $('#lgJ').textContent = s ? s.j || 'Lagu ' + (lgQ.idx + 1) : lgQ.item.a;
    $('#lgS').textContent = s
      ? (s.p || lgQ.item.b || 'YouTube') + (pl ? ' · lagu ' + (lgQ.idx + 1) + ' dari ' + lgQ.list.length : '')
      : lgQ.status || '';
    $('#lgMain').innerHTML = lgQ.main ? LG_IK.jeda : LG_IK.play;
    $('#lgMain').setAttribute('aria-label', lgQ.main ? 'Jeda' : 'Putar');
    $('#lgAcak').classList.toggle('on', lgQ.acak);
    $('#lgAcak').setAttribute('aria-pressed', lgQ.acak);
    $('#lgUlang').classList.toggle('on', lgQ.ulang > 0);
    $('#lgUlang').classList.toggle('satu', lgQ.ulang === 2);
    ['#lgAcak', '#lgPrev', '#lgNext'].forEach(function (k) {
      $(k).hidden = !pl;
    });
    var isi = $('#lgLayarIsi'),
      blok = s && s.ok === false;
    isi.className = 'lg-layar-isi' + (blok ? ' blok' : '') + (lgQ.status ? ' status' : '');
    isi.innerHTML = blok
      ? LG_IK.blok +
        '<p><b>Pemilik video tidak mengizinkan diputar di luar YouTube.</b>' +
        (pl && lgQ.hitung > 0 ? '<br>Lagu berikutnya diputar otomatis dalam <span id="lgHitung">' + lgQ.hitung + '</span> detik.' : '') +
        '</p><button type="button" id="lgBlokYt">' +
        LG_IK.luar +
        'Buka di YouTube</button>'
      : lgQ.status
        ? lgQ.gagal
          ? LG_IK.blok + '<p>' + esc(lgQ.status) + '</p><button type="button" id="lgUlangMuat">Coba lagi</button>'
          : '<div class="lg-muat"><i></i>' + esc(lgQ.status) + '</div>'
        : '';
    var kanan = $('#lgKanan');
    if (pl && lgQ.list.length) {
      var h =
        '<div class="lg-daftar-kp"><b>Daftar lagu</b><span>' +
        lgQ.list.length +
        ' lagu</span></div><div class="lg-daftar">' +
        lgQ.list
          .map(function (z, i) {
            var on = i === lgQ.idx;
            return (
              '<button type="button" class="lg-baris' +
              (on ? ' main' : '') +
              (z.ok === false ? ' blok' : '') +
              '" data-lg-i="' +
              i +
              '">' +
              '<span class="lg-no">' +
              (i + 1) +
              '</span><span class="lg-tb-wrap">' +
              lgGambar(z.id, 'lg-tb') +
              (z.d ? '<em>' + lgDur(z.d) + '</em>' : '') +
              (on ? lgGel() : '') +
              '</span>' +
              '<span class="lg-tx"><b>' +
              esc(z.j || 'Lagu ' + (i + 1)) +
              '</b><small>' +
              (z.ok === false ? 'Hanya bisa diputar di YouTube' : esc(z.p || '')) +
              '</small></span></button>'
            );
          })
          .join('') +
        '</div>';
      if (kanan.dataset.kunci !== lgQ.item.id + ':' + lgQ.list.length) {
        kanan.innerHTML = h;
        kanan.dataset.kunci = lgQ.item.id + ':' + lgQ.list.length;
      } else {
        kanan.querySelectorAll('[data-lg-i]').forEach(function (b, i) {
          var z = lgQ.list[i],
            on = i === lgQ.idx;
          b.classList.toggle('main', on);
          b.classList.toggle('blok', z.ok === false);
          b.querySelector('.lg-tx b').textContent = z.j || 'Lagu ' + (i + 1);
          b.querySelector('.lg-tx small').textContent = z.ok === false ? 'Hanya bisa diputar di YouTube' : z.p || '';
          var g = b.querySelector('.lg-gel');
          if (on && !g) b.querySelector('.lg-tb-wrap').insertAdjacentHTML('beforeend', lgGel());
          else if (!on && g) g.remove();
          else if (g) g.classList.toggle('jeda', !lgQ.main);
        });
      }
    } else {
      kanan.innerHTML = '';
      kanan.dataset.kunci = '';
    }
    lgJalan();
  }
  lgMiniRender();
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'lagu') {
    $$('#glDaftar [data-lg]').forEach(function (b) {
      var on = lgSedang(b.dataset.lg),
        g = b.querySelector('.lg-gel');
      b.classList.toggle('main', on);
      if (on && !g) (b.querySelector('.lg-tb-wrap') || b.querySelector('.lg-pl-sampul')).insertAdjacentHTML('beforeend', lgGel());
      else if (!on && g) g.remove();
      else if (g) g.classList.toggle('jeda', !lgQ.main);
    });
  }
}
function lgGulirKeLagu() {
  var b = $('#lgKanan [data-lg-i="' + (lgQ ? lgQ.idx : -1) + '"]'),
    box = $('#subBody');
  if (!b || !box) return;
  var r = b.getBoundingClientRect(),
    rb = box.getBoundingClientRect();
  if (window.innerWidth >= 900 && (r.top < rb.top + 60 || r.bottom > rb.bottom)) box.scrollTop += r.top - rb.top - rb.height / 3;
}

/* ---------- Pemutar YouTube ---------- */
function lgMuatApi() {
  if (window.YT && YT.Player) return Promise.resolve();
  if (lgApiJanji) return lgApiJanji;
  lgApiJanji = new Promise(function (res, rej) {
    var lama = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof lama === 'function')
        try {
          lama();
        } catch (e) {}
      res();
    };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = function () {
      lgApiJanji = null;
      s.remove();
      rej(new Error('Pemutar YouTube tidak bisa dimuat. Periksa koneksi internet.'));
    };
    document.head.appendChild(s);
    setTimeout(function () {
      if (!(window.YT && YT.Player)) {
        lgApiJanji = null;
        rej(new Error('Pemutar YouTube tidak bisa dimuat. Periksa koneksi internet.'));
      }
    }, 20000);
  });
  return lgApiJanji;
}
function lgHost() {
  var h = $('#lgHost');
  if (!h) {
    h = document.createElement('div');
    h.id = 'lgHost';
    h.className = 'lg-host';
    h.innerHTML = '<div id="lgYt"></div>';
    document.body.appendChild(h);
  }
  return h;
}
function lgPemutar() {
  if (lgYT) return Promise.resolve(lgYT);
  return lgMuatApi().then(function () {
    lgHost();
    return new Promise(function (res) {
      var p = new YT.Player('lgYt', {
        width: '100%',
        height: '100%',
        host: 'https://www.youtube.com',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
        events: {
          onReady: function () {
            lgYT = p;
            res(p);
          },
          onStateChange: lgStatus,
          onError: lgGalat
        }
      });
    });
  });
}
function lgDurasiKini() {
  var s = lgQ && lgQ.list[lgQ.idx],
    d = 0;
  try {
    d = lgYT && lgYT.getDuration ? lgYT.getDuration() : 0;
  } catch (e) {}
  return d || (s && s.d) || 0;
}
function lgStatus(e) {
  if (!lgQ) return;
  var st = e.data;
  if (st === 5 && lgCuedJanji) {
    var f = lgCuedJanji;
    lgCuedJanji = null;
    f();
    return;
  }
  if (st === 1) {
    lgQ.main = true;
    lgQ.berturut = 0;
    var s = lgQ.list[lgQ.idx],
      vd = null;
    try {
      vd = lgYT.getVideoData();
    } catch (x) {}
    if (s && vd) {
      if (!s.j && vd.title) s.j = vd.title;
      if (!s.p && vd.author) s.p = vd.author;
      if (!s.d) s.d = lgDurasiKini();
      lgLengkapiItem(s);
    }
  } else if (st === 2) lgQ.main = false;
  else if (st === 0) {
    lgQ.main = false;
    lgSelesai();
  }
  lgRender();
}
/* Item tersimpan tanpa judul (info YouTube belum bisa diambil): judul diisi dari pemutar */
function lgLengkapiItem(s) {
  var it = lgQ.item,
    y = lgQ.y,
    ubah = {};
  if (y.t === 'v' && it.a === 'Lagu YouTube' && s.j) {
    ubah.a = s.j;
    if (!it.b && s.p) ubah.b = s.p;
  }
  if (y.t === 'pl' && !y.tv && lgQ.idx === 0) ubah.tv = s.id;
  if (y.t === 'pl' && lgQ.list.length && y.n !== lgQ.list.length && !lgApiSiap()) ubah.n = lgQ.list.length;
  if (!Object.keys(ubah).length) return;
  var o = glSemua();
  o.lagu = o.lagu.map(function (x) {
    if (x.id !== it.id) return x;
    var z = Object.assign({}, x);
    z.yt = Object.assign({}, lgYt(x));
    if (ubah.a) {
      z.a = ubah.a.slice(0, GL_A_MAKS);
      if (ubah.b) z.b = ubah.b.slice(0, GL_B_MAKS);
    }
    if (ubah.tv) z.yt.tv = ubah.tv;
    if (ubah.n) z.yt.n = ubah.n;
    z.diubah = Date.now();
    lgQ.item = z;
    lgQ.y = lgYtSah(z.yt);
    return z;
  });
  glSimpanSemua(o);
  if (opened.page && pageKind === 'lagu-putar' && ubah.a) $('#subTitle').textContent = lgQ.item.a;
}
function lgGalat(e) {
  if (!lgQ) return;
  var s = lgQ.list[lgQ.idx];
  if (!LG_GALAT_BLOK[e.data] || !s) return;
  s.ok = false;
  lgQ.main = false;
  lgMulaiHitung();
  lgRender();
}
function lgMulaiHitung() {
  clearInterval(lgBlokT);
  lgQ.hitung = 0;
  if (lgQ.y.t !== 'pl' || lgQ.list.length < 2) return;
  lgQ.berturut = (lgQ.berturut || 0) + 1;
  if (lgQ.berturut >= lgQ.list.length) return; /* semua lagu terblokir: berhenti */
  lgQ.hitung = 5;
  lgBlokT = setInterval(function () {
    if (!lgQ) {
      clearInterval(lgBlokT);
      return;
    }
    lgQ.hitung--;
    var el = $('#lgHitung');
    if (el) el.textContent = lgQ.hitung;
    if (lgQ.hitung <= 0) {
      clearInterval(lgBlokT);
      lgKe(1, true);
    }
  }, 1000);
}
function lgMulai(x, y) {
  lgBerhentiDiam();
  var no = Date.now();
  lgQ = {
    item: x,
    y: y,
    list: [],
    idx: 0,
    main: false,
    acak: false,
    ulang: 0,
    status: 'Menyiapkan pemutar…',
    gagal: false,
    no: no,
    hitung: 0,
    berturut: 0
  };
  lgRender();
  var daftar;
  if (y.t === 'v') {
    daftar = Promise.resolve([{ id: y.id, j: x.a === 'Lagu YouTube' ? '' : x.a, p: x.b, d: 0, ok: true }]).then(function (L) {
      return lgApiSiap()
        ? lgInfoVideo([y.id])
            .then(function (m) {
              var d = m[y.id];
              if (d) {
                L[0].d = d.d;
                L[0].ok = d.ok;
              }
              return L;
            })
            .catch(function () {
              return L;
            })
        : L;
    });
  } else if (lgCache[y.id]) daftar = Promise.resolve(lgCache[y.id]);
  else
    daftar = (
      lgApiSiap()
        ? lgIsiPlaylist(y.id).then(function (L) {
            if (!L.length) throw new Error('kosong');
            return L;
          })
        : Promise.reject(new Error('tanpa-key'))
    )
      .catch(function () {
        return lgDaftarDariPemutar(y.id);
      })
      .then(function (L) {
        lgCache[y.id] = L;
        return L;
      });
  Promise.all([daftar, lgPemutar()])
    .then(function (r) {
      if (!lgQ || lgQ.no !== no) return;
      var L = r[0];
      if (!L || !L.length) throw new Error('Playlist kosong atau pribadi. Coba buka di YouTube.');
      lgQ.list = L.map(function (z) {
        return Object.assign({}, z);
      });
      lgQ.status = '';
      var awal = y.v
        ? L.map(function (z) {
            return z.id;
          }).indexOf(y.v)
        : 0;
      if (y.t === 'pl' && lgApiSiap() && L.length !== y.n) lgPerbaruiJumlah(x.id, L.length);
      lgPutarIdx(awal < 0 ? 0 : awal);
      setTimeout(lgGulirKeLagu, 60);
    })
    .catch(function (err) {
      if (!lgQ || lgQ.no !== no) return;
      lgQ.status =
        err && err.message && !/^(tanpa-key|kosong)$/.test(err.message) ? err.message : 'Playlist tidak bisa dimuat. Coba buka di YouTube.';
      lgQ.gagal = true;
      lgRender();
    });
}
function lgPerbaruiJumlah(id, n) {
  var o = glSemua(),
    ubah = false;
  o.lagu = o.lagu.map(function (x) {
    if (x.id !== id) return x;
    var y = lgYt(x);
    if (!y || y.n === n) return x;
    ubah = true;
    var z = Object.assign({}, x);
    z.yt = Object.assign({}, y, { n: n });
    return z;
  });
  if (ubah) {
    glSimpanSemua(o);
    if (lgQ && lgQ.item.id === id) lgQ.item = lgCariItem(id) || lgQ.item;
  }
}
/* Tanpa key: daftar lagu diambil dari pemutar YouTube */
function lgDaftarDariPemutar(listId) {
  return lgPemutar().then(function (p) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () {
        lgCuedJanji = null;
        rej(new Error('Playlist tidak bisa dimuat. Bisa jadi pribadi atau mix otomatis.'));
      }, 12000);
      lgCuedJanji = function () {
        clearTimeout(t);
        var ids = [];
        try {
          ids = p.getPlaylist() || [];
        } catch (e) {}
        res(
          ids
            .filter(function (v) {
              return LG_ID.test(v);
            })
            .map(function (v) {
              return { id: v, j: '', p: '', d: 0, ok: true };
            })
        );
      };
      p.cuePlaylist({ listType: 'playlist', list: listId });
    });
  });
}
function lgPutarIdx(i) {
  if (!lgQ || !lgQ.list[i]) return;
  clearInterval(lgBlokT);
  lgQ.hitung = 0;
  lgQ.idx = i;
  var s = lgQ.list[i];
  if (s.ok === false) {
    lgQ.main = false;
    try {
      lgYT.stopVideo();
    } catch (e) {}
    lgMulaiHitung();
    lgRender();
    setTimeout(lgGulirKeLagu, 30);
    return;
  }
  try {
    lgYT.loadVideoById(s.id);
    lgQ.main = true;
  } catch (e) {}
  lgRender();
  setTimeout(lgGulirKeLagu, 30);
}
function lgToggle() {
  if (!lgQ || !lgYT || !lgQ.list.length) return;
  var s = lgQ.list[lgQ.idx];
  if (s && s.ok === false) {
    lgKe(1);
    return;
  }
  var st = -1;
  try {
    st = lgYT.getPlayerState();
  } catch (e) {}
  if (st === 1 || st === 3) {
    lgYT.pauseVideo();
    lgQ.main = false;
  } else if (st === 0 || st === 5 || st === -1) {
    lgYT.loadVideoById(s.id);
    lgQ.main = true;
  } else {
    lgYT.playVideo();
    lgQ.main = true;
  }
  lgRender();
}
function lgKe(d, otomatis) {
  if (!lgQ || !lgQ.list.length) return;
  if (!otomatis) lgQ.berturut = 0;
  var n = lgQ.list.length,
    i;
  if (lgQ.acak && d > 0 && n > 1) {
    do {
      i = Math.floor(Math.random() * n);
    } while (i === lgQ.idx);
  } else i = (lgQ.idx + d + n) % n;
  lgPutarIdx(i);
}
function lgSebelum() {
  var t = 0;
  try {
    t = lgYT.getCurrentTime();
  } catch (e) {}
  if (t > 3) {
    lgYT.seekTo(0, true);
    lgJalan();
  } else lgKe(-1);
}
function lgSelesai() {
  var pl = lgQ.y.t === 'pl';
  if (lgQ.ulang === 2 || (!pl && lgQ.ulang === 1)) {
    lgYT.seekTo(0, true);
    lgYT.playVideo();
    lgQ.main = true;
    return;
  }
  if (!pl) return;
  if (lgQ.idx === lgQ.list.length - 1 && !lgQ.ulang && !lgQ.acak) return;
  lgKe(1, true);
}
function lgBerhentiDiam() {
  clearInterval(lgBlokT);
  if (lgYT)
    try {
      lgYT.stopVideo();
    } catch (e) {}
  lgCuedJanji = null;
}
function lgBerhenti() {
  lgBerhentiDiam();
  lgQ = null;
  lgMiniRender();
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'lagu') glRenderDaftar();
}

/* Waktu & bar kemajuan */
function lgJalan() {
  if (!lgQ) return;
  var t = 0,
    d = lgDurasiKini();
  try {
    t = lgYT && lgYT.getCurrentTime ? lgYT.getCurrentTime() : 0;
  } catch (e) {}
  var p = d ? Math.min(100, (t / d) * 100) : 0;
  var a = $('#lgRelIsi');
  if (a && opened.page && pageKind === 'lagu-putar') {
    a.style.width = p + '%';
    $('#lgNow').textContent = lgDur(t);
    $('#lgTot').textContent = lgDur(d);
  }
  var m = $('#lgMiniGaris');
  if (m) m.style.width = p + '%';
}

/* Posisi pemutar mengikuti kotak video di halaman; di luar halaman disembunyikan (tetap berputar) */
function lgLoopMulai() {
  if (lgLoop) return;
  var tik = 0;
  function langkah() {
    lgLoop = null;
    if (!lgQ && !$('#lgHost')) return;
    var h = $('#lgHost'),
      box = $('#lgLayar'),
      lihat = h && lgQ && opened.page && pageKind === 'lagu-putar' && box && !document.documentElement.classList.contains('kunci-aktif');
    if (h) {
      if (lihat) {
        var r = box.getBoundingClientRect(),
          sb = $('#subBody').getBoundingClientRect();
        var atas = Math.max(r.top, sb.top),
          bawah = Math.min(r.bottom, sb.bottom);
        h.style.cssText =
          'left:' +
          r.left +
          'px;top:' +
          r.top +
          'px;width:' +
          r.width +
          'px;height:' +
          r.height +
          'px;z-index:' +
          ((+$('#layer-page').style.zIndex || 40) + 1) +
          ';clip-path:inset(' +
          Math.max(0, atas - r.top) +
          'px 0 ' +
          Math.max(0, r.bottom - bawah) +
          'px 0 round 0)';
        h.classList.toggle('tutup', !!(lgQ.list[lgQ.idx] && lgQ.list[lgQ.idx].ok === false) || !!lgQ.status || bawah <= atas);
      } else h.style.cssText = '';
      h.classList.toggle('lihat', !!lihat);
    }
    if (++tik % 15 === 0) lgJalan();
    lgMiniTampil();
    if (lgQ) lgLoop = requestAnimationFrame(langkah);
  }
  lgLoop = requestAnimationFrame(langkah);
}

/* ---------- Mini player ---------- */
function lgMini() {
  var m = $('#lgMini');
  if (!m) {
    m = document.createElement('div');
    m.id = 'lgMini';
    m.className = 'lg-mini';
    m.hidden = true;
    m.innerHTML =
      '<button type="button" class="lg-mini-buka" id="lgMiniBuka"><span class="lg-mini-tb" id="lgMiniTb"></span><span class="lg-tx"><b id="lgMiniJ"></b><small id="lgMiniS"></small></span></button>' +
      '<button type="button" class="lg-ib" id="lgMiniMain" aria-label="Putar"></button>' +
      '<button type="button" class="lg-ib" id="lgMiniNext" aria-label="Berikutnya">' +
      LG_IK.next +
      '</button>' +
      '<button type="button" class="lg-ib" id="lgMiniTutup" aria-label="Hentikan">' +
      LG_IK.tutup +
      '</button><span class="lg-mini-garis" id="lgMiniGaris"></span>';
    m.addEventListener('click', function (e) {
      if (!lgQ) return;
      if (e.target.closest('#lgMiniMain')) lgToggle();
      else if (e.target.closest('#lgMiniNext')) lgKe(1);
      else if (e.target.closest('#lgMiniTutup')) lgBerhenti();
      else if (e.target.closest('#lgMiniBuka')) openLayer('page:lagu-putar:' + lgQ.item.id);
    });
    document.body.appendChild(m);
  }
  return m;
}
function lgMiniRender() {
  if (!lgQ) {
    var a = $('#lgMini');
    if (a) a.hidden = true;
    document.body.classList.remove('lg-mini-on');
    return;
  }
  var m = lgMini(),
    s = lgQ.list[lgQ.idx];
  $('#lgMiniTb').innerHTML = lgGambar(s ? s.id : lgQ.y.tv || '', 'lg-tb');
  $('#lgMiniJ').textContent = s ? s.j || 'Lagu ' + (lgQ.idx + 1) : lgQ.item.a;
  $('#lgMiniS').textContent =
    s && s.ok === false ? 'Hanya bisa diputar di YouTube' : ((s && s.p) || lgQ.item.b || '') + (lgQ.y.t === 'pl' ? ' · ' + lgQ.item.a : '');
  $('#lgMiniMain').innerHTML = lgQ.main ? LG_IK.jeda : LG_IK.play;
  $('#lgMiniMain').setAttribute('aria-label', lgQ.main ? 'Jeda' : 'Putar');
  $('#lgMiniNext').hidden = lgQ.y.t !== 'pl';
  lgMiniTampil();
}
function lgMiniTampil() {
  var m = $('#lgMini');
  if (!m) return;
  var tampil = !!lgQ && !(opened.page && pageKind === 'lagu-putar') && !opened.img && !opened.confirm && !$('#lgMenu');
  if (m.hidden === tampil) m.hidden = !tampil;
  document.body.classList.toggle('lg-mini-on', tampil);
  if (!tampil) return;
  var bawah = 12,
    nav = $('#bottomNav');
  if (!cur.layers.length && nav) {
    var r = nav.getBoundingClientRect();
    if (r.height && r.top > innerHeight / 2) bawah = innerHeight - r.top + 8;
  }
  var nilai = 'calc(' + bawah + 'px + ' + (bawah === 12 ? 'env(safe-area-inset-bottom)' : '0px') + ')';
  if (m.style.bottom !== nilai) m.style.bottom = nilai;
  m.style.zIndex = cur.layers.length ? (+$('#layer-page').style.zIndex || 40) + 2 : 30;
}

/* ---------- Aksi ---------- */
function lgBukaYoutube(x, s) {
  var y = lgYt(x);
  if (!y) return;
  var t = 0,
    url;
  if (s && lgQ && lgQ.item.id === x.id) {
    try {
      t = Math.floor(lgYT.getCurrentTime());
      lgYT.pauseVideo();
      lgQ.main = false;
      lgRender();
    } catch (e) {}
  }
  if (s) url = 'https://www.youtube.com/watch?v=' + s.id + (y.t === 'pl' ? '&list=' + y.id : '') + (t > 2 ? '&t=' + t + 's' : '');
  else url = y.t === 'pl' ? (y.v ? 'https://www.youtube.com/watch?v=' + y.v + '&list=' + y.id : lgUrlKanonik(y)) : lgUrlKanonik(y);
  window.open(url, '_blank', 'noopener');
}
function lgSalin(x) {
  var u = x.url || lgUrlKanonik(lgYt(x));
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(u).then(
      function () {
        toast('Link disalin');
      },
      function () {
        toast('Gagal menyalin link');
      }
    );
  else toast('Gagal menyalin link');
}
function lgTanyaHapus(x, n) {
  var y = lgYt(x),
    jenis = y && y.t === 'pl' ? 'playlist' : 'lagu';
  askConfirm({
    title: 'Hapus ' + jenis + '?',
    text: '"' + x.a.slice(0, 80) + '" dihapus dari Stivora. Di YouTube tetap ada.',
    ok: 'Hapus',
    action: function () {
      back(n, function () {
        lgHapus(x.id, jenis);
      });
    }
  });
}
function lgHapus(id, jenis) {
  var o = glSemua();
  o.lagu = o.lagu.filter(function (x) {
    return x.id !== id;
  });
  glSimpanSemua(o);
  if (lgQ && lgQ.item.id === id) lgBerhenti();
  renderGaleryTab();
  if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
  toast((jenis === 'playlist' ? 'Playlist' : 'Lagu') + ' dihapus');
}

/* Data berubah dari cloud: item yang sedang diputar dihapus di perangkat lain → berhenti */
function lgSegarkan() {
  if (lgQ && !lgCariItem(lgQ.item.id)) lgBerhenti();
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'lagu') glRenderDaftar();
}
