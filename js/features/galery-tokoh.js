/* ============================================================
   Stivora — Galery · Lainnya · Tokoh Favorit (5.62.0)
   - Tiga jenis tokoh: 'pub' (publik, info dari Wikipedia), 'fik' (fiksi), 'dkt' (orang dekat, pribadi).
     Disimpan di 'stivora.galery.tokoh' = { v: 1, top: [bidang tambahan], item: [...] }
     (sinkron dipecah: 'tokoh-t-<id>' + 'tokoh-urutan'; ikut cadangan).
     Item: { id, a: nama, j, b: dikenal sebagai / hubungan, ka: dari karya (fiksi), u: link,
             wk: { k: judul halaman, l: 'id'|'en', d: deskripsi, x: ringkasan, img, lh: lahir, wf: wafat (YYYY-MM-DD / YYYY) },
             av: foto sendiri (JPEG kecil), top: [bidang], n: nilai, al: alasan, ar: arsip,
             ku: [{ i, t: kutipan, s: sumber }], ti: [{ i, t, m: mulai dijalankan (ms) }], pj: [{ i, y: tahun, t, c }],
             hub: { im: [id impian], bk: [id buku], fm: [id film], tp: [id tempat] }, dibuat, diubah }
     Channel ditautkan dari sisi Channel Favorit (item channel menyimpan tk = id tokoh).
   ============================================================ */
'use strict';

var K_TK = 'stivora.galery.tokoh';
var TK_MAKS = 2000,
  TK_KU_MAKS = 300,
  TK_TI_MAKS = 100,
  TK_PJ_MAKS = 200,
  TK_HUB_MAKS = 50,
  TK_RUANG = 300000,
  TK_AV_MAKS = 40000;
var TK_JENIS = { pub: { n: 'Publik', k: 'tk-pub' }, fik: { n: 'Fiksi', k: 'tk-fik' }, dkt: { n: 'Orang dekat', k: 'tk-dkt' } };
var TK_TOPIK = ['Bisnis', 'Teknologi', 'Agama', 'Pendidikan', 'Politik', 'Olahraga', 'Seni', 'Sains', 'Keluarga', 'Sejarah'];
var TK_WARNA = ['#7c3aed', '#2563eb', '#0d9488', '#16a34a', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#4f46e5', '#0f766e'];
var TK_HUB = {
  im: { n: 'Impian', w: '#7c3aed' },
  bk: { n: 'Buku', w: '#1fa463' },
  fm: { n: 'Film', w: '#ea580c' },
  ch: { n: 'Channel', w: '#e5484d' },
  tp: { n: 'Tempat', w: '#3b8beb' }
};
var tkF = '',
  tkT = '',
  tkS = 'aktif',
  tkGeser = 0,
  tkDraft = null,
  tkForm = null,
  tkCariNo = 0,
  tkCariT = null;

function tkStr(v, n) {
  return typeof v === 'string' ? v.slice(0, n) : '';
}
function tkUrl(u) {
  return typeof glUrlSah === 'function' ? glUrlSah(u) : '';
}
function tkTgl(v) {
  v = tkStr(v, 12);
  return /^-?\d{1,4}(-\d{2}-\d{2})?$/.test(v) ? v : '';
}
function tkIdOk(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
}
function tkSah(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.a) return null;
  var o = {
    id: x.id.slice(0, 64),
    a: tkStr(String(x.a), 100),
    j: TK_JENIS[x.j] ? x.j : 'pub',
    dibuat: +x.dibuat || 0,
    diubah: +x.diubah || +x.dibuat || 0
  };
  if (tkStr(x.b, 120).trim()) o.b = tkStr(x.b, 120);
  if (tkStr(x.ka, 120).trim()) o.ka = tkStr(x.ka, 120);
  if (tkUrl(x.u)) o.u = tkUrl(x.u);
  if (x.wk && typeof x.wk === 'object' && tkStr(x.wk.k, 300)) {
    var w = { k: tkStr(x.wk.k, 300), l: x.wk.l === 'en' ? 'en' : 'id' };
    if (tkStr(x.wk.d, 200)) w.d = tkStr(x.wk.d, 200);
    if (tkStr(x.wk.x, 1500)) w.x = tkStr(x.wk.x, 1500);
    var im = tkUrl(x.wk.img);
    if (im && im.length < 500 && /^https:\/\/upload\.wikimedia\.org\//.test(im)) w.img = im;
    if (tkTgl(x.wk.lh)) w.lh = tkTgl(x.wk.lh);
    if (tkTgl(x.wk.wf)) w.wf = tkTgl(x.wk.wf);
    o.wk = w;
  }
  if (typeof x.av === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x.av) && x.av.length <= TK_AV_MAKS) o.av = x.av;
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
  if (tkStr(x.al, 2000).trim()) o.al = tkStr(x.al, 2000);
  if (x.ar) o.ar = 1;
  if (Array.isArray(x.ku))
    o.ku = x.ku
      .filter(function (k) {
        return k && tkStr(k.t, 1000).trim();
      })
      .slice(0, TK_KU_MAKS)
      .map(function (k) {
        var q = { i: tkStr(k.i, 40) || uid(), t: tkStr(k.t, 1000) };
        if (tkStr(k.s, 150)) q.s = tkStr(k.s, 150);
        return q;
      });
  if (Array.isArray(x.ti))
    o.ti = x.ti
      .filter(function (k) {
        return k && tkStr(k.t, 200).trim();
      })
      .slice(0, TK_TI_MAKS)
      .map(function (k) {
        var q = { i: tkStr(k.i, 40) || uid(), t: tkStr(k.t, 200) };
        if (+k.m > 0) q.m = Math.floor(+k.m);
        return q;
      });
  if (Array.isArray(x.pj))
    o.pj = x.pj
      .filter(function (k) {
        return k && tkStr(k.t, 200).trim();
      })
      .slice(0, TK_PJ_MAKS)
      .map(function (k) {
        var q = { i: tkStr(k.i, 40) || uid(), y: tkStr(String(k.y == null ? '' : k.y), 10), t: tkStr(k.t, 200) };
        if (tkStr(k.c, 500)) q.c = tkStr(k.c, 500);
        return q;
      });
  if (x.hub && typeof x.hub === 'object') {
    var hb = {};
    ['im', 'bk', 'fm', 'tp'].forEach(function (k) {
      if (Array.isArray(x.hub[k])) {
        var a = x.hub[k].filter(tkIdOk).slice(0, TK_HUB_MAKS);
        if (a.length) hb[k] = a;
      }
    });
    if (Object.keys(hb).length) o.hub = hb;
  }
  return o;
}

