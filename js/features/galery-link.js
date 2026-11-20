/* ============================================================
   Stivora — Galery · Lainnya · Koleksi Link (5.63.0)
   - Disimpan di 'stivora.galery.link' = { v: 1, fol: [{ id, n }], lb: [label], item: [...] }
     (sinkron dipecah: 'link-l-<id>' + 'link-urutan'; ikut cadangan).
     Item: { id, u: alamat, a: judul, d: deskripsi, img: gambar pratinjau, ik: ikon situs, si: nama situs,
             j: jenis, v: id video YouTube, s: 'nanti'|'buka', pin, fol: id folder, lb: [label], al: kenapa disimpan,
             po: [{ i, t }] poin penting, hub: { im, tk, bk, ch, tp }, nb: jumlah dibuka, tb: terakhir dibuka (ms),
             ck: { t: dicek (ms), s: status HTTP (0 = tidak bisa dihubungi) }, dibuat, diubah }
   - Pratinjau: lewat Worker (MEDIA_WORKER_URL + login) bila tersedia; bila tidak, cukup ikon situs + domain
     (+ judul YouTube lewat Worker).
   - Bisa menerima link dari menu Bagikan Android (share_target di manifest).
   ============================================================ */
'use strict';

var K_LK = 'stivora.galery.link';
var LK_MAKS = 3000,
  LK_FOL_MAKS = 100,
  LK_LB_MAKS = 100,
  LK_PO_MAKS = 100,
  LK_HUB_MAKS = 50,
  LK_HAL = 80,
  LK_LAMA = 30 * 86400000;
var LK_JENIS = { video: 'Video', artikel: 'Artikel', dokumen: 'Dokumen', kode: 'Kode', alat: 'Alat', medsos: 'Medsos', lain: 'Lainnya' };
var LK_HUB = {
  im: { n: 'Impian', w: '#7c3aed' },
  tk: { n: 'Tokoh', w: '#8b5cf6' },
  bk: { n: 'Buku', w: '#1fa463' },
  ch: { n: 'Channel', w: '#e5484d' },
  tp: { n: 'Tempat', w: '#3b8beb' }
};
var LK_WARNA = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#ca8a04', '#0891b2', '#4f46e5', '#be123c'];
var lkJudulBagi = '',
  lkS = '',
  lkFol = '',
  lkFolSemua = false /* tampil semua kartu folder (bawaan 4) */,
  lkSaringBuka = false /* panel saring jenis & label */,
  lkJ = '',
  lkLb = '',
  lkTampil = LK_HAL,
  lkDraft = null,
  lkCekNo = 0,
  lkCekT = null,
  lkForm = null,
  lkImpor = null,
  lkDariBagikan = false;

function lkStr(v, n) {
  return typeof v === 'string' ? v.slice(0, n) : '';
}
function lkUrl(u) {
  u = String(u || '')
    .trim()
    .slice(0, 2000);
  if (!u) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u) && /^[^\s/]+\.[^\s]+/.test(u)) u = 'https://' + u;
  try {
    var x = new URL(u);
    return /^https?:$/.test(x.protocol) && !/\s/.test(u) ? u : '';
  } catch (e) {
    return '';
  }
}
function lkIdOk(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
}
function lkSah(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string') return null;
  var u = lkUrl(x.u);
  if (!u) return null;
  var o = {
    id: x.id.slice(0, 64),
    u: u,
    a: lkStr(x.a, 300) || lkDomain(u),
    j: LK_JENIS[x.j] ? x.j : 'lain',
    s: x.s === 'buka' ? 'buka' : 'nanti',
    dibuat: +x.dibuat || 0,
    diubah: +x.diubah || +x.dibuat || 0
  };
  if (lkStr(x.d, 600)) o.d = lkStr(x.d, 600);
  ['img', 'ik'].forEach(function (k) {
    var v = lkUrl(x[k]);
    if (v && v.length <= 1000) o[k] = v;
  });
  if (lkStr(x.si, 100)) o.si = lkStr(x.si, 100);
  if (/^[A-Za-z0-9_-]{6,20}$/.test(x.v || '')) o.v = x.v;
  if (x.pin) o.pin = 1;
  if (lkIdOk(x.fol)) o.fol = x.fol;
  if (Array.isArray(x.lb)) {
    var lb = x.lb
      .filter(function (t) {
        return typeof t === 'string' && t.trim();
      })
      .map(function (t) {
        return t.trim().slice(0, 30);
      })
      .slice(0, 10);
    if (lb.length) o.lb = lb;
  }
  if (lkStr(x.al, 2000).trim()) o.al = lkStr(x.al, 2000);
  if (Array.isArray(x.po)) {
    var po = x.po
      .filter(function (k) {
        return k && lkStr(k.t, 1000).trim();
      })
      .slice(0, LK_PO_MAKS)
      .map(function (k) {
        return { i: lkStr(k.i, 40) || uid(), t: lkStr(k.t, 1000) };
      });
    if (po.length) o.po = po;
  }
  if (x.hub && typeof x.hub === 'object') {
    var hb = {};
    Object.keys(LK_HUB).forEach(function (k) {
      if (Array.isArray(x.hub[k])) {
        var a = x.hub[k].filter(lkIdOk).slice(0, LK_HUB_MAKS);
        if (a.length) hb[k] = a;
      }
    });
    if (Object.keys(hb).length) o.hub = hb;
  }
  if (+x.nb > 0) o.nb = Math.min(1e6, Math.floor(+x.nb));
  if (+x.tb > 0) o.tb = Math.floor(+x.tb);
  if (x.ck && +x.ck.t > 0) o.ck = { t: Math.floor(+x.ck.t), s: Math.max(0, Math.min(999, Math.floor(+x.ck.s || 0))) };
  return o;
}

/* ---------- Penyimpanan ---------- */
function lkData() {
  var d = store.get(K_LK, null);
  return d && typeof d === 'object' ? d : { v: 1, item: [] };
}
function lkItems() {
  lkMigrasi();
  var d = lkData();
  return (Array.isArray(d.item) ? d.item : []).map(lkSah).filter(Boolean);
}
function lkFolder() {
  var d = lkData();
  return (Array.isArray(d.fol) ? d.fol : [])
    .filter(function (f) {
      return f && lkIdOk(f.id) && typeof f.n === 'string' && f.n;
    })
    .slice(0, LK_FOL_MAKS)
    .map(function (f) {
      return { id: f.id, n: f.n.slice(0, 40) };
    });
}
function lkLabel() {
  var d = lkData();
  return (Array.isArray(d.lb) ? d.lb : [])
    .filter(function (t) {
      return typeof t === 'string' && t;
    })
    .slice(0, LK_LB_MAKS);
}
function lkSimpanData(items, fol, lb) {
  glSimpanPecahan(K_LK, lkSah, items, { fol: fol, lb: lb });
}
function lkCari(id) {
  return (
    lkItems().filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function lkUbah(id, f) {
  var hasil = null;
  var L = lkItems().map(function (x) {
    if (x.id !== id) return x;
    var z = JSON.parse(JSON.stringify(x));
    f(z);
    z = lkSah(z);
    if (!z) return x;
    z.diubah = Date.now();
    hasil = z;
    return z;
  });
  if (hasil) lkSimpanData(L);
  return hasil;
}
function lkKunciUrl(u) {
  try {
    var x = new URL(u);
    x.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'si', 'feature', 'fbclid', 'igsh', 'igshid'].forEach(
      function (k) {
        x.searchParams.delete(k);
      }
    );
    return (x.hostname.replace(/^(www|m)\./, '') + x.pathname.replace(/\/+$/, '') + x.search).toLowerCase();
  } catch (e) {
    return String(u).toLowerCase();
  }
}
function lkDobel(u, kecuali) {
  var k = lkKunciUrl(u),
    v = lkVideo(u);
  return (
    lkItems().filter(function (x) {
      return x.id !== kecuali && (lkKunciUrl(x.u) === k || (v && x.v === v));
    })[0] || null
  );
}
/* Koleksi Link lama di tab Lainnya dipindah ke sini */
function lkMigrasi() {
  var d = store.get(K_GL, null);
  if (!d || !Array.isArray(d.link) || !d.link.length) return;
  var data = lkData(),
    items = Array.isArray(data.item) ? data.item.slice() : [],
    ada = {};
  items.forEach(function (x) {
    if (x && x.id) ada[x.id] = 1;
  });
  d.link.forEach(function (x) {
    if (!x || typeof x.id !== 'string' || ada[x.id]) return;
    var u = lkUrl(x.url);
    if (!u) return;
    items.push({
      id: x.id,
      u: u,
      a: String(x.a || ''),
      j: lkJenis(u),
      v: lkVideo(u),
      s: 'buka',
      al: [x.b, x.c].filter(Boolean).join('\n'),
      dibuat: x.dibuat || Date.now(),
      diubah: x.diubah || Date.now()
    });
  });
  var sisa = {};
  Object.keys(d).forEach(function (k) {
    if (k !== 'link') sisa[k] = d[k];
  });
  store.set(K_GL, sisa);
  var o = { v: 1 };
  Object.keys(data).forEach(function (k) {
    if (k !== 'item' && k !== 'v') o[k] = data[k];
  });
  o.item = items;
  store.set(K_LK, o);
}

/* ---------- Mengenali link ---------- */
function lkHost(u) {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  } catch (e) {
    return '';
  }
}
function lkDomain(u) {
  return lkHost(u) || String(u || '').slice(0, 60);
}
function lkVideo(u) {
  var r = typeof lgUrai === 'function' ? lgUrai(u) : null;
  return r && r.v ? r.v : '';
}
function lkJenis(u, ct) {
  var h = lkHost(u),
    p = '';
  try {
    p = new URL(u).pathname.toLowerCase();
  } catch (e) {}
  if (/pdf/.test(ct || '') || /\.(pdf|docx?|xlsx?|pptx?)$/.test(p)) return 'dokumen';
  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv)$/.test(h)) return 'video';
  if (
    /(^|\.)(instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|fb\.com|fb\.watch|threads\.net|threads\.com|linkedin\.com|t\.me|reddit\.com|pinterest\.com)$/.test(
      h
    )
  )
    return 'medsos';
  if (
    /^(docs|drive|sheets|slides)\.google\.com$/.test(h) ||
    /(^|\.)(notion\.so|notion\.site|dropbox\.com|onedrive\.live\.com|sharepoint\.com|scribd\.com)$/.test(h)
  )
    return 'dokumen';
  if (
    /(^|\.)(github\.com|gitlab\.com|bitbucket\.org|stackoverflow\.com|codepen\.io|npmjs\.com|developer\.mozilla\.org|jsfiddle\.net|replit\.com|pypi\.org)$/.test(
      h
    ) ||
    /\.github\.io$/.test(h)
  )
    return 'kode';
  if (
    /(^|\.)(canva\.com|figma\.com|chatgpt\.com|openai\.com|claude\.ai|remove\.bg|tinypng\.com|photopea\.com|trello\.com|calendar\.google\.com|translate\.google\.com|squoosh\.app)$/.test(
      h
    )
  )
    return 'alat';
  if (
    /(^|\.)(medium\.com|substack\.com|wikipedia\.org|kompas\.com|detik\.com|tempo\.co|cnnindonesia\.com|liputan6\.com|tirto\.id|kumparan\.com|bbc\.com|nytimes\.com)$/.test(
      h
    ) ||
    /\/(blog|artikel|article|news|berita|read|post|docs?|guide|tutorial)s?\//.test(p)
  )
    return 'artikel';
  return 'lain';
}
function lkWarna(s) {
  var h = 0;
  s = String(s || '');
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return LK_WARNA[h % LK_WARNA.length];
}
function lkFavicon(x, kelas) {
  var h = lkDomain(x.u),
    huruf = (h.replace(/^[^a-z0-9]+/i, '').charAt(0) || '?').toUpperCase();
  var src = x.ik || (h ? 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(h) : '');
  return (
    '<span class="lk-fav ' +
    (kelas || '') +
    '" style="--w:' +
    lkWarna(h) +
    '">' +
    esc(huruf) +
    (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
    '</span>'
  );
}
function lkGambar(x) {
  return x.img || (x.v ? 'https://i.ytimg.com/vi/' + x.v + '/mqdefault.jpg' : '');
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
      (t.parentNode.classList.contains('lk-fav') ||
        t.parentNode.classList.contains('lk-tb') ||
        t.parentNode.classList.contains('lk-sampul'))
    ) {
      var p = t.parentNode;
      t.remove();
      p.classList.add('tanpa');
    }
  },
  true
);
function lkLalu(t) {
  var d = Date.now() - t,
    h = Math.floor(d / 86400000);
  if (d < 3600000) return Math.max(1, Math.floor(d / 60000)) + ' menit lalu';
  if (d < 86400000) return Math.floor(d / 3600000) + ' jam lalu';
  if (h === 1) return 'kemarin';
  if (h < 30) return h + ' hari lalu';
  var a = new Date(t);
  return a.getDate() + ' ' + GT_BULAN[a.getMonth()] + ' ' + a.getFullYear();
}
function lkTgl(t) {
  var a = new Date(t);
  return a.getDate() + ' ' + GT_BULAN[a.getMonth()] + ' ' + a.getFullYear();
}
function lkLama(x) {
  return Date.now() - (x.tb || x.dibuat) > LK_LAMA;
}
function lkMati(x) {
  return x.ck && (x.ck.s === 0 || x.ck.s === 404 || x.ck.s === 410 || x.ck.s >= 500);
}
var LK_IK = {
  pensil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  saring: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  kiri: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  bawah: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>',
  impor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  buka: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M8 5v14l11-7z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3l6 6-3 1.5-3.5 3.5.5 5-2 2-4-4-5 5M9 11L5 7l2-2 5 .5L15.5 2"/></svg>',
  salin:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  bagi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
  hapus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  pola: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
  cek: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  ulang: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>',
  ubah: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>',
  im: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 19H16a2.4 2.4 0 0 0 0-4.75H8a2.4 2.4 0 0 1 0-4.75h9.5"/><path d="M17.5 9.5V2.6l4.3 2.2-4.3 2.2"/><circle cx="5.2" cy="19" r="2"/></svg>',
  tk: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/></svg>',
  bk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  ch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/></svg>',
  tp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
};

