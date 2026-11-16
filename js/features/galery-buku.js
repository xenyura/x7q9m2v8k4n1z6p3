/* ============================================================
   Stivora — Galery · Lainnya · Readlist Buku (5.59.0)
   - Disimpan di kunci sendiri 'stivora.galery.buku' = { v: 1, tgt: { '2026': 24 }, item: [...] }
     (sinkron dipecah: satu dokumen per buku 'buku-b-<id>' + 'buku-urutan'; ikut cadangan).
     Item: { id, a: judul, b: penulis, url, s: 'ingin'|'sedang'|'selesai'|'berhenti', c, dibuat, diubah,
       bk: { g: id Google Books, isbn, th, hal, pnb, kat, bhs,
             hl: halaman sekarang, mulai, selesai, n: nilai 1-5, ul: ulasan, fmt, mil, pj: pinjam dari,
             ss: [['YYYY-MM-DD', halaman], ...] sesi baca per hari, kt: [{ i, k: 1 kutipan | 0 catatan, t, h, w }] } }
   - Buku lama di 'stivora.galery.lainnya'.buku dipindah otomatis ke kunci ini.
   - Info buku dari Google Books (lewat Worker bila ada; tanpa Worker tetap jalan dengan kuota umum), sampul cadangan Open Library.
   - Scan barcode ISBN dengan kamera atau dari gambar (BarcodeDetector, Chrome Android).
   ============================================================ */
'use strict';

var K_BK = 'stivora.galery.buku';
var BK_MAKS = 5000,
  BK_KARTU_RUANG = 600000,
  BK_KT_MAKS = 500,
  BK_KT_T = 1500,
  BK_UL_T = 2000,
  BK_SS_MAKS = 1500,
  BK_HAL = 120;
var BK_ST = { ingin: 'Ingin dibaca', sedang: 'Sedang dibaca', selesai: 'Selesai', berhenti: 'Berhenti' };
var BK_ST_PENDEK = { ingin: 'Ingin', sedang: 'Sedang', selesai: 'Selesai', berhenti: 'Berhenti' };
var BK_URUT = ['Terbaru ditambah', 'Judul A–Z', 'Penulis', 'Nilai saya'];
var BK_FMT = [
  ['cetak', 'Cetak'],
  ['ebook', 'E-book'],
  ['audio', 'Audiobook']
];
var BK_MIL = [
  ['sendiri', 'Milik sendiri'],
  ['pinjam', 'Pinjam'],
  ['beli', 'Ingin beli']
];
var bkS = '',
  bkUrut = 0,
  bkTampil = BK_HAL,
  bkCache = {},
  bkCariQ = '',
  bkCariNo = 0,
  bkCariT = null,
  bkCocok = null,
  bkFormK = 1;

function bkHariIni() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function bkTglGeser(n) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function bkTgl(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : '';
}
function bkStr(v, n) {
  return typeof v === 'string' ? v.slice(0, n) : '';
}
function bkAngka(v, maks) {
  v = Math.floor(+v);
  return v > 0 ? Math.min(maks, v) : 0;
}
function bkSah(b) {
  if (!b || typeof b !== 'object') return {};
  var o = {};
  if (/^[A-Za-z0-9_-]{4,40}$/.test(b.g || '')) o.g = b.g;
  if (/^[0-9X]{10,13}$/.test(b.isbn || '')) o.isbn = b.isbn;
  if (+b.th > 0 && +b.th < 3000) o.th = Math.floor(+b.th);
  if (bkAngka(b.hal, 99999)) o.hal = bkAngka(b.hal, 99999);
  ['pnb', 'kat', 'bhs'].forEach(function (k) {
    var v = bkStr(b[k], 120);
    if (v) o[k] = v;
  });
  if (+b.hl >= 0 && b.hl !== undefined) o.hl = Math.min(99999, Math.floor(+b.hl) || 0);
  if (bkTgl(b.mulai)) o.mulai = b.mulai;
  if (bkTgl(b.selesai)) o.selesai = b.selesai;
  if (+b.n >= 1 && +b.n <= 5) o.n = Math.floor(+b.n);
  if (bkStr(b.ul, BK_UL_T)) o.ul = bkStr(b.ul, BK_UL_T);
  if (
    BK_FMT.some(function (f) {
      return f[0] === b.fmt;
    })
  )
    o.fmt = b.fmt;
  if (
    BK_MIL.some(function (f) {
      return f[0] === b.mil;
    })
  )
    o.mil = b.mil;
  if (bkStr(b.pj, 80)) o.pj = bkStr(b.pj, 80);
  if (Array.isArray(b.ss))
    o.ss = b.ss
      .filter(function (s) {
        return Array.isArray(s) && bkTgl(s[0]) && +s[1] > 0;
      })
      .slice(0, BK_SS_MAKS)
      .map(function (s) {
        return [s[0], Math.min(99999, Math.floor(+s[1]))];
      });
  if (Array.isArray(b.kt))
    o.kt = b.kt
      .filter(function (q) {
        return q && typeof q.t === 'string' && q.t.trim();
      })
      .slice(0, BK_KT_MAKS)
      .map(function (q) {
        return { i: bkStr(q.i, 40) || uid(), k: q.k ? 1 : 0, t: q.t.slice(0, BK_KT_T), h: bkAngka(q.h, 99999), w: +q.w || 0 };
      });
  return o;
}

