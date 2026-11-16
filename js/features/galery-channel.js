/* ============================================================
   Stivora — Galery · Lainnya · Channel Favorit (5.61.0)
   - Satu item = satu kreator dengan banyak platform (YouTube, Instagram, TikTok, X, Facebook, Threads, Twitch,
     Telegram, Spotify, website). Disimpan di 'stivora.galery.channel' = { v: 1, top: [topik tambahan], item: [...] }
     (sinkron dipecah: 'channel-c-<id>' + 'channel-urutan'; ikut cadangan).
     Item: { id, a: nama, pl: [{ p, u: link, h: username, yt?: { id, up, t, av, bn, subs, vids } }], top: [], n: nilai,
             al: alasan, ar: arsip, fav: [{ i, u, j, c, v: id video YouTube }], tk: id Tokoh Favorit,
             av: foto profil (JPEG kecil, data URL), lv: terakhir dilihat (ms), sn: [id video sudah dilihat], dibuat, diubah }
   - YouTube: profil, subscriber & video terbaru lewat YouTube Data API, melalui Worker (sama dengan Playlist Lagu).
     Platform lain dikenali dari link saja (tidak ada akses publik untuk foto & jumlah pengikut).
   ============================================================ */
'use strict';

var K_CH = 'stivora.galery.channel';
var CH_MAKS = 2000,
  CH_PL_MAKS = 20,
  CH_FAV_MAKS = 300,
  CH_RUANG = 300000,
  CH_AV_MAKS = 40000;
var CH_PL = {
  yt: { n: 'YouTube', h: 'YT', w: '#ff0033' },
  ig: { n: 'Instagram', h: 'IG', w: '#dd2a7b', k: 'ch-pl-ig' },
  tt: { n: 'TikTok', h: 'TT', w: '#111111', k: 'ch-pl-gelap' },
  x: { n: 'X', h: 'X', w: '#111111', k: 'ch-pl-gelap' },
  fb: { n: 'Facebook', h: 'f', w: '#1877f2' },
  th: { n: 'Threads', h: '@', w: '#111111', k: 'ch-pl-gelap' },
  tw: { n: 'Twitch', h: 'Tw', w: '#9146ff' },
  tg: { n: 'Telegram', h: 'Tg', w: '#229ed9' },
  sp: { n: 'Spotify', h: 'Sp', w: '#1db954' },
  web: { n: 'Website', h: 'W', w: '#64748b' }
};
var CH_TOPIK = ['Bisnis', 'Gaming', 'Sains', 'Agama', 'Keuangan', 'Teknologi', 'Hiburan', 'Masak', 'Olahraga', 'Pendidikan'];
var CH_WARNA = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#0f766e', '#92400e'];
var chS = 'aktif',
  chP = '',
  chT = '',
  chTujuan = null,
  chDraft = null,
  chYtCache = {},
  chLvLama = {},
  chFavForm = false,
  chMuatNo = 0;

function chStr(v, n) {
  return typeof v === 'string' ? v.slice(0, n) : '';
}
function chUrl(u) {
  return typeof glUrlSah === 'function' ? glUrlSah(u) : '';
}
function chYtSah(y) {
  if (!y || typeof y !== 'object' || !/^UC[A-Za-z0-9_-]{20,30}$/.test(y.id || '')) return undefined;
  var o = { id: y.id };
  if (/^UU[A-Za-z0-9_-]{20,30}$/.test(y.up || '')) o.up = y.up;
  if (chStr(y.t, 120)) o.t = chStr(y.t, 120);
  ['av', 'bn'].forEach(function (k) {
    var u = chUrl(y[k]);
    if (u && u.length < 500) o[k] = u;
  });
  if (+y.subs >= 0 && y.subs !== undefined && y.subs !== null) o.subs = Math.floor(+y.subs);
  if (+y.vids >= 0 && y.vids !== undefined && y.vids !== null) o.vids = Math.floor(+y.vids);
  return o;
}
function chSah(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.a) return null;
  var o = { id: x.id.slice(0, 64), a: chStr(String(x.a), 80), dibuat: +x.dibuat || 0, diubah: +x.diubah || +x.dibuat || 0 };
  o.pl = (Array.isArray(x.pl) ? x.pl : [])
    .filter(function (p) {
      return p && CH_PL[p.p] && chUrl(p.u);
    })
    .slice(0, CH_PL_MAKS)
    .map(function (p) {
      var q = { p: p.p, u: chUrl(p.u), h: chStr(p.h, 80) };
      var y = p.p === 'yt' ? chYtSah(p.yt) : undefined;
      if (y) q.yt = y;
      return q;
    });
  if (Array.isArray(x.top))
    o.top = x.top
      .filter(function (t) {
        return typeof t === 'string' && t.trim();
      })
      .slice(0, 12)
      .map(function (t) {
        return t.trim().slice(0, 30);
      });
  if (+x.n >= 1 && +x.n <= 5) o.n = Math.floor(+x.n);
  if (chStr(x.al, 2000).trim()) o.al = chStr(x.al, 2000);
  if (x.ar) o.ar = 1;
  if (Array.isArray(x.fav))
    o.fav = x.fav
      .filter(function (f) {
        return f && chUrl(f.u);
      })
      .slice(0, CH_FAV_MAKS)
      .map(function (f) {
        var q = { i: chStr(f.i, 40) || uid(), u: chUrl(f.u), j: chStr(f.j, 200), c: chStr(f.c, 1000) };
        if (/^[A-Za-z0-9_-]{6,20}$/.test(f.v || '')) q.v = f.v;
        return q;
      });
  if (typeof x.tk === 'string' && x.tk) o.tk = x.tk.slice(0, 64);
  if (typeof x.av === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x.av) && x.av.length <= CH_AV_MAKS) o.av = x.av;
  if (+x.lv > 0) o.lv = Math.floor(+x.lv);
  if (Array.isArray(x.sn))
    o.sn = x.sn
      .filter(function (v) {
        return /^[A-Za-z0-9_-]{6,20}$/.test(v || '');
      })
      .slice(-60);
  return o;
}