/* ---------- Pratinjau (Worker → cadangan tanpa server) ---------- */
function lkWorkerSiap() {
  return glApiSiap();
}
function lkWorker(u) {
  if (!lkWorkerSiap()) return Promise.reject(new Error('tanpa-worker'));
  return user.getIdToken().then(function (t) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null,
      w = setTimeout(function () {
        if (ctl) ctl.abort();
      }, 12000);
    return fetch(MEDIA_WORKER_URL.replace(/\/+$/, '') + '/pratinjau?url=' + encodeURIComponent(u), {
      headers: { Authorization: 'Bearer ' + t },
      signal: ctl ? ctl.signal : undefined
    }).then(
      function (r) {
        clearTimeout(w);
        if (!r.ok) throw new Error('worker ' + r.status);
        return r.json();
      },
      function (e) {
        clearTimeout(w);
        throw e;
      }
    );
  });
}
function lkPratinjau(u) {
  var o = { u: u, j: lkJenis(u), v: lkVideo(u) },
    tugas = [];
  if (o.v && typeof lgApiSiap === 'function' && lgApiSiap() && typeof lgInfoVideo === 'function')
    tugas.push(
      lgInfoVideo([o.v])
        .then(function (m) {
          var i = m[o.v];
          if (i) {
            o.a = i.j;
            o.dur = i.d;
          }
        })
        .catch(function () {})
    );
  tugas.push(
    lkWorker(u)
      .then(function (r) {
        o.lewat = 'worker';
        if (r.t && !o.a) o.a = r.t;
        if (r.d) o.d = r.d;
        if (r.img) o.img = r.img;
        if (r.ik) o.ik = r.ik;
        if (r.si) o.si = r.si;
        if (r.ct && o.j === 'lain') o.j = lkJenis(u, r.ct);
        o.ck = { t: Date.now(), s: +r.s || 0 };
      })
      .catch(function () {
        o.lewat = 'tanpa';
      })
  );
  return Promise.all(tugas).then(function () {
    return o;
  });
}

