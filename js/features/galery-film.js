/* ============================================================
   Stivora — Galery · Lainnya · Playlist Film (5.58.0)
   - Cari film & serial lewat TMDB melalui Worker (key disimpan di Worker), simpan ke 'stivora.galery.lainnya'.film
     (ikut sinkron & cadangan; hanya teks). Item film TMDB:
     { id, a: judul, b: 'tahun · genre', url, s: 'ingin'|'sedang'|'sudah', c: catatan, dibuat, diubah,
       tm: { t: 'movie'|'tv', id, p: poster, bd: backdrop, th: tahun, g: [genre], o: judul asli,
             es: [jumlah episode per musim], ms, ep: kemajuan serial, n: nilai 1-5, tg: 'YYYY-MM-DD' } }
   - Detail (sinopsis, pemain, trailer, tempat menonton dari JustWatch) diambil saat dibuka, tidak disimpan.
   - Item tanpa TMDB (manual / film lama) tetap memakai formulir lama dan bisa dicocokkan ke TMDB.
   ============================================================ */
'use strict';

var FM_IMG = 'https://image.tmdb.org/t/p/';
var FM_URUT = ['Terbaru ditambah', 'Judul A–Z', 'Tahun rilis', 'Nilai saya'];
var fmS = '',
  fmJ = '',
  fmUrut = 0,
  fmCache = {},
  fmCariJ = '',
  fmCariQ = '',
  fmCocok = null,
  fmCariNo = 0,
  fmCariT = null;

/* TMDB lewat Worker (key disimpan di Worker, 5.66.0) */
function fmApiSiap() {
  return glApiSiap();
}
function fmPath(p) {
  return typeof p === 'string' && /^\/[A-Za-z0-9_.-]{1,80}$/.test(p) ? p : '';
}
function fmTgl(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : '';
}
function fmHariIni() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function fmSah(m) {
  if (!m || typeof m !== 'object' || (m.t !== 'movie' && m.t !== 'tv') || !(+m.id > 0)) return null;
  var o = { t: m.t, id: Math.floor(+m.id) };
  if (fmPath(m.p)) o.p = m.p;
  if (fmPath(m.bd)) o.bd = m.bd;
  if (+m.th > 1800 && +m.th < 2200) o.th = Math.floor(+m.th);
  if (Array.isArray(m.g))
    o.g = m.g
      .filter(function (x) {
        return typeof x === 'string';
      })
      .slice(0, 4)
      .map(function (x) {
        return x.slice(0, 40);
      });
  if (typeof m.o === 'string' && m.o) o.o = m.o.slice(0, 150);
  if (Array.isArray(m.es))
    o.es = m.es.slice(0, 80).map(function (x) {
      return Math.max(0, Math.min(9999, Math.floor(+x) || 0));
    });
  if (+m.ms > 0) o.ms = Math.min(999, Math.floor(+m.ms));
  if (+m.ep >= 0 && m.ep !== undefined) o.ep = Math.min(9999, Math.floor(+m.ep));
  if (+m.n >= 1 && +m.n <= 5) o.n = Math.floor(+m.n);
  if (fmTgl(m.tg)) o.tg = m.tg;
  return o;
}
function fmCariItem(id) {
  return (
    glSemua().film.filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function fmUbahItem(id, f) {
  var o = glSemua(),
    hasil = null;
  o.film = o.film.map(function (x) {
    if (x.id !== id) return x;
    var z = Object.assign({}, x);
    z.tm = x.tm ? Object.assign({}, x.tm) : undefined;
    f(z);
    z.diubah = Date.now();
    hasil = z;
    return z;
  });
  if (hasil) glSimpanSemua(o);
  return hasil;
}
function fmTotalEps(m) {
  return (m.es || []).reduce(function (a, b) {
    return a + b;
  }, 0);
}
function fmSelesaiEps(m) {
  var ms = m.ms || 1;
  return (
    (m.es || []).slice(0, ms - 1).reduce(function (a, b) {
      return a + b;
    }, 0) + (m.ep || 0)
  );
}

/* ---------- TMDB API ---------- */
function fmApi(jalur, q) {
  return glApi('tmdb', jalur, q);
}
function fmDetail(t, id) {
  var k = t + id;
  if (fmCache[k]) return Promise.resolve(fmCache[k]);
  return fmApi(t + '/' + id, {
    language: 'id-ID',
    append_to_response: 'credits,videos,watch/providers',
    include_video_language: 'id,en,null'
  })
    .then(function (d) {
      if (d.overview) return d;
      return fmApi(t + '/' + id, { language: 'en-US' })
        .then(function (e) {
          d.overview = e.overview || '';
          return d;
        })
        .catch(function () {
          return d;
        });
    })
    .then(function (d) {
      fmCache[k] = d;
      return d;
    });
}
function fmDariTmdb(t, d) {
  var tgl = t === 'movie' ? d.release_date : d.first_air_date,
    th = +String(tgl || '').slice(0, 4) || 0;
  var g = (d.genres || [])
    .map(function (x) {
      return x.name;
    })
    .filter(Boolean);
  if (!g.length && Array.isArray(d.genre_ids)) g = d.genre_ids.map(fmNamaGenre).filter(Boolean);
  var a = (t === 'movie' ? d.title : d.name) || '',
    o = (t === 'movie' ? d.original_title : d.original_name) || '';
  var m = { t: t, id: d.id, p: d.poster_path, bd: d.backdrop_path, th: th, g: g.slice(0, 3), o: o && o !== a ? o : '' };
  if (t === 'tv' && Array.isArray(d.seasons))
    m.es = d.seasons
      .filter(function (s) {
        return s.season_number > 0;
      })
      .sort(function (x, y) {
        return x.season_number - y.season_number;
      })
      .map(function (s) {
        return s.episode_count || 0;
      });
  return { a: a, b: [th || '', g[0] || ''].filter(Boolean).join(' · '), tm: fmSah(m) };
}
var FM_GENRE = {
  28: 'Laga',
  12: 'Petualangan',
  16: 'Animasi',
  35: 'Komedi',
  80: 'Kejahatan',
  99: 'Dokumenter',
  18: 'Drama',
  10751: 'Keluarga',
  14: 'Fantasi',
  36: 'Sejarah',
  27: 'Horor',
  10402: 'Musik',
  9648: 'Misteri',
  10749: 'Romantis',
  878: 'Fiksi Ilmiah',
  10770: 'Film TV',
  53: 'Cerita Seru',
  10752: 'Perang',
  37: 'Barat',
  10759: 'Laga & Petualangan',
  10762: 'Anak',
  10763: 'Berita',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasi',
  10766: 'Sinetron',
  10767: 'Talk',
  10768: 'War & Politics'
};
function fmNamaGenre(id) {
  return FM_GENRE[id] || '';
}

/* ---------- Ikon ---------- */
var FM_IK = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  film: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
  ingin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  sedang: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M8 5v14l11-7z"/></svg>',
  sudah: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  bintang:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  urut: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg>',
  tv: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  hapus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  orang: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/></svg>'
};
var FM_ST = { ingin: 'Ingin', sedang: 'Sedang', sudah: 'Sudah' };
var FM_ST_PANJANG = { ingin: 'Ingin ditonton', sedang: 'Sedang ditonton', sudah: 'Sudah ditonton' };

function fmPosterHtml(x, opsi) {
  opsi = opsi || {};
  var m = x.tm || {},
    src = m.p ? FM_IMG + (opsi.besar ? 'w342' : 'w185') + m.p : '';
  var h =
    '<span class="fm-poster' +
    (src ? '' : ' kosong') +
    '">' +
    (src ? '<img src="' + src + '" alt="" loading="lazy" decoding="async">' : '') +
    '<span class="fm-poster-j">' +
    esc(x.a) +
    '</span>';
  if (!opsi.polos) {
    if (m.t === 'tv') h += '<span class="fm-lenc">Serial</span>';
    if (x.s) h += '<span class="fm-st fm-st-' + x.s + '">' + FM_IK[x.s] + '</span>';
    if (m.t === 'tv' && x.s === 'sedang' && fmTotalEps(m))
      h += '<span class="fm-maju"><i style="width:' + Math.min(100, Math.round((fmSelesaiEps(m) / fmTotalEps(m)) * 100)) + '%"></i></span>';
  }
  return h + '</span>';
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
      (t.parentNode.classList.contains('fm-poster') || t.parentNode.classList.contains('fm-orang'))
    ) {
      t.parentNode.classList.add('kosong');
      t.remove();
    }
  },
  true
);