/* ---------- Penyimpanan ---------- */
function tkData() {
  var d = store.get(K_TK, null);
  return d && typeof d === 'object' ? d : { v: 1, item: [] };
}
function tkItems() {
  tkMigrasi();
  var d = tkData();
  return (Array.isArray(d.item) ? d.item : []).map(tkSah).filter(Boolean);
}
function tkTopikTambahan() {
  var d = tkData();
  return (Array.isArray(d.top) ? d.top : [])
    .filter(function (t) {
      return typeof t === 'string' && t;
    })
    .slice(0, 50);
}
function tkSemuaTopik() {
  var o = TK_TOPIK.slice();
  tkTopikTambahan().forEach(function (t) {
    if (o.indexOf(t) < 0) o.push(t);
  });
  return o;
}
function tkSimpanData(items, topTambahan) {
  glSimpanPecahan(K_TK, tkSah, items, { top: topTambahan });
}
function tkCari(id) {
  return (
    tkItems().filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function tkUbah(id, f) {
  var hasil = null,
    gagal = false;
  var L = tkItems().map(function (x) {
    if (x.id !== id) return x;
    var z = JSON.parse(JSON.stringify(x));
    f(z);
    z = tkSah(z);
    if (!z) return x;
    z.diubah = Date.now();
    if (typeof gtUkuranByte === 'function' && gtUkuranByte(z) > TK_RUANG) {
      gagal = true;
      toast('Data tokoh ini sudah terlalu besar. Hapus beberapa kutipan atau catatan dulu.');
      return x;
    }
    hasil = z;
    return z;
  });
  if (hasil && !gagal) tkSimpanData(L);
  return gagal ? null : hasil;
}
/* Tambah tokoh baru (dipakai juga oleh Channel Favorit) */
function tkBuat(o) {
  var L = tkItems();
  if (L.length >= TK_MAKS) {
    toast('Maksimal ' + TK_MAKS + ' tokoh');
    return null;
  }
  var kini = Date.now(),
    x = tkSah(Object.assign({ id: uid(), j: 'pub', dibuat: kini, diubah: kini }, o));
  if (!x) return null;
  L.unshift(x);
  tkSimpanData(L);
  return x;
}
/* Tokoh lama di tab Lainnya dipindah ke sini (id tetap, supaya tautan dari Channel tidak putus) */
function tkMigrasi() {
  var d = store.get(K_GL, null);
  if (!d || !Array.isArray(d.tokoh) || !d.tokoh.length) return;
  var data = tkData(),
    items = Array.isArray(data.item) ? data.item.slice() : [],
    ada = {};
  items.forEach(function (x) {
    if (x && x.id) ada[x.id] = 1;
  });
  d.tokoh.forEach(function (x) {
    if (!x || typeof x.id !== 'string' || !x.a || ada[x.id]) return;
    items.push({
      id: x.id,
      a: String(x.a),
      j: 'pub',
      b: x.b || '',
      u: x.url || '',
      al: x.c || '',
      dibuat: x.dibuat || Date.now(),
      diubah: x.diubah || Date.now()
    });
  });
  var sisa = {};
  Object.keys(d).forEach(function (k) {
    if (k !== 'tokoh') sisa[k] = d[k];
  });
  store.set(K_GL, sisa);
  var o = { v: 1 };
  Object.keys(data).forEach(function (k) {
    if (k !== 'item' && k !== 'v') o[k] = data[k];
  });
  o.item = items;
  store.set(K_TK, o);
}

/* ---------- Wikipedia ---------- */
function tkWikiJson(url) {
  return fetch(url, { headers: { Accept: 'application/json' } }).then(
    function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('Wikipedia sedang tidak bisa dihubungi (' + r.status + ').');
      return r.json();
    },
    function () {
      throw new Error('Tidak ada koneksi internet.');
    }
  );
}
function tkWikiCari(q) {
  var cari = function (l) {
    return tkWikiJson('https://' + l + '.wikipedia.org/w/rest.php/v1/search/title?limit=8&q=' + encodeURIComponent(q)).then(function (j) {
      return ((j && j.pages) || [])
        .map(function (p) {
          return {
            k: String(p.key || p.title || ''),
            l: l,
            t: String(p.title || ''),
            d: String(p.description || ''),
            img: p.thumbnail && p.thumbnail.url ? (/^\/\//.test(p.thumbnail.url) ? 'https:' + p.thumbnail.url : p.thumbnail.url) : ''
          };
        })
        .filter(function (p) {
          return p.k;
        });
    });
  };
  return cari('id').then(function (L) {
    return L.length ? L : cari('en');
  });
}
function tkWikiTgl(c) {
  try {
    var v = c[0].mainsnak.datavalue.value,
      m = /^([+-])0*(\d+)-(\d{2})-(\d{2})/.exec(v.time);
    if (!m) return '';
    var y = (m[1] === '-' ? '-' : '') + m[2];
    return v.precision >= 11 ? y + '-' + m[3] + '-' + m[4] : y;
  } catch (e) {
    return '';
  }
}
function tkWikiRingkas(k, l) {
  return tkWikiJson('https://' + l + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(k.replace(/ /g, '_'))).then(
    function (s) {
      if (!s || s.type === 'disambiguation')
        throw new Error(s ? 'Itu halaman daftar beberapa arti. Pilih yang lebih spesifik.' : 'Halaman tidak ditemukan.');
      var w = {
        k: String((s.titles && s.titles.canonical) || s.title || k),
        l: l,
        t: String(s.title || k),
        d: String(s.description || ''),
        x: String(s.extract || ''),
        img: s.thumbnail && s.thumbnail.source ? s.thumbnail.source : ''
      };
      if (!s.wikibase_item) return w;
      return tkWikiJson(
        'https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&origin=*&ids=' +
          encodeURIComponent(s.wikibase_item)
      )
        .then(function (j) {
          var c = (j && j.entities && j.entities[s.wikibase_item] && j.entities[s.wikibase_item].claims) || {};
          if (c.P569) w.lh = tkWikiTgl(c.P569);
          if (c.P570) w.wf = tkWikiTgl(c.P570);
          return w;
        })
        .catch(function () {
          return w;
        });
    }
  );
}
function tkWikiUrl(wk) {
  return 'https://' + wk.l + '.wikipedia.org/wiki/' + encodeURIComponent(wk.k.replace(/ /g, '_'));
}

/* ---------- Tampilan kecil ---------- */
var TK_BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function tkTahun(v) {
  if (!v) return '';
  var m = /^(-?)(\d+)/.exec(v);
  return m ? (m[1] ? m[2] + ' SM' : m[2]) : '';
}
function tkTglTeks(v) {
  if (!v) return '';
  var m = /^(-?\d+)-(\d{2})-(\d{2})$/.exec(v);
  return m ? +m[3] + ' ' + TK_BLN[+m[2] - 1] + ' ' + tkTahun(m[1]) : tkTahun(v);
}
function tkMasa(x) {
  var w = x.wk;
  if (!w || !w.lh) return '';
  return tkTahun(w.lh) + '–' + (w.wf ? tkTahun(w.wf) : 'sekarang');
}
function tkWarna(x) {
  var h = 0;
  for (var i = 0; i < x.id.length; i++) h = (h * 31 + x.id.charCodeAt(i)) >>> 0;
  return TK_WARNA[h % TK_WARNA.length];
}
function tkInisial(a) {
  return (
    String(a || '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map(function (w) {
        return w.charAt(0);
      })
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}
function tkAvatar(x, kelas) {
  var src = x.av || (x.wk && x.wk.img) || '';
  return (
    '<span class="tk-av ' +
    (kelas || '') +
    '" style="--g:' +
    tkWarna(x) +
    '">' +
    esc(tkInisial(x.a)) +
    (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') +
    '</span>'
  );
}
function tkLencana(j) {
  return '<span class="tk-lenc ' + TK_JENIS[j].k + '">' + TK_JENIS[j].n + '</span>';
}
function tkSub(x) {
  return [x.b || (x.wk && x.wk.d) || '', x.j === 'fik' && x.ka ? 'dari ' + x.ka : '', tkMasa(x)].filter(Boolean);
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
      (t.parentNode.classList.contains('tk-av') || t.parentNode.classList.contains('tk-sampul'))
    )
      t.remove();
  },
  true
);
var TK_IK = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  orang: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/></svg>',
  cek: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  ulang: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>',
  hapus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  pola: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
  kamera:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8h3.5l2-2.5h6L17 8h3.5v11h-17z"/><circle cx="12" cy="13.2" r="3.4"/></svg>',
  bintang:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  globe:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  ubah: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
  im: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 19H16a2.4 2.4 0 0 0 0-4.75H8a2.4 2.4 0 0 1 0-4.75h9.5"/><path d="M17.5 9.5V2.6l4.3 2.2-4.3 2.2"/><circle cx="5.2" cy="19" r="2"/></svg>',
  bk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  fm: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>',
  ch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/></svg>',
  tp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
};

/* ---------- Data tautan ---------- */
function tkImpianDaftar() {
  var d = store.get('stivora.impian.daftar', []);
  return (Array.isArray(d) ? d : []).filter(function (x) {
    return x && x.id && x.nama;
  });
}
function tkSumber(k) {
  if (k === 'im')
    return tkImpianDaftar().map(function (d) {
      return { id: d.id, t: (d.emoji ? d.emoji + ' ' : '') + d.nama, s: 'Impian' };
    });
  if (k === 'bk')
    return (glSemua().buku || []).map(function (b) {
      return { id: b.id, t: b.a, s: b.b ? 'Buku · ' + b.b : 'Readlist Buku' };
    });
  if (k === 'fm')
    return (glSemua().film || []).map(function (f) {
      return { id: f.id, t: f.a, s: 'Playlist Film' };
    });
  if (k === 'tp')
    return typeof tpItems === 'function'
      ? tpItems().map(function (p) {
          return { id: p.id, t: tpNama(p), s: 'Tempat Favorit' };
        })
      : [];
  if (k === 'ch')
    return typeof chItems === 'function'
      ? chItems().map(function (c) {
          return { id: c.id, t: c.a, s: 'Channel Favorit', tk: c.tk };
        })
      : [];
  return [];
}
function tkTautan(x) {
  var o = [];
  ['im', 'bk', 'fm', 'ch', 'tp'].forEach(function (k) {
    var S = tkSumber(k),
      ids =
        k === 'ch'
          ? S.filter(function (c) {
              return c.tk === x.id;
            }).map(function (c) {
              return c.id;
            })
          : (x.hub && x.hub[k]) || [];
    ids.forEach(function (id) {
      var s = S.filter(function (z) {
        return z.id === id;
      })[0];
      if (s) o.push({ k: k, id: id, t: s.t, s: s.s });
    });
  });
  return o;
}
function tkDiPola(x, t) {
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
      return p.asal && p.asal[0] === 'Tokoh' && bersih(p.asal[1]) === bersih(x.a) && bersih(gpTeksCari(p)).indexOf(q) >= 0;
    });
  } catch (e) {
    return false;
  }
}