/* ---------- Daftar ---------- */
function lkSaring(L, q) {
  return L.filter(function (x) {
    if (lkS === 'pin' && !x.pin) return false;
    if (lkS === 'nanti' && x.s !== 'nanti') return false;
    if (lkS === 'buka' && x.s !== 'buka') return false;
    if (lkS === 'lama' && !lkLama(x)) return false;
    if (lkS === 'mati' && !lkMati(x)) return false;
    if (lkFol && (lkFol === '-' ? x.fol : x.fol !== lkFol)) return false;
    if (lkJ && x.j !== lkJ) return false;
    if (lkLb && (x.lb || []).indexOf(lkLb) < 0) return false;
    return (
      !q ||
      [
        x.a,
        x.u,
        x.d,
        x.al,
        x.si,
        (x.lb || []).join(' '),
        (x.po || [])
          .map(function (p) {
            return p.t;
          })
          .join(' ')
      ]
        .join(' ')
        .toLowerCase()
        .indexOf(q) >= 0
    );
  });
}
function lkKartu(x, F) {
  var g = lkGambar(x),
    f = x.fol
      ? F.filter(function (z) {
          return z.id === x.fol;
        })[0]
      : null;
  return (
    '<button type="button" class="lk-kartu" data-lk="' +
    esc(x.id) +
    '">' +
    (x.pin ? '<span class="lk-pin">' + LK_IK.pin + '</span>' : '') +
    (g
      ? '<span class="lk-tb" style="--w:' +
        lkWarna(lkDomain(x.u)) +
        '"><img src="' +
        esc(g) +
        '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' +
        (x.v ? '<i>' + LK_IK.play + '</i>' : '') +
        '</span>'
      : lkFavicon(x, 'besar')) +
    '<span class="lk-kartu-tx"><b>' +
    esc(x.a) +
    '</b><span class="lk-dom">' +
    (g ? lkFavicon(x, 'mini') : '') +
    '<span>' +
    esc(lkDomain(x.u)) +
    ' · ' +
    LK_JENIS[x.j] +
    '</span>' +
    (lkMati(x)
      ? '<em class="lk-lb mati">Link mati?</em>'
      : x.s === 'nanti'
        ? '<em class="lk-lb nanti">Baca nanti</em>'
        : lkLama(x)
          ? '<em class="lk-lb lama">Lama belum dibuka · ' + Math.floor((Date.now() - (x.tb || x.dibuat)) / 86400000) + ' hari</em>'
          : '') +
    (f ? '<em class="lk-lb">' + esc(f.n) + '</em>' : '') +
    '</span></span></button>'
  );
}
function lkRenderDaftar(box, q) {
  var semua = lkItems(),
    F = lkFolder();
  if (!semua.length) {
    box.innerHTML =
      '<div class="lg-kosong lk-kosong">' +
      LK_IK.link +
      '<p>Belum ada link.<br>Ketuk <b>Tempel</b>, atau dari aplikasi lain tekan <b>Bagikan → Stivora</b>. Bookmark Chrome bisa diimpor lewat tombol ' +
      LK_IK.impor +
      '.</p></div>';
    return;
  }
  var h = '',
    nanti = semua
      .filter(function (x) {
        return x.s === 'nanti';
      })
      .sort(function (a, b) {
        return b.dibuat - a.dibuat;
      });
  if (nanti.length && !q && !lkS && !lkFol && !lkJ && !lkLb) {
    h +=
      '<h3 class="lg-judul lk-judul"><span>Baca nanti · ' +
      nanti.length +
      '</span>' +
      (nanti.length > 10 ? '<button type="button" data-lk-s="nanti">Lihat semua</button>' : '') +
      '</h3><div class="lk-bn-list">' +
      nanti
        .slice(0, 10)
        .map(function (x) {
          var g = lkGambar(x);
          return (
            '<button type="button" class="lk-bn" data-lk="' +
            esc(x.id) +
            '"><span class="lk-tb' +
            (g ? '' : ' tanpa') +
            '" style="--w:' +
            lkWarna(lkDomain(x.u)) +
            '">' +
            (g ? '<img src="' + esc(g) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
            '<span class="lk-tb-h">' +
            esc((lkDomain(x.u).charAt(0) || '?').toUpperCase()) +
            '</span><em>' +
            LK_JENIS[x.j] +
            '</em></span>' +
            '<span class="lk-bn-tx"><b>' +
            esc(x.a) +
            '</b><small>' +
            lkFavicon(x, 'mini') +
            esc(lkDomain(x.u)) +
            ' · ' +
            lkLalu(x.dibuat) +
            '</small></span></button>'
          );
        })
        .join('') +
      '</div>';
  }
  /* 5.74.0: folder = kartu 2 kolom; ketuk = masuk folder (satu langkah riwayat, gestur kembali naik) */
  if (
    lkFol &&
    lkFol !== '-' &&
    !F.some(function (f) {
      return f.id === lkFol;
    })
  )
    lkFol = '';
  var diFol = function (x) {
      return !lkFol || (lkFol === '-' ? !x.fol : x.fol === lkFol);
    },
    dasar = semua.filter(diFol),
    n = function (f) {
      return dasar.filter(f).length;
    };
  if (lkFol) {
    var fAktif = F.filter(function (f) {
      return f.id === lkFol;
    })[0];
    h +=
      '<nav class="gfs-jejak lk-jejak" aria-label="Lokasi folder"><button type="button" class="gfs-kembali" data-lk-naik aria-label="Kembali">' +
      LK_IK.kiri +
      '</button><button type="button" data-lk-naik>Folder</button><i>›</i><button type="button" class="on">' +
      esc(fAktif ? fAktif.n : 'Tanpa folder') +
      '</button></nav>';
  }
  var stat = [
    ['', 'Semua', dasar.length],
    [
      'pin',
      'Disematkan',
      n(function (x) {
        return x.pin;
      })
    ],
    [
      'nanti',
      'Baca nanti',
      n(function (x) {
        return x.s === 'nanti';
      })
    ],
    [
      'buka',
      'Sudah dibuka',
      n(function (x) {
        return x.s === 'buka';
      })
    ],
    ['lama', 'Lama belum dibuka', n(lkLama)],
    ['mati', 'Link mati?', n(lkMati)]
  ];
  if (
    lkS &&
    !stat.some(function (c) {
      return c[0] === lkS && c[2];
    })
  )
    lkS = '';
  h +=
    '<div class="gp-filter gl-filter lk-chips">' +
    stat
      .filter(function (c) {
        return !c[0] || c[2];
      })
      .map(function (c) {
        return (
          '<button type="button" data-lk-s="' +
          c[0] +
          '"' +
          (lkS === c[0] ? ' class="on"' : '') +
          '>' +
          (c[0] === 'pin' ? LK_IK.pin : '') +
          c[1] +
          ' <small>' +
          c[2] +
          '</small></button>'
        );
      })
      .join('') +
    '</div>';
  /* Kartu folder (hanya di halaman utama, tidak saat mencari) */
  if (!lkFol && F.length && !q) {
    var tanpa = semua.filter(function (x) {
        return !x.fol;
      }),
      kartu = F.map(function (f, i) {
        return { id: f.id, n: f.n, w: LK_WARNA[i % LK_WARNA.length] };
      });
    if (tanpa.length) kartu.push({ id: '-', n: 'Tanpa folder', w: '', tanpa: true });
    var tampil = lkFolSemua ? kartu : kartu.slice(0, 4);
    h +=
      '<h3 class="lg-judul lk-judul"><span>Folder · ' +
      F.length +
      '</span><button type="button" class="lk-ikon-btn" id="lkKelola" aria-label="Kelola folder">' +
      LK_IK.pensil +
      '</button></h3><div class="lk-fol-grid">' +
      tampil
        .map(function (k) {
          var isi = semua
              .filter(function (x) {
                return k.tanpa ? !x.fol : x.fol === k.id;
              })
              .sort(function (a, b) {
                return b.dibuat - a.dibuat;
              }),
            nt = isi.filter(function (x) {
              return x.s === 'nanti';
            }).length;
          return (
            '<button type="button" class="lk-fol' +
            (k.tanpa ? ' tanpa' : '') +
            '" data-lk-masuk="' +
            esc(k.id) +
            '"' +
            (k.w ? ' style="--fw:' + k.w + '"' : '') +
            '><span class="lk-fol-h"><i>' +
            LK_IK.folder +
            '</i><b>' +
            esc(k.n) +
            '</b></span><span class="lk-fol-fav">' +
            (isi.length
              ? isi
                  .slice(0, 3)
                  .map(function (x) {
                    return lkFavicon(x, 'mini');
                  })
                  .join('')
              : '') +
            '</span><small>' +
            isi.length +
            ' link' +
            (nt ? ' · ' + nt + ' baca nanti' : '') +
            '</small></button>'
          );
        })
        .join('') +
      '</div>' +
      (kartu.length > 4
        ? '<button type="button" class="lk-fol-semua" id="lkFolSemua" aria-expanded="' +
          lkFolSemua +
          '">' +
          (lkFolSemua ? 'Ringkas' : 'Lihat semua folder (' + kartu.length + ')') +
          LK_IK.bawah +
          '</button>'
        : '');
  }
  var jAda = Object.keys(LK_JENIS).filter(function (j) {
      return dasar.some(function (x) {
        return x.j === j;
      });
    }),
    lbAda = lkLabel().filter(function (t) {
      return dasar.some(function (x) {
        return (x.lb || []).indexOf(t) >= 0;
      });
    });
  if (lkJ && jAda.indexOf(lkJ) < 0) lkJ = '';
  if (lkLb && lbAda.indexOf(lkLb) < 0) lkLb = '';
  var bisaSaring = jAda.length > 1 || lbAda.length,
    saringAktif = !!(lkJ || lkLb);
  var L = lkSaring(semua, q).sort(function (a, b) {
    return (b.pin || 0) - (a.pin || 0) || b.dibuat - a.dibuat;
  });
  h +=
    '<h3 class="lg-judul lk-judul"><span>Link · ' +
    L.length +
    '</span>' +
    (bisaSaring
      ? '<button type="button" class="lk-ikon-btn' +
        (saringAktif || lkSaringBuka ? ' on' : '') +
        '" id="lkSaringBtn" aria-label="Saring jenis dan label" aria-expanded="' +
        !!(lkSaringBuka || saringAktif) +
        '">' +
        LK_IK.saring +
        (saringAktif ? '<em></em>' : '') +
        '</button>'
      : '') +
    '</h3>';
  if (bisaSaring && (lkSaringBuka || saringAktif))
    h +=
      '<div class="lk-saring">' +
      (jAda.length > 1
        ? '<small>Jenis</small><div class="lk-saring-c">' +
          jAda
            .map(function (j) {
              return '<button type="button" data-lk-j="' + j + '"' + (lkJ === j ? ' class="on"' : '') + '>' + LK_JENIS[j] + '</button>';
            })
            .join('') +
          '</div>'
        : '') +
      (lbAda.length
        ? '<small>Label</small><div class="lk-saring-c">' +
          lbAda
            .map(function (t) {
              return '<button type="button" data-lk-l="' + esc(t) + '"' + (lkLb === t ? ' class="on"' : '') + '>#' + esc(t) + '</button>';
            })
            .join('') +
          '</div>'
        : '') +
      '</div>';
  if (!L.length) h += '<p class="gt-kosong">Tidak ada yang cocok.</p>';
  else
    h +=
      '<div class="lk-daftar">' +
      L.slice(0, lkTampil)
        .map(function (x) {
          return lkKartu(x, F);
        })
        .join('') +
      '</div>' +
      (L.length > lkTampil
        ? '<button type="button" class="btn ghost bk-lagi" id="lkLagi">Tampilkan lagi (' + (L.length - lkTampil) + ')</button>'
        : '');
  if (semua.length >= LK_MAKS) h += '<p class="gp-catatan">Sudah ' + LK_MAKS + ' link (batas maksimal).</p>';
  box.innerHTML = h;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'link') return;
  var el;
  if ((el = e.target.closest('[data-lk-s]'))) {
    lkS = lkS === el.dataset.lkS ? '' : el.dataset.lkS;
    lkTampil = LK_HAL;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-lk-masuk]'))) {
    lkMasukFolder(el.dataset.lkMasuk);
    return;
  }
  if (e.target.closest('[data-lk-naik]')) {
    try {
      history.back();
    } catch (x) {}
    return;
  }
  if (e.target.closest('#lkFolSemua')) {
    lkFolSemua = !lkFolSemua;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#lkSaringBtn')) {
    if (lkJ || lkLb) {
      lkJ = lkLb = '';
      lkSaringBuka = false;
    } else lkSaringBuka = !lkSaringBuka;
    lkTampil = LK_HAL;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-lk-j]'))) {
    lkJ = lkJ === el.dataset.lkJ ? '' : el.dataset.lkJ;
    lkTampil = LK_HAL;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-lk-l]'))) {
    lkLb = lkLb === el.dataset.lkL ? '' : el.dataset.lkL;
    lkTampil = LK_HAL;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#lkLagi')) {
    lkTampil += LK_HAL;
    var y = $('#subBody').scrollTop;
    glRenderDaftar();
    $('#subBody').scrollTop = y;
    return;
  }
  if (e.target.closest('#lkKelola')) {
    lkKelolaFolder();
    return;
  }
  if (e.target.closest('#lkTambahBtn')) {
    if (lkItems().length >= LK_MAKS) {
      toast('Maksimal ' + LK_MAKS + ' link');
      return;
    }
    lkDariBagikan = false;
    lkJudulBagi = '';
    lkDraft = null;
    openLayer('page:link-tambah');
    return;
  }
  if (e.target.closest('#lkImporBtn')) {
    lkImpor = null;
    openLayer('page:link-impor');
    return;
  }
  if ((el = e.target.closest('[data-lk]'))) openLayer('page:link-detail:' + el.dataset.lk);
});
/* Masuk folder = satu langkah riwayat; gestur/tombol kembali naik ke daftar folder (5.74.0) */
function lkMasukFolder(id) {
  lkFol = id;
  lkS = '';
  lkJ = lkLb = '';
  lkSaringBuka = false;
  lkTampil = LK_HAL;
  try {
    history.pushState({ tab: cur.tab, fromRoot: cur.fromRoot, layers: cur.layers.slice(), lkf: id }, '');
  } catch (e) {}
  glRenderDaftar();
  var sb = $('#subBody');
  if (sb) sb.scrollTop = 0;
}
function lkFolDariRiwayat() {
  var st = history.state;
  if (st && st.lkf) lkFol = st.lkf;
  else if (cur.layers[cur.layers.length - 1] === 'page:galery-koleksi') lkFol = '';
}
window.addEventListener('popstate', function () {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'link') return;
  var lama = lkFol;
  lkFolDariRiwayat();
  if (lama !== lkFol) {
    lkS = '';
    lkTampil = LK_HAL;
    glRenderDaftar();
  }
});
function lkKelolaFolder() {
  var F = lkFolder();
  tpPilihan({
    judul: 'Kelola folder',
    opsi: F.map(function (f) {
      return {
        kelas: 'tp-opsi-imp',
        html: '<i>' + LK_IK.folder + '</i><span><b>' + esc(f.n) + '</b></span>',
        aksi: function () {
          tpPilihan({
            judul: f.n,
            opsi: [
              {
                t: 'Ganti nama',
                aksi: function () {
                  tpMintaTeks({
                    judul: 'Nama folder',
                    nilai: f.n,
                    maks: 40,
                    ok: 'Simpan',
                    cb: function (v) {
                      v = v.trim();
                      if (!v) return;
                      lkSimpanData(
                        lkItems(),
                        lkFolder().map(function (z) {
                          return z.id === f.id ? { id: z.id, n: v } : z;
                        })
                      );
                      glRenderDaftar();
                    }
                  });
                }
              },
              {
                t: 'Hapus folder',
                kelas: 'bahaya',
                aksi: function () {
                  var jml = lkItems().filter(function (x) {
                    return x.fol === f.id;
                  }).length;
                  askConfirm({
                    title: 'Hapus folder?',
                    text: 'Folder "' + f.n + '" dihapus.' + (jml ? ' ' + jml + ' link di dalamnya tetap ada (tanpa folder).' : ''),
                    ok: 'Hapus',
                    action: function () {
                      back(1, function () {
                        var kini = Date.now();
                        lkSimpanData(
                          lkItems().map(function (x) {
                            if (x.fol === f.id) {
                              delete x.fol;
                              x.diubah = kini;
                            }
                            return x;
                          }),
                          lkFolder().filter(function (z) {
                            return z.id !== f.id;
                          })
                        );
                        if (lkFol === f.id) lkFol = '';
                        glRenderDaftar();
                        toast('Folder dihapus');
                      });
                    }
                  });
                }
              },
              { t: 'Batal' }
            ]
          });
        }
      };
    }).concat([{ t: 'Tutup' }])
  });
}
function lkFolderBaru(lalu) {
  tpMintaTeks({
    judul: 'Folder baru',
    ph: 'mis. Bisnis Xenyura',
    maks: 40,
    ok: 'Buat',
    cb: function (v) {
      v = v.trim();
      if (!v) return;
      var F = lkFolder();
      var ada = F.filter(function (f) {
        return f.n.toLowerCase() === v.toLowerCase();
      })[0];
      if (ada) {
        lalu(ada.id);
        return;
      }
      if (F.length >= LK_FOL_MAKS) {
        toast('Maksimal ' + LK_FOL_MAKS + ' folder');
        return;
      }
      var id = uid();
      F.push({ id: id, n: v });
      lkSimpanData(lkItems(), F);
      lalu(id);
    }
  });
}
function lkLabelBaru(lalu) {
  tpMintaTeks({
    judul: 'Label baru',
    ph: 'mis. firebase',
    maks: 30,
    ok: 'Tambah',
    cb: function (v) {
      v = v.trim().replace(/^#+/, '').slice(0, 30);
      if (!v) return;
      var L = lkLabel();
      var ada = L.filter(function (t) {
        return t.toLowerCase() === v.toLowerCase();
      })[0];
      if (ada) {
        lalu(ada);
        return;
      }
      if (L.length >= LK_LB_MAKS) {
        toast('Maksimal ' + LK_LB_MAKS + ' label');
        return;
      }
      L.push(v);
      lkSimpanData(lkItems(), null, L);
      lalu(v);
    }
  });
}
function lkPilFolder(aktif, attr, idBaru) {
  return (
    '<div class="bk-pil lk-pil">' +
    lkFolder()
      .map(function (f) {
        return (
          '<button type="button" ' +
          attr +
          '="' +
          esc(f.id) +
          '"' +
          (aktif === f.id ? ' class="on"' : '') +
          '>' +
          LK_IK.folder +
          esc(f.n) +
          '</button>'
        );
      })
      .join('') +
    '<button type="button" class="lk-tbh" id="' +
    idBaru +
    '">+ Folder baru</button></div>'
  );
}
function lkPilLabel(aktif, attr, idBaru) {
  return (
    '<div class="bk-pil lk-pil">' +
    lkLabel()
      .map(function (t) {
        return (
          '<button type="button" ' +
          attr +
          '="' +
          esc(t) +
          '"' +
          ((aktif || []).indexOf(t) >= 0 ? ' class="on"' : '') +
          '>#' +
          esc(t) +
          '</button>'
        );
      })
      .join('') +
    '<button type="button" class="lk-tbh" id="' +
    idBaru +
    '">+ Label</button></div>'
  );
}

/* ---------- Halaman tambah (tempel & dari Bagikan) ---------- */
PAGES['link-tambah'] = function () {
  $('#subTitle').textContent = lkDariBagikan ? 'Simpan dari Bagikan' : 'Simpan link';
  var awal = lkDraft && lkDraft.u ? lkDraft.u : '';
  $('#subBody').innerHTML =
    '<div class="lk-tambah"><p class="lg-ket">' +
    (lkDariBagikan
      ? 'Link dari menu Bagikan. Atur sebentar lalu simpan, atau langsung <b>Simpan</b>.'
      : 'Tempel link dari mana saja. Lebih cepat: di aplikasi lain tekan <b>Bagikan → Stivora</b>.') +
    '</p>' +
    '<div class="lg-masuk"><input class="input" id="lkUrl" type="url" inputmode="url" autocomplete="off" maxlength="2000" placeholder="https://…" data-tanpa-hitung value="' +
    esc(awal) +
    '"><button type="button" class="btn ghost" id="lkTempel">Tempel</button></div>' +
    '<div id="lkPra" aria-live="polite"></div></div>';
  if (awal) {
    lkDraft = null;
    lkCek();
  } else lkDraft = null;
  return true;
};
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'link-tambah' && e.target.id === 'lkUrl') {
    clearTimeout(lkCekT);
    lkCekT = setTimeout(lkCek, 450);
  }
});
function lkPraKotak(h) {
  var b = $('#lkPra');
  if (b && pageKind === 'link-tambah') b.innerHTML = h;
}
function lkCek() {
  var el = $('#lkUrl');
  if (!el) return;
  var u = lkUrl(el.value),
    no = ++lkCekNo;
  if (!el.value.trim()) {
    lkDraft = null;
    lkPraKotak('');
    return;
  }
  if (!u) {
    lkDraft = null;
    lkPraKotak('<p class="lg-salah">Link tidak dikenali. Pastikan diawali https://</p>');
    return;
  }
  var lama = lkDraft && lkDraft.u === u ? lkDraft : null;
  if (lama && lama.siap) return;
  lkDraft = { u: u, s: 'nanti', lb: [], fol: lkFol && lkFol !== '-' ? lkFol : '', muat: true, j: lkJenis(u), v: lkVideo(u) };
  lkRenderDraft();
  lkPratinjau(u).then(function (p) {
    if (no !== lkCekNo || !lkDraft || lkDraft.u !== u) return;
    var judulKetik = $('#lkJudul') ? $('#lkJudul').value : '',
      al = $('#lkAl') ? $('#lkAl').value : '';
    Object.keys(p).forEach(function (k) {
      lkDraft[k] = p[k];
    });
    if (judulKetik) lkDraft.a = judulKetik;
    else if (!lkDraft.a && lkJudulBagi) lkDraft.a = lkJudulBagi;
    lkDraft.al = al;
    lkDraft.muat = false;
    lkDraft.siap = true;
    lkRenderDraft();
  });
}
function lkRenderDraft() {
  var d = lkDraft;
  if (!d) return;
  var dobel = lkDobel(d.u),
    g = lkGambar(d),
    h = '<div class="lk-pra">';
  if (d.muat)
    h +=
      '<div class="lk-pra-muat">' +
      lkFavicon(d, 'besar') +
      '<span><b>' +
      esc(lkDomain(d.u)) +
      '</b><small><span class="lk-titik"></span>Mengambil pratinjau…</small></span></div>';
  else {
    if (g)
      h +=
        '<div class="lk-sampul" style="--w:' +
        lkWarna(lkDomain(d.u)) +
        '"><img src="' +
        esc(g) +
        '" alt="" referrerpolicy="no-referrer">' +
        (d.v ? '<i>' + LK_IK.play + '</i>' : '') +
        '</div>';
    h +=
      '<div class="lk-pra-bw"><div class="lk-pra-atas">' +
      (g ? '' : lkFavicon(d, 'besar')) +
      '<span><b>' +
      esc(d.a || lkDomain(d.u)) +
      '</b>' +
      (d.d ? '<p>' + esc(d.d.slice(0, 220)) + (d.d.length > 220 ? '…' : '') + '</p>' : '') +
      '</span></div>' +
      '<div class="lk-dom">' +
      lkFavicon(d, 'mini') +
      '<span>' +
      esc(d.si || lkDomain(d.u)) +
      ' · ' +
      LK_JENIS[d.j] +
      '</span></div>' +
      (d.lewat === 'tanpa' && !d.a
        ? '<p class="lk-cat">Judul situs ini tidak bisa diambil otomatis' +
          (lkWorkerSiap() ? '' : ' (Worker belum aktif atau belum login)') +
          '. Ketik judulnya di bawah.</p>'
        : '') +
      (d.ck && lkMati({ ck: d.ck })
        ? '<p class="lg-salah">Situs ini tidak bisa dibuka saat dicek (' + (d.ck.s || 'tidak merespons') + '). Tetap bisa disimpan.</p>'
        : '') +
      '</div>';
  }
  if (dobel)
    h +=
      '<p class="lk-peringatan">Link ini sudah ada di Koleksi Link (disimpan ' +
      lkTgl(dobel.dibuat) +
      '). <button type="button" id="lkBukaAda" data-id="' +
      esc(dobel.id) +
      '">Buka yang ada</button></p>';
  h +=
    '<div class="lk-isian"><div class="field"><label for="lkJudul">Judul</label><input class="input" id="lkJudul" maxlength="300" autocomplete="off" placeholder="' +
    esc(lkDomain(d.u)) +
    '" value="' +
    esc(d.a || '') +
    '"></div>' +
    '<div class="field"><label>Simpan sebagai</label><div class="bk-pil lk-pil"><button type="button" data-lkds="nanti"' +
    (d.s === 'nanti' ? ' class="on"' : '') +
    '>Baca nanti</button><button type="button" data-lkds="buka"' +
    (d.s === 'buka' ? ' class="on"' : '') +
    '>Sudah dibuka</button><button type="button" id="lkDPin"' +
    (d.pin ? ' class="on"' : '') +
    '>' +
    LK_IK.pin +
    'Sematkan</button></div></div>' +
    '<div class="field"><label>Jenis</label><div class="bk-pil lk-pil">' +
    Object.keys(LK_JENIS)
      .map(function (j) {
        return '<button type="button" data-lkdj="' + j + '"' + (d.j === j ? ' class="on"' : '') + '>' + LK_JENIS[j] + '</button>';
      })
      .join('') +
    '</div></div>' +
    '<div class="field"><label>Folder</label>' +
    lkPilFolder(d.fol, 'data-lkdf', 'lkDFolBaru') +
    '</div>' +
    '<div class="field"><label>Label <span class="gl-ops">(opsional)</span></label>' +
    lkPilLabel(d.lb, 'data-lkdl', 'lkDLbBaru') +
    '</div>' +
    '<div class="field"><label for="lkAl">Kenapa disimpan? <span class="gl-ops">(opsional)</span></label><textarea class="input" id="lkAl" rows="2" maxlength="2000">' +
    esc(d.al || '') +
    '</textarea></div>' +
    '<div class="bk-dlg-dua"><button type="button" class="btn ghost" data-back>Batal</button><button type="button" class="btn primary" id="lkSimpan">Simpan</button></div></div></div>';
  lkPraKotak(h);
}
function lkBacaDraft() {
  var d = lkDraft;
  if (!d) return;
  var a = $('#lkJudul'),
    b = $('#lkAl');
  if (a) d.a = a.value;
  if (b) d.al = b.value;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'link-tambah') return;
  var el,
    d = lkDraft;
  if (e.target.closest('#lkTempel')) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      toast('Tekan lama kolom link, lalu pilih Tempel');
      $('#lkUrl').focus();
      return;
    }
    navigator.clipboard
      .readText()
      .then(function (t) {
        var m = /https?:\/\/\S+/i.exec(String(t || ''));
        $('#lkUrl').value = (m ? m[0] : String(t || '').trim()).slice(0, 2000);
        lkCek();
      })
      .catch(function () {
        toast('Izin papan klip ditolak. Tekan lama kolom link, lalu pilih Tempel');
      });
    return;
  }
  if ((el = e.target.closest('#lkBukaAda'))) {
    var ida = el.dataset.id;
    back(1, function () {
      openLayer('page:link-detail:' + ida);
    });
    return;
  }
  if (!d) return;
  if ((el = e.target.closest('[data-lkds]'))) {
    lkBacaDraft();
    d.s = el.dataset.lkds;
    lkRenderDraft();
    return;
  }
  if (e.target.closest('#lkDPin')) {
    lkBacaDraft();
    d.pin = !d.pin;
    lkRenderDraft();
    return;
  }
  if ((el = e.target.closest('[data-lkdj]'))) {
    lkBacaDraft();
    d.j = el.dataset.lkdj;
    lkRenderDraft();
    return;
  }
  if ((el = e.target.closest('[data-lkdf]'))) {
    lkBacaDraft();
    d.fol = d.fol === el.dataset.lkdf ? '' : el.dataset.lkdf;
    lkRenderDraft();
    return;
  }
  if ((el = e.target.closest('[data-lkdl]'))) {
    lkBacaDraft();
    var t = el.dataset.lkdl,
      i = d.lb.indexOf(t);
    if (i >= 0) d.lb.splice(i, 1);
    else if (d.lb.length < 10) d.lb.push(t);
    lkRenderDraft();
    return;
  }
  if (e.target.closest('#lkDFolBaru')) {
    lkBacaDraft();
    lkFolderBaru(function (id) {
      d.fol = id;
      lkRenderDraft();
    });
    return;
  }
  if (e.target.closest('#lkDLbBaru')) {
    lkBacaDraft();
    lkLabelBaru(function (t) {
      if (d.lb.indexOf(t) < 0 && d.lb.length < 10) d.lb.push(t);
      lkRenderDraft();
    });
    return;
  }
  if (e.target.closest('#lkSimpan')) {
    lkBacaDraft();
    lkSimpanDraft();
  }
});
function lkSimpanDraft() {
  var d = lkDraft;
  if (!d) return;
  if (lkDobel(d.u)) {
    toast('Link ini sudah ada. Ketuk "Buka yang ada".');
    return;
  }
  var L = lkItems();
  if (L.length >= LK_MAKS) {
    toast('Maksimal ' + LK_MAKS + ' link');
    return;
  }
  var kini = Date.now(),
    x = lkSah({
      id: uid(),
      u: d.u,
      a: (d.a || '').trim(),
      d: d.d,
      img: d.img,
      ik: d.ik,
      si: d.si,
      j: d.j,
      v: d.v,
      s: d.s,
      pin: d.pin,
      fol: d.fol,
      lb: d.lb,
      al: (d.al || '').trim(),
      ck: d.ck,
      nb: d.s === 'buka' ? 1 : 0,
      tb: d.s === 'buka' ? kini : 0,
      dibuat: kini,
      diubah: kini
    });
  if (!x) {
    toast('Link tidak valid');
    return;
  }
  L.unshift(x);
  lkSimpanData(L);
  lkDraft = null;
  var bagi = lkDariBagikan;
  lkDariBagikan = false;
  lkJudulBagi = '';
  back(1, function () {
    renderGaleryTab();
    if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
    toast(bagi ? 'Tersimpan di Koleksi Link' : 'Link disimpan');
  });
}