/* ---------- Rak di halaman Playlist Film ---------- */
function fmRenderDaftar(box, semua, q) {
  if (!semua.length) {
    box.innerHTML =
      '<div class="lg-kosong fm-kosong">' +
      FM_IK.film +
      '<p>Belum ada film.<br>Ketuk <b>Tambah</b> lalu ketik judul film atau serial.</p></div>';
    return;
  }
  var n = function (f) {
    return semua.filter(f).length;
  };
  var jenis = function (x) {
    return x.tm ? (x.tm.t === 'tv' ? 'serial' : 'film') : 'film';
  };
  var adaSerial = semua.some(function (x) {
    return jenis(x) === 'serial';
  });
  if (!adaSerial) fmJ = '';
  var h =
    '<div class="gp-filter gl-filter">' +
    [
      ['', 'Semua', semua.length],
      [
        'ingin',
        'Ingin ditonton',
        n(function (x) {
          return x.s === 'ingin';
        })
      ],
      [
        'sedang',
        'Sedang',
        n(function (x) {
          return x.s === 'sedang';
        })
      ],
      [
        'sudah',
        'Sudah',
        n(function (x) {
          return x.s === 'sudah';
        })
      ]
    ]
      .filter(function (c) {
        return !c[0] || c[2] || fmS === c[0];
      })
      .map(function (c) {
        return (
          '<button type="button" data-fm-s="' +
          c[0] +
          '"' +
          (fmS === c[0] ? ' class="on"' : '') +
          '>' +
          c[1] +
          ' <small>' +
          c[2] +
          '</small></button>'
        );
      })
      .join('') +
    '</div>';
  if (adaSerial)
    h +=
      '<div class="gp-filter gl-filter fm-jenis">' +
      [
        ['', 'Film & serial'],
        ['film', 'Film'],
        ['serial', 'Serial']
      ]
        .map(function (c) {
          return '<button type="button" data-fm-j="' + c[0] + '"' + (fmJ === c[0] ? ' class="on"' : '') + '>' + c[1] + '</button>';
        })
        .join('') +
      '</div>';
  var L = semua.filter(function (x) {
    return (
      (!fmS || x.s === fmS) &&
      (!fmJ || jenis(x) === fmJ) &&
      (!q || (x.a + ' ' + x.b + ' ' + x.c + ' ' + ((x.tm && x.tm.o) || '')).toLowerCase().indexOf(q) >= 0)
    );
  });
  if (fmUrut === 1)
    L.sort(function (a, b) {
      return a.a.localeCompare(b.a, 'id');
    });
  else if (fmUrut === 2)
    L.sort(function (a, b) {
      return ((b.tm && b.tm.th) || 0) - ((a.tm && a.tm.th) || 0);
    });
  else if (fmUrut === 3)
    L.sort(function (a, b) {
      return ((b.tm && b.tm.n) || 0) - ((a.tm && a.tm.n) || 0);
    });
  h +=
    '<div class="fm-urut"><span>' +
    L.length +
    ' judul</span><button type="button" id="fmUrut">' +
    FM_IK.urut +
    FM_URUT[fmUrut] +
    '</button></div>';
  if (!L.length) h += '<p class="gt-kosong">Tidak ada yang cocok.</p>';
  else
    h +=
      '<div class="fm-rak">' +
      L.map(function (x) {
        var m = x.tm || {},
          sub = [];
        if (m.n) sub.push('<span class="fm-nilai">★ ' + m.n + '</span>');
        if (m.th) sub.push(m.th);
        if (m.t === 'tv')
          sub.push(x.s === 'sedang' && m.ms ? 'M' + m.ms + ' E' + (m.ep || 0) : m.es && m.es.length ? m.es.length + ' musim' : 'Serial');
        else if (m.g && m.g[0]) sub.push(esc(m.g[0]));
        else if (!x.tm && x.b) sub.push(esc(x.b));
        return (
          '<button type="button" class="fm-kartu" ' +
          (x.tm ? 'data-fm="' : 'data-gl-item="') +
          esc(x.id) +
          '">' +
          fmPosterHtml(x) +
          '<b>' +
          esc(x.a) +
          '</b><small>' +
          sub.join(' · ') +
          '</small></button>'
        );
      }).join('') +
      '</div>';
  h += '<p class="fm-atribusi">Info film dari TMDB · Tempat menonton dari JustWatch</p>';
  if (semua.length >= GL_ITEM_MAKS) h += '<p class="gp-catatan">Sudah ' + GL_ITEM_MAKS + ' film (batas maksimal).</p>';
  box.innerHTML = h;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'film') return;
  var el;
  if ((el = e.target.closest('[data-fm-s]'))) {
    fmS = el.dataset.fmS;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-fm-j]'))) {
    fmJ = el.dataset.fmJ;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#fmUrut')) {
    fmUrut = (fmUrut + 1) % FM_URUT.length;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#fmTambahBtn')) {
    fmCocok = null;
    fmCariQ = '';
    openLayer('page:film-cari');
    return;
  }
  if ((el = e.target.closest('[data-fm]'))) openLayer('page:film-detail:' + el.dataset.fm);
});