/* ---------- Daftar di halaman Tokoh Favorit ---------- */
function tkSemuaKutipan(semua) {
  var o = [];
  semua.forEach(function (x) {
    if (!x.ar)
      (x.ku || []).forEach(function (k) {
        o.push({ x: x, k: k });
      });
  });
  return o;
}
function tkKutipanHariIni(semua) {
  var L = tkSemuaKutipan(semua);
  if (!L.length) return null;
  var hari = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  return L[(((hari + tkGeser) % L.length) + L.length) % L.length];
}
function tkRenderDaftar(box, q) {
  var semua = tkItems();
  if (!semua.length) {
    box.innerHTML =
      '<div class="lg-kosong tk-kosong">' +
      TK_IK.orang +
      '<p>Belum ada tokoh.<br>Simpan tokoh publik (dari Wikipedia), tokoh fiksi, atau orang dekat yang kamu kagumi — ketuk <b>Tambah</b>.</p></div>';
    return;
  }
  var h = '',
    khi = tkKutipanHariIni(semua);
  if (khi)
    h +=
      '<div class="tk-khi"><small>Kutipan hari ini</small><p>' +
      esc(khi.k.t) +
      '</p><div class="tk-khi-dari"><button type="button" class="tk-khi-org" data-tk="' +
      esc(khi.x.id) +
      '">' +
      tkAvatar(khi.x, 'mini') +
      esc(khi.x.a) +
      '</button>' +
      (tkSemuaKutipan(semua).length > 1 ? '<button type="button" class="tk-khi-lain" id="tkLain">' + TK_IK.ulang + 'Lain</button>' : '') +
      '</div></div>';
  var nA = semua.filter(function (x) {
      return !x.ar;
    }),
    nR = semua.length - nA.length;
  if (tkS === 'arsip' && !nR) tkS = 'aktif';
  var dasar = semua.filter(function (x) {
    return (tkS === 'arsip') === !!x.ar;
  });
  if (
    tkF &&
    !dasar.some(function (x) {
      return x.j === tkF;
    })
  )
    tkF = '';
  h +=
    '<div class="gp-filter gl-filter tk-chips"><button type="button" data-tk-f=""' +
    (!tkF && tkS === 'aktif' ? ' class="on"' : '') +
    '>Semua <small>' +
    nA.length +
    '</small></button>' +
    Object.keys(TK_JENIS)
      .map(function (j) {
        var n = dasar.filter(function (x) {
          return x.j === j;
        }).length;
        return n
          ? '<button type="button" data-tk-f="' +
              j +
              '"' +
              (tkF === j ? ' class="on"' : '') +
              '>' +
              TK_JENIS[j].n +
              ' <small>' +
              n +
              '</small></button>'
          : '';
      })
      .join('') +
    (nR
      ? '<button type="button" data-tk-s="' +
        (tkS === 'arsip' ? 'aktif' : 'arsip') +
        '"' +
        (tkS === 'arsip' ? ' class="on"' : '') +
        '>Arsip <small>' +
        nR +
        '</small></button>'
      : '') +
    '</div>';
  var topAda = tkSemuaTopik().filter(function (t) {
    return dasar.some(function (x) {
      return (x.top || []).indexOf(t) >= 0;
    });
  });
  if (tkT && topAda.indexOf(tkT) < 0) tkT = '';
  if (topAda.length)
    h +=
      '<div class="gp-filter gl-filter tk-chips-top">' +
      topAda
        .map(function (t) {
          return '<button type="button" data-tk-t="' + esc(t) + '"' + (tkT === t ? ' class="on"' : '') + '>' + esc(t) + '</button>';
        })
        .join('') +
      '</div>';
  var L = dasar
    .filter(function (x) {
      return (
        (!tkF || x.j === tkF) &&
        (!tkT || (x.top || []).indexOf(tkT) >= 0) &&
        (!q ||
          [
            x.a,
            x.b,
            x.ka,
            x.al,
            (x.top || []).join(' '),
            (x.ku || [])
              .map(function (k) {
                return k.t;
              })
              .join(' ')
          ]
            .join(' ')
            .toLowerCase()
            .indexOf(q) >= 0)
      );
    })
    .sort(function (a, b) {
      return b.dibuat - a.dibuat;
    });
  h += '<h3 class="lg-judul">' + (tkS === 'arsip' ? 'Arsip' : 'Tokohku') + '</h3>';
  if (!L.length) h += '<p class="gt-kosong">Tidak ada yang cocok.</p>';
  else
    h +=
      '<div class="tk-daftar">' +
      L.map(function (x) {
        var ku = x.ku || [],
          ti = x.ti || [],
          sudah = ti.filter(function (t) {
            return t.m;
          }).length,
          nt = tkTautan(x).length,
          kut = ku.length ? ku[0].t : x.al || '';
        return (
          '<button type="button" class="tk-kartu' +
          (x.ar ? ' arsip' : '') +
          '" data-tk="' +
          esc(x.id) +
          '">' +
          tkAvatar(x) +
          '<span class="tk-kartu-tx"><b>' +
          esc(x.a) +
          '</b>' +
          '<span class="tk-sub">' +
          tkLencana(x.j) +
          '<span>' +
          esc(
            [(x.top || [])[0] || '', tkMasa(x) || (x.j === 'fik' && x.ka ? x.ka : x.j === 'dkt' ? x.b || '' : '')]
              .filter(Boolean)
              .join(' · ')
          ) +
          '</span></span>' +
          (kut ? '<q>' + esc(kut.slice(0, 200)) + '</q>' : '') +
          '<span class="tk-kaki">' +
          (x.n ? '<span class="fm-nilai">★ ' + x.n + '</span>' : '') +
          (ku.length ? '<span>' + ku.length + ' kutipan</span>' : '') +
          (ti.length ? '<span>' + sudah + '/' + ti.length + ' ditiru</span>' : '') +
          (nt ? '<span>' + nt + ' tautan</span>' : '') +
          '</span></span></button>'
        );
      }).join('') +
      '</div>';
  if (
    semua.some(function (x) {
      return x.wk;
    })
  )
    h += '<p class="fm-atribusi">Info tokoh publik dari Wikipedia (CC BY-SA)</p>';
  box.innerHTML = h;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'tokoh') return;
  var el;
  if (e.target.closest('#tkLain')) {
    tkGeser++;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-tk-f]'))) {
    tkF = el.dataset.tkF;
    tkS = 'aktif';
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-tk-s]'))) {
    tkS = el.dataset.tkS;
    tkF = '';
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-tk-t]'))) {
    tkT = tkT === el.dataset.tkT ? '' : el.dataset.tkT;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#tkTambahBtn')) {
    if (tkItems().length >= TK_MAKS) {
      toast('Maksimal ' + TK_MAKS + ' tokoh');
      return;
    }
    openLayer('page:tokoh-tambah');
    return;
  }
  if ((el = e.target.closest('[data-tk]'))) openLayer('page:tokoh-detail:' + el.dataset.tk);
});