/* ---------- Menerima link dari menu Bagikan (share_target) ---------- */
function lkCekBagikan() {
  var q;
  try {
    q = new URLSearchParams(location.search);
  } catch (e) {
    return;
  }
  if (!q.has('bagikan')) return;
  var teks = [q.get('url'), q.get('text'), q.get('title')].filter(Boolean).join(' '),
    m = /https?:\/\/[^\s<>"']+/i.exec(teks);
  try {
    history.replaceState(history.state, '', location.pathname);
  } catch (e) {}
  if (!m) {
    toast('Tidak ada link yang bisa disimpan');
    return;
  }
  var u = lkUrl(m[0].replace(/[).,;!?]+$/, ''));
  if (!u) {
    toast('Link tidak dikenali');
    return;
  }
  setTimeout(function () {
    if (typeof switchTab === 'function') switchTab('galery');
    try {
      store.set(K_GT_AKTIF, 'lainnya');
      if (typeof renderGaleryTab === 'function') renderGaleryTab();
    } catch (e) {}
    glBukaJenis = 'link';
    glFilter = '';
    glCari = '';
    if (!(opened.page && pageKind === 'galery-koleksi')) openLayer('page:galery-koleksi');
    var ada = lkDobel(u);
    if (ada) {
      toast('Link ini sudah ada di Koleksi Link');
      openLayer('page:link-detail:' + ada.id);
      return;
    }
    var jd = String(q.get('title') || '').trim();
    lkJudulBagi = /https?:\/\//i.test(jd) ? '' : jd.slice(0, 300);
    lkDariBagikan = true;
    lkDraft = { u: u };
    openLayer('page:link-tambah');
  }, 300);
}