/* ---------- Halaman cari ---------- */
PAGES['film-cari'] = function () {
  var cocok = fmCocok ? fmCariItem(fmCocok) : null;
  if (fmCocok && !cocok) fmCocok = null;
  $('#subTitle').textContent = cocok ? 'Cocokkan ke TMDB' : 'Tambah film / serial';
  $('#subBody').innerHTML =
    '<div class="fm-cari">' +
    (cocok ? '<p class="lg-ket">Pilih judul yang sama dengan <b>' + esc(cocok.a) + '</b>. Status dan catatanmu tetap disimpan.</p>' : '') +
    '<label class="gt-cari fm-cari-kolom">' +
    GT_IKON_CARI +
    '<input type="search" id="fmQ" placeholder="Ketik judul film atau serial" autocomplete="off" data-tanpa-hitung value="' +
    esc(fmCariQ) +
    '"></label>' +
    '<div class="gp-filter gl-filter fm-jenis">' +
    [
      ['', 'Semua'],
      ['movie', 'Film'],
      ['tv', 'Serial']
    ]
      .map(function (c) {
        return '<button type="button" data-fmc-j="' + c[0] + '"' + (fmCariJ === c[0] ? ' class="on"' : '') + '>' + c[1] + '</button>';
      })
      .join('') +
    '</div>' +
    '<div id="fmHasil" aria-live="polite"></div></div>';
  fmCari();
  setTimeout(function () {
    var i = $('#fmQ');
    if (i && pageKind === 'film-cari' && !i.value) i.focus();
  }, 300);
  return true;
};
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'film-cari' && e.target.id === 'fmQ') {
    fmCariQ = e.target.value;
    clearTimeout(fmCariT);
    fmCariT = setTimeout(fmCari, 400);
  }
});
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'film-cari') return;
  var el;
  if ((el = e.target.closest('[data-fmc-j]'))) {
    fmCariJ = el.dataset.fmcJ;
    $$('#subBody [data-fmc-j]').forEach(function (b) {
      b.classList.toggle('on', b === el);
    });
    fmCari();
    return;
  }
  if (e.target.closest('#fmManual')) {
    var q = fmCariQ.trim();
    back(1, function () {
      glItemId = null;
      glIsiA = q;
      openLayer('page:galery-koleksi-item');
    });
    return;
  }
  if ((el = e.target.closest('[data-fmc]'))) fmPilih(el.dataset.fmcT, +el.dataset.fmc);
});
function fmHasilKotak(h) {
  var b = $('#fmHasil');
  if (b && pageKind === 'film-cari') b.innerHTML = h;
}
function fmCari() {
  var q = fmCariQ.trim(),
    no = ++fmCariNo;
  var manual = '<p class="fm-manual">Tidak ada yang cocok? <button type="button" id="fmManual">Tambah manual</button></p>';
  if (fmCocok) manual = '';
  if (!fmApiSiap()) {
    fmHasilKotak(
      '<p class="lg-salah">' + esc(glApiAlasan()) + ', jadi pencarian TMDB belum bisa dipakai. Film tetap bisa diisi manual.</p>' + manual
    );
    return;
  }
  if (!q) {
    fmHasilKotak('<p class="fm-manual">Contoh: ketik <b>laskar pelangi</b>, lalu pilih dari hasilnya.</p>' + manual);
    return;
  }
  fmHasilKotak('<div class="lg-muat"><i></i>Mencari di TMDB…</div>');
  var jalur = fmCariJ ? 'search/' + fmCariJ : 'search/multi';
  fmApi(jalur, { query: q, language: 'id-ID', include_adult: 'false', page: 1 })
    .then(function (j) {
      if (no !== fmCariNo) return;
      var punya = {};
      glSemua().film.forEach(function (x) {
        if (x.tm) punya[x.tm.t + x.tm.id] = x.id;
      });
      var L = (j.results || [])
        .map(function (r) {
          if (!r.media_type) r.media_type = fmCariJ;
          return r;
        })
        .filter(function (r) {
          return r.media_type === 'movie' || r.media_type === 'tv';
        })
        .slice(0, 20);
      if (!L.length) {
        fmHasilKotak('<p class="gt-kosong">Tidak ditemukan di TMDB.</p>' + manual);
        return;
      }
      fmHasilKotak(
        '<div class="fm-hasil">' +
          L.map(function (r) {
            var t = r.media_type,
              x = fmDariTmdb(t, r),
              ada = punya[t + r.id];
            var sub = [x.tm.th || '', x.tm.o || '', (x.tm.g || []).join(', ')].filter(Boolean).map(esc).join(' · ');
            return (
              '<button type="button" class="fm-hasil-i" data-fmc="' +
              r.id +
              '" data-fmc-t="' +
              t +
              '">' +
              fmPosterHtml({ a: x.a, tm: x.tm }, { polos: true }) +
              '<span class="fm-hasil-tx"><b>' +
              esc(x.a) +
              '</b>' +
              (sub ? '<small>' + sub + '</small>' : '') +
              '<span><em class="lg-lb fm-lb">' +
              (t === 'tv' ? 'Serial' : 'Film') +
              '</em>' +
              (ada ? ' <span class="fm-ada">✓ Sudah di koleksi</span>' : '') +
              '</span></span>' +
              (ada ? '' : '<span class="fm-plus">' + FM_IK.plus + '</span>') +
              '</button>'
            );
          }).join('') +
          '</div>' +
          manual
      );
    })
    .catch(function (err) {
      if (no !== fmCariNo) return;
      fmHasilKotak(
        '<p class="lg-salah">' +
          esc(
            err && err.message === 'tanpa-key'
              ? glApiAlasan() + '.'
              : err && /fetch/i.test(err.message)
                ? 'Tidak ada koneksi internet.'
                : (err && err.message) || 'Pencarian gagal.'
          ) +
          '</p>' +
          manual
      );
    });
}
var fmPilihJalan = false;
function fmPilih(t, id) {
  if (fmPilihJalan) return;
  var ada = glSemua().film.filter(function (x) {
    return x.tm && x.tm.t === t && x.tm.id === id;
  })[0];
  if (ada && !fmCocok) {
    back(1, function () {
      openLayer('page:film-detail:' + ada.id);
    });
    return;
  }
  if (ada && fmCocok && ada.id !== fmCocok) {
    toast('Judul ini sudah ada di koleksi');
    return;
  }
  fmPilihJalan = true;
  fmHasilKotak('<div class="lg-muat"><i></i>Mengambil info film…</div>');
  fmDetail(t, id)
    .then(function (d) {
      var x = fmDariTmdb(t, d),
        o = glSemua(),
        kini = Date.now(),
        tujuan;
      if (fmCocok) {
        tujuan = fmCocok;
        o.film = o.film.map(function (z) {
          if (z.id !== fmCocok) return z;
          var tm = x.tm;
          if (z.s === 'sudah') tm.tg = fmHariIni();
          if (tm.t === 'tv' && z.s === 'sedang') {
            tm.ms = 1;
            tm.ep = 0;
          }
          return {
            id: z.id,
            a: x.a.slice(0, GL_A_MAKS),
            b: x.b.slice(0, GL_B_MAKS),
            url: z.url,
            s: z.s === 'sudah' || z.s === 'sedang' ? z.s : 'ingin',
            c: z.c,
            dibuat: z.dibuat,
            diubah: kini,
            tm: tm
          };
        });
      } else {
        if (o.film.length >= GL_ITEM_MAKS) {
          toast('Maksimal ' + GL_ITEM_MAKS + ' film');
          fmPilihJalan = false;
          fmCari();
          return;
        }
        tujuan = uid();
        o.film.unshift({
          id: tujuan,
          a: x.a.slice(0, GL_A_MAKS),
          b: x.b.slice(0, GL_B_MAKS),
          url: '',
          s: 'ingin',
          c: '',
          dibuat: kini,
          diubah: kini,
          tm: x.tm
        });
      }
      if (glPenuh(o)) {
        toast('Ruang tab Lainnya penuh. Hapus beberapa item dulu.');
        fmPilihJalan = false;
        fmCari();
        return;
      }
      glSimpanSemua(o);
      var c = fmCocok;
      fmCocok = null;
      fmPilihJalan = false;
      back(1, function () {
        renderGaleryTab();
        openLayer('page:film-detail:' + tujuan);
        toast(c ? 'Dicocokkan ke TMDB' : (t === 'tv' ? 'Serial' : 'Film') + ' ditambahkan ke Ingin ditonton');
      });
    })
    .catch(function (err) {
      fmPilihJalan = false;
      fmHasilKotak('<p class="lg-salah">' + esc((err && err.message) || 'Gagal mengambil info.') + '</p>');
    });
}