/* ---------- Penyimpanan ---------- */
function bkDataMentah() {
  var d = store.get(K_BK, null);
  return d && typeof d === 'object' ? d : { v: 1, item: [] };
}
function bkItemMentah() {
  var d = bkDataMentah();
  return Array.isArray(d.item) ? d.item : [];
}
function bkSimpanItem(items) {
  var d = bkDataMentah(),
    o = { v: 1, item: items };
  Object.keys(d).forEach(function (k) {
    if (k !== 'item' && k !== 'v') o[k] = d[k];
  });
  store.set(K_BK, o);
}
function bkTarget(th) {
  var d = bkDataMentah();
  return d.tgt && +d.tgt[th] > 0 ? Math.floor(+d.tgt[th]) : 0;
}
function bkSetTarget(th, n) {
  var d = bkDataMentah(),
    o = { v: 1, item: Array.isArray(d.item) ? d.item : [] };
  Object.keys(d).forEach(function (k) {
    if (k !== 'item' && k !== 'v') o[k] = d[k];
  });
  o.tgt = Object.assign({}, o.tgt || {});
  if (n > 0) o.tgt[th] = n;
  else delete o.tgt[th];
  store.set(K_BK, o);
}
/* Buku lama di tab Lainnya dipindah ke kunci Readlist (sekali, juga setelah impor cadangan lama) */
function bkMigrasi(dLainnya) {
  if (!dLainnya || !Array.isArray(dLainnya.buku) || !dLainnya.buku.length) return;
  var ada = {},
    items = bkItemMentah().slice();
  items.forEach(function (x) {
    if (x && x.id) ada[x.id] = 1;
  });
  dLainnya.buku.forEach(function (x) {
    if (x && typeof x.id === 'string' && !ada[x.id]) items.push(x);
  });
  bkSimpanItem(items);
  var sisa = {};
  Object.keys(dLainnya).forEach(function (k) {
    if (k !== 'buku') sisa[k] = dLainnya[k];
  });
  store.set(K_GL, sisa);
}
function bkCari(id) {
  return (
    glSemua().buku.filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function bkUkuranOk(x) {
  if (typeof gtUkuranByte === 'function' && gtUkuranByte(x) > BK_KARTU_RUANG) {
    toast('Buku ini sudah terlalu besar. Hapus beberapa kutipan dulu.');
    return false;
  }
  return true;
}
function bkUbah(id, f) {
  var o = glSemua(),
    hasil = null,
    gagal = false;
  o.buku = o.buku.map(function (x) {
    if (x.id !== id) return x;
    var z = Object.assign({}, x);
    z.bk = JSON.parse(JSON.stringify(x.bk || {}));
    f(z);
    z.bk = bkSah(z.bk);
    z.diubah = Date.now();
    if (!bkUkuranOk(z)) {
      gagal = true;
      return x;
    }
    hasil = z;
    return z;
  });
  if (hasil && !gagal) glSimpanSemua(o);
  return gagal ? null : hasil;
}

/* ---------- Google Books ---------- */
/* Google Books: lewat Worker bila siap (key disimpan di Worker); bila tidak / gagal, langsung tanpa key (kuota umum Google) */
function bkLangsung(jalur, q) {
  var s = Object.keys(q || {})
    .map(function (n) {
      return n + '=' + encodeURIComponent(q[n]);
    })
    .join('&');
  return fetch('https://www.googleapis.com/books/v1/' + jalur + (s ? '?' + s : '')).then(function (r) {
    return r
      .json()
      .catch(function () {
        return {};
      })
      .then(function (j) {
        if (!r.ok) {
          var e = new Error((j.error && j.error.message) || 'HTTP ' + r.status);
          e.status = r.status;
          throw e;
        }
        return j;
      });
  });
}
function bkApi(jalur, q) {
  q = q || {};
  if (typeof glApiSiap === 'function' && glApiSiap())
    return glApi('books', jalur, q).catch(function () {
      return bkLangsung(jalur, q);
    });
  return bkLangsung(jalur, q);
}
function bkTeksPolos(html) {
  if (!html) return '';
  try {
    return (
      new DOMParser().parseFromString(
        '<div>' +
          String(html)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n') +
          '</div>',
        'text/html'
      ).body.textContent || ''
    )
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (e) {
    return String(html).replace(/<[^>]*>/g, '');
  }
}
function bkDariVolume(v) {
  var i = v.volumeInfo || {},
    isbn = '';
  (i.industryIdentifiers || []).forEach(function (x) {
    if (x.type === 'ISBN_13') isbn = x.identifier;
  });
  if (!isbn)
    (i.industryIdentifiers || []).forEach(function (x) {
      if (x.type === 'ISBN_10' && !isbn) isbn = x.identifier;
    });
  var th = +String(i.publishedDate || '').slice(0, 4) || 0;
  return {
    a: String(i.title || 'Tanpa judul') + (i.subtitle && String(i.title || '').length < 60 ? ': ' + i.subtitle : ''),
    b: (i.authors || []).join(', '),
    bk: bkSah({
      g: v.id,
      isbn: isbn.replace(/[^0-9X]/g, ''),
      th: th,
      hal: i.pageCount || i.printedPageCount,
      pnb: i.publisher,
      kat: (i.categories || [])[0],
      bhs: i.language
    })
  };
}
function bkVolume(g) {
  if (bkCache[g]) return Promise.resolve(bkCache[g]);
  return bkApi('volumes/' + encodeURIComponent(g), {}).then(function (v) {
    bkCache[g] = v;
    return v;
  });
}

/* ---------- Sampul ---------- */
function bkSampulUrl(bk) {
  var L = [];
  if (bk.g) L.push('https://books.google.com/books/content?id=' + bk.g + '&printsec=frontcover&img=1&zoom=1');
  if (bk.isbn) L.push('https://covers.openlibrary.org/b/isbn/' + bk.isbn + '-M.jpg?default=false');
  return L;
}
function bkSampulHtml(x, opsi) {
  opsi = opsi || {};
  var bk = x.bk || {},
    L = bkSampulUrl(bk),
    h = '<span class="bk-sampul' + (L.length ? '' : ' kosong') + '">';
  if (L.length) h += '<img src="' + esc(L[0]) + '" data-alt="' + esc(L.slice(1).join(' ')) + '" alt="" loading="lazy" decoding="async">';
  h += '<span class="bk-sampul-j">' + esc(x.a) + '</span>' + (x.b ? '<span class="bk-sampul-p">' + esc(x.b) + '</span>' : '');
  if (!opsi.polos) {
    if (x.s) h += '<span class="bk-st bk-st-' + x.s + '">' + BK_IK[x.s] + '</span>';
    if (x.s === 'sedang' && bk.hal)
      h += '<span class="bk-mj"><i style="width:' + Math.min(100, Math.round(((bk.hl || 0) / bk.hal) * 100)) + '%"></i></span>';
  }
  return h + '</span>';
}
function bkSampulGanti(img) {
  var alt = (img.getAttribute('data-alt') || '').split(' ').filter(Boolean);
  if (alt.length) {
    img.setAttribute('data-alt', alt.slice(1).join(' '));
    img.src = alt[0];
  } else {
    var p = img.parentNode;
    p.classList.add('kosong');
    img.remove();
  }
}
document.addEventListener(
  'error',
  function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('bk-sampul'))
      bkSampulGanti(t);
  },
  true
);
/* Google Books memberi gambar "tidak tersedia" kecil, bukan galat */
document.addEventListener(
  'load',
  function (e) {
    var t = e.target;
    if (
      t &&
      t.tagName === 'IMG' &&
      t.parentNode &&
      t.parentNode.classList &&
      t.parentNode.classList.contains('bk-sampul') &&
      t.naturalWidth <= 2
    )
      bkSampulGanti(t);
  },
  true
);

var BK_IK = {
  ingin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  sedang:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  selesai: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  berhenti:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  scan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>',
  gambar:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
  mata: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  toko: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12zM6 6L5 3H2"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
  cocok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  jam: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  bintang:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  pola: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
  hapus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  senter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6l-1 7h-4zM10 9h4v13h-4z"/></svg>',
  ketik:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h0M10 10h0M14 10h0M18 10h0M7 14h10"/></svg>'
};

/* ---------- Statistik ---------- */
function bkSemuaSesi(L) {
  var m = {};
  L.forEach(function (x) {
    ((x.bk && x.bk.ss) || []).forEach(function (s) {
      m[s[0]] = (m[s[0]] || 0) + s[1];
    });
  });
  return m;
}
function bkRentetan(m) {
  var n = 0,
    i = m[bkHariIni()] ? 0 : 1;
  while (m[bkTglGeser(i)]) {
    n++;
    i++;
  }
  return n;
}
function bkKecepatan(bk) {
  var ss = bk.ss || [],
    jum = 0,
    hari = 14;
  ss.forEach(function (s) {
    for (var i = 0; i < 14; i++) if (s[0] === bkTglGeser(i)) jum += s[1];
  });
  if (bk.mulai) {
    var sejak = Math.floor((new Date(bkHariIni()) - new Date(bk.mulai)) / 864e5) + 1;
    if (sejak > 0 && sejak < hari) hari = sejak;
  }
  return jum ? jum / hari : 0;
}

/* ---------- Rak di halaman Readlist ---------- */
function bkRenderDaftar(box, semua, q) {
  var th = String(new Date().getFullYear()),
    tgt = bkTarget(th);
  var selesaiTh = semua.filter(function (x) {
    return x.s === 'selesai' && x.bk && (x.bk.selesai || '').slice(0, 4) === th;
  }).length;
  var sesi = bkSemuaSesi(semua),
    bln = bkHariIni().slice(0, 7),
    halBln = 0;
  Object.keys(sesi).forEach(function (t) {
    if (t.slice(0, 7) === bln) halBln += sesi[t];
  });
  var minggu = Math.max(0, Math.ceil((new Date(+th, 11, 31) - new Date()) / (7 * 864e5)));
  var h =
    '<div class="bk-target">' +
    (tgt
      ? '<div class="bk-target-kp"><b>Target ' +
        th +
        ': ' +
        selesaiTh +
        ' dari ' +
        tgt +
        ' buku</b><button type="button" id="bkTarget">Ubah</button></div><div class="bk-batang"><i style="width:' +
        Math.min(100, (selesaiTh / tgt) * 100) +
        '%"></i></div>'
      : '<div class="bk-target-kp"><b>' +
        selesaiTh +
        ' buku selesai di ' +
        th +
        '</b><button type="button" id="bkTarget">Atur target</button></div>') +
    '<div class="bk-stat"><div><b>' +
    bkRentetan(sesi) +
    ' hari</b><small>Rentetan baca</small></div><div><b>' +
    halBln +
    '</b><small>Halaman bulan ini</small></div>' +
    '<div>' +
    (tgt
      ? '<b>' + Math.max(0, tgt - selesaiTh) + '</b><small>Buku lagi · ' + minggu + ' minggu</small>'
      : '<b>' +
        semua.filter(function (x) {
          return x.s === 'selesai';
        }).length +
        '</b><small>Total selesai</small>') +
    '</div></div></div>';
  if (!semua.length) {
    box.innerHTML =
      h +
      '<div class="lg-kosong bk-kosong">' +
      BK_IK.sedang +
      '<p>Belum ada buku.<br>Ketuk <b>Tambah</b>, lalu cari judul atau scan barcode.</p></div>';
    return;
  }
  var sd = semua.filter(function (x) {
    return x.s === 'sedang';
  });
  if (sd.length && !q)
    h +=
      '<h3 class="lg-judul">Sedang dibaca</h3><div class="bk-sedang-list">' +
      sd
        .map(function (x) {
          var bk = x.bk || {},
            p = bk.hal ? Math.min(100, Math.round(((bk.hl || 0) / bk.hal) * 100)) : 0;
          return (
            '<div class="bk-sedang" data-bk="' +
            esc(x.id) +
            '" role="button" tabindex="0">' +
            bkSampulHtml(x, { polos: true }) +
            '<div class="bk-sedang-tx"><b>' +
            esc(x.a) +
            '</b>' +
            (x.b ? '<small>' + esc(x.b) + '</small>' : '') +
            '<span class="bk-batang kecil"><i style="width:' +
            p +
            '%"></i></span><span class="bk-pr"><span>hlm ' +
            (bk.hl || 0) +
            (bk.hal ? ' / ' + bk.hal : '') +
            '</span>' +
            (bk.hal ? '<span>' + p + '%</span>' : '') +
            '</span>' +
            '<button type="button" class="bk-plus" data-bk-plus="' +
            esc(x.id) +
            '">+ Halaman</button></div></div>'
          );
        })
        .join('') +
      '</div>';
  var n = function (s) {
    return semua.filter(function (x) {
      return x.s === s;
    }).length;
  };
  if (bkS && !n(bkS)) bkS = '';
  h +=
    '<h3 class="lg-judul">Rak buku</h3><div class="gp-filter gl-filter">' +
    [
      ['', 'Semua', semua.length],
      ['ingin', 'Ingin dibaca', n('ingin')],
      ['sedang', 'Sedang', n('sedang')],
      ['selesai', 'Selesai', n('selesai')],
      ['berhenti', 'Berhenti', n('berhenti')]
    ]
      .filter(function (c) {
        return !c[0] || c[2];
      })
      .map(function (c) {
        return (
          '<button type="button" data-bk-s="' +
          c[0] +
          '"' +
          (bkS === c[0] ? ' class="on"' : '') +
          '>' +
          c[1] +
          ' <small>' +
          c[2] +
          '</small></button>'
        );
      })
      .join('') +
    '</div>';
  var L = semua.filter(function (x) {
    return (!bkS || x.s === bkS) && (!q || (x.a + ' ' + x.b + ' ' + x.c + ' ' + ((x.bk && x.bk.isbn) || '')).toLowerCase().indexOf(q) >= 0);
  });
  if (bkUrut === 1)
    L.sort(function (a, b) {
      return a.a.localeCompare(b.a, 'id');
    });
  else if (bkUrut === 2)
    L.sort(function (a, b) {
      return (a.b || '~').localeCompare(b.b || '~', 'id');
    });
  else if (bkUrut === 3)
    L.sort(function (a, b) {
      return ((b.bk && b.bk.n) || 0) - ((a.bk && a.bk.n) || 0);
    });
  h +=
    '<div class="fm-urut"><span>' +
    L.length +
    ' buku</span><button type="button" id="bkUrut">' +
    FM_IK.urut +
    BK_URUT[bkUrut] +
    '</button></div>';
  if (!L.length) h += '<p class="gt-kosong">Tidak ada yang cocok.</p>';
  else
    h +=
      '<div class="bk-rak">' +
      L.slice(0, bkTampil)
        .map(function (x) {
          var bk = x.bk || {};
          return (
            '<button type="button" class="bk-kartu" data-bk="' +
            esc(x.id) +
            '">' +
            bkSampulHtml(x) +
            '<b>' +
            esc(x.a) +
            '</b><small>' +
            (bk.n ? '<span class="fm-nilai">★ ' + bk.n + '</span> · ' : '') +
            esc(x.b || (bk.th ? String(bk.th) : '')) +
            '</small></button>'
          );
        })
        .join('') +
      '</div>' +
      (L.length > bkTampil
        ? '<button type="button" class="btn ghost bk-lagi" id="bkLagi">Tampilkan lagi (' + (L.length - bkTampil) + ')</button>'
        : '');
  h += '<p class="fm-atribusi">Info buku dari Google Books</p>';
  box.innerHTML = h;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'buku') return;
  var el;
  if ((el = e.target.closest('[data-bk-plus]'))) {
    bkTanyaHal(el.dataset.bkPlus, function () {
      glRenderDaftar();
      renderGaleryTab();
    });
    return;
  }
  if ((el = e.target.closest('[data-bk-s]'))) {
    bkS = el.dataset.bkS;
    bkTampil = BK_HAL;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#bkUrut')) {
    bkUrut = (bkUrut + 1) % BK_URUT.length;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#bkLagi')) {
    bkTampil += BK_HAL;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#bkTarget')) {
    var th = String(new Date().getFullYear());
    bkMinta({
      judul: 'Target baca ' + th,
      teks: 'Berapa buku yang ingin kamu selesaikan tahun ini? Isi 0 untuk tanpa target.',
      nilai: bkTarget(th) || 12,
      maks: 999,
      ok: 'Simpan',
      cb: function (v) {
        bkSetTarget(th, v);
        glRenderDaftar();
        toast(v ? 'Target ' + th + ': ' + v + ' buku' : 'Target dihapus');
      }
    });
    return;
  }
  if (e.target.closest('#bkTambahBtn')) {
    bkCocok = null;
    bkCariQ = '';
    openLayer('page:buku-cari');
    return;
  }
  if ((el = e.target.closest('[data-bk]'))) openLayer('page:buku-detail:' + el.dataset.bk);
});
$('#subBody').addEventListener('keydown', function (e) {
  if (pageKind === 'galery-koleksi' && e.key === 'Enter' && e.target.matches('.bk-sedang')) e.target.click();
});