/* ---------- Penyimpanan ---------- */
function chData() {
  var d = store.get(K_CH, null);
  return d && typeof d === 'object' ? d : { v: 1, item: [] };
}
function chItems() {
  chMigrasi();
  var d = chData();
  return (Array.isArray(d.item) ? d.item : []).map(chSah).filter(Boolean);
}
function chTopikTambahan() {
  var d = chData();
  return (Array.isArray(d.top) ? d.top : [])
    .filter(function (t) {
      return typeof t === 'string' && t;
    })
    .slice(0, 50);
}
function chSemuaTopik() {
  var o = CH_TOPIK.slice();
  chTopikTambahan().forEach(function (t) {
    if (o.indexOf(t) < 0) o.push(t);
  });
  return o;
}
function chSimpanData(items, topTambahan) {
  glSimpanPecahan(K_CH, chSah, items, { top: topTambahan });
}
function chCari(id) {
  return (
    chItems().filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function chUbah(id, f) {
  var hasil = null,
    gagal = false;
  var L = chItems().map(function (x) {
    if (x.id !== id) return x;
    var z = JSON.parse(JSON.stringify(x));
    f(z);
    z = chSah(z);
    if (!z) return x;
    z.diubah = Date.now();
    if (typeof gtUkuranByte === 'function' && gtUkuranByte(z) > CH_RUANG) {
      gagal = true;
      toast('Data kreator ini sudah terlalu besar. Hapus beberapa konten favorit dulu.');
      return x;
    }
    hasil = z;
    return z;
  });
  if (hasil && !gagal) chSimpanData(L);
  return gagal ? null : hasil;
}
/* Channel lama di tab Lainnya dipindah ke sini (platform dikenali dari link) */
function chMigrasi() {
  var d = store.get(K_GL, null);
  if (!d || !Array.isArray(d.channel) || !d.channel.length) return;
  var data = chData(),
    items = Array.isArray(data.item) ? data.item.slice() : [],
    ada = {};
  items.forEach(function (x) {
    if (x && x.id) ada[x.id] = 1;
  });
  d.channel.forEach(function (x) {
    if (!x || typeof x.id !== 'string' || !x.a || ada[x.id]) return;
    var p = chDeteksi(x.url),
      top = [],
      al = String(x.c || '');
    String(x.b || '')
      .split(/[·,/|]/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
      .forEach(function (s) {
        var t = CH_TOPIK.filter(function (k) {
          return k.toLowerCase() === s.toLowerCase();
        })[0];
        if (t) top.push(t);
        else if (
          !Object.keys(CH_PL).some(function (k) {
            return CH_PL[k].n.toLowerCase() === s.toLowerCase();
          })
        )
          al = (al ? al + '\n' : '') + s;
      });
    items.push({
      id: x.id,
      a: x.a,
      pl: p ? [{ p: p.p, u: p.u, h: p.h }] : [],
      top: top,
      al: al,
      dibuat: x.dibuat || Date.now(),
      diubah: x.diubah || Date.now(),
      lv: Date.now()
    });
  });
  var sisa = {};
  Object.keys(d).forEach(function (k) {
    if (k !== 'channel') sisa[k] = d[k];
  });
  store.set(K_GL, sisa);
  var o = { v: 1 };
  Object.keys(data).forEach(function (k) {
    if (k !== 'item' && k !== 'v') o[k] = data[k];
  });
  o.item = items;
  store.set(K_CH, o);
}

/* ---------- Mengenali link ---------- */
function chDeteksi(u) {
  u = String(u || '').trim();
  if (!u) return null;
  var x;
  try {
    x = new URL(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u);
  } catch (e) {
    return null;
  }
  if (!/^https?:$/.test(x.protocol)) return null;
  var h = x.hostname.toLowerCase().replace(/^(www|m|mobile|music)\./, ''),
    seg = x.pathname.split('/').filter(Boolean),
    s0 = decodeURIComponent(seg[0] || '');
  var hasil = function (p, han, urlKanon) {
    return { p: p, h: String(han || '').slice(0, 80), u: chUrl(urlKanon || x.href) };
  };
  if (/^(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(h)) {
    var r = { p: 'yt', h: '', u: '' };
    if (h === 'youtu.be') r.video = s0;
    else if (s0 === 'watch') r.video = x.searchParams.get('v') || '';
    else if (/^(shorts|live|embed)$/.test(s0)) r.video = seg[1] || '';
    else if (s0.charAt(0) === '@') r.handle = s0;
    else if (s0 === 'channel') r.cid = seg[1] || '';
    else if (s0 === 'c' || s0 === 'user') r.nama = seg[1] || '';
    else if (s0) r.handle = '@' + s0;
    if (r.video && !/^[A-Za-z0-9_-]{6,20}$/.test(r.video)) r.video = '';
    if (r.cid && !/^UC[A-Za-z0-9_-]{20,30}$/.test(r.cid)) r.cid = '';
    r.h = r.handle || (r.cid ? '' : r.nama ? r.nama : '');
    r.u = chUrl(r.handle ? 'https://www.youtube.com/' + r.handle : r.cid ? 'https://www.youtube.com/channel/' + r.cid : x.href);
    return r;
  }
  if (h === 'instagram.com' || h === 'instagr.am') {
    var ig = /^(p|reel|reels|tv|stories|explore)$/.test(s0) ? '' : s0;
    return hasil('ig', ig, ig ? 'https://www.instagram.com/' + ig + '/' : x.href);
  }
  if (h === 'tiktok.com' || /\.tiktok\.com$/.test(h)) {
    var tt = s0.charAt(0) === '@' ? s0 : '';
    return hasil('tt', tt, tt ? 'https://www.tiktok.com/' + tt : x.href);
  }
  if (h === 'x.com' || h === 'twitter.com') {
    var xx = /^(i|home|search|intent|share)$/.test(s0) ? '' : s0;
    return hasil('x', xx ? '@' + xx : '', xx ? 'https://x.com/' + xx : x.href);
  }
  if (/^(facebook\.com|fb\.com|fb\.me|web\.facebook\.com)$/.test(h)) {
    var fb = /^(profile\.php|share|groups|watch|story\.php|permalink\.php)$/.test(s0) ? '' : s0;
    return hasil('fb', fb, fb ? 'https://www.facebook.com/' + fb : x.href);
  }
  if (h === 'threads.net' || h === 'threads.com') {
    var th = s0.charAt(0) === '@' ? s0 : '';
    return hasil('th', th, th ? 'https://www.threads.net/' + th : x.href);
  }
  if (h === 'twitch.tv') return hasil('tw', s0, s0 ? 'https://www.twitch.tv/' + s0 : x.href);
  if (h === 't.me' || h === 'telegram.me') return hasil('tg', s0 ? '@' + s0 : '', s0 ? 'https://t.me/' + s0 : x.href);
  if (h === 'open.spotify.com' || h === 'spotify.link')
    return hasil('sp', seg[0] === 'show' ? 'Podcast' : seg[0] === 'artist' ? 'Artis' : '', x.href);
  return hasil('web', h);
}

/* ---------- YouTube ---------- */
function chYtSiap() {
  return typeof lgApi === 'function' && typeof lgApiSiap === 'function' && lgApiSiap();
}
function chYtChannel(r) {
  if (!chYtSiap()) return Promise.reject(new Error('tanpa-key'));
  var q;
  if (r.cid) q = Promise.resolve({ id: r.cid });
  else if (r.handle) q = Promise.resolve({ forHandle: r.handle });
  else if (r.nama)
    q = lgApi('channels', { part: 'id', forUsername: r.nama }).then(function (j) {
      return j.items && j.items[0] ? { id: j.items[0].id } : { forHandle: '@' + r.nama };
    });
  else if (r.video)
    q = lgApi('videos', { part: 'snippet', id: r.video }).then(function (j) {
      var v = j.items && j.items[0];
      if (!v) throw new Error('Video tidak ditemukan');
      return { id: v.snippet.channelId };
    });
  else return Promise.reject(new Error('Link YouTube ini tidak menunjuk ke channel.'));
  return q
    .then(function (sel) {
      sel.part = 'snippet,statistics,brandingSettings,contentDetails';
      return lgApi('channels', sel);
    })
    .then(function (j) {
      var c = j.items && j.items[0];
      if (!c) throw new Error('Channel tidak ditemukan.');
      var sn = c.snippet || {},
        st = c.statistics || {},
        th = sn.thumbnails || {};
      return {
        yt: chYtSah({
          id: c.id,
          up: c.contentDetails && c.contentDetails.relatedPlaylists && c.contentDetails.relatedPlaylists.uploads,
          t: sn.title,
          av: (th.medium || th.high || th['default'] || {}).url,
          bn:
            c.brandingSettings && c.brandingSettings.image && c.brandingSettings.image.bannerExternalUrl
              ? c.brandingSettings.image.bannerExternalUrl + '=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj'
              : '',
          subs: st.hiddenSubscriberCount ? undefined : st.subscriberCount,
          vids: st.videoCount
        }),
        nama: sn.title || '',
        handle: sn.customUrl ? (sn.customUrl.charAt(0) === '@' ? sn.customUrl : '@' + sn.customUrl) : '',
        desk: sn.description || ''
      };
    });
}
/* Video terbaru (dari playlist unggahan), disimpan sementara 30 menit */
function chYtVideo(y, paksa) {
  var k = y.up || 'UU' + y.id.slice(2);
  var c = chYtCache[k];
  if (c && !paksa && Date.now() - c.t < 30 * 60000) return Promise.resolve(c.L);
  if (!chYtSiap()) return Promise.reject(new Error('tanpa-key'));
  return lgApi('playlistItems', { part: 'snippet,contentDetails', playlistId: k, maxResults: 10 })
    .then(function (j) {
      var L = (j.items || [])
        .map(function (it) {
          var sn = it.snippet || {},
            cd = it.contentDetails || {};
          return {
            v: cd.videoId || (sn.resourceId && sn.resourceId.videoId),
            j: sn.title || '',
            t: Date.parse(cd.videoPublishedAt || sn.publishedAt) || 0
          };
        })
        .filter(function (v) {
          return v.v && /^[A-Za-z0-9_-]{6,20}$/.test(v.v) && v.j !== 'Private video' && v.j !== 'Deleted video';
        });
      L.sort(function (a, b) {
        return b.t - a.t;
      });
      return typeof lgInfoVideo === 'function'
        ? lgInfoVideo(
            L.map(function (v) {
              return v.v;
            })
          )
            .then(function (m) {
              L.forEach(function (v) {
                if (m[v.v]) v.d = m[v.v].d;
              });
              return L;
            })
            .catch(function () {
              return L;
            })
        : L;
    })
    .then(function (L) {
      chYtCache[k] = { t: Date.now(), L: L };
      return L;
    });
}
function chYtDari(x) {
  var p = (x.pl || []).filter(function (q) {
    return q.p === 'yt' && q.yt;
  })[0];
  return p ? p.yt : null;
}
function chBaru(x, L, lv) {
  lv = lv === undefined ? x.lv || x.dibuat || 0 : lv;
  var sn = x.sn || [];
  return (L || []).filter(function (v) {
    return v.t > lv && sn.indexOf(v.v) < 0;
  });
}
function chAngka(n) {
  n = +n || 0;
  if (n >= 1e9) return (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  if (n >= 1e6) return (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
  if (n >= 1e3) return (n / 1e3).toLocaleString('id-ID', { maximumFractionDigits: n >= 1e4 ? 0 : 1 }) + ' rb';
  return String(n);
}
function chLalu(t) {
  var d = (Date.now() - t) / 1000;
  if (d < 3600) return Math.max(1, Math.round(d / 60)) + ' menit lalu';
  if (d < 86400) return Math.round(d / 3600) + ' jam lalu';
  if (d < 172800) return 'Kemarin';
  if (d < 7 * 86400) return Math.round(d / 86400) + ' hari lalu';
  if (d < 30 * 86400) return Math.round(d / (7 * 86400)) + ' minggu lalu';
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------- Tampilan kecil ---------- */
function chLencana(p, besar) {
  var c = CH_PL[p] || CH_PL.web;
  return (
    '<span class="ch-pl ' +
    (c.k || '') +
    (besar ? ' besar' : '') +
    '" style="--p:' +
    c.w +
    '" title="' +
    c.n +
    '" translate="no">' +
    c.h +
    '</span>'
  );
}
function chWarna(x) {
  var h = 0;
  for (var i = 0; i < x.id.length; i++) h = (h * 31 + x.id.charCodeAt(i)) >>> 0;
  return CH_WARNA[h % CH_WARNA.length];
}
function chAvatar(x, kelas) {
  var y = chYtDari(x),
    src = x.av || (y && y.av) || '';
  var inisial = x.a
    .split(/\s+/)
    .filter(Boolean)
    .map(function (w) {
      return w.charAt(0);
    })
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    '<span class="ch-av ' +
    (kelas || '') +
    '" style="--g:' +
    chWarna(x) +
    '">' +
    esc(inisial) +
    (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
    '</span>'
  );
}
document.addEventListener(
  'error',
  function (e) {
    var t = e.target;
    if (
      t &&
      t.tagName === 'IMG' &&
      t.parentNode &&
      t.parentNode.classList &&
      (t.parentNode.classList.contains('ch-av') || t.parentNode.classList.contains('ch-banner'))
    )
      t.remove();
  },
  true
);
var CH_IK = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  tv: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M8 5v14l11-7z"/></svg>',
  simpan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  hapus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  bintang:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  pola: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
  orang: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/></svg>',
  kamera:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8h3.5l2-2.5h6L17 8h3.5v11h-17z"/><circle cx="12" cy="13.2" r="3.4"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h0M11 12h1v5h1"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
};

/* ---------- Daftar di halaman Channel Favorit ---------- */
function chRenderDaftar(box, q) {
  var semua = chItems();
  if (!semua.length) {
    box.innerHTML =
      '<div class="lg-kosong ch-kosong">' +
      CH_IK.tv +
      '<p>Belum ada channel.<br>Salin link profil dari YouTube, Instagram, TikTok, atau platform lain, lalu ketuk <b>Tambah</b>.</p></div>';
    return;
  }
  var h = '<div id="chBaruBox"></div>';
  var nA = semua.filter(function (x) {
      return !x.ar;
    }).length,
    nR = semua.length - nA;
  if (chS === 'arsip' && !nR) chS = 'aktif';
  h +=
    '<h3 class="lg-judul">Kreator</h3><div class="gp-filter gl-filter">' +
    [
      ['aktif', 'Diikuti', nA],
      ['arsip', 'Arsip', nR]
    ]
      .filter(function (c) {
        return c[0] === 'aktif' || c[2];
      })
      .map(function (c) {
        return (
          '<button type="button" data-ch-s="' +
          c[0] +
          '"' +
          (chS === c[0] ? ' class="on"' : '') +
          '>' +
          c[1] +
          ' <small>' +
          c[2] +
          '</small></button>'
        );
      })
      .join('') +
    '</div>';
  var plAda = Object.keys(CH_PL).filter(function (k) {
    return semua.some(function (x) {
      return x.pl.some(function (p) {
        return p.p === k;
      });
    });
  });
  if (plAda.length > 1)
    h +=
      '<div class="gp-filter gl-filter ch-chip-pl">' +
      plAda
        .map(function (k) {
          return (
            '<button type="button" data-ch-p="' + k + '"' + (chP === k ? ' class="on"' : '') + '>' + chLencana(k) + CH_PL[k].n + '</button>'
          );
        })
        .join('') +
      '</div>';
  var topAda = glGabungTopik(
    chSemuaTopik(),
    [].concat.apply(
      [],
      semua.map(function (x) {
        return x.top || [];
      })
    )
  ).filter(function (t) {
    return semua.some(function (x) {
      return (x.top || []).indexOf(t) >= 0;
    });
  });
  if (topAda.length)
    h +=
      '<div class="gp-filter gl-filter ch-chip-top">' +
      topAda
        .map(function (t) {
          return '<button type="button" data-ch-t="' + esc(t) + '"' + (chT === t ? ' class="on"' : '') + '>' + esc(t) + '</button>';
        })
        .join('') +
      '</div>';
  var L = semua
    .filter(function (x) {
      return (
        (chS === 'arsip') === !!x.ar &&
        (!chP ||
          x.pl.some(function (p) {
            return p.p === chP;
          })) &&
        (!chT || (x.top || []).indexOf(chT) >= 0) &&
        (!q ||
          (
            x.a +
            ' ' +
            (x.top || []).join(' ') +
            ' ' +
            (x.al || '') +
            ' ' +
            x.pl
              .map(function (p) {
                return p.h;
              })
              .join(' ')
          )
            .toLowerCase()
            .indexOf(q) >= 0)
      );
    })
    .sort(function (a, b) {
      return b.dibuat - a.dibuat;
    });
  if (!L.length) h += '<p class="gt-kosong">Tidak ada yang cocok.</p>';
  else
    h +=
      '<div class="ch-daftar">' +
      L.map(function (x) {
        var y = chYtDari(x),
          c = y ? chYtCache[y.up || 'UU' + y.id.slice(2)] : null,
          nb = c && !x.ar ? chBaru(x, c.L).length : 0;
        return (
          '<button type="button" class="ch-kartu' +
          (x.ar ? ' arsip' : '') +
          '" data-ch="' +
          esc(x.id) +
          '">' +
          chAvatar(x) +
          '<span class="ch-kartu-tx"><b>' +
          esc(x.a) +
          '</b>' +
          '<small>' +
          esc((x.top || []).join(' · ')) +
          (x.n ? (x.top && x.top.length ? ' · ' : '') + '<span class="fm-nilai">★ ' + x.n + '</span>' : '') +
          '</small>' +
          '<span class="ch-pls">' +
          x.pl
            .map(function (p) {
              return chLencana(p.p);
            })
            .join('') +
          (y && y.subs !== undefined ? '<em>' + chAngka(y.subs) + ' subscriber</em>' : '') +
          '</span></span>' +
          (nb ? '<span class="ch-lenc-baru">' + nb + ' baru</span>' : '') +
          '</button>'
        );
      }).join('') +
      '</div>';
  h += '<p class="fm-atribusi">Info YouTube dari YouTube Data API · Platform lain dikenali dari link</p>';
  box.innerHTML = h;
  chRenderBaru(semua);
  chMuatBaru(semua);
}
function chRenderBaru(semua) {
  var box = $('#chBaruBox');
  if (!box) return;
  var baru = [];
  semua.forEach(function (x) {
    if (x.ar) return;
    var y = chYtDari(x);
    if (!y) return;
    var c = chYtCache[y.up || 'UU' + y.id.slice(2)];
    if (!c) return;
    chBaru(x, c.L).forEach(function (v) {
      baru.push({ x: x, v: v });
    });
  });
  baru.sort(function (a, b) {
    return b.v.t - a.v.t;
  });
  if (!baru.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML =
    '<h3 class="lg-judul ch-judul"><span>Ada video baru · ' +
    baru.length +
    '</span><button type="button" id="chSudahLihat">Tandai sudah dilihat</button></h3><div class="ch-baru-list">' +
    baru
      .slice(0, 30)
      .map(function (b) {
        return (
          '<button type="button" class="ch-vb" data-ch-putar="' +
          esc(b.x.id) +
          '|' +
          b.v.v +
          '"><span class="ch-vb-tb"><img src="https://i.ytimg.com/vi/' +
          b.v.v +
          '/mqdefault.jpg" alt="" loading="lazy"><span class="ch-lb-baru">BARU</span>' +
          (b.v.d ? '<em>' + lgDur(b.v.d) + '</em>' : '') +
          '</span>' +
          '<span class="ch-vb-bw">' +
          chAvatar(b.x, 'mini') +
          '<span><b>' +
          esc(b.v.j) +
          '</b><small>' +
          esc(b.x.a) +
          ' · ' +
          chLalu(b.v.t) +
          '</small></span></span></button>'
        );
      })
      .join('') +
    '</div>';
}
/* Ambil video terbaru semua kreator YouTube (paling banyak 40, berurutan) lalu perbarui bagian "Ada video baru" */
function chMuatBaru(semua) {
  if (!chYtSiap()) return;
  var no = ++chMuatNo,
    daftar = semua
      .filter(function (x) {
        return !x.ar && chYtDari(x);
      })
      .slice(0, 40),
    ubah = false;
  daftar
    .reduce(function (p, x) {
      return p.then(function () {
        if (no !== chMuatNo) return;
        var y = chYtDari(x),
          k = y.up || 'UU' + y.id.slice(2),
          ada = !!chYtCache[k];
        return chYtVideo(y)
          .then(function () {
            if (!ada) ubah = true;
          })
          .catch(function () {});
      });
    }, Promise.resolve())
    .then(function () {
      if (no !== chMuatNo || !ubah || !(opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'channel')) return;
      var y = $('#subBody').scrollTop;
      glRenderDaftar();
      $('#subBody').scrollTop = y;
    });
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'channel') return;
  var el;
  if ((el = e.target.closest('[data-ch-s]'))) {
    chS = el.dataset.chS;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-ch-p]'))) {
    chP = chP === el.dataset.chP ? '' : el.dataset.chP;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-ch-t]'))) {
    chT = chT === el.dataset.chT ? '' : el.dataset.chT;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#chSudahLihat')) {
    var kini = Date.now(),
      L = chItems().map(function (x) {
        if (!x.ar && chYtDari(x)) {
          x.lv = kini;
          delete x.sn;
          x.diubah = kini;
        }
        return x;
      });
    chSimpanData(L);
    toast('Semua video ditandai sudah dilihat');
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-ch-putar]'))) {
    var a = el.dataset.chPutar.split('|');
    chPutar(a[0], a[1]);
    return;
  }
  if (e.target.closest('#chTambahBtn')) {
    chTujuan = null;
    openLayer('page:channel-tambah');
    return;
  }
  if ((el = e.target.closest('[data-ch]'))) openLayer('page:channel-detail:' + el.dataset.ch);
});

/* ---------- Pemutar video (YouTube) ---------- */
function chPutar(id, v) {
  var x = chCari(id);
  if (!x) return;
  var y = chYtDari(x),
    c = y ? chYtCache[y.up || 'UU' + y.id.slice(2)] : null,
    info = c
      ? c.L.filter(function (z) {
          return z.v === v;
        })[0]
      : null;
  if ((x.sn || []).indexOf(v) < 0 && info && info.t > (x.lv || 0))
    chUbah(id, function (z) {
      z.sn = (z.sn || []).concat([v]);
    });
  glPutarVideo(v, info ? info.j : x.a, chSegarkanTampilan);
}
function chSegarkanTampilan() {
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'channel') {
    var y = $('#subBody').scrollTop;
    glRenderDaftar();
    $('#subBody').scrollTop = y;
  } else if (opened.page && pageKind === 'channel-detail') chRenderUlang();
}

/* ---------- Halaman tambah ---------- */
PAGES['channel-tambah'] = function () {
  var tujuan = chTujuan ? chCari(chTujuan) : null;
  if (chTujuan && !tujuan) chTujuan = null;
  chDraft = null;
  $('#subTitle').textContent = tujuan ? 'Tambah link · ' + tujuan.a : 'Tambah channel';
  $('#subBody').innerHTML =
    '<div class="ch-tambah"><p class="lg-ket">Salin link profil atau channel (<b>Bagikan → Salin link</b>), lalu tempel di sini. Bisa dari YouTube, Instagram, TikTok, X, Facebook, Threads, Twitch, Telegram, Spotify, atau website.</p>' +
    '<div class="lg-masuk"><input class="input" id="chUrl" type="url" inputmode="url" autocomplete="off" maxlength="500" placeholder="https://…" data-tanpa-hitung><button type="button" class="btn ghost" id="chTempel">Tempel</button></div>' +
    '<div id="chPra" aria-live="polite"></div></div>';
  return true;
};
var chCekT = null,
  chCekNo = 0;
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'channel-tambah' && e.target.id === 'chUrl') {
    clearTimeout(chCekT);
    chCekT = setTimeout(chCek, 450);
  }
});
function chPraKotak(h) {
  var b = $('#chPra');
  if (b && pageKind === 'channel-tambah') b.innerHTML = h;
}
function chCek() {
  var u = ($('#chUrl') || {}).value || '',
    no = ++chCekNo;
  u = u.trim();
  chDraft = null;
  if (!u) {
    chPraKotak('');
    return;
  }
  var r = chDeteksi(u);
  if (!r || !r.u) {
    chPraKotak('<p class="lg-salah">Link tidak dikenali. Pastikan diawali https://</p>');
    return;
  }
  var semua = chItems();
  var dobel = semua.filter(function (x) {
    return x.pl.some(function (p) {
      return p.u === r.u || (r.p !== 'web' && p.p === r.p && p.h && r.h && p.h.toLowerCase() === r.h.toLowerCase());
    });
  })[0];
  if (r.p === 'yt') {
    chPraKotak('<div class="lg-muat"><i></i>Mengambil info channel dari YouTube…</div>');
    chYtChannel(r)
      .then(function (c) {
        if (no !== chCekNo) return;
        var d2 =
          semua.filter(function (x) {
            return x.pl.some(function (p) {
              return p.yt && p.yt.id === c.yt.id;
            });
          })[0] || dobel;
        chDraft = {
          p: 'yt',
          u: c.handle ? 'https://www.youtube.com/' + c.handle : 'https://www.youtube.com/channel/' + c.yt.id,
          h: c.handle || r.h,
          yt: c.yt,
          nama: c.nama,
          desk: c.desk,
          dobel: d2
        };
        chRenderDraft();
      })
      .catch(function (err) {
        if (no !== chCekNo) return;
        if (err && err.message === 'tanpa-key') {
          chDraft = {
            p: 'yt',
            u: r.u,
            h: r.h,
            nama: (r.h || '').replace(/^@/, ''),
            dobel: dobel,
            tanpaInfo: glApiAlasan() + ', jadi foto profil, subscriber, dan video terbaru belum bisa diambil.'
          };
          chRenderDraft();
          return;
        }
        if (!r.handle && !r.cid && !r.nama && !r.video) {
          chPraKotak('<p class="lg-salah">Link YouTube ini tidak menunjuk ke channel.</p>');
          return;
        }
        chDraft = {
          p: 'yt',
          u: r.u,
          h: r.h,
          nama: (r.h || '').replace(/^@/, ''),
          dobel: dobel,
          tanpaInfo: (err && err.message ? err.message + ' ' : '') + 'Tetap bisa disimpan tanpa info dari YouTube.'
        };
        chRenderDraft();
      });
    return;
  }
  chDraft = { p: r.p, u: r.u, h: r.h, nama: '', dobel: dobel };
  chRenderDraft();
}
function chRenderDraft() {
  var d = chDraft;
  if (!d) return;
  var semua = chItems(),
    tujuan = chTujuan ? chCari(chTujuan) : null,
    c = CH_PL[d.p];
  if (d.kr === undefined) d.kr = tujuan ? tujuan.id : d.dobel ? '' : '';
  if (!d.top) d.top = [];
  var h = '<div class="ch-pra">';
  if (d.yt) {
    h +=
      '<div class="ch-banner kecil" style="--g:' +
      CH_PL.yt.w +
      '">' +
      (d.yt.bn ? '<img src="' + esc(d.yt.bn) + '" alt="" referrerpolicy="no-referrer">' : '') +
      '</div><div class="ch-pra-atas">' +
      chAvatar({ id: d.yt.id, a: d.nama || 'YT', av: '', pl: [{ p: 'yt', yt: d.yt }] }) +
      '<span><b>' +
      esc(d.nama) +
      '</b><small>' +
      esc(
        [
          d.h,
          d.yt.subs !== undefined ? chAngka(d.yt.subs) + ' subscriber' : '',
          d.yt.vids !== undefined ? chAngka(d.yt.vids) + ' video' : ''
        ]
          .filter(Boolean)
          .join(' · ')
      ) +
      '</small></span></div>' +
      (d.desk ? '<p class="ch-desk">' + esc(d.desk.slice(0, 220)) + (d.desk.length > 220 ? '…' : '') + '</p>' : '');
  } else
    h +=
      '<div class="ch-terdeteksi">' +
      chLencana(d.p, true) +
      '<span><b>' +
      esc(d.h || c.n) +
      '</b><small>' +
      c.n +
      ' · dikenali dari link</small></span></div>';
  h += '<div class="ch-pra-isi">';
  if (d.tanpaInfo) h += '<p class="lg-ket">' + esc(d.tanpaInfo) + '</p>';
  if (d.dobel && !tujuan) h += '<p class="lg-salah">Link ini sudah ada di <b>' + esc(d.dobel.a) + '</b>.</p>';
  if (!tujuan) {
    h +=
      '<div class="field"><label>Masukkan ke</label><div class="bk-pil ch-kr-pil"><button type="button" data-chkr=""' +
      (!d.kr ? ' class="on"' : '') +
      '>' +
      CH_IK.plus +
      'Kreator baru</button>' +
      semua
        .slice(0, 60)
        .map(function (x) {
          return (
            '<button type="button" data-chkr="' +
            esc(x.id) +
            '"' +
            (d.kr === x.id ? ' class="on"' : '') +
            '>' +
            chAvatar(x, 'mini') +
            esc(x.a) +
            '</button>'
          );
        })
        .join('') +
      '</div></div>';
  }
  if (!d.kr) {
    h +=
      '<div class="field"><label for="chNama">Nama kreator</label><input class="input" id="chNama" maxlength="80" autocomplete="off" placeholder="Nama yang kamu kenal" value="' +
      esc(d.nama || '') +
      '"></div>' +
      '<div class="field"><label>Topik</label><div class="bk-pil">' +
      glGabungTopik(chSemuaTopik(), d.top)
        .map(function (t) {
          return (
            '<button type="button" data-chtp="' + esc(t) + '"' + (d.top.indexOf(t) >= 0 ? ' class="on"' : '') + '>' + esc(t) + '</button>'
          );
        })
        .join('') +
      '<button type="button" class="ch-tbh" id="chTopikBaru">+ Topik lain</button>' +
      (chTopikTambahan().length ? '<button type="button" class="ch-tbh" data-ch-kelola>Kelola</button>' : '') +
      '</div></div>';
  }
  if (d.p !== 'yt')
    h +=
      '<p class="tp-terhubung ch-catat">' +
      CH_IK.info +
      '<span>' +
      c.n +
      ' tidak menyediakan foto profil & jumlah pengikut untuk aplikasi seperti ini. Foto profil bisa kamu pasang sendiri dari HP di halaman kreator.</span></p>';
  h +=
    '<div class="bk-dlg-dua"><button type="button" class="btn ghost" data-back>Batal</button><button type="button" class="btn primary" id="chSimpan"' +
    (d.dobel && !tujuan && d.kr !== d.dobel.id && d.dobel ? '' : '') +
    '>Simpan</button></div></div></div>';
  chPraKotak(h);
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'channel-tambah') return;
  var el,
    d = chDraft;
  if (e.target.closest('#chTempel')) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      toast('Tekan lama kolom link, lalu pilih Tempel');
      $('#chUrl').focus();
      return;
    }
    navigator.clipboard
      .readText()
      .then(function (t) {
        $('#chUrl').value = String(t || '')
          .trim()
          .slice(0, 500);
        chCek();
      })
      .catch(function () {
        toast('Izin papan klip ditolak. Tekan lama kolom link, lalu pilih Tempel');
      });
    return;
  }
  if (!d) return;
  if ((el = e.target.closest('[data-chkr]'))) {
    var nm = $('#chNama');
    if (nm) d.nama = nm.value;
    d.kr = el.dataset.chkr;
    chRenderDraft();
    return;
  }
  if ((el = e.target.closest('[data-chtp]'))) {
    var t = el.dataset.chtp,
      i = d.top.indexOf(t);
    if (i >= 0) d.top.splice(i, 1);
    else d.top.push(t);
    el.classList.toggle('on', i < 0);
    return;
  }
  if (e.target.closest('[data-ch-kelola]')) {
    var n3 = $('#chNama');
    if (n3) d.nama = n3.value;
    chKelolaTopik(chRenderDraft);
    return;
  }
  if (e.target.closest('#chTopikBaru')) {
    var n2 = $('#chNama');
    if (n2) d.nama = n2.value;
    chTopikBaru(function (t) {
      if (d.top.indexOf(t) < 0) d.top.push(t);
      chRenderDraft();
    });
    return;
  }
  if (e.target.closest('#chSimpan')) chSimpanDraft();
});
function chTopikBaru(lalu) {
  tpMintaTeks({
    judul: 'Topik baru',
    ph: 'mis. Parenting',
    maks: 30,
    ok: 'Tambah',
    cb: function (v) {
      v = v.trim().slice(0, 30);
      if (!v) return;
      var ada = chSemuaTopik().filter(function (t) {
        return t.toLowerCase() === v.toLowerCase();
      })[0];
      if (!ada) {
        var tt = chTopikTambahan();
        if (tt.length >= 50) {
          toast('Maksimal 50 topik tambahan');
          return;
        }
        tt.push(v);
        chSimpanData(chItems(), tt);
      }
      lalu(ada || v);
    }
  });
}
function chKelolaTopik(lalu) {
  glKelolaTopik({
    judul: 'Kelola topik',
    nama: 'topik',
    daftar: chTopikTambahan,
    hapus: function (t) {
      chSimpanData(
        chItems(),
        chTopikTambahan().filter(function (x) {
          return x !== t;
        })
      );
    },
    lalu: lalu
  });
}
function chSimpanDraft() {
  var d = chDraft,
    tujuan = chTujuan || d.kr,
    kini = Date.now(),
    pl = { p: d.p, u: d.u, h: d.h };
  if (d.yt) pl.yt = d.yt;
  if (d.dobel && (!tujuan || tujuan === d.dobel.id)) {
    toast('Link ini sudah ada di ' + d.dobel.a);
    return;
  }
  var id;
  if (tujuan) {
    var x = chCari(tujuan);
    if (!x) return;
    if (x.pl.length >= CH_PL_MAKS) {
      toast('Maksimal ' + CH_PL_MAKS + ' link per kreator');
      return;
    }
    id = tujuan;
    chUbah(id, function (z) {
      z.pl.push(pl);
      if (d.p === 'yt' && !z.lv) z.lv = kini;
    });
  } else {
    var nama = ($('#chNama') ? $('#chNama').value : d.nama || '').trim().slice(0, 80);
    if (!nama) {
      toast('Isi nama kreator dulu');
      if ($('#chNama')) $('#chNama').focus();
      return;
    }
    var L = chItems();
    if (L.length >= CH_MAKS) {
      toast('Maksimal ' + CH_MAKS + ' kreator');
      return;
    }
    id = uid();
    L.unshift(chSah({ id: id, a: nama, pl: [pl], top: d.top, lv: kini, dibuat: kini, diubah: kini }));
    chSimpanData(L);
  }
  var dariDetail = cur.layers[cur.layers.length - 2] === 'page:channel-detail:' + id,
    baruKr = !tujuan;
  chDraft = null;
  chTujuan = null;
  back(1, function () {
    renderGaleryTab();
    if (!dariDetail) openLayer('page:channel-detail:' + id);
    toast(baruKr ? 'Kreator disimpan' : 'Link ditambahkan');
  });
}