/* ---------- Halaman detail ---------- */
function fmIdHalaman() {
  var L = layerOf('page');
  return L ? L.name.split(':').slice(2).join(':') : '';
}
PAGES['film-detail'] = function () {
  var x = fmCariItem(fmIdHalaman());
  if (!x || !x.tm) return false;
  $('#subTitle').textContent = x.a;
  fmRenderDetail(x, fmCache[x.tm.t + x.tm.id] || null);
  if (!fmCache[x.tm.t + x.tm.id]) {
    var id = x.id;
    fmDetail(x.tm.t, x.tm.id)
      .then(function (d) {
        if (pageKind !== 'film-detail' || fmIdHalaman() !== id) return;
        fmPerbaruiDariDetail(id, d);
        var y = fmCariItem(id);
        if (y) fmRenderDetail(y, d, true);
      })
      .catch(function (err) {
        if (pageKind !== 'film-detail' || fmIdHalaman() !== id) return;
        var b = $('#fmInfoTmdb');
        if (b)
          b.innerHTML =
            '<p class="lg-salah">' +
            esc(
              err && err.message === 'tanpa-key'
                ? glApiAlasan() + ', jadi sinopsis, pemain, trailer, dan tempat menonton belum bisa ditampilkan.'
                : 'Info dari TMDB tidak bisa diambil. Periksa koneksi internet.'
            ) +
            '</p>';
      });
  }
  return true;
};
/* Data kecil yang berubah di TMDB (poster, jumlah episode) disegarkan saat detail dibuka */
function fmPerbaruiDariDetail(id, d) {
  var x = fmCariItem(id);
  if (!x || !x.tm) return;
  var b = fmDariTmdb(x.tm.t, d).tm,
    m = x.tm,
    ubah = false;
  ['p', 'bd', 'th', 'o'].forEach(function (k) {
    if (b[k] && b[k] !== m[k]) ubah = true;
  });
  if (b.es && JSON.stringify(b.es) !== JSON.stringify(m.es || [])) ubah = true;
  if (b.g && b.g.length && JSON.stringify(b.g) !== JSON.stringify(m.g || [])) ubah = true;
  if (!ubah) return;
  fmUbahItem(id, function (z) {
    ['p', 'bd', 'th', 'o', 'es', 'g'].forEach(function (k) {
      if (b[k]) z.tm[k] = b[k];
    });
    z.tm = fmSah(z.tm);
  });
}
function fmDurasi(t, d) {
  var mnt = t === 'movie' ? d.runtime : d.episode_run_time && d.episode_run_time[0];
  if (!mnt) return '';
  return (mnt >= 60 ? Math.floor(mnt / 60) + ' j ' : '') + (mnt % 60 ? (mnt % 60) + ' m' : '') + (t === 'tv' ? ' / ep' : '');
}
function fmTrailer(d) {
  var v = ((d && d.videos && d.videos.results) || []).filter(function (r) {
    return r.site === 'YouTube' && /^[A-Za-z0-9_-]{6,20}$/.test(r.key || '');
  });
  var urut = function (r) {
    return (r.type === 'Trailer' ? 0 : r.type === 'Teaser' ? 1 : 2) * 10 + (r.official ? 0 : 1) + (r.iso_639_1 === 'id' ? -5 : 0);
  };
  v.sort(function (a, b) {
    return urut(a) - urut(b);
  });
  return v[0] || null;
}
function fmRenderDetail(x, d, ulang) {
  var m = x.tm,
    simpanScroll = ulang ? $('#subBody').scrollTop : 0;
  var bd = m.bd ? FM_IMG + 'w780' + m.bd : '';
  var meta = [m.th || ''];
  if (d) {
    var du = fmDurasi(m.t, d);
    if (m.t === 'tv') meta.push((d.number_of_seasons || (m.es || []).length || '?') + ' musim');
    if (du) meta.push(du);
    if (d.vote_average) meta.push('★ ' + Math.round(d.vote_average * 10) / 10 + ' TMDB');
  } else if (m.t === 'tv' && m.es) meta.push(m.es.length + ' musim');
  var h =
    '<div class="fm-det">' +
    '<div class="fm-hero' +
    (bd ? '' : ' polos') +
    '">' +
    (bd ? '<img class="fm-hero-bg" src="' + bd + '" alt="">' : '') +
    '<div class="fm-hero-isi">' +
    fmPosterHtml(x, { polos: true, besar: true }) +
    '<div class="fm-hero-tx"><h2>' +
    esc(x.a) +
    '</h2>' +
    (m.o ? '<p class="fm-asli">' + esc(m.o) + '</p>' : '') +
    '<div class="fm-meta">' +
    meta
      .filter(Boolean)
      .map(function (s) {
        return '<span>' + esc(String(s)) + '</span>';
      })
      .join('') +
    (m.t === 'tv' ? '<span>Serial</span>' : '') +
    '</div>' +
    ((m.g || []).length
      ? '<div class="fm-meta">' +
        m.g
          .map(function (g) {
            return '<span>' + esc(g) + '</span>';
          })
          .join('') +
        '</div>'
      : '') +
    '</div></div></div>' +
    '<div class="fm-det-grid"><div class="fm-det-kiri">';
  var tr = fmTrailer(d);
  h +=
    '<div class="fm-tombol"><button type="button" class="utama" id="fmTrailerBtn"' +
    (d && !tr ? ' disabled' : '') +
    '>' +
    FM_IK.sedang +
    (d && !tr ? 'Tanpa trailer' : 'Trailer') +
    '</button>' +
    '<button type="button" id="fmKeTonton">' +
    FM_IK.tv +
    'Tonton di…</button></div>';
  h += '<div id="fmInfoTmdb">';
  if (!d) h += '<div class="lg-muat fm-muat"><i></i>Mengambil info dari TMDB…</div>';
  else {
    var sutradara =
      m.t === 'movie'
        ? ((d.credits && d.credits.crew) || [])
            .filter(function (c) {
              return c.job === 'Director';
            })
            .map(function (c) {
              return c.name;
            })
            .slice(0, 2)
            .join(', ')
        : (d.created_by || [])
            .map(function (c) {
              return c.name;
            })
            .slice(0, 2)
            .join(', ');
    var bahasa = '';
    try {
      bahasa = d.original_language ? new Intl.DisplayNames(['id'], { type: 'language' }).of(d.original_language) : '';
    } catch (e) {
      bahasa = d.original_language || '';
    }
    h +=
      '<section class="fm-bag"><h3>Sinopsis</h3>' +
      (d.overview
        ? '<p class="fm-sinopsis pendek" id="fmSin">' +
          esc(d.overview) +
          '</p><button type="button" class="fm-lagi" id="fmLagi" hidden>Selengkapnya</button>'
        : '<p class="fm-sinopsis kosong">Belum ada sinopsis.</p>') +
      '<dl class="fm-info">' +
      (sutradara ? '<dt>' + (m.t === 'movie' ? 'Sutradara' : 'Pembuat') + '</dt><dd>' + esc(sutradara) + '</dd>' : '') +
      (bahasa ? '<dt>Bahasa</dt><dd>' + esc(bahasa) + '</dd>' : '') +
      (m.t === 'tv' && d.number_of_episodes ? '<dt>Episode</dt><dd>' + d.number_of_episodes + ' episode</dd>' : '') +
      (m.t === 'tv' && d.status
        ? '<dt>Status</dt><dd>' +
          (d.status === 'Ended'
            ? 'Tamat'
            : d.status === 'Returning Series'
              ? 'Masih berlanjut'
              : d.status === 'Canceled'
                ? 'Dibatalkan'
                : esc(d.status)) +
          '</dd>'
        : '') +
      '</dl></section>';
    var cast = ((d.credits && d.credits.cast) || []).slice(0, 12);
    if (cast.length)
      h +=
        '<section class="fm-bag"><h3>Pemain</h3><div class="fm-pemain">' +
        cast
          .map(function (c) {
            var f = fmPath(c.profile_path);
            return (
              '<div><span class="fm-orang' +
              (f ? '' : ' kosong') +
              '">' +
              (f ? '<img src="' + FM_IMG + 'w185' + f + '" alt="" loading="lazy">' : '') +
              FM_IK.orang +
              '</span><b>' +
              esc(c.name || '') +
              '</b>' +
              (c.character ? '<small>' + esc(c.character) + '</small>' : '') +
              '</div>'
            );
          })
          .join('') +
        '</div></section>';
  }
  h += '</div></div><div class="fm-det-kanan">';
  /* Catatanku */
  h +=
    '<section class="fm-bag"><h3>Catatanku</h3><div class="fm-kartu-p"><div class="fm-status" role="radiogroup">' +
    ['ingin', 'sedang', 'sudah']
      .map(function (s) {
        return (
          '<button type="button" role="radio" aria-checked="' +
          (x.s === s) +
          '" data-fms="' +
          s +
          '" class="fm-s-' +
          s +
          (x.s === s ? ' on' : '') +
          '">' +
          FM_IK[s] +
          FM_ST[s] +
          '</button>'
        );
      })
      .join('') +
    '</div>';
  if (m.t === 'tv' && x.s !== 'ingin' && (m.es || []).length) {
    var tot = fmTotalEps(m),
      sel = Math.min(tot, fmSelesaiEps(m));
    h +=
      '<div class="fm-eps"><div class="fm-eps-lbl">Terakhir ditonton<b>Musim ' +
      (m.ms || 1) +
      ' · Episode ' +
      (m.ep || 0) +
      '</b></div>' +
      '<div class="fm-step"><button type="button" data-fme="-1" aria-label="Kurangi episode">−</button><button type="button" class="nx" data-fme="1">+1 episode</button></div></div>' +
      '<div class="fm-bar-eps"><i style="width:' +
      (tot ? Math.round((sel / tot) * 100) : 0) +
      '%"></i></div><div class="fm-eps-ket">' +
      sel +
      ' dari ' +
      tot +
      ' episode</div>';
  }
  if (x.s === 'sudah') {
    h +=
      '<div class="fm-bintang"><span>Nilai saya</span>' +
      [1, 2, 3, 4, 5]
        .map(function (n) {
          return (
            '<button type="button" data-fmn="' +
            n +
            '" class="' +
            ((m.n || 0) >= n ? 'on' : '') +
            '" aria-label="' +
            n +
            ' bintang">' +
            FM_IK.bintang +
            '</button>'
          );
        })
        .join('') +
      '</div>' +
      '<label class="fm-tgl"><span>Ditonton tanggal</span><input type="date" id="fmTgl" value="' +
      esc(m.tg || '') +
      '" max="' +
      fmHariIni() +
      '"></label>';
  }
  h +=
    '<textarea class="input fm-catatan" id="fmCat" rows="3" maxlength="' +
    GL_C_MAKS +
    '" placeholder="Kesan atau catatan…">' +
    esc(x.c) +
    '</textarea></div></section>';
  /* Tempat menonton */
  h += '<section class="fm-bag" id="fmTonton"><h3>Tonton di Indonesia</h3><div class="fm-kartu-p">';
  if (!d) h += '<div class="lg-muat"><i></i>Memuat…</div>';
  else {
    var wp = (d['watch/providers'] && d['watch/providers'].results && d['watch/providers'].results.ID) || null;
    var grup = function (judul, L) {
      L = (L || []).filter(function (p) {
        return p && p.provider_name;
      });
      if (!L.length) return '';
      return (
        '<div class="fm-prov-grup"><small>' +
        judul +
        '</small><div class="fm-prov">' +
        L.map(function (p) {
          var lg = fmPath(p.logo_path);
          return (
            '<a href="' +
            esc(wp.link || 'https://www.themoviedb.org/' + m.t + '/' + m.id + '/watch?locale=ID') +
            '" target="_blank" rel="noopener noreferrer">' +
            (lg ? '<img src="' + FM_IMG + 'w92' + lg + '" alt="">' : '') +
            esc(p.provider_name) +
            '</a>'
          );
        }).join('') +
        '</div></div>'
      );
    };
    var isi = wp
      ? grup('Langganan', wp.flatrate) + grup('Gratis', (wp.free || []).concat(wp.ads || [])) + grup('Sewa', wp.rent) + grup('Beli', wp.buy)
      : '';
    h += isi || '<p class="fm-tidak">Belum tersedia di layanan streaming Indonesia.</p>';
    h += '<p class="fm-jw">Data tempat menonton dari JustWatch</p>';
  }
  h += '</div></section>';
  h +=
    '<button type="button" class="se-hapus fm-hapus" id="fmHapus">' +
    FM_IK.hapus +
    'Hapus dari koleksi</button>' +
    '<p class="fm-tmdb">Produk ini menggunakan TMDB API tetapi tidak didukung atau disertifikasi oleh TMDB.</p>' +
    '</div></div></div>';
  $('#subBody').innerHTML = h;
  var s = $('#fmSin');
  if (s && s.scrollHeight > s.clientHeight + 4) $('#fmLagi').hidden = false;
  if (ulang) $('#subBody').scrollTop = simpanScroll;
}
function fmItemKini() {
  return fmCariItem(fmIdHalaman());
}
function fmRenderUlang() {
  var x = fmItemKini();
  if (x) fmRenderDetail(x, fmCache[x.tm.t + x.tm.id] || null, true);
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'film-detail') return;
  var x = fmItemKini();
  if (!x) return;
  var el;
  if (e.target.closest('#fmLagi')) {
    var s = $('#fmSin');
    s.classList.toggle('pendek');
    e.target.textContent = s.classList.contains('pendek') ? 'Selengkapnya' : 'Ringkas';
    return;
  }
  if (e.target.closest('#fmKeTonton')) {
    var t = $('#fmTonton');
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (e.target.closest('#fmTrailerBtn')) {
    fmBukaTrailer(x);
    return;
  }
  if (e.target.closest('#fmHapus')) {
    var jenis = x.tm.t === 'tv' ? 'serial' : 'film';
    askConfirm({
      title: 'Hapus ' + jenis + '?',
      text: '"' + x.a.slice(0, 80) + '" beserta nilai dan catatanmu dihapus dari Playlist Film.',
      ok: 'Hapus',
      action: function () {
        back(2, function () {
          var o = glSemua();
          o.film = o.film.filter(function (z) {
            return z.id !== x.id;
          });
          glSimpanSemua(o);
          renderGaleryTab();
          if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
          toast((jenis === 'serial' ? 'Serial' : 'Film') + ' dihapus');
        });
      }
    });
    return;
  }
  if ((el = e.target.closest('[data-fms]'))) {
    var st = el.dataset.fms;
    if (st === x.s) return;
    fmUbahItem(x.id, function (z) {
      z.s = st;
      if (st === 'sudah' && !z.tm.tg) z.tm.tg = fmHariIni();
      if (st === 'sedang' && z.tm.t === 'tv' && !z.tm.ms) {
        z.tm.ms = 1;
        z.tm.ep = 0;
      }
      if (st === 'sudah' && z.tm.t === 'tv' && (z.tm.es || []).length) {
        z.tm.ms = z.tm.es.length;
        z.tm.ep = z.tm.es[z.tm.es.length - 1];
      }
    });
    toast('Status: ' + FM_ST_PANJANG[st]);
    fmRenderUlang();
    renderGaleryTab();
    return;
  }
  if ((el = e.target.closest('[data-fmn]'))) {
    var n = +el.dataset.fmn;
    fmUbahItem(x.id, function (z) {
      if (z.tm.n === n) delete z.tm.n;
      else z.tm.n = n;
    });
    fmRenderUlang();
    return;
  }
  if ((el = e.target.closest('[data-fme]'))) {
    var d = +el.dataset.fme,
      pesan = '';
    fmUbahItem(x.id, function (z) {
      var m = z.tm,
        es = m.es || [];
      m.ms = Math.min(Math.max(1, m.ms || 1), es.length || 1);
      m.ep = (m.ep || 0) + d;
      if (m.ep > (es[m.ms - 1] || 0)) {
        if (m.ms < es.length) {
          m.ms++;
          m.ep = 1;
          pesan = 'Lanjut ke musim ' + m.ms;
        } else {
          m.ep = es[m.ms - 1] || 0;
          if (z.s !== 'sudah') {
            z.s = 'sudah';
            if (!m.tg) m.tg = fmHariIni();
            pesan = 'Serial selesai ditonton';
          }
        }
      }
      if (m.ep < 0) {
        if (m.ms > 1) {
          m.ms--;
          m.ep = es[m.ms - 1] || 0;
        } else m.ep = 0;
      }
      if (d > 0 && z.s !== 'sudah' && es.length && m.ms === es.length && m.ep >= (es[m.ms - 1] || 0)) {
        z.s = 'sudah';
        if (!m.tg) m.tg = fmHariIni();
        pesan = 'Serial selesai ditonton';
      }
    });
    if (pesan) toast(pesan);
    fmRenderUlang();
    return;
  }
});
var fmCatT = null;
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'film-detail' || e.target.id !== 'fmCat') return;
  var id = fmIdHalaman(),
    v = e.target.value.replace(/\s+$/, '').slice(0, GL_C_MAKS);
  clearTimeout(fmCatT);
  fmCatT = setTimeout(function () {
    fmUbahItem(id, function (z) {
      z.c = v;
    });
  }, 600);
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'film-detail') return;
  if (e.target.id === 'fmTgl') {
    var v = fmTgl(e.target.value);
    fmUbahItem(fmIdHalaman(), function (z) {
      if (v) z.tm.tg = v;
      else delete z.tm.tg;
    });
  }
  if (e.target.id === 'fmCat') {
    clearTimeout(fmCatT);
    var id = fmIdHalaman(),
      c = e.target.value.replace(/\s+$/, '').slice(0, GL_C_MAKS);
    fmUbahItem(id, function (z) {
      z.c = c;
    });
  }
});