/* ---------- Halaman tambah ---------- */
PAGES['tokoh-tambah'] = function () {
  tkDraft = { j: 'pub', top: [] };
  $('#subTitle').textContent = 'Tambah tokoh';
  tkRenderTambah();
  return true;
};
function tkRenderTambah() {
  var d = tkDraft;
  if (!d) return;
  var h =
    '<div class="tk-tambah"><div class="tk-seg">' +
    [
      ['pub', 'Publik', 'dari Wikipedia'],
      ['fik', 'Fiksi', 'isi sendiri'],
      ['dkt', 'Orang dekat', 'pribadi']
    ]
      .map(function (s) {
        return (
          '<button type="button" data-tkj="' +
          s[0] +
          '"' +
          (d.j === s[0] ? ' class="on"' : '') +
          '>' +
          s[1] +
          '<small>' +
          s[2] +
          '</small></button>'
        );
      })
      .join('') +
    '</div>';
  if (d.j === 'pub' && !d.manual) {
    h +=
      '<label class="gt-cari tk-wcari">' +
      GT_IKON_CARI +
      '<input type="search" id="tkWiki" placeholder="Cari nama tokoh di Wikipedia" autocomplete="off" maxlength="100" value="' +
      esc(d.q || '') +
      '"></label>' +
      '<div id="tkHasil" aria-live="polite"></div><div id="tkPra"></div>';
  } else {
    h +=
      '<p class="lg-ket">' +
      (d.j === 'dkt'
        ? 'Orang dekat tidak dicari di internet — isinya hanya untukmu (ikut sinkron & cadangan akunmu).'
        : d.j === 'fik'
          ? 'Tokoh dari novel, film, anime, atau cerita. Foto bisa kamu pasang sendiri.'
          : 'Isi sendiri info tokoh ini.') +
      '</p>' +
      tkFormManual(d);
  }
  h += '</div>';
  $('#subBody').innerHTML = h;
  if (d.j === 'pub' && !d.manual) {
    if (d.hasil) tkRenderHasil();
    if (d.wk) tkRenderPra();
  }
}
function tkTopikPil(d, attr, idBaru) {
  return (
    '<div class="bk-pil">' +
    tkSemuaTopik()
      .map(function (t) {
        return (
          '<button type="button" ' +
          attr +
          '="' +
          esc(t) +
          '"' +
          ((d.top || []).indexOf(t) >= 0 ? ' class="on"' : '') +
          '>' +
          esc(t) +
          '</button>'
        );
      })
      .join('') +
    '<button type="button" class="tk-tbh" id="' +
    idBaru +
    '">+ Bidang lain</button></div>'
  );
}
function tkFormManual(d) {
  return (
    '<div class="field"><label>Foto <span class="gl-ops">(opsional)</span></label><label class="tk-foto-baru">' +
    (d.av ? '<span class="tk-av"><img src="' + esc(d.av) + '" alt=""></span>' : '<span class="tk-av kosong">' + TK_IK.kamera + '</span>') +
    '<span class="btn ghost">' +
    (d.av ? 'Ganti foto' : 'Pilih dari HP') +
    '</span><input type="file" accept="image/*" id="tkFotoBaru" hidden></label></div>' +
    '<div class="field"><label for="tkNama">Nama</label><input class="input" id="tkNama" maxlength="100" autocomplete="off" placeholder="' +
    (d.j === 'dkt' ? 'mis. Ayah' : d.j === 'fik' ? 'Nama tokoh' : 'Nama tokoh') +
    '" value="' +
    esc(d.nama || '') +
    '"></div>' +
    '<div class="field"><label for="tkB">' +
    (d.j === 'dkt' ? 'Hubungan' : 'Dikenal sebagai') +
    ' <span class="gl-ops">(opsional)</span></label><input class="input" id="tkB" maxlength="120" autocomplete="off" placeholder="' +
    (d.j === 'dkt' ? 'mis. Ayah, guru SMA, mentor bisnis' : 'mis. Kapten kapal') +
    '" value="' +
    esc(d.b || '') +
    '"></div>' +
    (d.j === 'fik'
      ? '<div class="field"><label for="tkKa">Dari karya <span class="gl-ops">(opsional)</span></label><input class="input" id="tkKa" maxlength="120" autocomplete="off" placeholder="Judul novel / film / anime" value="' +
        esc(d.ka || '') +
        '"></div>'
      : '') +
    '<div class="field"><label>Bidang</label>' +
    tkTopikPil(d, 'data-tktp', 'tkTopikBaru') +
    '</div>' +
    '<div class="field"><label for="tkAl">Kenapa kamu mengaguminya? <span class="gl-ops">(opsional)</span></label><textarea class="input" id="tkAl" rows="3" maxlength="2000">' +
    esc(d.al || '') +
    '</textarea></div>' +
    '<div class="bk-dlg-dua"><button type="button" class="btn ghost" data-back>Batal</button><button type="button" class="btn primary" id="tkSimpan">Simpan</button></div>'
  );
}
function tkBacaForm() {
  var d = tkDraft;
  if (!d) return;
  ['tkNama:nama', 'tkB:b', 'tkKa:ka', 'tkAl:al'].forEach(function (p) {
    var a = p.split(':'),
      el = $('#' + a[0]);
    if (el) d[a[1]] = el.value;
  });
}
function tkRenderHasil() {
  var d = tkDraft,
    b = $('#tkHasil');
  if (!b || !d) return;
  if (d.hasil === 'muat') {
    b.innerHTML = '<div class="lg-muat"><i></i>Mencari di Wikipedia…</div>';
    return;
  }
  if (typeof d.hasil === 'string') {
    b.innerHTML =
      '<p class="lg-salah">' + esc(d.hasil) + '</p><button type="button" class="tk-tbh tk-manual" id="tkManual">Isi sendiri</button>';
    return;
  }
  var L = d.hasil || [];
  b.innerHTML =
    '<h3 class="lg-judul">Hasil Wikipedia</h3>' +
    (L.length
      ? '<div class="tk-hasil">' +
        L.map(function (p, i) {
          return (
            '<button type="button" data-tkw="' +
            i +
            '"' +
            (d.wk && d.wk.k === p.k ? ' class="on"' : '') +
            '>' +
            tkAvatar({ id: p.k, a: p.t, wk: { img: p.img } }) +
            '<span><b>' +
            esc(p.t) +
            '</b><small>' +
            esc(p.d || (p.l === 'en' ? 'Wikipedia bahasa Inggris' : 'Wikipedia')) +
            '</small></span>' +
            (d.wk && d.wk.k === p.k ? TK_IK.cek : '') +
            '</button>'
          );
        }).join('') +
        '</div>'
      : '<p class="fm-tidak">Tidak ditemukan di Wikipedia.</p>') +
    '<p class="lg-ket">Tidak ada yang cocok? <button type="button" class="tk-link" id="tkManual">Isi sendiri</button></p>';
}
function tkRenderPra() {
  var d = tkDraft,
    b = $('#tkPra');
  if (!b || !d) return;
  if (d.wk === 'muat') {
    b.innerHTML = '<div class="lg-muat"><i></i>Mengambil info tokoh…</div>';
    return;
  }
  if (typeof d.wk === 'string') {
    b.innerHTML = '<p class="lg-salah">' + esc(d.wk) + '</p>';
    return;
  }
  var w = d.wk;
  if (!w) {
    b.innerHTML = '';
    return;
  }
  var dobel = tkItems().filter(function (x) {
    return x.wk && x.wk.k === w.k && x.wk.l === w.l;
  })[0];
  b.innerHTML =
    '<div class="tk-pra"><div class="tk-pra-atas">' +
    tkAvatar({ id: w.k, a: w.t, wk: { img: w.img } }) +
    '<span><b>' +
    esc(w.t) +
    '</b><small>' +
    esc(w.d || '') +
    '</small></span></div>' +
    (w.x ? '<p class="tk-ringkas">' + esc(w.x.slice(0, 400)) + (w.x.length > 400 ? '…' : '') + '</p>' : '') +
    (w.lh || w.wf
      ? '<div class="tk-fakta">' +
        (w.lh ? '<div><small>Lahir</small><b>' + tkTglTeks(w.lh) + '</b></div>' : '') +
        (w.wf ? '<div><small>Wafat</small><b>' + tkTglTeks(w.wf) + '</b></div>' : '') +
        '</div>'
      : '') +
    (dobel ? '<p class="lg-salah">' + esc(dobel.a) + ' sudah ada di Tokoh Favorit.</p>' : '') +
    '<div class="field"><label>Bidang</label>' +
    tkTopikPil(d, 'data-tktp', 'tkTopikBaru') +
    '</div>' +
    '<div class="field"><label for="tkAl">Kenapa kamu mengaguminya? <span class="gl-ops">(opsional)</span></label><textarea class="input" id="tkAl" rows="3" maxlength="2000">' +
    esc(d.al || '') +
    '</textarea></div>' +
    '<div class="bk-dlg-dua"><button type="button" class="btn ghost" data-back>Batal</button><button type="button" class="btn primary" id="tkSimpan"' +
    (dobel ? ' data-dobel="' + esc(dobel.id) + '"' : '') +
    '>' +
    (dobel ? 'Buka yang ada' : 'Simpan') +
    '</button></div></div>' +
    '<p class="fm-atribusi">Sumber: Wikipedia (CC BY-SA)</p>';
}
function tkCariWiki() {
  var d = tkDraft,
    el = $('#tkWiki');
  if (!d || !el) return;
  var q = el.value.trim(),
    no = ++tkCariNo;
  d.q = el.value;
  d.wk = null;
  tkRenderPra();
  if (q.length < 2) {
    d.hasil = null;
    var b = $('#tkHasil');
    if (b) b.innerHTML = '';
    return;
  }
  d.hasil = 'muat';
  tkRenderHasil();
  tkWikiCari(q)
    .then(function (L) {
      if (no !== tkCariNo || tkDraft !== d) return;
      d.hasil = L;
      tkRenderHasil();
    })
    .catch(function (err) {
      if (no !== tkCariNo || tkDraft !== d) return;
      d.hasil = err.message || 'Gagal mencari.';
      tkRenderHasil();
    });
}
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'tokoh-tambah' && e.target.id === 'tkWiki') {
    clearTimeout(tkCariT);
    tkCariT = setTimeout(tkCariWiki, 450);
  }
});
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'tokoh-tambah') return;
  var d = tkDraft,
    el;
  if (!d) return;
  if ((el = e.target.closest('[data-tkj]'))) {
    tkBacaForm();
    d.j = el.dataset.tkj;
    d.manual = false;
    tkRenderTambah();
    return;
  }
  if (e.target.closest('#tkManual')) {
    var w0 = $('#tkWiki');
    d.nama = w0 ? w0.value.trim() : '';
    d.manual = true;
    d.wk = null;
    tkRenderTambah();
    var nm = $('#tkNama');
    if (nm) nm.focus();
    return;
  }
  if ((el = e.target.closest('[data-tkw]'))) {
    var p = (d.hasil || [])[+el.dataset.tkw];
    if (!p) return;
    tkBacaForm();
    var no = ++tkCariNo;
    d.wk = 'muat';
    tkRenderHasil();
    tkRenderPra();
    tkWikiRingkas(p.k, p.l)
      .then(function (w) {
        if (no !== tkCariNo || tkDraft !== d) return;
        d.wk = w;
        tkRenderHasil();
        tkRenderPra();
        var b = $('#tkPra');
        if (b && b.scrollIntoView) b.scrollIntoView({ block: 'start', behavior: 'smooth' });
      })
      .catch(function (err) {
        if (no !== tkCariNo || tkDraft !== d) return;
        d.wk = err.message || 'Gagal mengambil info.';
        tkRenderPra();
      });
    return;
  }
  if ((el = e.target.closest('[data-tktp]'))) {
    var t = el.dataset.tktp,
      i = d.top.indexOf(t);
    if (i >= 0) d.top.splice(i, 1);
    else d.top.push(t);
    el.classList.toggle('on', i < 0);
    return;
  }
  if (e.target.closest('#tkTopikBaru')) {
    tkBacaForm();
    tkTopikBaru(function (t2) {
      if (d.top.indexOf(t2) < 0) d.top.push(t2);
      if (d.j === 'pub' && !d.manual) tkRenderPra();
      else tkRenderTambah();
    });
    return;
  }
  if ((el = e.target.closest('#tkSimpan'))) {
    if (el.dataset.dobel) {
      var idd = el.dataset.dobel;
      back(1, function () {
        openLayer('page:tokoh-detail:' + idd);
      });
      return;
    }
    tkBacaForm();
    tkSimpanDraft();
  }
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind === 'tokoh-tambah' && e.target.id === 'tkFotoBaru') {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    tkBacaForm();
    tkKecilkanFoto(f, function (url) {
      if (tkDraft) {
        tkDraft.av = url;
        tkRenderTambah();
      }
    });
  }
});
function tkTopikBaru(lalu) {
  tpMintaTeks({
    judul: 'Bidang baru',
    ph: 'mis. Kuliner',
    maks: 30,
    ok: 'Tambah',
    cb: function (v) {
      v = v.trim().slice(0, 30);
      if (!v) return;
      var ada = tkSemuaTopik().filter(function (t) {
        return t.toLowerCase() === v.toLowerCase();
      })[0];
      if (!ada) {
        var tt = tkTopikTambahan();
        if (tt.length >= 50) {
          toast('Maksimal 50 bidang tambahan');
          return;
        }
        tt.push(v);
        tkSimpanData(tkItems(), tt);
      }
      lalu(ada || v);
    }
  });
}
function tkSimpanDraft() {
  var d = tkDraft,
    o;
  if (d.j === 'pub' && !d.manual) {
    if (!d.wk || typeof d.wk !== 'object') {
      toast('Pilih tokoh dari hasil Wikipedia dulu');
      return;
    }
    var w = d.wk,
      pj = [];
    if (w.lh) pj.push({ i: uid(), y: tkTahun(w.lh), t: 'Lahir' });
    if (w.wf) pj.push({ i: uid(), y: tkTahun(w.wf), t: 'Wafat' });
    o = {
      j: 'pub',
      a: w.t,
      wk: { k: w.k, l: w.l, d: w.d, x: w.x, img: w.img, lh: w.lh, wf: w.wf },
      top: d.top,
      al: (d.al || '').trim(),
      pj: pj
    };
  } else {
    var nama = (d.nama || '').trim();
    if (!nama) {
      toast('Isi nama dulu');
      var n = $('#tkNama');
      if (n) n.focus();
      return;
    }
    o = {
      j: d.j,
      a: nama,
      b: (d.b || '').trim(),
      ka: d.j === 'fik' ? (d.ka || '').trim() : '',
      av: d.av,
      top: d.top,
      al: (d.al || '').trim()
    };
  }
  var x = tkBuat(o);
  if (!x) return;
  tkDraft = null;
  back(1, function () {
    renderGaleryTab();
    openLayer('page:tokoh-detail:' + x.id);
    toast('Tokoh disimpan');
  });
}
function tkKecilkanFoto(f, lalu) {
  glFotoKecil(f, TK_AV_MAKS, lalu);
}