/* ---------- Kotak isian angka (halaman, target) ---------- */
function bkMinta(o) {
  bkMintaTutup();
  var w = document.createElement('div');
  w.className = 'bk-dlg';
  w.id = 'bkDlg';
  w.innerHTML =
    '<div class="bk-dlg-tirai" data-bkd="batal"></div><form class="bk-dlg-kotak" novalidate><h4>' +
    esc(o.judul) +
    '</h4>' +
    (o.teks ? '<p>' + esc(o.teks) + '</p>' : '') +
    '<input class="input" id="bkDlgIn" type="number" inputmode="numeric" min="0"' +
    (o.maks ? ' max="' + o.maks + '"' : '') +
    ' value="' +
    (o.nilai || '') +
    '" data-tanpa-hitung>' +
    '<div class="bk-dlg-dua"><button type="button" class="btn ghost" data-bkd="batal">Batal</button><button type="submit" class="btn primary">' +
    esc(o.ok || 'Simpan') +
    '</button></div></form>';
  w.addEventListener('click', function (e) {
    if (e.target.closest('[data-bkd="batal"]')) bkMintaTutupRiwayat();
  });
  w.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = Math.max(0, Math.floor(+$('#bkDlgIn').value || 0));
    if (o.maks) v = Math.min(o.maks, v);
    bkMintaTutupRiwayat();
    setTimeout(function () {
      o.cb(v);
    }, 30);
  });
  document.body.appendChild(w);
  try {
    history.pushState(history.state, '');
    bkLapisRiwayat = true;
  } catch (e) {
    bkLapisRiwayat = false;
  }
  setTimeout(function () {
    var i = $('#bkDlgIn');
    if (i) {
      i.focus();
      i.select();
    }
  }, 60);
}
var bkLapisRiwayat = false;
function bkMintaTutup() {
  var w = $('#bkDlg');
  if (w) w.remove();
}
function bkMintaTutupRiwayat() {
  if (bkLapisRiwayat) {
    bkLapisRiwayat = false;
    history.back();
  }
  bkMintaTutup();
  bkKameraTutup();
}
window.addEventListener('popstate', function () {
  bkLapisRiwayat = false;
  bkMintaTutup();
  bkKameraTutup();
});