/* ---------- Trailer (pemutar YouTube) ---------- */
function fmBukaTrailer(x) {
  var d = fmCache[x.tm.t + x.tm.id],
    tr = fmTrailer(d);
  if (!tr) {
    toast(d ? 'Trailer tidak tersedia' : 'Info film belum termuat');
    return;
  }
  if (typeof lgYT !== 'undefined' && lgYT && typeof lgQ !== 'undefined' && lgQ && lgQ.main) {
    try {
      lgYT.pauseVideo();
      lgQ.main = false;
      lgRender();
    } catch (e) {}
  }
  fmTutupTrailer();
  var w = document.createElement('div');
  w.className = 'fm-trailer';
  w.id = 'fmTrailer';
  w.innerHTML =
    '<div class="fm-trailer-isi"><div class="fm-trailer-vid"><iframe src="https://www.youtube.com/embed/' +
    tr.key +
    '?autoplay=1&playsinline=1&rel=0" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' +
    '<div class="fm-trailer-bwh"><b>' +
    esc(tr.name || 'Trailer · ' + x.a) +
    '</b><button type="button" id="fmTrailerTutup">' +
    FM_IK.tutup +
    'Tutup</button></div></div>';
  w.addEventListener('click', function (e) {
    if (e.target === w || e.target.closest('#fmTrailerTutup')) fmTutupTrailerRiwayat();
  });
  document.body.appendChild(w);
  /* entri riwayat sendiri: gestur kembali menutup trailer saja */
  try {
    history.pushState(history.state, '');
    fmTrailerRiwayat = true;
  } catch (e) {
    fmTrailerRiwayat = false;
  }
}
var fmTrailerRiwayat = false;
function fmTutupTrailer() {
  var w = $('#fmTrailer');
  if (w) w.remove();
}
function fmTutupTrailerRiwayat() {
  if (fmTrailerRiwayat) {
    fmTrailerRiwayat = false;
    history.back();
  } else fmTutupTrailer();
}
window.addEventListener('popstate', function () {
  fmTrailerRiwayat = false;
  fmTutupTrailer();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && $('#fmTrailer')) fmTutupTrailerRiwayat();
});