/* ---------- Halaman detail ---------- */
function chIdHalaman() {
  var L = layerOf('page');
  return L ? L.name.split(':').slice(2).join(':') : '';
}
PAGES['channel-detail'] = function () {
  var x = chCari(chIdHalaman());
  if (!x) return false;
  $('#subTitle').textContent = x.a;
  chFavForm = false;
  /* "Baru" dihitung dari kunjungan sebelumnya; kunjungan ini dicatat sebagai sudah dilihat */
  chLvLama[x.id] = x.lv || x.dibuat || 0;
  if (chYtDari(x))
    chUbah(x.id, function (z) {
      z.lv = Date.now();
      delete z.sn;
    });
  chRenderDetail(x);
  var y = chYtDari(x);
  if (y && chYtSiap()) {
    var id = x.id;
    chYtVideo(y, true)
      .then(function () {
        if (pageKind === 'channel-detail' && chIdHalaman() === id) chRenderUlang();
      })
      .catch(function () {
        var b = $('#chVidBox');
        if (b) b.innerHTML = '<p class="fm-tidak">Video terbaru tidak bisa diambil. Periksa koneksi internet.</p>';
      });
    /* Perbarui profil (foto, subscriber) sesekali */
    chYtChannel({ cid: y.id })
      .then(function (c) {
        if (!c || !c.yt) return;
        var lama = JSON.stringify(y),
          baru = Object.assign({}, y, c.yt);
        if (JSON.stringify(chYtSah(baru)) === lama) return;
        chUbah(id, function (z) {
          z.pl.forEach(function (p) {
            if (p.p === 'yt' && p.yt && p.yt.id === y.id) p.yt = baru;
          });
        });
        if (pageKind === 'channel-detail' && chIdHalaman() === id) chRenderUlang();
      })
      .catch(function () {});
  }
  return true;
};
function chRenderDetail(x, ulang) {
  var sy = ulang ? $('#subBody').scrollTop : 0,
    y = chYtDari(x),
    c = y ? chYtCache[y.up || 'UU' + y.id.slice(2)] : null;
  var lvLama = chLvLama[x.id] !== undefined ? chLvLama[x.id] : x.lv || 0,
    baru = c ? chBaru({ sn: [], lv: lvLama }, c.L, lvLama) : [];
  var tk = x.tk && typeof tkCari === 'function' ? tkCari(x.tk) : null;
  var h =
    '<div class="ch-det"><div class="ch-banner" style="--g:' +
    chWarna(x) +
    '">' +
    (y && y.bn ? '<img src="' + esc(y.bn) + '" alt="" referrerpolicy="no-referrer">' : '') +
    '</div>' +
    '<div class="ch-det-grid"><div class="ch-det-kiri"><div class="ch-det-atas"><label class="ch-av-ganti" title="Pasang foto profil">' +
    chAvatar(x, 'besar') +
    '<span class="ch-av-kamera">' +
    CH_IK.kamera +
    '</span><input type="file" accept="image/*" id="chAvFile" hidden></label>' +
    '<span class="ch-det-tx"><h2>' +
    esc(x.a) +
    '</h2><small>' +
    esc((x.top || []).join(' · ') || 'Belum ada topik') +
    '</small></span>' +
    '<button type="button" class="ch-arsipb' +
    (x.ar ? ' on' : '') +
    '" id="chArsip">' +
    (x.ar ? 'Diarsipkan' : 'Arsipkan') +
    '</button></div>';
  /* Platform */
  h +=
    '<section class="fm-bag"><h3 class="bk-h3">Platform · ' +
    x.pl.length +
    ' <button type="button" id="chTbhLink">' +
    CH_IK.plus +
    'Tambah link</button></h3><div class="fm-kartu-p ch-plat-box">' +
    (x.pl.length
      ? x.pl
          .map(function (p, i) {
            var sub = p.yt
              ? [
                  p.yt.subs !== undefined ? chAngka(p.yt.subs) + ' subscriber' : '',
                  p.yt.vids !== undefined ? chAngka(p.yt.vids) + ' video' : ''
                ]
                  .filter(Boolean)
                  .join(' · ')
              : '';
            return (
              '<div class="ch-plat">' +
              chLencana(p.p, true) +
              '<span class="ch-plat-tx"><b>' +
              CH_PL[p.p].n +
              '</b><small>' +
              esc(p.h || p.u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)) +
              (sub ? ' · ' + sub : '') +
              '</small></span>' +
              '<a class="ch-buka" href="' +
              esc(p.u) +
              '" target="_blank" rel="noopener noreferrer">Buka</a><button type="button" class="ch-x" data-chhpl="' +
              i +
              '" aria-label="Lepas link">' +
              CH_IK.tutup +
              '</button></div>'
            );
          })
          .join('')
      : '<p class="fm-tidak">Belum ada link. Ketuk <b>Tambah link</b>.</p>') +
    '</div></section>';
  /* Video */
  if (y) {
    h +=
      '<section class="fm-bag"><h3>Video terbaru' +
      (baru.length ? ' · ' + baru.length + ' baru' : '') +
      '</h3><div class="fm-kartu-p" id="chVidBox">';
    if (!chYtSiap()) h += '<p class="fm-tidak">' + esc(glApiAlasan()) + ' untuk melihat video terbaru.</p>';
    else if (!c) h += '<div class="lg-muat"><i></i>Mengambil video terbaru…</div>';
    else if (!c.L.length) h += '<p class="fm-tidak">Belum ada video.</p>';
    else
      h += c.L.map(function (v) {
        var disimpan = (x.fav || []).some(function (f) {
            return f.v === v.v;
          }),
          isBaru = baru.some(function (b) {
            return b.v === v.v;
          });
        return (
          '<div class="ch-vid" data-ch-putar="' +
          esc(x.id) +
          '|' +
          v.v +
          '" role="button" tabindex="0"><span class="ch-vid-tb"><img src="https://i.ytimg.com/vi/' +
          v.v +
          '/mqdefault.jpg" alt="" loading="lazy">' +
          (isBaru ? '<span class="ch-lb-baru">BARU</span>' : '') +
          (v.d ? '<em>' + lgDur(v.d) + '</em>' : '') +
          '</span>' +
          '<span class="ch-vid-tx"><b>' +
          esc(v.j) +
          '</b><small>' +
          chLalu(v.t) +
          '</small></span><button type="button" class="ch-sim' +
          (disimpan ? ' on' : '') +
          '" data-chsim="' +
          v.v +
          '" aria-label="' +
          (disimpan ? 'Sudah di konten favorit' : 'Simpan ke konten favorit') +
          '">' +
          CH_IK.simpan +
          '</button></div>'
        );
      }).join('');
    h += '</div></section>';
  }
  h += '</div><div class="ch-det-kanan">';
  /* Kenapa aku mengikuti */
  h +=
    '<section class="fm-bag"><h3>Kenapa aku mengikuti</h3><div class="fm-kartu-p"><div class="fm-bintang ch-bintang"><span>Nilai</span>' +
    [1, 2, 3, 4, 5]
      .map(function (n) {
        return (
          '<button type="button" data-chn="' +
          n +
          '" class="' +
          ((x.n || 0) >= n ? 'on' : '') +
          '" aria-label="' +
          n +
          ' bintang">' +
          CH_IK.bintang +
          '</button>'
        );
      })
      .join('') +
    '</div>' +
    '<textarea class="input ch-alasan" id="chAlasan" rows="3" maxlength="2000" placeholder="Alasan mengikuti, atau hal yang kamu pelajari dari dia…">' +
    esc(x.al || '') +
    '</textarea>' +
    '<button type="button" class="ch-pola" id="chPola">' +
    CH_IK.pola +
    'Jadikan Pola Pikir</button></div></section>';
  /* Konten favorit */
  var fav = x.fav || [];
  h +=
    '<section class="fm-bag"><h3 class="bk-h3">Konten favorit <button type="button" id="chFavTambah">' +
    CH_IK.plus +
    'Tambah</button></h3>' +
    (chFavForm
      ? '<div class="tp-kj-form ch-fav-form"><div class="field"><label for="chFavU">Link video / postingan</label><input class="input" id="chFavU" type="url" inputmode="url" maxlength="500" placeholder="https://" autocomplete="off" data-tanpa-hitung></div>' +
        '<div class="field"><label for="chFavJ">Judul <span class="gl-ops">(opsional)</span></label><input class="input" id="chFavJ" maxlength="200" autocomplete="off"></div>' +
        '<div class="field"><label for="chFavC">Kenapa berkesan? <span class="gl-ops">(opsional)</span></label><textarea class="input" id="chFavC" rows="2" maxlength="1000"></textarea></div>' +
        '<div class="bk-dlg-dua"><button type="button" class="btn ghost" id="chFavBatal">Batal</button><button type="button" class="btn primary" id="chFavSimpan">Simpan</button></div></div>'
      : '') +
    '<div class="fm-kartu-p">' +
    (fav.length
      ? fav
          .map(function (f) {
            var d = chDeteksi(f.u);
            return (
              '<div class="ch-fav"><' +
              (f.v
                ? 'button type="button" data-ch-putar="' + esc(x.id) + '|' + f.v + '"'
                : 'a href="' + esc(f.u) + '" target="_blank" rel="noopener noreferrer"') +
              ' class="ch-fav-tb">' +
              (f.v
                ? '<img src="https://i.ytimg.com/vi/' + f.v + '/mqdefault.jpg" alt="" loading="lazy">' + CH_IK.play
                : chLencana(d ? d.p : 'web', true)) +
              '</' +
              (f.v ? 'button' : 'a') +
              '>' +
              '<span class="ch-fav-tx"><b>' +
              esc(f.j || f.u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)) +
              '</b>' +
              (f.c ? '<p>' + esc(f.c) + '</p>' : '') +
              '</span>' +
              '<button type="button" class="ch-x" data-chhfav="' +
              esc(f.i) +
              '" aria-label="Hapus">' +
              CH_IK.hapus +
              '</button></div>'
            );
          })
          .join('')
      : '<p class="fm-tidak">Simpan video atau postingan yang paling berkesan.' +
        (y ? ' Ketuk ikon simpan di video terbaru, atau Tambah.' : '') +
        '</p>') +
    '</div></section>';
  /* Tokoh */
  h +=
    '<section class="fm-bag"><h3>Tokoh Favorit</h3>' +
    (tk
      ? '<div class="tp-impian ch-tokoh"><i>' +
        CH_IK.orang +
        '</i><span><b>' +
        esc(tk.a) +
        '</b><small>' +
        esc(tk.b || (tk.wk && tk.wk.d) || 'Juga ada di Tokoh Favorit') +
        '</small></span><button type="button" id="chTokohBuka">Buka</button><button type="button" id="chTokohLepas">Lepas</button></div>'
      : '<div class="bk-pil"><button type="button" class="ch-tbh" id="chTokohTaut">+ Tautkan ke Tokoh Favorit</button></div>') +
    '</section>';
  /* Topik */
  h +=
    '<section class="fm-bag"><h3>Topik</h3><div class="bk-pil">' +
    glGabungTopik(chSemuaTopik(), x.top)
      .map(function (t) {
        return (
          '<button type="button" data-chtop="' +
          esc(t) +
          '"' +
          ((x.top || []).indexOf(t) >= 0 ? ' class="on"' : '') +
          '>' +
          esc(t) +
          '</button>'
        );
      })
      .join('') +
    '<button type="button" class="ch-tbh" id="chTopikBaru2">+ Topik lain</button>' +
    (chTopikTambahan().length ? '<button type="button" class="ch-tbh" data-ch-kelola>Kelola</button>' : '') +
    '</div></section>';
  h +=
    '<section class="fm-bag"><h3>Nama</h3><button type="button" class="btn ghost ch-ganti-nama" id="chGantiNama">Ganti nama kreator</button>' +
    (x.av ? '<button type="button" class="btn ghost ch-ganti-nama" id="chHapusAv">Hapus foto profil</button>' : '') +
    '</section>';
  h +=
    '<button type="button" class="se-hapus fm-hapus" id="chHapus">' +
    CH_IK.hapus +
    'Hapus kreator</button><p class="fm-tmdb">' +
    (y ? 'Info YouTube dari YouTube Data API' : 'Platform dikenali dari link') +
    '</p></div></div></div>';
  $('#subBody').innerHTML = h;
  if (ulang) $('#subBody').scrollTop = sy;
}
function chKini() {
  return chCari(chIdHalaman());
}
function chRenderUlang() {
  var x = chKini();
  if (x) {
    $('#subTitle').textContent = x.a;
    chRenderDetail(x, true);
  }
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'channel-detail') return;
  var x = chKini();
  if (!x) return;
  var el,
    id = x.id;
  if ((el = e.target.closest('[data-chsim]'))) {
    e.stopPropagation();
    var v = el.dataset.chsim;
    if (
      (x.fav || []).some(function (f) {
        return f.v === v;
      })
    ) {
      toast('Sudah ada di Konten favorit');
      return;
    }
    var y = chYtDari(x),
      c = y ? chYtCache[y.up || 'UU' + y.id.slice(2)] : null,
      info = c
        ? c.L.filter(function (z) {
            return z.v === v;
          })[0]
        : null;
    if ((x.fav || []).length >= CH_FAV_MAKS) {
      toast('Maksimal ' + CH_FAV_MAKS + ' konten favorit');
      return;
    }
    if (
      chUbah(id, function (z) {
        z.fav = [{ i: uid(), u: 'https://www.youtube.com/watch?v=' + v, j: info ? info.j : '', c: '', v: v }].concat(z.fav || []);
      })
    ) {
      toast('Disimpan ke Konten favorit');
      chRenderUlang();
    }
    return;
  }
  if ((el = e.target.closest('[data-ch-putar]'))) {
    e.preventDefault();
    var a = el.dataset.chPutar.split('|');
    chPutar(a[0], a[1]);
    return;
  }
  if (e.target.closest('#chArsip')) {
    var ar = !x.ar;
    chUbah(id, function (z) {
      z.ar = ar;
    });
    toast(ar ? 'Dipindah ke Arsip' : 'Kembali ke Diikuti');
    chRenderUlang();
    return;
  }
  if (e.target.closest('#chTbhLink')) {
    chTujuan = id;
    openLayer('page:channel-tambah');
    return;
  }
  if ((el = e.target.closest('[data-chhpl]'))) {
    var i = +el.dataset.chhpl,
      p = x.pl[i];
    if (!p) return;
    askConfirm({
      title: 'Lepas link ' + CH_PL[p.p].n + '?',
      text: (p.h || p.u) + ' dilepas dari ' + x.a + '. Platform lain tetap ada.',
      ok: 'Lepas',
      action: function () {
        back(1, function () {
          chUbah(id, function (z) {
            z.pl = z.pl.filter(function (q) {
              return !(q.u === p.u && q.p === p.p);
            });
          });
          chRenderUlang();
          toast('Link dilepas');
        });
      }
    });
    return;
  }
  if ((el = e.target.closest('[data-chn]'))) {
    var n = +el.dataset.chn;
    chUbah(id, function (z) {
      if (z.n === n) delete z.n;
      else z.n = n;
    });
    chRenderUlang();
    return;
  }
  if (e.target.closest('#chPola')) {
    var al = ($('#chAlasan') || {}).value || x.al || '';
    if (!al.trim()) {
      toast('Tulis dulu hal yang kamu pelajari dari dia');
      $('#chAlasan').focus();
      return;
    }
    if (typeof gpIsiAwal === 'undefined') return;
    gpIsiAwal = { teks: al.trim(), asal: ['Tokoh', x.a] };
    openLayer('page:pola-form:');
    return;
  }
  if (e.target.closest('#chFavTambah')) {
    chFavForm = true;
    chRenderUlang();
    var u = $('#chFavU');
    if (u) u.focus();
    return;
  }
  if (e.target.closest('#chFavBatal')) {
    chFavForm = false;
    chRenderUlang();
    return;
  }
  if (e.target.closest('#chFavSimpan')) {
    var uu = chUrl($('#chFavU').value),
      jj = $('#chFavJ').value.trim(),
      cc = $('#chFavC').value.trim();
    if (!uu) {
      toast('Tempel link yang diawali https://');
      $('#chFavU').focus();
      return;
    }
    if ((x.fav || []).length >= CH_FAV_MAKS) {
      toast('Maksimal ' + CH_FAV_MAKS + ' konten favorit');
      return;
    }
    var vid = typeof lgUrai === 'function' ? (lgUrai(uu) || {}).v || '' : '';
    var simpan = function (judul) {
      if (
        chUbah(id, function (z) {
          var f = { i: uid(), u: uu, j: judul, c: cc };
          if (vid) f.v = vid;
          z.fav = [f].concat(z.fav || []);
        })
      ) {
        chFavForm = false;
        toast('Konten favorit disimpan');
        chRenderUlang();
      }
    };
    if (!jj && vid && chYtSiap())
      lgInfoVideo([vid])
        .then(function (m) {
          simpan(m[vid] ? m[vid].j : '');
        })
        .catch(function () {
          simpan('');
        });
    else simpan(jj);
    return;
  }
  if ((el = e.target.closest('[data-chhfav]'))) {
    var fi = el.dataset.chhfav,
      f = (x.fav || []).filter(function (z) {
        return z.i === fi;
      })[0];
    if (!f) return;
    askConfirm({
      title: 'Hapus konten favorit?',
      text: '"' + (f.j || f.u).slice(0, 80) + '" dihapus dari daftar.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          chUbah(id, function (z) {
            z.fav = (z.fav || []).filter(function (w) {
              return w.i !== fi;
            });
          });
          chRenderUlang();
          toast('Dihapus');
        });
      }
    });
    return;
  }
  if (e.target.closest('#chTokohTaut')) {
    if (typeof tkItems !== 'function') return;
    var T = tkItems();
    tpPilihan({
      judul: 'Tautkan ke Tokoh Favorit',
      opsi: [
        {
          kelas: 'tp-opsi-imp',
          html: '<i>+</i><span><b>Tambah "' + esc(x.a.slice(0, 40)) + '" ke Tokoh Favorit</b></span>',
          aksi: function () {
            var t0 = tkBuat({
              j: 'pub',
              a: x.a,
              b: (x.top || []).join(', '),
              u: (x.pl[0] || {}).u || '',
              av: x.av,
              top: (x.top || []).filter(function (t) {
                return TK_TOPIK.indexOf(t) >= 0;
              })
            });
            if (!t0) return;
            chUbah(id, function (z) {
              z.tk = t0.id;
            });
            toast('Ditambahkan ke Tokoh Favorit');
            chRenderUlang();
            renderGaleryTab();
          }
        }
      ]
        .concat(
          T.map(function (t) {
            return {
              kelas: 'tp-opsi-imp',
              html: '<i>' + esc(tkInisial(t.a)) + '</i><span><b>' + esc(t.a) + '</b></span>',
              aksi: function () {
                chUbah(id, function (z) {
                  z.tk = t.id;
                });
                toast('Ditautkan ke Tokoh Favorit');
                chRenderUlang();
              }
            };
          })
        )
        .concat([{ t: 'Batal' }])
    });
    return;
  }
  if (e.target.closest('#chTokohLepas')) {
    chUbah(id, function (z) {
      delete z.tk;
    });
    toast('Tautan tokoh dilepas');
    chRenderUlang();
    return;
  }
  if (e.target.closest('#chTokohBuka')) {
    openLayer('page:tokoh-detail:' + x.tk);
    return;
  }
  if ((el = e.target.closest('[data-chtop]'))) {
    var t2 = el.dataset.chtop;
    chUbah(id, function (z) {
      var a = z.top || [],
        k = a.indexOf(t2);
      if (k >= 0) a.splice(k, 1);
      else a.push(t2);
      z.top = a;
    });
    chRenderUlang();
    return;
  }
  if (e.target.closest('[data-ch-kelola]')) {
    chKelolaTopik(chRenderUlang);
    return;
  }
  if (e.target.closest('#chTopikBaru2')) {
    chTopikBaru(function (t3) {
      chUbah(id, function (z) {
        z.top = (z.top || []).concat((z.top || []).indexOf(t3) < 0 ? [t3] : []);
      });
      chRenderUlang();
    });
    return;
  }
  if (e.target.closest('#chGantiNama')) {
    tpMintaTeks({
      judul: 'Nama kreator',
      nilai: x.a,
      maks: 80,
      ok: 'Simpan',
      cb: function (v) {
        if (!v) return;
        chUbah(id, function (z) {
          z.a = v;
        });
        chRenderUlang();
      }
    });
    return;
  }
  if (e.target.closest('#chHapusAv')) {
    askConfirm({
      title: 'Hapus foto profil?',
      text: 'Foto yang kamu pasang untuk ' + x.a + ' dihapus.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          chUbah(id, function (z) {
            delete z.av;
          });
          chRenderUlang();
        });
      }
    });
    return;
  }
  if (e.target.closest('#chHapus')) {
    askConfirm({
      title: 'Hapus kreator?',
      text: '"' + x.a.slice(0, 80) + '" beserta semua link, konten favorit, dan catatanmu dihapus. Akun aslinya tidak terpengaruh.',
      ok: 'Hapus',
      action: function () {
        back(2, function () {
          chSimpanData(
            chItems().filter(function (z) {
              return z.id !== id;
            })
          );
          renderGaleryTab();
          if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
          toast('Kreator dihapus');
        });
      }
    });
  }
});
$('#subBody').addEventListener('keydown', function (e) {
  if (pageKind === 'channel-detail' && e.key === 'Enter' && e.target.matches('.ch-vid')) e.target.click();
});
var chAlT = null;
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'channel-detail' || e.target.id !== 'chAlasan') return;
  var id = chIdHalaman(),
    v = e.target.value.replace(/\s+$/, '');
  clearTimeout(chAlT);
  chAlT = setTimeout(function () {
    chUbah(id, function (z) {
      z.al = v;
    });
  }, 600);
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'channel-detail') return;
  if (e.target.id === 'chAlasan') {
    clearTimeout(chAlT);
    var v = e.target.value.replace(/\s+$/, '');
    chUbah(chIdHalaman(), function (z) {
      z.al = v;
    });
  }
  if (e.target.id === 'chAvFile') {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) chPasangFoto(chIdHalaman(), f);
  }
});
function chPasangFoto(id, f) {
  glFotoKecil(f, CH_AV_MAKS, function (url) {
    chUbah(id, function (z) {
      z.av = url;
    });
    toast('Foto profil dipasang');
    chRenderUlang();
  });
}
function chSegarkan() {
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'channel') glRenderDaftar();
  else if (opened.page && pageKind === 'channel-detail' && !chFavForm && document.activeElement && document.activeElement.id !== 'chAlasan')
    chRenderUlang();
}
chMigrasi();