/* ---------- Halaman & sesi baca ---------- */
function bkTanyaHal(id, lalu) {
  var x = bkCari(id);
  if (!x) return;
  var bk = x.bk || {};
  bkMinta({
    judul: 'Sampai halaman berapa?',
    teks: x.a + (bk.hal ? ' · ' + bk.hal + ' halaman' : ''),
    nilai: bk.hl || 0,
    maks: bk.hal || 99999,
    ok: 'Simpan',
    cb: function (v) {
      bkSetHal(id, v);
      if (lalu) lalu();
    }
  });
}
function bkSetHal(id, n) {
  var pesan = '';
  var z = bkUbah(id, function (x) {
    var bk = x.bk,
      lama = bk.hl || 0,
      hari = bkHariIni();
    n = Math.max(0, Math.floor(n));
    if (bk.hal) n = Math.min(bk.hal, n);
    var d = n - lama;
    bk.hl = n;
    bk.ss = bk.ss || [];
    var hIni = bk.ss.filter(function (s) {
      return s[0] === hari;
    })[0];
    if (d > 0) {
      if (hIni) hIni[1] += d;
      else bk.ss.unshift([hari, d]);
    } else if (d < 0 && hIni) {
      hIni[1] = Math.max(0, hIni[1] + d);
      if (!hIni[1])
        bk.ss = bk.ss.filter(function (s) {
          return s !== hIni;
        });
    }
    bk.ss.sort(function (a, b) {
      return a[0] < b[0] ? 1 : -1;
    });
    if (n > 0 && (x.s === 'ingin' || x.s === 'berhenti')) {
      x.s = 'sedang';
    }
    if (x.s === 'sedang' && !bk.mulai) bk.mulai = hari;
    if (bk.hal && n >= bk.hal && x.s !== 'selesai') {
      x.s = 'selesai';
      if (!bk.selesai) bk.selesai = hari;
      pesan = 'Selamat! "' + x.a.slice(0, 60) + '" selesai dibaca';
    } else pesan = (d >= 0 ? '+' : '') + d + ' halaman · sekarang hlm ' + n;
  });
  if (z) toast(pesan);
}

/* ---------- Halaman tambah / cari ---------- */
PAGES['buku-cari'] = function () {
  var cocok = bkCocok ? bkCari(bkCocok) : null;
  if (bkCocok && !cocok) bkCocok = null;
  $('#subTitle').textContent = cocok ? 'Cocokkan ke Google Books' : 'Tambah buku';
  var bisaScan = 'BarcodeDetector' in window;
  $('#subBody').innerHTML =
    '<div class="bk-cari">' +
    (cocok
      ? '<p class="lg-ket">Pilih buku yang sama dengan <b>' + esc(cocok.a) + '</b>. Kemajuan, kutipan, dan catatanmu tetap disimpan.</p>'
      : '') +
    '<label class="gt-cari fm-cari-kolom">' +
    GT_IKON_CARI +
    '<input type="search" id="bkQ" placeholder="Judul, penulis, atau ISBN" autocomplete="off" data-tanpa-hitung value="' +
    esc(bkCariQ) +
    '"></label>' +
    '<div class="bk-dua"><button type="button" id="bkScan">' +
    BK_IK.scan +
    'Scan barcode</button>' +
    '<label>' +
    BK_IK.gambar +
    'Upload barcode<input type="file" accept="image/*" id="bkUnggah" hidden></label></div>' +
    (bisaScan
      ? ''
      : '<p class="lg-ket bk-tanpa-scan">Browser ini belum bisa membaca barcode. Pakai Chrome di Android, atau ketik ISBN-nya.</p>') +
    '<div id="bkHasil" aria-live="polite"></div></div>';
  bkCariJalan();
  return true;
};
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'buku-cari' && e.target.id === 'bkQ') {
    bkCariQ = e.target.value;
    clearTimeout(bkCariT);
    bkCariT = setTimeout(bkCariJalan, 450);
  }
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind === 'buku-cari' && e.target.id === 'bkUnggah') {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) bkBacaGambar(f);
  }
});
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'buku-cari') return;
  var el;
  if (e.target.closest('#bkScan')) {
    bkKameraBuka();
    return;
  }
  if (e.target.closest('#bkManual')) {
    var q = /^[0-9X-]{10,17}$/i.test(bkCariQ.trim()) ? '' : bkCariQ.trim();
    back(1, function () {
      glItemId = null;
      glIsiA = q;
      openLayer('page:galery-koleksi-item');
    });
    return;
  }
  if ((el = e.target.closest('[data-bkc]'))) bkPilih(el.dataset.bkc);
});
function bkHasilKotak(h) {
  var b = $('#bkHasil');
  if (b && pageKind === 'buku-cari') b.innerHTML = h;
}
var bkHasilTerakhir = {};
function bkIsbnDari(q) {
  var d = String(q || '').replace(/[\s-]/g, '');
  return /^(97[89]\d{10}|\d{9}[\dX])$/i.test(d) ? d.toUpperCase() : '';
}
function bkCariJalan(judulIsbn) {
  var q = bkCariQ.trim(),
    no = ++bkCariNo;
  var manual = bkCocok ? '' : '<p class="fm-manual">Tidak ada yang cocok? <button type="button" id="bkManual">Tambah manual</button></p>';
  if (!q) {
    bkHasilKotak(
      '<p class="fm-manual">Ketik judul (mis. <b>laskar pelangi</b>), nama penulis, atau 13 angka ISBN. Bisa juga <b>scan barcode</b> di sampul belakang, atau <b>upload gambar barcode</b> dari internet.</p>' +
        manual
    );
    return;
  }
  var isbn = bkIsbnDari(q);
  bkHasilKotak('<div class="lg-muat"><i></i>' + (judulIsbn ? judulIsbn + ' Mencari buku…' : 'Mencari di Google Books…') + '</div>');
  bkApi('volumes', { q: isbn ? 'isbn:' + isbn : q, maxResults: 20, printType: 'books' })
    .then(function (j) {
      if (no !== bkCariNo) return;
      var punya = {};
      glSemua().buku.forEach(function (x) {
        if (x.bk && x.bk.g) punya[x.bk.g] = x.id;
        if (x.bk && x.bk.isbn) punya['i' + x.bk.isbn] = x.id;
      });
      var L = (j.items || []).filter(function (v) {
        return v && v.id;
      });
      bkHasilTerakhir = {};
      var kepala = judulIsbn ? '<p class="lg-ket bk-isbn-ok">' + judulIsbn + '</p>' : '';
      if (!L.length) {
        bkHasilKotak(
          kepala +
            '<p class="gt-kosong">' +
            (isbn ? 'Buku dengan ISBN ' + esc(isbn) + ' tidak ditemukan di Google Books.' : 'Tidak ditemukan di Google Books.') +
            '</p>' +
            manual
        );
        return;
      }
      bkHasilKotak(
        kepala +
          '<div class="fm-hasil">' +
          L.map(function (v) {
            var x = bkDariVolume(v),
              ada = punya[v.id] || (x.bk.isbn && punya['i' + x.bk.isbn]);
            bkHasilTerakhir[v.id] = v;
            var sub = [x.b, x.bk.th, x.bk.hal ? x.bk.hal + ' hlm' : '']
              .filter(Boolean)
              .map(function (s) {
                return esc(String(s));
              })
              .join(' · ');
            return (
              '<button type="button" class="fm-hasil-i" data-bkc="' +
              esc(v.id) +
              '">' +
              bkSampulHtml(x, { polos: true }) +
              '<span class="fm-hasil-tx"><b>' +
              esc(x.a) +
              '</b>' +
              (sub ? '<small>' + sub + '</small>' : '') +
              (x.bk.pnb ? '<small>' + esc(x.bk.pnb) + '</small>' : '') +
              (ada ? '<span class="fm-ada bk-ada">✓ Sudah di rak</span>' : '') +
              '</span>' +
              (ada ? '' : '<span class="fm-plus bk-plus-b">' + BK_IK.plus + '</span>') +
              '</button>'
            );
          }).join('') +
          '</div>' +
          manual
      );
    })
    .catch(function (err) {
      if (no !== bkCariNo) return;
      bkHasilKotak(
        '<p class="lg-salah">' +
          esc(err && /fetch/i.test(err.message) ? 'Tidak ada koneksi internet.' : (err && err.message) || 'Pencarian gagal.') +
          '</p>' +
          manual
      );
    });
}
var bkPilihJalan = false;
function bkPilih(g) {
  if (bkPilihJalan) return;
  var v = bkHasilTerakhir[g];
  if (!v) return;
  var x = bkDariVolume(v),
    o = glSemua();
  var ada = o.buku.filter(function (z) {
    return z.bk && (z.bk.g === g || (x.bk.isbn && z.bk.isbn === x.bk.isbn));
  })[0];
  if (ada && !bkCocok) {
    back(1, function () {
      openLayer('page:buku-detail:' + ada.id);
    });
    return;
  }
  if (ada && bkCocok && ada.id !== bkCocok) {
    toast('Buku ini sudah ada di rak');
    return;
  }
  var kini = Date.now(),
    tujuan;
  if (bkCocok) {
    tujuan = bkCocok;
    o.buku = o.buku.map(function (z) {
      if (z.id !== bkCocok) return z;
      var bk = Object.assign({}, z.bk || {}, {
        g: x.bk.g,
        isbn: x.bk.isbn,
        th: x.bk.th,
        hal: x.bk.hal || (z.bk || {}).hal,
        pnb: x.bk.pnb,
        kat: x.bk.kat,
        bhs: x.bk.bhs
      });
      return {
        id: z.id,
        a: x.a.slice(0, GL_A_MAKS),
        b: (x.b || z.b).slice(0, GL_B_MAKS),
        url: z.url,
        s: z.s,
        c: z.c,
        dibuat: z.dibuat,
        diubah: kini,
        bk: bkSah(bk)
      };
    });
  } else {
    if (o.buku.length >= BK_MAKS) {
      toast('Maksimal ' + BK_MAKS + ' buku');
      return;
    }
    tujuan = uid();
    o.buku.unshift({
      id: tujuan,
      a: x.a.slice(0, GL_A_MAKS),
      b: x.b.slice(0, GL_B_MAKS),
      url: '',
      s: 'ingin',
      c: '',
      dibuat: kini,
      diubah: kini,
      bk: Object.assign(x.bk, { hl: 0, fmt: 'cetak', mil: 'sendiri' })
    });
  }
  bkPilihJalan = true;
  glSimpanSemua(o);
  var c = bkCocok;
  bkCocok = null;
  var dariDetail = c && cur.layers.length >= 2 && cur.layers[cur.layers.length - 2] === 'page:buku-detail:' + c;
  back(1, function () {
    bkPilihJalan = false;
    renderGaleryTab();
    if (!dariDetail) openLayer('page:buku-detail:' + tujuan);
    toast(c ? 'Dicocokkan ke Google Books' : 'Ditambahkan ke Ingin dibaca');
  });
}