/* ---------- Halaman detail ---------- */
function tkIdHalaman() {
  var L = layerOf('page');
  return L ? L.name.split(':').slice(2).join(':') : '';
}
function tkKini() {
  return tkCari(tkIdHalaman());
}
PAGES['tokoh-detail'] = function () {
  var x = tkCari(tkIdHalaman());
  if (!x) return false;
  tkForm = null;
  $('#subTitle').textContent = x.a;
  tkRenderDetail(x);
  return true;
};
function tkRenderUlang() {
  var x = tkKini();
  if (x) {
    $('#subTitle').textContent = x.a;
    tkRenderDetail(x, true);
  }
}
function tkRenderDetail(x, ulang) {
  var sy = ulang ? $('#subBody').scrollTop : 0,
    w = x.wk,
    dkt = x.j === 'dkt';
  var h =
    '<div class="tk-det ' +
    TK_JENIS[x.j].k +
    '"><div class="tk-sampul" style="--g:' +
    tkWarna(x) +
    '">' +
    (x.av || (w && w.img) ? '<img src="' + esc(x.av || w.img) + '" alt="" referrerpolicy="no-referrer">' : '') +
    '<button type="button" class="ch-arsipb tk-arsipb' +
    (x.ar ? ' on' : '') +
    '" id="tkArsip">' +
    (x.ar ? 'Diarsipkan' : 'Arsipkan') +
    '</button></div>' +
    '<div class="tk-det-atas"><label class="tk-av-ganti" title="Pasang foto">' +
    tkAvatar(x, 'besar') +
    '<span class="tk-av-kamera">' +
    TK_IK.kamera +
    '</span><input type="file" accept="image/*" id="tkAvFile" hidden></label>' +
    '<span class="tk-det-tx"><h2>' +
    esc(x.a) +
    '</h2><span class="tk-sub">' +
    tkLencana(x.j) +
    '<span>' +
    esc(tkSub(x).join(' · ')) +
    '</span></span></span>' +
    '</div>' +
    '<div class="tk-det-grid"><div class="tk-det-kiri">';
  /* Wikipedia */
  if (w)
    h +=
      '<section class="fm-bag"><div class="fm-kartu-p tk-wiki">' +
      (w.x ? '<p>' + esc(w.x) + '</p>' : '<p class="fm-tidak">Belum ada ringkasan.</p>') +
      (w.lh || w.wf
        ? '<div class="tk-fakta">' +
          (w.lh ? '<div><small>Lahir</small><b>' + tkTglTeks(w.lh) + '</b></div>' : '') +
          (w.wf ? '<div><small>Wafat</small><b>' + tkTglTeks(w.wf) + '</b></div>' : '') +
          '</div>'
        : '') +
      '<div class="tk-sumber">' +
      TK_IK.globe +
      '<span>Sumber: <a href="' +
      esc(tkWikiUrl(w)) +
      '" target="_blank" rel="noopener noreferrer">Wikipedia</a> · <button type="button" id="tkSegarWiki">Segarkan</button></span></div></div></section>';
  else if (x.u)
    h +=
      '<section class="fm-bag"><a class="tk-link-luar" href="' +
      esc(x.u) +
      '" target="_blank" rel="noopener noreferrer">' +
      TK_IK.link +
      esc(x.u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)) +
      '</a></section>';
  /* Kenapa aku kagumi */
  h +=
    '<section class="fm-bag"><h3>Kenapa aku kagumi</h3><div class="fm-kartu-p"><div class="fm-bintang ch-bintang"><span>Nilai</span>' +
    [1, 2, 3, 4, 5]
      .map(function (n) {
        return (
          '<button type="button" data-tkn="' +
          n +
          '" class="' +
          ((x.n || 0) >= n ? 'on' : '') +
          '" aria-label="' +
          n +
          ' bintang">' +
          TK_IK.bintang +
          '</button>'
        );
      })
      .join('') +
    '</div>' +
    '<textarea class="input ch-alasan" id="tkAlasan" rows="3" maxlength="2000" placeholder="Apa yang membuatmu kagum padanya…">' +
    esc(x.al || '') +
    '</textarea>' +
    '<button type="button" class="ch-pola tk-aksen" id="tkPolaAl">' +
    TK_IK.pola +
    'Jadikan Pola Pikir</button></div></section>';
  /* Kutipan */
  var ku = x.ku || [],
    fk = tkForm && tkForm.k === 'ku' ? tkForm : null,
    fku =
      fk && fk.i
        ? ku.filter(function (k) {
            return k.i === fk.i;
          })[0]
        : null;
  h +=
    '<section class="fm-bag"><h3 class="bk-h3 tk-h3">' +
    (dkt ? 'Kutipan / nasihat' : 'Kutipan favorit') +
    (ku.length ? ' · ' + ku.length : '') +
    ' <button type="button" id="tkKuTambah">' +
    TK_IK.plus +
    'Tambah</button></h3>' +
    (fk
      ? '<div class="tp-kj-form tk-form"><div class="field"><label for="tkKuT">' +
        (dkt ? 'Kutipan / nasihat' : 'Kutipan') +
        '</label><textarea class="input" id="tkKuT" rows="3" maxlength="1000">' +
        esc(fku ? fku.t : '') +
        '</textarea></div>' +
        '<div class="field"><label for="tkKuS">' +
        (dkt ? 'Kapan / dalam situasi apa' : 'Sumber') +
        ' <span class="gl-ops">(opsional)</span></label><input class="input" id="tkKuS" maxlength="150" autocomplete="off" placeholder="' +
        (dkt ? 'mis. Waktu aku mau berhenti kerja' : 'mis. buku, pidato, wawancara') +
        '" value="' +
        esc((fku && fku.s) || '') +
        '"></div>' +
        '<div class="bk-dlg-dua"><button type="button" class="btn ghost" id="tkFormBatal">Batal</button><button type="button" class="btn primary" id="tkKuSimpan">Simpan</button></div></div>'
      : '') +
    '<div class="fm-kartu-p">' +
    (ku.length
      ? ku
          .map(function (k) {
            var sdh = tkDiPola(x, k.t);
            return (
              '<div class="tk-kut"><p data-tkkue="' +
              esc(k.i) +
              '" role="button" tabindex="0">' +
              esc(k.t) +
              '</p><div class="tk-kut-aksi">' +
              (k.s ? '<span>' + esc(k.s) + '</span>' : '') +
              (sdh
                ? '<em class="tk-sdh">' + TK_IK.cek + 'Sudah di Pola Pikir</em>'
                : '<button type="button" data-tkkup="' + esc(k.i) + '">' + TK_IK.pola + 'Jadikan Pola Pikir</button>') +
              '<button type="button" class="ch-x" data-tkkuh="' +
              esc(k.i) +
              '" aria-label="Hapus kutipan">' +
              TK_IK.hapus +
              '</button></div></div>'
            );
          })
          .join('')
      : '<p class="fm-tidak">' +
        (dkt ? 'Simpan nasihat atau kalimat yang selalu kamu ingat darinya.' : 'Simpan kutipan yang menginspirasimu.') +
        '</p>') +
    '</div></section>';
  /* Yang mau aku tiru */
  var ti = x.ti || [],
    sudah = ti.filter(function (t) {
      return t.m;
    }).length;
  h +=
    '<section class="fm-bag"><h3 class="bk-h3 tk-h3">Yang mau aku tiru' +
    (ti.length ? ' · ' + sudah + '/' + ti.length : '') +
    ' <button type="button" id="tkTiTambah">' +
    TK_IK.plus +
    'Tambah</button></h3><div class="fm-kartu-p">' +
    (ti.length
      ? '<div class="tk-prog"><i style="width:' +
        Math.round((sudah / ti.length) * 100) +
        '%"></i></div>' +
        ti
          .map(function (t) {
            return (
              '<div class="tk-tiru' +
              (t.m ? ' on' : '') +
              '"><button type="button" class="tk-cek" data-tkti="' +
              esc(t.i) +
              '" aria-label="' +
              (t.m ? 'Batal tandai' : 'Tandai sudah dijalankan') +
              '">' +
              (t.m ? TK_IK.cek : '') +
              '</button>' +
              '<span class="tk-tiru-tx" data-tktie="' +
              esc(t.i) +
              '" role="button" tabindex="0"><span>' +
              esc(t.t) +
              '</span>' +
              (t.m ? '<small>Mulai dijalankan ' + tkTglTeks(tkTglKunci(t.m)) + '</small>' : '') +
              '</span>' +
              '<button type="button" class="ch-x" data-tktih="' +
              esc(t.i) +
              '" aria-label="Hapus">' +
              TK_IK.hapus +
              '</button></div>'
            );
          })
          .join('')
      : '<p class="fm-tidak">Kebiasaan atau sifat darinya yang mau kamu jalankan. Centang kalau sudah mulai.</p>') +
    '</div></section>';
  h += '</div><div class="tk-det-kanan">';
  /* Perjalanan hidup */
  var pj = (x.pj || []).slice().sort(function (a, b) {
      return tkUrutTahun(a.y) - tkUrutTahun(b.y);
    }),
    fp = tkForm && tkForm.k === 'pj' ? tkForm : null,
    fpj =
      fp && fp.i
        ? (x.pj || []).filter(function (k) {
            return k.i === fp.i;
          })[0]
        : null;
  h +=
    '<section class="fm-bag"><h3 class="bk-h3 tk-h3">' +
    (dkt ? 'Momen penting' : 'Perjalanan hidup') +
    ' <button type="button" id="tkPjTambah">' +
    TK_IK.plus +
    'Tambah</button></h3>' +
    (fp
      ? '<div class="tp-kj-form tk-form"><div class="tk-form-2"><div class="field"><label for="tkPjY">Tahun</label><input class="input" id="tkPjY" maxlength="10" inputmode="numeric" autocomplete="off" placeholder="mis. 1955" value="' +
        esc(fpj ? fpj.y : '') +
        '"></div>' +
        '<div class="field"><label for="tkPjT">Peristiwa</label><input class="input" id="tkPjT" maxlength="200" autocomplete="off" value="' +
        esc(fpj ? fpj.t : '') +
        '"></div></div>' +
        '<div class="field"><label for="tkPjC">Catatanmu <span class="gl-ops">(opsional)</span></label><input class="input" id="tkPjC" maxlength="500" autocomplete="off" placeholder="Pelajaran dari momen ini" value="' +
        esc((fpj && fpj.c) || '') +
        '"></div>' +
        '<div class="bk-dlg-dua"><button type="button" class="btn ghost" id="tkFormBatal">Batal</button><button type="button" class="btn primary" id="tkPjSimpan">Simpan</button></div></div>'
      : '') +
    '<div class="fm-kartu-p">' +
    (pj.length
      ? '<div class="tk-garis">' +
        pj
          .map(function (p) {
            return (
              '<div class="tk-tt" data-tkpje="' +
              esc(p.i) +
              '" role="button" tabindex="0"><b>' +
              esc(p.y || '—') +
              '</b><div>' +
              esc(p.t) +
              '</div>' +
              (p.c ? '<small>Catatanmu: ' + esc(p.c) + '</small>' : '') +
              '</div>'
            );
          })
          .join('') +
        '</div>'
      : '<p class="fm-tidak">' +
        (dkt ? 'Catat momen penting bersamanya.' : 'Tambah peristiwa penting dalam hidupnya — orang hebat juga mulai dari bawah.') +
        '</p>') +
    '</div></section>';
  /* Terhubung dengan */
  var tt = tkTautan(x);
  h +=
    '<section class="fm-bag"><h3>Terhubung dengan</h3><div class="fm-kartu-p">' +
    tt
      .map(function (t) {
        return (
          '<div class="tk-sambung"><span class="tk-sb-ik" style="background:' +
          TK_HUB[t.k].w +
          '">' +
          TK_IK[t.k] +
          '</span><span class="tk-sb-tx"><b>' +
          esc(t.t) +
          '</b><small>' +
          esc(t.k === 'im' ? 'Panutan untuk impian ini' : t.s) +
          '</small></span>' +
          '<button type="button" class="tk-buka" data-tkhb="' +
          t.k +
          '|' +
          esc(t.id) +
          '">Buka</button><button type="button" class="ch-x" data-tkhl="' +
          t.k +
          '|' +
          esc(t.id) +
          '" aria-label="Lepas tautan">' +
          TK_IK.tutup +
          '</button></div>'
        );
      })
      .join('') +
    '<div class="tk-tbh-pil">' +
    ['im', 'bk', 'fm', 'ch', 'tp']
      .map(function (k) {
        return '<button type="button" class="tk-tbh" data-tkht="' + k + '">+ ' + TK_HUB[k].n + '</button>';
      })
      .join('') +
    '</div></div></section>';
  /* Bidang */
  h += '<section class="fm-bag"><h3>Bidang</h3>' + tkTopikPil(x, 'data-tktop', 'tkTopikBaru2') + '</section>';
  /* Info */
  h +=
    '<section class="fm-bag"><h3>Info</h3><div class="tk-info-btn"><button type="button" class="btn ghost" id="tkUbahNama">' +
    TK_IK.ubah +
    'Ganti nama</button><button type="button" class="btn ghost" id="tkUbahB">' +
    TK_IK.ubah +
    (dkt ? 'Ubah hubungan' : 'Ubah "dikenal sebagai"') +
    '</button>' +
    (x.j === 'fik' ? '<button type="button" class="btn ghost" id="tkUbahKa">' + TK_IK.ubah + 'Ubah "dari karya"</button>' : '') +
    '<button type="button" class="btn ghost" id="tkUbahJ">' +
    TK_IK.ubah +
    'Ubah jenis tokoh</button>' +
    (x.av ? '<button type="button" class="btn ghost" id="tkHapusAv">' + TK_IK.hapus + 'Hapus foto sendiri</button>' : '') +
    '</div></section>';
  h +=
    '<button type="button" class="se-hapus fm-hapus" id="tkHapus">' +
    TK_IK.hapus +
    'Hapus tokoh</button>' +
    (w ? '<p class="fm-tmdb">Info dari Wikipedia (CC BY-SA)</p>' : '') +
    '</div></div></div>';
  $('#subBody').innerHTML = h;
  if (ulang) $('#subBody').scrollTop = sy;
}
function tkTglKunci(t) {
  var a = new Date(t);
  return a.getFullYear() + '-' + ('0' + (a.getMonth() + 1)).slice(-2) + '-' + ('0' + a.getDate()).slice(-2);
}
function tkUrutTahun(y) {
  var m = /(-?\d+)/.exec(String(y || ''));
  if (!m) return 1e9;
  var n = +m[1];
  return /SM/i.test(y) ? -Math.abs(n) : n;
}
function tkBukaTautan(k, id) {
  if (k === 'im') {
    if (typeof imDetailId === 'undefined') return;
    imDetailId = id;
    openLayer('page:impian-detail');
    return;
  }
  if (k === 'bk') {
    openLayer('page:buku-detail:' + id);
    return;
  }
  if (k === 'fm') {
    var f = typeof fmCariItem === 'function' ? fmCariItem(id) : null;
    if (f && f.tm) openLayer('page:film-detail:' + id);
    else toast('Buka film ini dari Playlist Film');
    return;
  }
  if (k === 'ch') {
    openLayer('page:channel-detail:' + id);
    return;
  }
  if (k === 'tp') openLayer('page:tempat-detail:' + id);
}
function tkPilihTautan(x, k) {
  var S = tkSumber(k),
    ada =
      k === 'ch'
        ? S.filter(function (c) {
            return c.tk === x.id;
          }).map(function (c) {
            return c.id;
          })
        : (x.hub && x.hub[k]) || [];
  var L = S.filter(function (s) {
    return ada.indexOf(s.id) < 0;
  });
  if (!S.length) {
    toast('Belum ada ' + TK_HUB[k].n.toLowerCase() + '. Tambahkan dulu di ' + (k === 'im' ? 'tab Impian' : 'Galery › Lainnya'));
    return;
  }
  if (!L.length) {
    toast('Semua ' + TK_HUB[k].n.toLowerCase() + ' sudah ditautkan');
    return;
  }
  if (k !== 'ch' && ada.length >= TK_HUB_MAKS) {
    toast('Maksimal ' + TK_HUB_MAKS + ' tautan ' + TK_HUB[k].n.toLowerCase());
    return;
  }
  tpPilihan({
    judul: 'Tautkan ' + TK_HUB[k].n.toLowerCase(),
    opsi: L.slice(0, 300)
      .map(function (s) {
        return {
          kelas: 'tp-opsi-imp',
          html:
            '<i style="background:' +
            TK_HUB[k].w +
            ';color:#fff">' +
            TK_IK[k] +
            '</i><span><b>' +
            esc(s.t) +
            '</b>' +
            (s.tk && k === 'ch' ? '<small>Sudah ditautkan ke tokoh lain</small>' : '') +
            '</span>',
          aksi: function () {
            if (k === 'ch')
              chUbah(s.id, function (z) {
                z.tk = x.id;
              });
            else
              tkUbah(x.id, function (z) {
                z.hub = z.hub || {};
                z.hub[k] = (z.hub[k] || []).concat([s.id]);
              });
            toast('Ditautkan');
            tkRenderUlang();
          }
        };
      })
      .concat([{ t: 'Batal' }])
  });
}
function tkPola(x, teks) {
  if (typeof gpIsiAwal === 'undefined') return;
  gpIsiAwal = { teks: teks.trim(), asal: ['Tokoh', x.a] };
  openLayer('page:pola-form:');
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'tokoh-detail') return;
  var x = tkKini();
  if (!x) return;
  var el,
    id = x.id;
  if ((el = e.target.closest('[data-tkn]'))) {
    var n = +el.dataset.tkn;
    tkUbah(id, function (z) {
      if (z.n === n) delete z.n;
      else z.n = n;
    });
    tkRenderUlang();
    return;
  }
  if (e.target.closest('#tkArsip')) {
    tkUbah(id, function (z) {
      if (z.ar) delete z.ar;
      else z.ar = 1;
    });
    toast(x.ar ? 'Dikeluarkan dari arsip' : 'Diarsipkan');
    tkRenderUlang();
    return;
  }
  if (e.target.closest('#tkPolaAl')) {
    var al = ($('#tkAlasan') || {}).value || x.al || '';
    if (!al.trim()) {
      toast('Tulis dulu apa yang kamu kagumi darinya');
      $('#tkAlasan').focus();
      return;
    }
    tkPola(x, al);
    return;
  }
  if (e.target.closest('#tkSegarWiki')) {
    if (!x.wk) return;
    toast('Mengambil info terbaru…');
    tkWikiRingkas(x.wk.k, x.wk.l)
      .then(function (w) {
        tkUbah(id, function (z) {
          z.wk = { k: w.k, l: w.l, d: w.d, x: w.x, img: w.img, lh: w.lh, wf: w.wf };
        });
        toast('Info diperbarui');
        if (pageKind === 'tokoh-detail' && tkIdHalaman() === id) tkRenderUlang();
      })
      .catch(function (err) {
        toast(err.message || 'Gagal mengambil info');
      });
    return;
  }
  /* Kutipan */
  if (e.target.closest('#tkKuTambah')) {
    tkForm = { k: 'ku' };
    tkRenderUlang();
    var t0 = $('#tkKuT');
    if (t0) t0.focus();
    return;
  }
  if ((el = e.target.closest('[data-tkkue]'))) {
    tkForm = { k: 'ku', i: el.dataset.tkkue };
    tkRenderUlang();
    var t1 = $('#tkKuT');
    if (t1) {
      t1.focus();
      t1.scrollIntoView({ block: 'center' });
    }
    return;
  }
  if (e.target.closest('#tkFormBatal')) {
    tkForm = null;
    tkRenderUlang();
    return;
  }
  if (e.target.closest('#tkKuSimpan')) {
    var kt = $('#tkKuT').value.trim(),
      ks = $('#tkKuS').value.trim(),
      fi = tkForm && tkForm.i;
    if (!kt) {
      toast('Tulis kutipannya dulu');
      $('#tkKuT').focus();
      return;
    }
    if (!fi && (x.ku || []).length >= TK_KU_MAKS) {
      toast('Maksimal ' + TK_KU_MAKS + ' kutipan');
      return;
    }
    if (
      tkUbah(id, function (z) {
        if (fi)
          z.ku = (z.ku || []).map(function (k) {
            return k.i === fi ? { i: fi, t: kt, s: ks } : k;
          });
        else z.ku = [{ i: uid(), t: kt, s: ks }].concat(z.ku || []);
      })
    ) {
      tkForm = null;
      toast(fi ? 'Kutipan diperbarui' : 'Kutipan disimpan');
      tkRenderUlang();
    }
    return;
  }
  if ((el = e.target.closest('[data-tkkup]'))) {
    var kp = (x.ku || []).filter(function (k) {
      return k.i === el.dataset.tkkup;
    })[0];
    if (kp) tkPola(x, kp.t);
    return;
  }
  if ((el = e.target.closest('[data-tkkuh]'))) {
    var ki = el.dataset.tkkuh,
      kh = (x.ku || []).filter(function (k) {
        return k.i === ki;
      })[0];
    if (!kh) return;
    askConfirm({
      title: 'Hapus kutipan?',
      text: '"' + kh.t.slice(0, 80) + (kh.t.length > 80 ? '…' : '') + '" dihapus. Yang sudah ada di Pola Pikir tidak ikut terhapus.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          tkUbah(id, function (z) {
            z.ku = (z.ku || []).filter(function (k) {
              return k.i !== ki;
            });
          });
          tkRenderUlang();
          toast('Kutipan dihapus');
        });
      }
    });
    return;
  }
  /* Tiru */
  if (e.target.closest('#tkTiTambah')) {
    if ((x.ti || []).length >= TK_TI_MAKS) {
      toast('Maksimal ' + TK_TI_MAKS + ' hal');
      return;
    }
    tpMintaTeks({
      judul: 'Yang mau aku tiru',
      ph: 'mis. Belajar 1 jam setiap malam',
      maks: 200,
      ok: 'Tambah',
      cb: function (v) {
        v = v.trim();
        if (!v) return;
        tkUbah(id, function (z) {
          z.ti = (z.ti || []).concat([{ i: uid(), t: v }]);
        });
        tkRenderUlang();
      }
    });
    return;
  }
  if ((el = e.target.closest('[data-tkti]'))) {
    var ti = el.dataset.tkti;
    tkUbah(id, function (z) {
      (z.ti || []).forEach(function (t) {
        if (t.i === ti) {
          if (t.m) delete t.m;
          else t.m = Date.now();
        }
      });
    });
    tkRenderUlang();
    return;
  }
  if ((el = e.target.closest('[data-tktie]'))) {
    var te = (x.ti || []).filter(function (t) {
      return t.i === el.dataset.tktie;
    })[0];
    if (!te) return;
    tpMintaTeks({
      judul: 'Ubah',
      nilai: te.t,
      maks: 200,
      ok: 'Simpan',
      cb: function (v) {
        v = v.trim();
        if (!v) return;
        tkUbah(id, function (z) {
          (z.ti || []).forEach(function (t) {
            if (t.i === te.i) t.t = v;
          });
        });
        tkRenderUlang();
      }
    });
    return;
  }
  if ((el = e.target.closest('[data-tktih]'))) {
    var th = (x.ti || []).filter(function (t) {
      return t.i === el.dataset.tktih;
    })[0];
    if (!th) return;
    askConfirm({
      title: 'Hapus?',
      text: '"' + th.t.slice(0, 80) + '" dihapus dari daftar yang mau kamu tiru.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          tkUbah(id, function (z) {
            z.ti = (z.ti || []).filter(function (t) {
              return t.i !== th.i;
            });
          });
          tkRenderUlang();
          toast('Dihapus');
        });
      }
    });
    return;
  }
  /* Perjalanan hidup */
  if (e.target.closest('#tkPjTambah')) {
    tkForm = { k: 'pj' };
    tkRenderUlang();
    var p0 = $('#tkPjY');
    if (p0) {
      p0.focus();
      p0.scrollIntoView({ block: 'center' });
    }
    return;
  }
  if ((el = e.target.closest('[data-tkpje]'))) {
    var pe = el.dataset.tkpje;
    tpPilihan({
      judul: 'Peristiwa',
      opsi: [
        {
          t: 'Ubah',
          aksi: function () {
            tkForm = { k: 'pj', i: pe };
            tkRenderUlang();
            var p1 = $('#tkPjT');
            if (p1) {
              p1.focus();
              p1.scrollIntoView({ block: 'center' });
            }
          }
        },
        {
          t: 'Hapus',
          kelas: 'bahaya',
          aksi: function () {
            var pp = (x.pj || []).filter(function (p) {
              return p.i === pe;
            })[0];
            if (!pp) return;
            askConfirm({
              title: 'Hapus peristiwa?',
              text: '"' + (pp.y ? pp.y + ' – ' : '') + pp.t.slice(0, 80) + '" dihapus.',
              ok: 'Hapus',
              action: function () {
                back(1, function () {
                  tkUbah(id, function (z) {
                    z.pj = (z.pj || []).filter(function (p) {
                      return p.i !== pe;
                    });
                  });
                  tkRenderUlang();
                  toast('Dihapus');
                });
              }
            });
          }
        },
        { t: 'Batal' }
      ]
    });
    return;
  }
  if (e.target.closest('#tkPjSimpan')) {
    var py = $('#tkPjY').value.trim(),
      pt = $('#tkPjT').value.trim(),
      pc = $('#tkPjC').value.trim(),
      pi = tkForm && tkForm.i;
    if (!pt) {
      toast('Isi peristiwanya dulu');
      $('#tkPjT').focus();
      return;
    }
    if (!pi && (x.pj || []).length >= TK_PJ_MAKS) {
      toast('Maksimal ' + TK_PJ_MAKS + ' peristiwa');
      return;
    }
    if (
      tkUbah(id, function (z) {
        var o = { i: pi || uid(), y: py, t: pt, c: pc };
        if (pi)
          z.pj = (z.pj || []).map(function (p) {
            return p.i === pi ? o : p;
          });
        else z.pj = (z.pj || []).concat([o]);
      })
    ) {
      tkForm = null;
      toast('Disimpan');
      tkRenderUlang();
    }
    return;
  }
  /* Tautan */
  if ((el = e.target.closest('[data-tkht]'))) {
    tkPilihTautan(x, el.dataset.tkht);
    return;
  }
  if ((el = e.target.closest('[data-tkhb]'))) {
    var a = el.dataset.tkhb.split('|');
    tkBukaTautan(a[0], a.slice(1).join('|'));
    return;
  }
  if ((el = e.target.closest('[data-tkhl]'))) {
    var b = el.dataset.tkhl.split('|'),
      hk = b[0],
      hid = b.slice(1).join('|'),
      nm =
        (
          tkTautan(x).filter(function (t) {
            return t.k === hk && t.id === hid;
          })[0] || {}
        ).t || '';
    askConfirm({
      title: 'Lepas tautan?',
      text: '"' + nm.slice(0, 80) + '" tidak lagi terhubung dengan ' + x.a + '. Datanya sendiri tidak dihapus.',
      ok: 'Lepas',
      action: function () {
        back(1, function () {
          if (hk === 'ch')
            chUbah(hid, function (z) {
              if (z.tk === id) delete z.tk;
            });
          else
            tkUbah(id, function (z) {
              if (z.hub && z.hub[hk]) {
                z.hub[hk] = z.hub[hk].filter(function (v) {
                  return v !== hid;
                });
                if (!z.hub[hk].length) delete z.hub[hk];
              }
            });
          tkRenderUlang();
          toast('Tautan dilepas');
        });
      }
    });
    return;
  }
  /* Bidang */
  if ((el = e.target.closest('[data-tktop]'))) {
    var t2 = el.dataset.tktop;
    tkUbah(id, function (z) {
      var a2 = z.top || [],
        k2 = a2.indexOf(t2);
      if (k2 >= 0) a2.splice(k2, 1);
      else a2.push(t2);
      z.top = a2;
    });
    tkRenderUlang();
    return;
  }
  if (e.target.closest('#tkTopikBaru2')) {
    tkTopikBaru(function (t3) {
      tkUbah(id, function (z) {
        z.top = (z.top || []).concat((z.top || []).indexOf(t3) < 0 ? [t3] : []);
      });
      tkRenderUlang();
    });
    return;
  }
  /* Info */
  if (e.target.closest('#tkUbahNama')) {
    tpMintaTeks({
      judul: 'Nama',
      nilai: x.a,
      maks: 100,
      ok: 'Simpan',
      cb: function (v) {
        v = v.trim();
        if (!v) return;
        tkUbah(id, function (z) {
          z.a = v;
        });
        tkRenderUlang();
      }
    });
    return;
  }
  if (e.target.closest('#tkUbahB')) {
    tpMintaTeks({
      judul: x.j === 'dkt' ? 'Hubungan' : 'Dikenal sebagai',
      nilai: x.b || '',
      maks: 120,
      ok: 'Simpan',
      cb: function (v) {
        tkUbah(id, function (z) {
          z.b = v.trim();
        });
        tkRenderUlang();
      }
    });
    return;
  }
  if (e.target.closest('#tkUbahKa')) {
    tpMintaTeks({
      judul: 'Dari karya',
      nilai: x.ka || '',
      ph: 'Judul novel / film / anime',
      maks: 120,
      ok: 'Simpan',
      cb: function (v) {
        tkUbah(id, function (z) {
          z.ka = v.trim();
        });
        tkRenderUlang();
      }
    });
    return;
  }
  if (e.target.closest('#tkUbahJ')) {
    tpPilihan({
      judul: 'Jenis tokoh',
      opsi: Object.keys(TK_JENIS)
        .map(function (j) {
          return {
            t: TK_JENIS[j].n + (x.j === j ? ' ✓' : ''),
            aksi: function () {
              tkUbah(id, function (z) {
                z.j = j;
              });
              tkRenderUlang();
            }
          };
        })
        .concat([{ t: 'Batal' }])
    });
    return;
  }
  if (e.target.closest('#tkHapusAv')) {
    askConfirm({
      title: 'Hapus foto?',
      text: 'Foto yang kamu pasang untuk ' + x.a + ' dihapus.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          tkUbah(id, function (z) {
            delete z.av;
          });
          tkRenderUlang();
        });
      }
    });
    return;
  }
  if (e.target.closest('#tkHapus')) {
    askConfirm({
      title: 'Hapus tokoh?',
      text:
        '"' +
        x.a.slice(0, 80) +
        '" beserta kutipan, catatan, dan tautannya dihapus. Kartu Pola Pikir yang sudah dibuat tidak ikut terhapus.',
      ok: 'Hapus',
      action: function () {
        back(2, function () {
          tkSimpanData(
            tkItems().filter(function (z) {
              return z.id !== id;
            })
          );
          if (typeof chItems === 'function')
            chItems().forEach(function (c) {
              if (c.tk === id)
                chUbah(c.id, function (z) {
                  delete z.tk;
                });
            });
          renderGaleryTab();
          if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
          toast('Tokoh dihapus');
        });
      }
    });
  }
});
$('#subBody').addEventListener('keydown', function (e) {
  if (pageKind === 'tokoh-detail' && e.key === 'Enter' && e.target.matches('[data-tkkue],[data-tktie],[data-tkpje]')) e.target.click();
});
var tkAlT = null;
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'tokoh-detail' || e.target.id !== 'tkAlasan') return;
  var id = tkIdHalaman(),
    v = e.target.value.replace(/\s+$/, '');
  clearTimeout(tkAlT);
  tkAlT = setTimeout(function () {
    tkUbah(id, function (z) {
      z.al = v;
    });
  }, 600);
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'tokoh-detail') return;
  if (e.target.id === 'tkAlasan') {
    clearTimeout(tkAlT);
    var v = e.target.value.replace(/\s+$/, '');
    tkUbah(tkIdHalaman(), function (z) {
      z.al = v;
    });
  }
  if (e.target.id === 'tkAvFile') {
    var f = e.target.files && e.target.files[0],
      id = tkIdHalaman();
    e.target.value = '';
    if (!f) return;
    tkKecilkanFoto(f, function (url) {
      tkUbah(id, function (z) {
        z.av = url;
      });
      toast('Foto dipasang');
      tkRenderUlang();
    });
  }
});
function tkSegarkan() {
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'tokoh') glRenderDaftar();
  else if (opened.page && pageKind === 'tokoh-detail' && !tkForm && document.activeElement && document.activeElement.id !== 'tkAlasan')
    tkRenderUlang();
}
tkMigrasi();