/* ---------- Halaman detail ---------- */
function lkIdHalaman() {
  var L = layerOf('page');
  return L ? L.name.split(':').slice(2).join(':') : '';
}
function lkKini() {
  return lkCari(lkIdHalaman());
}
PAGES['link-detail'] = function () {
  var x = lkCari(lkIdHalaman());
  if (!x) return false;
  lkForm = null;
  $('#subTitle').textContent = 'Link';
  lkRenderDetail(x);
  /* Cek otomatis bila Worker aktif & pengecekan terakhir > 7 hari */
  if (lkWorkerSiap() && (!x.ck || Date.now() - x.ck.t > 7 * 86400000)) lkPeriksa(x.id, true);
  return true;
};
function lkRenderUlang() {
  var x = lkKini();
  if (x) lkRenderDetail(x, true);
}
function lkSumber(k) {
  if (k === 'im')
    return (typeof tkImpianDaftar === 'function' ? tkImpianDaftar() : []).map(function (d) {
      return { id: d.id, t: (d.emoji ? d.emoji + ' ' : '') + d.nama };
    });
  if (k === 'tk')
    return typeof tkItems === 'function'
      ? tkItems().map(function (t) {
          return { id: t.id, t: t.a };
        })
      : [];
  if (k === 'bk')
    return (glSemua().buku || []).map(function (b) {
      return { id: b.id, t: b.a };
    });
  if (k === 'ch')
    return typeof chItems === 'function'
      ? chItems().map(function (c) {
          return { id: c.id, t: c.a };
        })
      : [];
  if (k === 'tp')
    return typeof tpItems === 'function'
      ? tpItems().map(function (p) {
          return { id: p.id, t: tpNama(p) };
        })
      : [];
  return [];
}
function lkTautan(x) {
  var o = [];
  Object.keys(LK_HUB).forEach(function (k) {
    var S = lkSumber(k);
    ((x.hub && x.hub[k]) || []).forEach(function (id) {
      var s = S.filter(function (z) {
        return z.id === id;
      })[0];
      if (s) o.push({ k: k, id: id, t: s.t });
    });
  });
  return o;
}
function lkDiPola(t) {
  if (typeof gpData !== 'function') return false;
  var bersih = function (s) {
      return String(s || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    },
    q = bersih(t).slice(0, 60);
  try {
    return gpData().item.some(function (p) {
      return bersih(gpTeksCari(p)).indexOf(q) >= 0;
    });
  } catch (e) {
    return false;
  }
}
function lkRenderDetail(x, ulang) {
  var sy = ulang ? $('#subBody').scrollTop : 0,
    g = lkGambar(x),
    F = lkFolder(),
    dom = lkDomain(x.u);
  var h =
    '<div class="lk-det">' +
    (g
      ? '<div class="lk-sampul besar" style="--w:' +
        lkWarna(dom) +
        '"><img src="' +
        esc(g) +
        '" alt="" referrerpolicy="no-referrer">' +
        (x.v ? '<button type="button" class="lk-putar-b" id="lkPutar" aria-label="Putar">' + LK_IK.play + '</button>' : '') +
        '</div>'
      : '') +
    '<div class="lk-det-grid"><div class="lk-det-kiri"><div class="lk-det-atas">' +
    (g ? '' : lkFavicon(x, 'besar')) +
    '<span><h2>' +
    esc(x.a) +
    '</h2>' +
    '<span class="lk-dom">' +
    lkFavicon(x, 'mini') +
    '<span>' +
    esc(x.si || dom) +
    ' · ' +
    LK_JENIS[x.j] +
    '</span>' +
    (x.fol &&
    F.some(function (f) {
      return f.id === x.fol;
    })
      ? '<em class="lk-lb">' +
        esc(
          F.filter(function (f) {
            return f.id === x.fol;
          })[0].n
        ) +
        '</em>'
      : '') +
    (x.lb || [])
      .map(function (t) {
        return '<em class="lk-lb">#' + esc(t) + '</em>';
      })
      .join('') +
    '</span></span></div>' +
    (x.d ? '<p class="lk-desk">' + esc(x.d) + '</p>' : '') +
    '<div class="lk-aksi">' +
    (x.v
      ? '<button type="button" class="lk-utama" id="lkPutar2">' +
        LK_IK.play +
        'Putar di sini</button><a class="lk-ab" id="lkBuka" href="' +
        esc(x.u) +
        '" target="_blank" rel="noopener noreferrer">' +
        LK_IK.buka +
        'Buka</a>'
      : '<a class="lk-utama" id="lkBuka" href="' +
        esc(x.u) +
        '" target="_blank" rel="noopener noreferrer">' +
        LK_IK.buka +
        'Buka link</a>') +
    '<button type="button" class="lk-ab' +
    (x.pin ? ' on' : '') +
    '" id="lkPin">' +
    LK_IK.pin +
    (x.pin ? 'Disematkan' : 'Sematkan') +
    '</button><button type="button" class="lk-ab" id="lkSalin">' +
    LK_IK.salin +
    'Salin</button>' +
    (navigator.share ? '<button type="button" class="lk-ab" id="lkBagi">' + LK_IK.bagi + 'Bagikan</button>' : '') +
    '</div>';
  /* Status */
  h +=
    '<section class="fm-bag"><h3>Status</h3><div class="fm-kartu-p"><div class="lk-status"><button type="button" data-lks="nanti"' +
    (x.s === 'nanti' ? ' class="on"' : '') +
    '>Baca nanti</button><button type="button" data-lks="buka"' +
    (x.s === 'buka' ? ' class="on"' : '') +
    '>' +
    LK_IK.cek +
    'Sudah dibuka</button></div>' +
    '<div class="lk-info"><span>Disimpan ' +
    lkTgl(x.dibuat) +
    '</span><span>' +
    (x.nb ? 'Dibuka ' + x.nb + ' kali' + (x.tb ? ' · terakhir ' + lkLalu(x.tb) : '') : 'Belum pernah dibuka') +
    '</span></div>' +
    '<div class="lk-periksa" id="lkPeriksaBox">' +
    lkPeriksaHtml(x) +
    '</div></div></section>';
  /* Kenapa disimpan */
  h +=
    '<section class="fm-bag"><h3>Kenapa disimpan</h3><textarea class="input lk-alasan" id="lkAlasan" rows="3" maxlength="2000" placeholder="Untuk apa link ini, atau apa yang mau kamu ambil darinya…">' +
    esc(x.al || '') +
    '</textarea></section>';
  /* Poin penting */
  var po = x.po || [],
    fp = lkForm && lkForm.k === 'po' ? lkForm : null,
    fpo =
      fp && fp.i
        ? po.filter(function (p) {
            return p.i === fp.i;
          })[0]
        : null;
  h +=
    '<section class="fm-bag"><h3 class="bk-h3 lk-h3">Poin penting' +
    (po.length ? ' · ' + po.length : '') +
    ' <button type="button" id="lkPoTambah">' +
    LK_IK.plus +
    'Tambah</button></h3>' +
    (fp
      ? '<div class="tp-kj-form lk-form"><div class="field"><label for="lkPoT">Poin / kutipan</label><textarea class="input" id="lkPoT" rows="3" maxlength="1000">' +
        esc(fpo ? fpo.t : '') +
        '</textarea></div>' +
        '<div class="bk-dlg-dua"><button type="button" class="btn ghost" id="lkFormBatal">Batal</button><button type="button" class="btn primary" id="lkPoSimpan">Simpan</button></div></div>'
      : '') +
    '<div class="fm-kartu-p">' +
    (po.length
      ? po
          .map(function (p) {
            return (
              '<div class="tk-kut lk-kut"><p data-lkpoe="' +
              esc(p.i) +
              '" role="button" tabindex="0">' +
              esc(p.t) +
              '</p><div class="tk-kut-aksi">' +
              (lkDiPola(p.t)
                ? '<em class="tk-sdh">' + LK_IK.cek + 'Sudah di Pola Pikir</em>'
                : '<button type="button" data-lkpop="' + esc(p.i) + '">' + LK_IK.pola + 'Jadikan Pola Pikir</button>') +
              '<button type="button" class="ch-x" data-lkpoh="' +
              esc(p.i) +
              '" aria-label="Hapus poin">' +
              LK_IK.hapus +
              '</button></div></div>'
            );
          })
          .join('')
      : '<p class="fm-tidak">Catat poin atau kalimat penting dari link ini.</p>') +
    '</div></section>';
  h += '</div><div class="lk-det-kanan">';
  /* Terhubung */
  var tt = lkTautan(x);
  h +=
    '<section class="fm-bag"><h3>Terhubung dengan</h3><div class="fm-kartu-p">' +
    tt
      .map(function (t) {
        return (
          '<div class="tk-sambung"><span class="tk-sb-ik" style="background:' +
          LK_HUB[t.k].w +
          '">' +
          LK_IK[t.k] +
          '</span><span class="tk-sb-tx"><b>' +
          esc(t.t) +
          '</b><small>' +
          LK_HUB[t.k].n +
          '</small></span>' +
          '<button type="button" class="tk-buka lk-buka" data-lkhb="' +
          t.k +
          '|' +
          esc(t.id) +
          '">Buka</button><button type="button" class="ch-x" data-lkhl="' +
          t.k +
          '|' +
          esc(t.id) +
          '" aria-label="Lepas tautan">' +
          LK_IK.tutup +
          '</button></div>'
        );
      })
      .join('') +
    '<div class="tk-tbh-pil">' +
    Object.keys(LK_HUB)
      .map(function (k) {
        return '<button type="button" class="lk-tbh" data-lkht="' + k + '">+ ' + LK_HUB[k].n + '</button>';
      })
      .join('') +
    '</div></div></section>';
  /* Folder, label, jenis */
  h +=
    '<section class="fm-bag"><h3>Folder</h3>' +
    lkPilFolder(x.fol, 'data-lkf', 'lkFolBaru') +
    '</section>' +
    '<section class="fm-bag"><h3>Label</h3>' +
    lkPilLabel(x.lb, 'data-lkl', 'lkLbBaru') +
    '</section>' +
    '<section class="fm-bag"><h3>Jenis</h3><div class="bk-pil lk-pil">' +
    Object.keys(LK_JENIS)
      .map(function (j) {
        return '<button type="button" data-lkj="' + j + '"' + (x.j === j ? ' class="on"' : '') + '>' + LK_JENIS[j] + '</button>';
      })
      .join('') +
    '</div></section>';
  /* Alamat & info */
  h +=
    '<section class="fm-bag"><h3>Alamat</h3><div class="fm-kartu-p lk-alamat"><span>' +
    esc(x.u) +
    '</span></div><div class="tk-info-btn lk-info-btn">' +
    '<button type="button" class="btn ghost" id="lkUbahJudul">' +
    LK_IK.ubah +
    'Ubah judul</button><button type="button" class="btn ghost" id="lkUbahUrl">' +
    LK_IK.ubah +
    'Ubah alamat</button>' +
    '<button type="button" class="btn ghost" id="lkSegar">' +
    LK_IK.ulang +
    'Ambil ulang pratinjau</button></div></section>';
  h += '<button type="button" class="se-hapus fm-hapus" id="lkHapus">' + LK_IK.hapus + 'Hapus link</button></div></div></div>';
  $('#subBody').innerHTML = h;
  if (ulang) $('#subBody').scrollTop = sy;
}
function lkPeriksaHtml(x) {
  if (!x.ck)
    return lkWorkerSiap()
      ? '<button type="button" class="lk-cek-b" id="lkPeriksa">' + LK_IK.ulang + 'Cek apakah link masih aktif</button>'
      : '';
  var mati = lkMati(x);
  return (
    '<span class="' +
    (mati ? 'mati' : 'hidup') +
    '">● ' +
    (mati ? 'Link mungkin mati (' + (x.ck.s || 'tidak merespons') + ')' : 'Link aktif') +
    ' · dicek ' +
    lkLalu(x.ck.t) +
    '</span>' +
    (lkWorkerSiap() ? '<button type="button" class="lk-cek-b" id="lkPeriksa">' + LK_IK.ulang + 'Cek lagi</button>' : '')
  );
}
function lkPeriksa(id, diam) {
  var x = lkCari(id);
  if (!x) return;
  if (!lkWorkerSiap()) {
    if (!diam) toast('Cek link butuh Worker aktif dan login');
    return;
  }
  var b = $('#lkPeriksaBox');
  if (b && !diam) b.innerHTML = '<span class="lk-titik"></span>Mengecek…';
  lkWorker(x.u)
    .then(function (r) {
      lkUbah(id, function (z) {
        z.ck = { t: Date.now(), s: +r.s || 0 };
        if (!z.img && r.img) z.img = r.img;
        if (!z.d && r.d) z.d = r.d;
        if (!z.ik && r.ik) z.ik = r.ik;
      });
      if (
        pageKind === 'link-detail' &&
        lkIdHalaman() === id &&
        !lkForm &&
        !(document.activeElement && document.activeElement.id === 'lkAlasan')
      )
        lkRenderUlang();
      else {
        var bx = $('#lkPeriksaBox');
        if (bx && lkIdHalaman() === id) bx.innerHTML = lkPeriksaHtml(lkCari(id));
      }
    })
    .catch(function () {
      if (!diam) {
        toast('Tidak bisa mengecek sekarang');
        var bx = $('#lkPeriksaBox'),
          z = lkCari(id);
        if (bx && z) bx.innerHTML = lkPeriksaHtml(z);
      }
    });
}
function lkDibuka(id) {
  lkUbah(id, function (z) {
    z.nb = (z.nb || 0) + 1;
    z.tb = Date.now();
    z.s = 'buka';
  });
}
/* Pemutar YouTube di dalam aplikasi */
function lkPutar(x) {
  if (!x.v) return;
  lkDibuka(x.id);
  glPutarVideo(x.v, x.a, function () {
    if (opened.page && pageKind === 'link-detail') lkRenderUlang();
  });
}
function lkBukaTautan(k, id) {
  if (k === 'im') {
    if (typeof imDetailId === 'undefined') return;
    imDetailId = id;
    openLayer('page:impian-detail');
    return;
  }
  if (k === 'tk') {
    openLayer('page:tokoh-detail:' + id);
    return;
  }
  if (k === 'bk') {
    openLayer('page:buku-detail:' + id);
    return;
  }
  if (k === 'ch') {
    openLayer('page:channel-detail:' + id);
    return;
  }
  if (k === 'tp') openLayer('page:tempat-detail:' + id);
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'link-detail') return;
  var x = lkKini();
  if (!x) return;
  var el,
    id = x.id;
  if (e.target.closest('#lkBuka')) {
    lkDibuka(id);
    setTimeout(lkRenderUlang, 300);
    return;
  }
  if (e.target.closest('#lkPutar') || e.target.closest('#lkPutar2')) {
    lkPutar(x);
    return;
  }
  if (e.target.closest('#lkPin')) {
    lkUbah(id, function (z) {
      if (z.pin) delete z.pin;
      else z.pin = 1;
    });
    toast(x.pin ? 'Tidak disematkan' : 'Disematkan');
    lkRenderUlang();
    return;
  }
  if (e.target.closest('#lkSalin')) {
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(x.u).then(
        function () {
          toast('Link disalin');
        },
        function () {
          toast('Tidak bisa menyalin');
        }
      );
    else toast('Tidak bisa menyalin di browser ini');
    return;
  }
  if (e.target.closest('#lkBagi')) {
    try {
      navigator.share({ title: x.a, url: x.u }).catch(function () {});
    } catch (er) {}
    return;
  }
  if ((el = e.target.closest('[data-lks]'))) {
    var s = el.dataset.lks;
    lkUbah(id, function (z) {
      z.s = s;
    });
    lkRenderUlang();
    return;
  }
  if (e.target.closest('#lkPeriksa')) {
    lkPeriksa(id, false);
    return;
  }
  /* Poin penting */
  if (e.target.closest('#lkPoTambah')) {
    if ((x.po || []).length >= LK_PO_MAKS) {
      toast('Maksimal ' + LK_PO_MAKS + ' poin');
      return;
    }
    lkForm = { k: 'po' };
    lkRenderUlang();
    var t0 = $('#lkPoT');
    if (t0) {
      t0.focus();
      t0.scrollIntoView({ block: 'center' });
    }
    return;
  }
  if ((el = e.target.closest('[data-lkpoe]'))) {
    lkForm = { k: 'po', i: el.dataset.lkpoe };
    lkRenderUlang();
    var t1 = $('#lkPoT');
    if (t1) {
      t1.focus();
      t1.scrollIntoView({ block: 'center' });
    }
    return;
  }
  if (e.target.closest('#lkFormBatal')) {
    lkForm = null;
    lkRenderUlang();
    return;
  }
  if (e.target.closest('#lkPoSimpan')) {
    var pt = $('#lkPoT').value.trim(),
      pi = lkForm && lkForm.i;
    if (!pt) {
      toast('Tulis poinnya dulu');
      $('#lkPoT').focus();
      return;
    }
    lkUbah(id, function (z) {
      if (pi)
        z.po = (z.po || []).map(function (p) {
          return p.i === pi ? { i: pi, t: pt } : p;
        });
      else z.po = (z.po || []).concat([{ i: uid(), t: pt }]);
    });
    lkForm = null;
    toast(pi ? 'Poin diperbarui' : 'Poin disimpan');
    lkRenderUlang();
    return;
  }
  if ((el = e.target.closest('[data-lkpop]'))) {
    var pp = (x.po || []).filter(function (p) {
      return p.i === el.dataset.lkpop;
    })[0];
    if (!pp || typeof gpIsiAwal === 'undefined') return;
    gpIsiAwal = { teks: pp.t, asal: ['Pengalaman', x.a.slice(0, 80)] };
    openLayer('page:pola-form:');
    return;
  }
  if ((el = e.target.closest('[data-lkpoh]'))) {
    var ph = (x.po || []).filter(function (p) {
      return p.i === el.dataset.lkpoh;
    })[0];
    if (!ph) return;
    askConfirm({
      title: 'Hapus poin?',
      text: '"' + ph.t.slice(0, 80) + (ph.t.length > 80 ? '…' : '') + '" dihapus. Yang sudah ada di Pola Pikir tidak ikut terhapus.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          lkUbah(id, function (z) {
            z.po = (z.po || []).filter(function (p) {
              return p.i !== ph.i;
            });
          });
          lkRenderUlang();
          toast('Poin dihapus');
        });
      }
    });
    return;
  }
  /* Tautan */
  if ((el = e.target.closest('[data-lkht]'))) {
    var k = el.dataset.lkht,
      S = lkSumber(k),
      ada = (x.hub && x.hub[k]) || [],
      P = S.filter(function (s2) {
        return ada.indexOf(s2.id) < 0;
      });
    if (!S.length) {
      toast('Belum ada ' + LK_HUB[k].n.toLowerCase() + ' yang bisa ditautkan');
      return;
    }
    if (!P.length) {
      toast('Semua ' + LK_HUB[k].n.toLowerCase() + ' sudah ditautkan');
      return;
    }
    if (ada.length >= LK_HUB_MAKS) {
      toast('Maksimal ' + LK_HUB_MAKS + ' tautan');
      return;
    }
    tpPilihan({
      judul: 'Tautkan ' + LK_HUB[k].n.toLowerCase(),
      opsi: P.slice(0, 300)
        .map(function (s3) {
          return {
            kelas: 'tp-opsi-imp',
            html: '<i style="background:' + LK_HUB[k].w + ';color:#fff">' + LK_IK[k] + '</i><span><b>' + esc(s3.t) + '</b></span>',
            aksi: function () {
              lkUbah(id, function (z) {
                z.hub = z.hub || {};
                z.hub[k] = (z.hub[k] || []).concat([s3.id]);
              });
              toast('Ditautkan');
              lkRenderUlang();
            }
          };
        })
        .concat([{ t: 'Batal' }])
    });
    return;
  }
  if ((el = e.target.closest('[data-lkhb]'))) {
    var a = el.dataset.lkhb.split('|');
    lkBukaTautan(a[0], a.slice(1).join('|'));
    return;
  }
  if ((el = e.target.closest('[data-lkhl]'))) {
    var b2 = el.dataset.lkhl.split('|'),
      hk = b2[0],
      hid = b2.slice(1).join('|'),
      nm =
        (
          lkTautan(x).filter(function (t) {
            return t.k === hk && t.id === hid;
          })[0] || {}
        ).t || '';
    askConfirm({
      title: 'Lepas tautan?',
      text: '"' + nm.slice(0, 80) + '" tidak lagi terhubung dengan link ini. Datanya sendiri tidak dihapus.',
      ok: 'Lepas',
      action: function () {
        back(1, function () {
          lkUbah(id, function (z) {
            if (z.hub && z.hub[hk]) {
              z.hub[hk] = z.hub[hk].filter(function (v) {
                return v !== hid;
              });
              if (!z.hub[hk].length) delete z.hub[hk];
            }
          });
          lkRenderUlang();
          toast('Tautan dilepas');
        });
      }
    });
    return;
  }
  /* Folder, label, jenis */
  if ((el = e.target.closest('[data-lkf]'))) {
    var fo = el.dataset.lkf;
    lkUbah(id, function (z) {
      if (z.fol === fo) delete z.fol;
      else z.fol = fo;
    });
    lkRenderUlang();
    return;
  }
  if (e.target.closest('#lkFolBaru')) {
    lkFolderBaru(function (fid) {
      lkUbah(id, function (z) {
        z.fol = fid;
      });
      lkRenderUlang();
    });
    return;
  }
  if ((el = e.target.closest('[data-lkl]'))) {
    var t2 = el.dataset.lkl;
    if (
      !(x.lb || []).some(function (q) {
        return q === t2;
      }) &&
      (x.lb || []).length >= 10
    ) {
      toast('Maksimal 10 label per link');
      return;
    }
    lkUbah(id, function (z) {
      var A = z.lb || [],
        i = A.indexOf(t2);
      if (i >= 0) A.splice(i, 1);
      else A.push(t2);
      z.lb = A;
    });
    lkRenderUlang();
    return;
  }
  if (e.target.closest('#lkLbBaru')) {
    lkLabelBaru(function (t3) {
      lkUbah(id, function (z) {
        var A = z.lb || [];
        if (A.indexOf(t3) < 0 && A.length < 10) A.push(t3);
        z.lb = A;
      });
      lkRenderUlang();
    });
    return;
  }
  if ((el = e.target.closest('[data-lkj]'))) {
    var j = el.dataset.lkj;
    lkUbah(id, function (z) {
      z.j = j;
    });
    lkRenderUlang();
    return;
  }
  /* Judul, alamat, pratinjau */
  if (e.target.closest('#lkUbahJudul')) {
    tpMintaTeks({
      judul: 'Judul',
      nilai: x.a,
      maks: 300,
      ok: 'Simpan',
      cb: function (v) {
        v = v.trim();
        if (!v) return;
        lkUbah(id, function (z) {
          z.a = v;
        });
        lkRenderUlang();
      }
    });
    return;
  }
  if (e.target.closest('#lkUbahUrl')) {
    tpMintaTeks({
      judul: 'Alamat link',
      nilai: x.u,
      maks: 2000,
      ok: 'Simpan',
      cb: function (v) {
        var u = lkUrl(v);
        if (!u) {
          toast('Alamat tidak valid');
          return;
        }
        var d = lkDobel(u, id);
        if (d) {
          toast('Alamat ini sudah dipakai link lain');
          return;
        }
        lkUbah(id, function (z) {
          z.u = u;
          z.v = lkVideo(u);
          delete z.ck;
          delete z.img;
          delete z.ik;
        });
        lkRenderUlang();
      }
    });
    return;
  }
  if (e.target.closest('#lkSegar')) {
    toast('Mengambil pratinjau…');
    lkPratinjau(x.u).then(function (p) {
      lkUbah(id, function (z) {
        if (p.a) z.a = p.a;
        if (p.d) z.d = p.d;
        if (p.img) z.img = p.img;
        if (p.ik) z.ik = p.ik;
        if (p.si) z.si = p.si;
        if (p.ck) z.ck = p.ck;
      });
      toast(p.lewat === 'worker' || p.a ? 'Pratinjau diperbarui' : 'Pratinjau tidak bisa diambil (Worker belum aktif atau situs menolak)');
      if (pageKind === 'link-detail' && lkIdHalaman() === id) lkRenderUlang();
    });
    return;
  }
  if (e.target.closest('#lkHapus')) {
    askConfirm({
      title: 'Hapus link?',
      text: '"' + x.a.slice(0, 80) + '" beserta catatan dan poinnya dihapus.',
      ok: 'Hapus',
      action: function () {
        back(2, function () {
          lkSimpanData(
            lkItems().filter(function (z) {
              return z.id !== id;
            })
          );
          renderGaleryTab();
          if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
          toast('Link dihapus');
        });
      }
    });
  }
});
$('#subBody').addEventListener('keydown', function (e) {
  if (pageKind === 'link-detail' && e.key === 'Enter' && e.target.matches('[data-lkpoe]')) e.target.click();
});
var lkAlT = null;
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'link-detail' || e.target.id !== 'lkAlasan') return;
  var id = lkIdHalaman(),
    v = e.target.value.replace(/\s+$/, '');
  clearTimeout(lkAlT);
  lkAlT = setTimeout(function () {
    lkUbah(id, function (z) {
      z.al = v;
    });
  }, 600);
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind === 'link-detail' && e.target.id === 'lkAlasan') {
    clearTimeout(lkAlT);
    var v = e.target.value.replace(/\s+$/, '');
    lkUbah(lkIdHalaman(), function (z) {
      z.al = v;
    });
  }
});