/* ---------- Barcode: kamera & gambar ---------- */
var bkStrim = null,
  bkPindai = null;
function bkDetektor() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    return new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  } catch (e) {
    return null;
  }
}
function bkDariBarcode(nilai, sumber) {
  var isbn = bkIsbnDari(nilai);
  if (!isbn) {
    toast('Barcode terbaca (' + nilai + '), tapi bukan ISBN buku');
    return false;
  }
  bkCariQ = isbn;
  var i = $('#bkQ');
  if (i) i.value = isbn;
  bkCariJalan('Barcode ' + (sumber === 'gambar' ? 'dari gambar ' : '') + 'terbaca: <b>' + isbn + '</b>.');
  return true;
}
function bkBacaGambar(f) {
  var det = bkDetektor();
  if (!det) {
    toast('Browser ini belum bisa membaca barcode. Ketik ISBN-nya.');
    return;
  }
  bkHasilKotak('<div class="lg-muat"><i></i>Membaca barcode dari gambar…</div>');
  createImageBitmap(f)
    .then(function (bmp) {
      return det.detect(bmp);
    })
    .then(function (r) {
      var ok =
        (r || [])
          .map(function (b) {
            return b.rawValue;
          })
          .filter(bkIsbnDari)[0] ||
        (r && r[0] && r[0].rawValue);
      if (!ok) {
        bkHasilKotak(
          '<p class="lg-salah">Barcode tidak terbaca di gambar itu. Coba gambar yang lebih jelas dan lurus, atau ketik ISBN-nya.</p>'
        );
        return;
      }
      if (!bkDariBarcode(ok, 'gambar')) bkCariJalan();
    })
    .catch(function () {
      bkHasilKotak('<p class="lg-salah">Gambar tidak bisa dibaca.</p>');
    });
}
function bkKameraBuka() {
  var det = bkDetektor();
  if (!det) {
    toast('Browser ini belum bisa scan barcode. Pakai Chrome di Android, atau ketik ISBN.');
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('Kamera tidak tersedia');
    return;
  }
  bkKameraTutup();
  var w = document.createElement('div');
  w.className = 'bk-kamera';
  w.id = 'bkKamera';
  w.innerHTML =
    '<video id="bkVid" playsinline muted autoplay></video><div class="bk-kamera-bingkai"><span class="bk-kamera-garis"></span></div>' +
    '<div class="bk-kamera-atas"><button type="button" data-bkk="tutup" aria-label="Tutup">' +
    BK_IK.tutup +
    '</button><button type="button" data-bkk="senter" id="bkSenter" aria-label="Senter" hidden>' +
    BK_IK.senter +
    '</button></div>' +
    '<div class="bk-kamera-bawah"><p id="bkKamKet">Arahkan kamera ke barcode di sampul belakang buku</p><div>' +
    '<label>' +
    BK_IK.gambar +
    'Dari galeri<input type="file" accept="image/*" id="bkUnggah2" hidden></label>' +
    '<button type="button" data-bkk="ketik">' +
    BK_IK.ketik +
    'Ketik ISBN</button></div></div>';
  w.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bkk]');
    if (!b) return;
    if (b.dataset.bkk === 'tutup') bkMintaTutupRiwayat();
    else if (b.dataset.bkk === 'ketik') {
      bkMintaTutupRiwayat();
      setTimeout(function () {
        var i = $('#bkQ');
        if (i) {
          i.value = '';
          bkCariQ = '';
          i.placeholder = 'Ketik 13 angka ISBN';
          i.focus();
        }
      }, 120);
    } else if (b.dataset.bkk === 'senter' && bkStrim) {
      var tr = bkStrim.getVideoTracks()[0],
        on = !b.classList.contains('on');
      tr.applyConstraints({ advanced: [{ torch: on }] })
        .then(function () {
          b.classList.toggle('on', on);
        })
        .catch(function () {
          toast('Senter tidak bisa dinyalakan');
        });
    }
  });
  w.querySelector('#bkUnggah2').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    bkMintaTutupRiwayat();
    setTimeout(function () {
      bkBacaGambar(f);
    }, 120);
  });
  document.body.appendChild(w);
  try {
    history.pushState(history.state, '');
    bkLapisRiwayat = true;
  } catch (e) {
    bkLapisRiwayat = false;
  }
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
    .then(function (s) {
      if (!$('#bkKamera')) {
        s.getTracks().forEach(function (t) {
          t.stop();
        });
        return;
      }
      bkStrim = s;
      var v = $('#bkVid');
      v.srcObject = s;
      var tr = s.getVideoTracks()[0],
        cap = tr.getCapabilities ? tr.getCapabilities() : {};
      if (cap.torch) $('#bkSenter').hidden = false;
      var sibuk = false;
      bkPindai = setInterval(function () {
        if (sibuk || !v.videoWidth) return;
        sibuk = true;
        det
          .detect(v)
          .then(function (r) {
            sibuk = false;
            var nilai = (r || [])
              .map(function (b) {
                return b.rawValue;
              })
              .filter(bkIsbnDari)[0];
            if (nilai) {
              if (navigator.vibrate)
                try {
                  navigator.vibrate(40);
                } catch (x) {}
              bkMintaTutupRiwayat();
              setTimeout(function () {
                bkDariBarcode(nilai, 'kamera');
              }, 120);
            } else if (r && r[0]) {
              var k = $('#bkKamKet');
              if (k) k.textContent = 'Barcode terbaca, tapi bukan ISBN buku. Cari barcode yang diawali 978 atau 979.';
            }
          })
          .catch(function () {
            sibuk = false;
          });
      }, 280);
    })
    .catch(function (err) {
      var k = $('#bkKamKet');
      if (k)
        k.textContent =
          err && err.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser, atau pakai Dari galeri.'
            : 'Kamera tidak bisa dibuka. Pakai Dari galeri atau Ketik ISBN.';
    });
}
function bkKameraTutup() {
  clearInterval(bkPindai);
  bkPindai = null;
  if (bkStrim) {
    bkStrim.getTracks().forEach(function (t) {
      t.stop();
    });
    bkStrim = null;
  }
  var w = $('#bkKamera');
  if (w) w.remove();
}

/* ---------- Halaman detail ---------- */
function bkIdHalaman() {
  var L = layerOf('page');
  return L ? L.name.split(':').slice(2).join(':') : '';
}
PAGES['buku-detail'] = function () {
  var x = bkCari(bkIdHalaman());
  if (!x) return false;
  $('#subTitle').textContent = x.a;
  bkRenderDetail(x);
  var bk = x.bk || {};
  if (bk.g && !bkCache[bk.g]) {
    var id = x.id;
    bkVolume(bk.g)
      .then(function () {
        if (pageKind === 'buku-detail' && bkIdHalaman() === id) {
          var y = bkCari(id);
          if (y) bkRenderDetail(y, true);
        }
      })
      .catch(function () {
        var t = $('#bkTentang');
        if (t) t.innerHTML = '<p class="fm-sinopsis kosong">Info dari Google Books tidak bisa diambil. Periksa koneksi internet.</p>';
      });
  }
  return true;
};
function bkRenderDetail(x, ulang) {
  var bk = x.bk || {},
    v = bk.g ? bkCache[bk.g] : null,
    vi = (v && v.volumeInfo) || {},
    y = ulang ? $('#subBody').scrollTop : 0;
  var hal = bk.hal || 0,
    hl = bk.hl || 0,
    p = hal ? Math.min(100, Math.round((hl / hal) * 100)) : 0;
  var meta = [bk.th, hal ? hal + ' halaman' : '', bk.kat].filter(Boolean),
    meta2 = [bk.pnb, bk.isbn ? 'ISBN ' + bk.isbn : ''].filter(Boolean);
  var h =
    '<div class="bk-det"><div class="bk-det-grid"><div class="bk-det-kiri"><div class="bk-det-atas">' +
    bkSampulHtml(x, { polos: true }) +
    '<div class="bk-det-tx"><h2>' +
    esc(x.a) +
    '</h2>' +
    (x.b ? '<p>' + esc(x.b) + '</p>' : '') +
    (meta.length
      ? '<div class="bk-meta">' +
        meta
          .map(function (s) {
            return '<span>' + esc(String(s)) + '</span>';
          })
          .join('') +
        '</div>'
      : '') +
    (meta2.length
      ? '<div class="bk-meta">' +
        meta2
          .map(function (s) {
            return '<span>' + esc(String(s)) + '</span>';
          })
          .join('') +
        '</div>'
      : '') +
    '</div></div>';
  h +=
    '<div class="fm-tombol bk-tombol">' +
    (bk.g
      ? '<button type="button" id="bkSampel">' +
        BK_IK.mata +
        'Baca sampel</button><button type="button" id="bkToko">' +
        BK_IK.toko +
        'Cari di toko</button>'
      : '<button type="button" id="bkEditInfo">' +
        BK_IK.edit +
        'Ubah info</button><button type="button" id="bkCocokBtn">' +
        BK_IK.cocok +
        'Cocokkan ke Google Books</button>') +
    '</div>';
  /* Bacaanku */
  h +=
    '<section class="fm-bag"><h3>Bacaanku</h3><div class="fm-kartu-p"><div class="bk-status" role="radiogroup">' +
    ['ingin', 'sedang', 'selesai', 'berhenti']
      .map(function (s) {
        return (
          '<button type="button" role="radio" aria-checked="' +
          (x.s === s) +
          '" data-bks="' +
          s +
          '" class="bk-s-' +
          s +
          (x.s === s ? ' on' : '') +
          '">' +
          BK_IK[s] +
          BK_ST_PENDEK[s] +
          '</button>'
        );
      })
      .join('') +
    '</div>';
  if (x.s !== 'ingin') {
    var sisa = hal ? Math.max(0, hal - hl) : 0,
      laju = bkKecepatan(bk);
    h +=
      '<div class="bk-maju"><div class="bk-angka"><b>' +
      (hal ? p + '%' : 'hlm ' + hl) +
      ' <small>' +
      (hal ? '· hlm ' + hl + ' / ' : '') +
      '<button type="button" id="bkUbahTotal">' +
      (hal ? hal : 'atur jumlah halaman') +
      '</button></small></b><span>' +
      (x.s === 'selesai' ? 'Tamat' : hal ? sisa + ' hlm lagi' : '') +
      '</span></div>' +
      (hal ? '<div class="bk-batang"><i style="width:' + p + '%"></i></div>' : '');
    if (x.s === 'sedang') {
      h +=
        '<div class="bk-cepat"><button type="button" data-bkt="10">+10</button><button type="button" data-bkt="25">+25</button><button type="button" class="utama" id="bkKeHal">Ke hlm…</button></div>';
      if (laju && sisa) {
        var t = new Date();
        t.setDate(t.getDate() + Math.ceil(sisa / laju));
        h +=
          '<p class="bk-perkiraan">' +
          BK_IK.jam +
          '<span>Rata-rata <b>' +
          Math.round(laju) +
          ' hlm/hari</b> belakangan ini. Dengan kecepatan ini selesai sekitar <b>' +
          t.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: t.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          }) +
          '</b>.</span></p>';
      }
    }
    h +=
      '<div class="bk-tgl2"><label>Mulai<input type="date" id="bkMulai" value="' +
      esc(bk.mulai || '') +
      '" max="' +
      bkHariIni() +
      '"></label><label>Selesai<input type="date" id="bkSelesai" value="' +
      esc(bk.selesai || '') +
      '" max="' +
      bkHariIni() +
      '"' +
      (x.s === 'selesai' ? '' : ' disabled') +
      '></label></div></div>';
  }
  h += '</div></section>';
  /* Sesi */
  var ss = bk.ss || [];
  if (ss.length) {
    var m = {};
    ss.forEach(function (s) {
      m[s[0]] = s[1];
    });
    h +=
      '<section class="fm-bag"><h3>Sesi baca</h3><div class="fm-kartu-p"><div class="bk-runtun">' +
      [6, 5, 4, 3, 2, 1, 0]
        .map(function (n) {
          var tg = bkTglGeser(n),
            vv = m[tg] || 0,
            d = new Date(tg + 'T00:00');
          return (
            '<div><i class="' +
            (vv ? 'on' + (vv < 15 ? ' t1' : vv < 30 ? ' t2' : '') : '') +
            '" title="' +
            vv +
            ' halaman"></i>' +
            d.toLocaleDateString('id-ID', { weekday: 'short' }) +
            '</div>'
          );
        })
        .join('') +
      '</div>' +
      '<div class="bk-sesi">' +
      ss
        .slice(0, 6)
        .map(function (s) {
          var lbl =
            s[0] === bkHariIni()
              ? 'Hari ini'
              : s[0] === bkTglGeser(1)
                ? 'Kemarin'
                : new Date(s[0] + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          return '<div><span>' + lbl + '</span><b>+' + s[1] + ' hlm</b></div>';
        })
        .join('') +
      '</div>' +
      (ss.length > 6
        ? '<p class="bk-sesi-total">' +
          ss.length +
          ' hari membaca · ' +
          ss.reduce(function (a, s) {
            return a + s[1];
          }, 0) +
          ' halaman tercatat</p>'
        : '') +
      '</div></section>';
  }
  h += '</div><div class="bk-det-kanan">';
  /* Kutipan */
  var kt = bk.kt || [];
  h +=
    '<section class="fm-bag"><h3 class="bk-h3">Kutipan & catatan <button type="button" id="bkKtTambah">' +
    BK_IK.plus +
    'Tambah</button></h3>' +
    '<div class="bk-kt-form" id="bkKtForm" hidden><div class="bk-kt-jen"><button type="button" data-bkfk="1"' +
    (bkFormK ? ' class="on"' : '') +
    '>Kutipan</button><button type="button" data-bkfk="0"' +
    (!bkFormK ? ' class="on"' : '') +
    '>Catatanku</button></div>' +
    '<textarea class="input" id="bkKtTeks" rows="3" maxlength="' +
    BK_KT_T +
    '" placeholder="' +
    (bkFormK ? 'Tulis kalimat dari buku…' : 'Tulis pelajaran atau pikiranmu…') +
    '"></textarea>' +
    '<div class="bk-kt-bw"><input class="input" id="bkKtHal" type="number" inputmode="numeric" min="0" placeholder="Hlm" value="' +
    (hl || '') +
    '" data-tanpa-hitung><button type="button" class="btn ghost" id="bkKtBatal">Batal</button><button type="button" class="btn primary" id="bkKtSimpan">Simpan</button></div></div>' +
    (kt.length
      ? kt
          .map(function (q) {
            return (
              '<div class="bk-kt' +
              (q.k ? '' : ' catatan') +
              '"><p>' +
              esc(q.t) +
              '</p><div class="bk-kt-bwh"><small>' +
              (q.k ? 'Kutipan' : 'Catatanku') +
              (q.h ? ' · hlm ' + q.h : '') +
              '</small>' +
              '<span><button type="button" data-bkpola="' +
              esc(q.i) +
              '">' +
              BK_IK.pola +
              'Jadikan Pola Pikir</button><button type="button" class="bk-kt-hapus" data-bkkthapus="' +
              esc(q.i) +
              '" aria-label="Hapus">' +
              BK_IK.hapus +
              '</button></span></div></div>'
            );
          })
          .join('')
      : '<p class="fm-tidak bk-kt-kosong">Belum ada. Simpan kalimat yang menyentuh atau pelajaran yang kamu dapat.</p>') +
    '</section>';
  /* Nilai */
  if (x.s === 'selesai')
    h +=
      '<section class="fm-bag"><h3>Nilai & ulasan</h3><div class="fm-kartu-p"><div class="fm-bintang bk-bintang"><span>Nilai saya</span>' +
      [1, 2, 3, 4, 5]
        .map(function (n) {
          return (
            '<button type="button" data-bkn="' +
            n +
            '" class="' +
            ((bk.n || 0) >= n ? 'on' : '') +
            '" aria-label="' +
            n +
            ' bintang">' +
            BK_IK.bintang +
            '</button>'
          );
        })
        .join('') +
      '</div>' +
      '<textarea class="input bk-ulasan" id="bkUlasan" rows="3" maxlength="' +
      BK_UL_T +
      '" placeholder="Ulasan singkat…">' +
      esc(bk.ul || '') +
      '</textarea></div></section>';
  /* Bukuku */
  h +=
    '<section class="fm-bag"><h3>Bukuku</h3><div class="fm-kartu-p"><div class="bk-lbl">Format</div><div class="bk-pil">' +
    BK_FMT.map(function (f) {
      return (
        '<button type="button" data-bkfmt="' + f[0] + '"' + ((bk.fmt || 'cetak') === f[0] ? ' class="on"' : '') + '>' + f[1] + '</button>'
      );
    }).join('') +
    '</div>' +
    '<div class="bk-lbl">Kepemilikan</div><div class="bk-pil">' +
    BK_MIL.map(function (f) {
      return (
        '<button type="button" data-bkmil="' + f[0] + '"' + ((bk.mil || 'sendiri') === f[0] ? ' class="on"' : '') + '>' + f[1] + '</button>'
      );
    }).join('') +
    '</div>' +
    (bk.mil === 'pinjam'
      ? '<input class="input bk-pinjam" id="bkPinjam" maxlength="80" placeholder="Pinjam dari siapa?" value="' +
        esc(bk.pj || '') +
        '" autocomplete="off">'
      : '') +
    '</div></section>';
  /* Tentang */
  h += '<section class="fm-bag" id="bkTentang"><h3>Tentang buku</h3>';
  if (bk.g && !v) h += '<div class="lg-muat"><i></i>Mengambil info dari Google Books…</div>';
  else {
    var des = bkTeksPolos(vi.description);
    h += des
      ? '<p class="fm-sinopsis pendek bk-des" id="bkDes">' +
        esc(des) +
        '</p><button type="button" class="fm-lagi" id="bkDesLagi" hidden>Selengkapnya</button>'
      : '<p class="fm-sinopsis kosong">Belum ada deskripsi.</p>';
    var bhs = '';
    try {
      bhs = vi.language || bk.bhs ? new Intl.DisplayNames(['id'], { type: 'language' }).of(vi.language || bk.bhs) : '';
    } catch (e) {
      bhs = vi.language || bk.bhs || '';
    }
    var info = [
      ['Penerbit', vi.publisher || bk.pnb],
      ['Terbit', vi.publishedDate || bk.th],
      ['Bahasa', bhs],
      ['Kategori', (vi.categories || []).slice(0, 2).join(', ') || bk.kat]
    ].filter(function (r) {
      return r[1];
    });
    if (info.length)
      h +=
        '<dl class="fm-info">' +
        info
          .map(function (r) {
            return '<dt>' + r[0] + '</dt><dd>' + esc(String(r[1])) + '</dd>';
          })
          .join('') +
        '</dl>';
    if (x.c) h += '<p class="bk-cat-lama"><b>Catatan:</b> ' + esc(x.c) + '</p>';
  }
  h +=
    '</section><button type="button" class="se-hapus fm-hapus" id="bkHapus">' +
    BK_IK.hapus +
    'Hapus dari rak</button>' +
    '<p class="fm-tmdb">' +
    (bk.g ? 'Info buku dari Google Books · Sampul cadangan dari Open Library' : 'Buku diisi manual') +
    '</p></div></div></div>';
  $('#subBody').innerHTML = h;
  var d = $('#bkDes');
  if (d && d.scrollHeight > d.clientHeight + 4) $('#bkDesLagi').hidden = false;
  if (ulang) $('#subBody').scrollTop = y;
}
function bkKini() {
  return bkCari(bkIdHalaman());
}
function bkRenderUlang() {
  var x = bkKini();
  if (x) bkRenderDetail(x, true);
}
function bkBukaUrl(u) {
  window.open(u, '_blank', 'noopener');
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'buku-detail') return;
  var x = bkKini();
  if (!x) return;
  var el,
    bk = x.bk || {},
    id = x.id;
  if (e.target.closest('#bkDesLagi')) {
    var d = $('#bkDes');
    d.classList.toggle('pendek');
    e.target.textContent = d.classList.contains('pendek') ? 'Selengkapnya' : 'Ringkas';
    return;
  }
  if (e.target.closest('#bkSampel')) {
    var v = bkCache[bk.g],
      ai = (v && v.accessInfo) || {},
      vi = (v && v.volumeInfo) || {};
    bkBukaUrl(ai.webReaderLink || vi.previewLink || 'https://books.google.com/books?id=' + bk.g);
    return;
  }
  if (e.target.closest('#bkToko')) {
    bkMenuToko(x);
    return;
  }
  if (e.target.closest('#bkEditInfo')) {
    glBukaJenis = 'buku';
    glItemId = id;
    openLayer('page:galery-koleksi-item');
    return;
  }
  if (e.target.closest('#bkCocokBtn')) {
    bkCocok = id;
    bkCariQ = x.a;
    openLayer('page:buku-cari');
    return;
  }
  if ((el = e.target.closest('[data-bks]'))) {
    var st = el.dataset.bks;
    if (st === x.s) return;
    bkUbah(id, function (z) {
      z.s = st;
      var b = z.bk,
        hari = bkHariIni();
      if ((st === 'sedang' || st === 'selesai') && !b.mulai) b.mulai = hari;
      if (st === 'selesai') {
        if (b.hal) b.hl = b.hal;
        if (!b.selesai) b.selesai = hari;
      }
    });
    toast('Status: ' + BK_ST[st]);
    bkRenderUlang();
    renderGaleryTab();
    return;
  }
  if ((el = e.target.closest('[data-bkt]'))) {
    bkSetHal(id, (bk.hl || 0) + +el.dataset.bkt);
    bkRenderUlang();
    return;
  }
  if (e.target.closest('#bkKeHal')) {
    bkTanyaHal(id, bkRenderUlang);
    return;
  }
  if (e.target.closest('#bkUbahTotal')) {
    bkMinta({
      judul: 'Jumlah halaman buku',
      teks: x.a,
      nilai: bk.hal || '',
      maks: 99999,
      ok: 'Simpan',
      cb: function (n) {
        bkUbah(id, function (z) {
          if (n > 0) z.bk.hal = n;
          else delete z.bk.hal;
          if (z.bk.hal && (z.bk.hl || 0) > z.bk.hal) z.bk.hl = z.bk.hal;
        });
        bkRenderUlang();
      }
    });
    return;
  }
  if ((el = e.target.closest('[data-bkn]'))) {
    var n = +el.dataset.bkn;
    bkUbah(id, function (z) {
      if (z.bk.n === n) delete z.bk.n;
      else z.bk.n = n;
    });
    bkRenderUlang();
    return;
  }
  if ((el = e.target.closest('[data-bkfmt]'))) {
    var f = el.dataset.bkfmt;
    bkUbah(id, function (z) {
      z.bk.fmt = f;
    });
    bkRenderUlang();
    return;
  }
  if ((el = e.target.closest('[data-bkmil]'))) {
    var mi = el.dataset.bkmil;
    bkUbah(id, function (z) {
      z.bk.mil = mi;
    });
    bkRenderUlang();
    return;
  }
  if (e.target.closest('#bkKtTambah')) {
    var fm = $('#bkKtForm');
    fm.hidden = false;
    $('#bkKtTeks').focus();
    return;
  }
  if ((el = e.target.closest('[data-bkfk]'))) {
    bkFormK = +el.dataset.bkfk;
    $$('#subBody [data-bkfk]').forEach(function (b) {
      b.classList.toggle('on', b === el);
    });
    $('#bkKtTeks').placeholder = bkFormK ? 'Tulis kalimat dari buku…' : 'Tulis pelajaran atau pikiranmu…';
    return;
  }
  if (e.target.closest('#bkKtBatal')) {
    $('#bkKtForm').hidden = true;
    $('#bkKtTeks').value = '';
    return;
  }
  if (e.target.closest('#bkKtSimpan')) {
    var t = $('#bkKtTeks').value.trim();
    if (!t) {
      toast('Tulis isinya dulu');
      $('#bkKtTeks').focus();
      return;
    }
    var hh = Math.max(0, Math.floor(+$('#bkKtHal').value || 0)),
      k = bkFormK;
    if ((bk.kt || []).length >= BK_KT_MAKS) {
      toast('Maksimal ' + BK_KT_MAKS + ' kutipan per buku');
      return;
    }
    if (
      bkUbah(id, function (z) {
        z.bk.kt = [{ i: uid(), k: k, t: t.slice(0, BK_KT_T), h: hh, w: Date.now() }].concat(z.bk.kt || []);
      })
    ) {
      toast(k ? 'Kutipan disimpan' : 'Catatan disimpan');
      bkRenderUlang();
    }
    return;
  }
  if ((el = e.target.closest('[data-bkkthapus]'))) {
    var qi = el.dataset.bkkthapus,
      q = (bk.kt || []).filter(function (z) {
        return z.i === qi;
      })[0];
    if (!q) return;
    askConfirm({
      title: 'Hapus ' + (q.k ? 'kutipan' : 'catatan') + '?',
      text: '"' + q.t.slice(0, 80) + (q.t.length > 80 ? '…' : '') + '" dihapus dari buku ini.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          bkUbah(id, function (z) {
            z.bk.kt = (z.bk.kt || []).filter(function (w) {
              return w.i !== qi;
            });
          });
          bkRenderUlang();
          toast('Dihapus');
        });
      }
    });
    return;
  }
  if ((el = e.target.closest('[data-bkpola]'))) {
    var qp = (bk.kt || []).filter(function (z) {
      return z.i === el.dataset.bkpola;
    })[0];
    if (!qp || typeof gpIsiAwal === 'undefined') return;
    gpIsiAwal = { teks: qp.t, asal: ['Buku', x.a + (qp.h ? ' (hlm ' + qp.h + ')' : '')] };
    openLayer('page:pola-form:');
    return;
  }
  if (e.target.closest('#bkHapus')) {
    askConfirm({
      title: 'Hapus buku?',
      text: '"' + x.a.slice(0, 80) + '" beserta kemajuan, sesi baca, kutipan, dan catatanmu dihapus dari Readlist.',
      ok: 'Hapus',
      action: function () {
        back(2, function () {
          var o = glSemua();
          o.buku = o.buku.filter(function (z) {
            return z.id !== id;
          });
          glSimpanSemua(o);
          renderGaleryTab();
          if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
          toast('Buku dihapus');
        });
      }
    });
  }
});
var bkKetikT = null;
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'buku-detail') return;
  var t = e.target,
    id = bkIdHalaman();
  if (t.id === 'bkUlasan') {
    var v = t.value;
    clearTimeout(bkKetikT);
    bkKetikT = setTimeout(function () {
      bkUbah(id, function (z) {
        z.bk.ul = v.replace(/\s+$/, '');
      });
    }, 600);
  }
  if (t.id === 'bkPinjam') {
    var p = t.value;
    clearTimeout(bkKetikT);
    bkKetikT = setTimeout(function () {
      bkUbah(id, function (z) {
        z.bk.pj = p.trim();
      });
    }, 600);
  }
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'buku-detail') return;
  var t = e.target,
    id = bkIdHalaman();
  if (t.id === 'bkMulai' || t.id === 'bkSelesai') {
    var k = t.id === 'bkMulai' ? 'mulai' : 'selesai',
      v = bkTgl(t.value);
    bkUbah(id, function (z) {
      if (v) z.bk[k] = v;
      else delete z.bk[k];
    });
    renderGaleryTab();
  }
  if (t.id === 'bkUlasan') {
    clearTimeout(bkKetikT);
    var u = t.value;
    bkUbah(id, function (z) {
      z.bk.ul = u.replace(/\s+$/, '');
    });
  }
  if (t.id === 'bkPinjam') {
    clearTimeout(bkKetikT);
    var p = t.value;
    bkUbah(id, function (z) {
      z.bk.pj = p.trim();
    });
  }
});
function bkMenuToko(x) {
  var bk = x.bk || {},
    q = encodeURIComponent(bk.isbn || x.a),
    qj = encodeURIComponent(x.a + (x.b ? ' ' + x.b : ''));
  var toko = [
    ['Google Play Books', 'https://play.google.com/store/search?c=books&q=' + q],
    ['Gramedia', 'https://www.gramedia.com/search?q=' + qj],
    ['Tokopedia', 'https://www.tokopedia.com/search?q=' + qj],
    ['Shopee', 'https://shopee.co.id/search?keyword=' + qj]
  ];
  lgMenuTutup();
  var m = document.createElement('div');
  m.className = 'lg-menu-wrap';
  m.id = 'lgMenu';
  m.innerHTML =
    '<div class="lg-menu-tirai" data-tk="tutup"></div><div class="lg-menu" role="menu"><div class="lg-menu-kp bk-menu-kp">' +
    bkSampulHtml(x, { polos: true }) +
    '<span><b>' +
    esc(x.a) +
    '</b><small>Cari di toko</small></span></div>' +
    toko
      .map(function (t, i) {
        return '<button type="button" role="menuitem" data-tk="' + i + '">' + BK_IK.toko + t[0] + '</button>';
      })
      .join('') +
    '</div>';
  m.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tk]');
    if (!b) return;
    lgMenuTutup();
    if (b.dataset.tk !== 'tutup') bkBukaUrl(toko[+b.dataset.tk][1]);
  });
  document.body.appendChild(m);
}
function bkSegarkan() {
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'buku') glRenderDaftar();
  else if (opened.page && pageKind === 'buku-detail') {
    var x = bkKini();
    if (x) bkRenderDetail(x, true);
  }
}