/* ---------- Impor bookmark Chrome (.html) ---------- */
PAGES['link-impor'] = function () {
  $('#subTitle').textContent = 'Impor bookmark';
  lkRenderImpor();
  return true;
};
function lkRenderImpor() {
  var I = lkImpor,
    h =
      '<div class="lk-impor"><p class="lg-ket">Ekspor bookmark dari Chrome di komputer (<b>Bookmark manager → ⋮ → Export bookmarks</b>), kirim filenya ke HP, lalu pilih file <b>.html</b>-nya di sini.</p>' +
      '<label class="lk-unggah">' +
      LK_IK.impor +
      '<b>' +
      (I ? esc(I.nama) : 'Pilih file bookmark (.html)') +
      '</b>' +
      (I
        ? '<small>Terbaca ' + I.semua.length + ' link dalam ' + I.grup.length + ' folder</small>'
        : '<small>File dari Chrome, Edge, Firefox, atau Safari</small>') +
      '<span class="btn ghost">' +
      (I ? 'Pilih file lain' : 'Pilih file') +
      '</span><input type="file" accept=".html,.htm,text/html" id="lkImporFile" hidden></label>';
  if (I) {
    var dipilih = I.semua.filter(function (b) {
        return I.pil[b.g];
      }),
      baru = dipilih.filter(function (b) {
        return !b.dobel;
      }),
      sisa = LK_MAKS - lkItems().length,
      akan = Math.min(baru.length, Math.max(0, sisa));
    h +=
      '<div class="fm-kartu-p lk-imp-ring"><div class="lk-angka"><div><b>' +
      baru.length +
      '</b><small>baru</small></div><div><b>' +
      (dipilih.length - baru.length) +
      '</b><small>sudah ada (dilewati)</small></div></div>' +
      '<h3 class="lk-imp-h">Folder yang diimpor (jadi folder di Stivora)</h3>' +
      I.grup
        .map(function (g) {
          return (
            '<button type="button" class="lk-folder-imp' +
            (I.pil[g.n] ? ' on' : '') +
            '" data-lkig="' +
            esc(g.n) +
            '"><span class="tk-cek">' +
            (I.pil[g.n] ? LK_IK.cek : '') +
            '</span><span>' +
            esc(g.n || 'Tanpa folder') +
            '</span><small>' +
            g.jml +
            '</small></button>'
          );
        })
        .join('') +
      (baru.length > akan ? '<p class="lg-salah">Hanya ' + akan + ' link yang muat (batas ' + LK_MAKS + ' link).</p>' : '') +
      '<div class="field lk-imp-status"><label>Simpan sebagai</label><div class="bk-pil lk-pil"><button type="button" data-lkis="buka"' +
      (I.s === 'buka' ? ' class="on"' : '') +
      '>Sudah dibuka</button><button type="button" data-lkis="nanti"' +
      (I.s === 'nanti' ? ' class="on"' : '') +
      '>Baca nanti</button></div></div>' +
      '<div class="bk-dlg-dua"><button type="button" class="btn ghost" data-back>Batal</button><button type="button" class="btn primary" id="lkImporGo"' +
      (akan ? '' : ' disabled') +
      '>Impor ' +
      akan +
      ' link</button></div></div>';
  }
  h += '</div>';
  $('#subBody').innerHTML = h;
}
function lkBacaBookmark(teks) {
  var doc = new DOMParser().parseFromString(teks, 'text/html'),
    hasil = [];
  var jalan = function (dl, jalur) {
    if (!dl) return;
    Array.prototype.forEach.call(dl.children, function (dt) {
      if (dt.tagName !== 'DT') {
        if (dt.tagName === 'DL') jalan(dt, jalur);
        return;
      }
      var a = dt.querySelector(':scope > a'),
        h3 = dt.querySelector(':scope > h3');
      if (a) {
        var u = lkUrl(a.getAttribute('href'));
        if (u)
          hasil.push({
            u: u,
            a: (a.textContent || '').trim().slice(0, 300),
            g: jalur[0] || '',
            w: (+a.getAttribute('add_date') || 0) * 1000
          });
      } else if (h3) {
        var sub =
          dt.querySelector(':scope > dl') ||
          (dt.nextElementSibling && dt.nextElementSibling.tagName === 'DL' ? dt.nextElementSibling : null);
        var nama = (h3.textContent || '').trim(),
          bar = h3.hasAttribute('personal_toolbar_folder') && !jalur.length;
        jalan(sub, bar ? jalur : jalur.concat([nama]));
      }
    });
  };
  jalan(doc.querySelector('dl'), []);
  return hasil;
}
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'link-impor' || e.target.id !== 'lkImporFile') return;
  var f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (f.size > 20 * 1024 * 1024) {
    toast('File terlalu besar');
    return;
  }
  f.text()
    .then(function (t) {
      var L = lkBacaBookmark(t);
      if (!L.length) {
        toast('Tidak ada bookmark di file ini');
        return;
      }
      var kunci = {};
      lkItems().forEach(function (x) {
        kunci[lkKunciUrl(x.u)] = 1;
      });
      var lihat = {},
        grup = {},
        urut = [];
      L.forEach(function (b) {
        var k = lkKunciUrl(b.u);
        b.dobel = !!kunci[k] || !!lihat[k];
        lihat[k] = 1;
        if (!(b.g in grup)) {
          grup[b.g] = 0;
          urut.push(b.g);
        }
        grup[b.g]++;
      });
      var pil = {};
      urut.forEach(function (g) {
        pil[g] = true;
      });
      lkImpor = {
        nama: f.name.slice(0, 80),
        semua: L,
        grup: urut.map(function (g) {
          return { n: g, jml: grup[g] };
        }),
        pil: pil,
        s: 'buka'
      };
      lkRenderImpor();
    })
    .catch(function () {
      toast('File tidak bisa dibaca');
    });
});
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'link-impor' || !lkImpor) return;
  var el;
  if ((el = e.target.closest('[data-lkig]'))) {
    var g = el.dataset.lkig;
    lkImpor.pil[g] = !lkImpor.pil[g];
    lkRenderImpor();
    return;
  }
  if ((el = e.target.closest('[data-lkis]'))) {
    lkImpor.s = el.dataset.lkis;
    lkRenderImpor();
    return;
  }
  if (e.target.closest('#lkImporGo')) {
    var I = lkImpor,
      L = lkItems(),
      F = lkFolder(),
      kini = Date.now(),
      sisa = LK_MAKS - L.length,
      n = 0,
      fid = {};
    var baru = I.semua
      .filter(function (b) {
        return I.pil[b.g] && !b.dobel;
      })
      .slice(0, Math.max(0, sisa));
    baru.forEach(function (b) {
      if (b.g && !(b.g in fid)) {
        var ada = F.filter(function (f) {
          return f.n.toLowerCase() === b.g.slice(0, 40).toLowerCase();
        })[0];
        if (ada) fid[b.g] = ada.id;
        else if (F.length < LK_FOL_MAKS) {
          var nf = { id: uid(), n: b.g.slice(0, 40) };
          F.push(nf);
          fid[b.g] = nf.id;
        } else fid[b.g] = '';
      }
      var x = lkSah({
        id: uid(),
        u: b.u,
        a: b.a,
        j: lkJenis(b.u),
        v: lkVideo(b.u),
        s: I.s,
        fol: b.g ? fid[b.g] : '',
        tb: kini,
        dibuat: b.w && b.w < kini ? b.w : kini - n,
        diubah: kini
      });
      if (x) {
        L.push(x);
        n++;
      }
    });
    L.sort(function (a, b) {
      return b.dibuat - a.dibuat;
    });
    lkSimpanData(L, F);
    lkImpor = null;
    back(1, function () {
      renderGaleryTab();
      if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
      toast(n + ' link diimpor');
    });
  }
});

function lkSegarkan() {
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'link') glRenderDaftar();
  else if (opened.page && pageKind === 'link-detail' && !lkForm && document.activeElement && document.activeElement.id !== 'lkAlasan')
    lkRenderUlang();
}
lkMigrasi();
