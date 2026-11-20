/* ============================================================
   Stivora — Galery · tab Lainnya (5.49.0)
   8 kotak koleksi: Playlist Lagu, Playlist Film, Readlist Buku, Tempat Favorit,
   Channel Favorit, Tokoh Favorit, Koleksi Link (5.54.0: Kutipan dipindah ke Pola Pikir · Perumpamaan).
   Disimpan di 'stivora.galery.lainnya' = { lagu: [...], film: [...], ... }
   (dokumen cloud 'galery-lainnya', ikut sinkron & cadangan).
   Item: { id, a: judul/isi utama, b: keterangan, url, s: status, c: catatan, dibuat, diubah }
   ============================================================ */
'use strict';

var K_GL = 'stivora.galery.lainnya';
var GL_ITEM_MAKS = 200,
  GL_RUANG = 600000;
var GL_JENIS = [
  {
    id: 'lagu',
    nama: 'Playlist Lagu',
    satuan: 'lagu',
    warna: '#ec5a8a',
    ikon: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    a: 'Judul lagu',
    aPh: 'mis. Laskar Pelangi',
    b: 'Penyanyi',
    bPh: 'mis. Nidji',
    url: 'Link (Spotify, YouTube, dll.)'
  },
  {
    id: 'film',
    nama: 'Playlist Film',
    satuan: 'film',
    warna: '#e8730c',
    ikon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    a: 'Judul film',
    aPh: 'mis. Interstellar',
    b: 'Tahun / sutradara',
    bPh: 'mis. 2014 · Christopher Nolan',
    url: 'Link (trailer, dll.)',
    status: [
      ['ingin', 'Ingin ditonton'],
      ['sedang', 'Sedang ditonton'],
      ['sudah', 'Sudah ditonton']
    ]
  },
  {
    id: 'buku',
    nama: 'Readlist Buku',
    satuan: 'buku',
    warna: '#1fa463',
    ikon: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    a: 'Judul buku',
    aPh: 'mis. Atomic Habits',
    b: 'Penulis',
    bPh: 'mis. James Clear',
    url: 'Link (opsional)',
    status: [
      ['ingin', 'Ingin dibaca'],
      ['sedang', 'Sedang dibaca'],
      ['selesai', 'Selesai'],
      ['berhenti', 'Berhenti']
    ],
    maks: 5000
  },
  {
    id: 'tempat',
    nama: 'Tempat Favorit',
    satuan: 'tempat',
    warna: '#3b8beb',
    ikon: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    a: 'Nama tempat',
    aPh: 'mis. Pantai Lampuuk',
    b: 'Lokasi / kota',
    bPh: 'mis. Aceh Besar',
    url: 'Link Google Maps (opsional)',
    status: [
      ['ingin', 'Ingin dikunjungi'],
      ['sudah', 'Sudah dikunjungi']
    ]
  },
  {
    id: 'channel',
    nama: 'Channel Favorit',
    satuan: 'channel',
    warna: '#e5484d',
    ikon: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
    a: 'Nama channel',
    aPh: 'mis. Kok Bisa?',
    b: 'Platform / topik',
    bPh: 'mis. YouTube · sains',
    url: 'Link channel'
  },
  {
    id: 'tokoh',
    nama: 'Tokoh Favorit',
    satuan: 'tokoh',
    warna: '#8b5cf6',
    ikon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/>',
    a: 'Nama tokoh',
    aPh: 'mis. B.J. Habibie',
    b: 'Dikenal sebagai',
    bPh: 'mis. Bapak teknologi Indonesia',
    url: 'Link (opsional)',
    catatan: 'Yang kamu teladani'
  },
  {
    id: 'link',
    nama: 'Koleksi Link',
    satuan: 'link',
    warna: '#0ea5a4',
    ikon: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
    a: 'Judul',
    aPh: 'mis. Dokumentasi Firebase',
    b: 'Keterangan',
    bPh: 'mis. Referensi kerja',
    url: 'Alamat link',
    urlWajib: true
  }
];
var GL_A_MAKS = 150,
  GL_A_PANJANG = 500,
  GL_B_MAKS = 100,
  GL_URL_MAKS = 500,
  GL_C_MAKS = 500;
var GL_IKON_LINK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

function glJenis(id) {
  return (
    GL_JENIS.filter(function (j) {
      return j.id === id;
    })[0] || null
  );
}
function glUrlSah(u) {
  u = String(u || '')
    .trim()
    .slice(0, GL_URL_MAKS);
  if (!u) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u) && /\./.test(u)) u = 'https://' + u;
  return /^https?:\/\/[^\s]+$/i.test(u) ? u : '';
}
function glMaks(j) {
  return (j && j.maks) || GL_ITEM_MAKS;
}
function glSemua() {
  var d = store.get(K_GL, null),
    o = {};
  /* 5.59.0: Readlist Buku punya kunci sendiri (dipecah per buku di cloud) */
  if (typeof bkMigrasi === 'function' && d && Array.isArray(d.buku) && d.buku.length) {
    bkMigrasi(d);
    d = store.get(K_GL, null);
  }
  GL_JENIS.forEach(function (j) {
    var arr =
      j.id === 'buku' && typeof bkItemMentah === 'function'
        ? bkItemMentah()
        : d && typeof d === 'object' && Array.isArray(d[j.id])
          ? d[j.id]
          : [];
    o[j.id] = arr
      .filter(function (x) {
        return x && typeof x.id === 'string' && x.a;
      })
      .slice(0, glMaks(j))
      .map(function (x) {
        return {
          id: x.id.slice(0, 64),
          a: String(x.a).slice(0, j.aPanjang ? GL_A_PANJANG : GL_A_MAKS),
          b: String(x.b || '').slice(0, GL_B_MAKS),
          url: glUrlSah(x.url),
          s:
            j.status &&
            j.status.some(function (s) {
              return s[0] === x.s;
            })
              ? x.s
              : j.status
                ? j.status[0][0]
                : '',
          c: String(x.c || '').slice(0, GL_C_MAKS),
          dibuat: +x.dibuat || 0,
          diubah: +x.diubah || +x.dibuat || 0,
          yt: j.id === 'lagu' && typeof lgYtSah === 'function' ? lgYtSah(x.yt) || undefined : undefined,
          tm: j.id === 'film' && typeof fmSah === 'function' ? fmSah(x.tm) || undefined : undefined,
          bk: j.id === 'buku' && typeof bkSah === 'function' ? bkSah(x.bk) : undefined
        };
      });
  });
  return o;
}
function glSimpanSemua(o) {
  if (typeof bkSimpanItem === 'function' && Array.isArray(o.buku)) {
    bkSimpanItem(o.buku);
    var sisa = {};
    Object.keys(o).forEach(function (k) {
      if (k !== 'buku') sisa[k] = o[k];
    });
    store.set(K_GL, sisa);
  } else store.set(K_GL, o);
}
/* Ruang dokumen 'galery-lainnya' (buku tidak ikut: punya dokumen sendiri) */
function glPenuh(o) {
  if (typeof gtUkuranByte !== 'function') return false;
  var sisa = {};
  Object.keys(o).forEach(function (k) {
    if (k !== 'buku') sisa[k] = o[k];
  });
  return gtUkuranByte(sisa) > GL_RUANG;
}

/* ---------- Tab: 8 kotak ---------- */
function renderGtLainnya(box) {
  var d = glSemua();
  box.innerHTML =
    '<div class="gl-kotak-grid">' +
    GL_JENIS.map(function (j) {
      var n =
        j.id === 'tempat' && typeof tpItems === 'function'
          ? tpItems().length
          : j.id === 'channel' && typeof chItems === 'function'
            ? chItems().length
            : j.id === 'tokoh' && typeof tkItems === 'function'
              ? tkItems().length
              : j.id === 'link' && typeof lkItems === 'function'
                ? lkItems().length
                : d[j.id].length;
      return (
        '<button type="button" class="gl-kotak" data-gl="' +
        j.id +
        '" style="--gl-w:' +
        j.warna +
        '">' +
        '<span class="gl-ikon"><svg viewBox="0 0 24 24" aria-hidden="true">' +
        j.ikon +
        '</svg></span>' +
        '<b>' +
        j.nama +
        '</b><small>' +
        (n ? n + ' ' + j.satuan : 'Belum ada') +
        '</small></button>'
      );
    }).join('') +
    '</div>';
}
$('#gtIsi').addEventListener('click', function (e) {
  var b = e.target.closest('[data-gl]');
  if (!b || gtAktif() !== 'lainnya') return;
  glBukaJenis = b.dataset.gl;
  glFilter = '';
  glCari = '';
  if (typeof lgF !== 'undefined') lgF = '';
  if (typeof fmS !== 'undefined') {
    fmS = '';
    fmJ = '';
  }
  if (typeof bkS !== 'undefined') {
    bkS = '';
    bkTampil = BK_HAL;
  }
  if (typeof tpS !== 'undefined') {
    tpS = '';
    tpK = '';
    tpKol = '';
  }
  if (typeof chS !== 'undefined') {
    chS = 'aktif';
    chP = '';
    chT = '';
  }
  if (typeof tkS !== 'undefined') {
    tkS = 'aktif';
    tkF = '';
    tkT = '';
  }
  if (typeof lkS !== 'undefined') {
    lkS = '';
    lkFol = '';
    lkJ = '';
    lkLb = '';
    lkTampil = LK_HAL;
  }
  openLayer('page:galery-koleksi');
});

/* ---------- Halaman koleksi ---------- */
var glBukaJenis = 'lagu',
  glFilter = '',
  glCari = '';
function glItemHtml(j, x) {
  var st = j.status
    ? j.status.filter(function (s) {
        return s[0] === x.s;
      })[0]
    : null;
  return (
    '<div class="gl-item" data-gl-item="' +
    esc(x.id) +
    '" role="button" tabindex="0">' +
    '<span class="gl-item-ikon"><svg viewBox="0 0 24 24" aria-hidden="true">' +
    j.ikon +
    '</svg></span>' +
    '<span class="gl-item-teks"><b>' +
    esc(x.a) +
    '</b>' +
    (x.b ? '<small>' + esc(x.b) + '</small>' : '') +
    (st ? '<em class="gl-status gl-s-' + st[0] + '">' + st[1] + '</em>' : '') +
    '</span>' +
    (x.url
      ? '<a class="gl-buka" href="' +
        esc(x.url) +
        '" target="_blank" rel="noopener noreferrer" aria-label="Buka link ' +
        esc(x.a) +
        '">' +
        GL_IKON_LINK +
        '</a>'
      : '') +
    '</div>'
  );
}
function glRenderDaftar() {
  var j = glJenis(glBukaJenis),
    box = $('#glDaftar');
  if (!j || !box) return;
  var semua = glSemua()[j.id],
    q = glCari.trim().toLowerCase();
  if (j.id === 'tempat' && typeof tpRenderDaftar === 'function') {
    tpRenderDaftar(box, q);
    return;
  }
  if (j.id === 'channel' && typeof chRenderDaftar === 'function') {
    chRenderDaftar(box, q);
    return;
  }
  if (j.id === 'tokoh' && typeof tkRenderDaftar === 'function') {
    tkRenderDaftar(box, q);
    return;
  }
  if (j.id === 'link' && typeof lkRenderDaftar === 'function') {
    if (typeof lkFolDariRiwayat === 'function') lkFolDariRiwayat();
    lkRenderDaftar(box, q);
    return;
  }
  if (j.id === 'buku' && typeof bkRenderDaftar === 'function') {
    bkRenderDaftar(box, semua, q);
    var tk = $('#bkTambahBtn');
    if (tk) tk.disabled = semua.length >= glMaks(j);
    return;
  }
  if (j.id === 'film' && typeof fmRenderDaftar === 'function') {
    fmRenderDaftar(box, semua, q);
    var tf = $('#fmTambahBtn');
    if (tf) tf.disabled = semua.length >= GL_ITEM_MAKS;
    return;
  }
  if (j.id === 'lagu' && typeof lgRenderDaftar === 'function') {
    lgRenderDaftar(box, semua, q);
    var tb = $('#lgTempelBtn');
    if (tb) tb.disabled = semua.length >= GL_ITEM_MAKS;
    return;
  }
  if (
    glFilter &&
    !semua.some(function (x) {
      return x.s === glFilter;
    })
  )
    glFilter = '';
  var cocok = semua.filter(function (x) {
    return (!glFilter || x.s === glFilter) && (!q || (x.a + ' ' + x.b + ' ' + x.c).toLowerCase().indexOf(q) >= 0);
  });
  var h = '';
  if (j.status && semua.length) {
    h +=
      '<div class="gp-filter gl-filter"><button type="button" data-gl-f=""' +
      (!glFilter ? ' class="on"' : '') +
      '>Semua <small>' +
      semua.length +
      '</small></button>' +
      j.status
        .map(function (s) {
          var n = semua.filter(function (x) {
            return x.s === s[0];
          }).length;
          return n
            ? '<button type="button" data-gl-f="' +
                s[0] +
                '"' +
                (glFilter === s[0] ? ' class="on"' : '') +
                '>' +
                s[1] +
                ' <small>' +
                n +
                '</small></button>'
            : '';
        })
        .join('') +
      '</div>';
  }
  if (!semua.length) h += '<p class="gt-kosong">Belum ada ' + j.satuan + '. Ketuk <b>+</b> untuk menambah.</p>';
  else if (!cocok.length) h += '<p class="gt-kosong">Tidak ada yang cocok.</p>';
  else
    h +=
      '<div class="gl-daftar">' +
      cocok
        .map(function (x) {
          return glItemHtml(j, x);
        })
        .join('') +
      '</div>';
  if (semua.length >= glMaks(j)) h += '<p class="gp-catatan">Sudah ' + glMaks(j) + ' ' + j.satuan + ' (batas maksimal).</p>';
  box.innerHTML = h;
  var t = $('#glTambah');
  if (t) t.disabled = semua.length >= glMaks(j);
}
PAGES['galery-koleksi'] = function () {
  var j = glJenis(glBukaJenis);
  if (!j) return false;
  $('#subTitle').textContent = j.nama;
  $('#subBody').innerHTML =
    '<div class="gl-hal" style="--gl-w:' +
    j.warna +
    '">' +
    '<div class="gt-bar">' +
    '<label class="gt-cari">' +
    GT_IKON_CARI +
    '<input type="search" id="glCari" placeholder="Cari ' +
    j.satuan +
    '" value="' +
    esc(glCari) +
    '" autocomplete="off"></label>' +
    (j.id === 'link' && typeof LK_IK !== 'undefined'
      ? '<button type="button" class="gt-ib lk-impor-btn" id="lkImporBtn" aria-label="Impor bookmark">' +
        LK_IK.impor +
        '</button><button type="button" class="lg-tempel-btn lk-tambah-btn" id="lkTambahBtn">' +
        LK_IK.plus +
        'Tempel</button>'
      : j.id === 'tokoh' && typeof TK_IK !== 'undefined'
        ? '<button type="button" class="lg-tempel-btn tk-tambah-btn" id="tkTambahBtn">' + TK_IK.plus + 'Tambah</button>'
        : j.id === 'channel' && typeof CH_IK !== 'undefined'
          ? '<button type="button" class="lg-tempel-btn ch-tambah-btn" id="chTambahBtn">' + CH_IK.plus + 'Tambah</button>'
          : j.id === 'tempat' && typeof TP_IK !== 'undefined'
            ? '<button type="button" class="lg-tempel-btn tp-tambah-btn" id="tpTambahBtn">' + TP_IK.plus + 'Tambah</button>'
            : j.id === 'buku' && typeof BK_IK !== 'undefined'
              ? '<button type="button" class="lg-tempel-btn bk-tambah-btn" id="bkTambahBtn">' + BK_IK.plus + 'Tambah</button>'
              : j.id === 'film' && typeof FM_IK !== 'undefined'
                ? '<button type="button" class="lg-tempel-btn fm-tambah-btn" id="fmTambahBtn">' + FM_IK.plus + 'Tambah</button>'
                : j.id === 'lagu' && typeof LG_IK !== 'undefined'
                  ? '<button type="button" class="lg-tempel-btn" id="lgTempelBtn">' + LG_IK.tempel + 'Tempel link</button>'
                  : '<button type="button" class="gt-ib ac" id="glTambah" aria-label="Tambah ' +
                    j.satuan +
                    '">' +
                    GT_IKON_PLUS +
                    '</button>') +
    '</div><div id="glDaftar"></div></div>';
  glRenderDaftar();
  return true;
};
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi') return;
  var el;
  if (e.target.closest('.gl-buka')) return; /* link dibuka di tab baru */
  if ((el = e.target.closest('[data-gl-f]'))) {
    glFilter = el.dataset.glF;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#glTambah')) {
    glItemId = null;
    openLayer('page:galery-koleksi-item');
    return;
  }
  if ((el = e.target.closest('[data-gl-item]'))) {
    glItemId = el.dataset.glItem;
    openLayer('page:galery-koleksi-item');
  }
});
$('#subBody').addEventListener('keydown', function (e) {
  if (pageKind === 'galery-koleksi' && e.key === 'Enter' && e.target.matches('[data-gl-item]')) e.target.click();
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'galery-koleksi' && e.target.id === 'glCari') {
    glCari = e.target.value;
    glRenderDaftar();
  }
});

/* ---------- Halaman tambah / edit item ---------- */
var glIsiUrl = '',
  glIsiA = '';
var glItemId = null,
  glItemLama = null,
  glItemKotor = false,
  glItemS = '';
PAGES['galery-koleksi-item'] = function () {
  var j = glJenis(glBukaJenis);
  if (!j) return false;
  glItemLama = glItemId
    ? glSemua()[j.id].filter(function (x) {
        return x.id === glItemId;
      })[0]
    : null;
  if (glItemId && !glItemLama) return false;
  glItemKotor = false;
  glItemS = glItemLama ? glItemLama.s : j.status ? glFilter || j.status[0][0] : '';
  var x = glItemLama || { a: glIsiA, b: '', url: glIsiUrl, c: '' };
  glIsiUrl = '';
  glIsiA = '';
  $('#subTitle').textContent = (glItemLama ? 'Edit ' : 'Tambah ') + j.satuan;
  var h =
    '<div class="se gl-form"><section class="ie-bagian se-kartu">' +
    (j.aPanjang
      ? '<div class="field"><label for="glA">' +
        j.a +
        '</label><textarea class="input" id="glA" rows="5" maxlength="' +
        GL_A_PANJANG +
        '" placeholder="' +
        j.aPh +
        '">' +
        esc(x.a) +
        '</textarea></div>'
      : '<div class="field"><label for="glA">' +
        j.a +
        '</label><input class="input" id="glA" maxlength="' +
        GL_A_MAKS +
        '" autocomplete="off" placeholder="' +
        j.aPh +
        '" value="' +
        esc(x.a) +
        '"></div>') +
    '<div class="field"><label for="glB">' +
    j.b +
    '</label><input class="input" id="glB" maxlength="' +
    GL_B_MAKS +
    '" autocomplete="off" placeholder="' +
    j.bPh +
    '" value="' +
    esc(x.b) +
    '"></div>' +
    (j.status
      ? '<div class="field"><label>Status</label><div class="gl-pilih" role="radiogroup">' +
        j.status
          .map(function (s) {
            return (
              '<button type="button" role="radio" class="gl-status gl-s-' +
              s[0] +
              (glItemS === s[0] ? ' dipilih' : '') +
              '" data-gle-s="' +
              s[0] +
              '" aria-checked="' +
              (glItemS === s[0]) +
              '">' +
              s[1] +
              '</button>'
            );
          })
          .join('') +
        '</div></div>'
      : '') +
    (j.url
      ? '<div class="field"><label for="glUrl">' +
        j.url +
        '</label><input class="input" id="glUrl" type="url" inputmode="url" maxlength="' +
        GL_URL_MAKS +
        '" autocomplete="off" placeholder="https://" value="' +
        esc(x.url) +
        '"></div>'
      : '') +
    '<div class="field"><label for="glC">' +
    (j.catatan || 'Catatan') +
    ' <span class="gl-ops">(opsional)</span></label><textarea class="input" id="glC" rows="3" maxlength="' +
    GL_C_MAKS +
    '" placeholder="Tulis catatan singkat">' +
    esc(x.c) +
    '</textarea></div>' +
    (glItemLama && j.id === 'film' && typeof fmSah === 'function'
      ? '<button type="button" class="btn ghost fm-cocok-btn" data-gle="cocok">Cocokkan ke TMDB (poster, sinopsis, trailer)</button>'
      : '') +
    (glItemLama
      ? '<button type="button" class="se-hapus" data-gle="hapus"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>Hapus ' +
        j.satuan +
        '</button>'
      : '') +
    '</section>' +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-gle="batal">Batal</button><button type="button" class="btn primary" data-gle="simpan">Simpan</button></div></div>';
  $('#subBody').innerHTML = h;
  return true;
};
$('#subBody').addEventListener('input', function () {
  if (pageKind === 'galery-koleksi-item') glItemKotor = true;
});
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi-item') return;
  var el,
    j = glJenis(glBukaJenis);
  if ((el = e.target.closest('[data-gle-s]'))) {
    glItemS = el.dataset.gleS;
    glItemKotor = true;
    $$('#subBody [data-gle-s]').forEach(function (b) {
      var on = b === el;
      b.classList.toggle('dipilih', on);
      b.setAttribute('aria-checked', on);
    });
    return;
  }
  if (!(el = e.target.closest('[data-gle]'))) return;
  var aksi = el.dataset.gle;
  if (aksi === 'batal') {
    if (!glItemKotor) {
      back(1);
      return;
    }
    askConfirm({
      title: 'Buang perubahan?',
      text: 'Isian ini tidak disimpan.',
      ok: 'Buang',
      action: function () {
        back(2);
      }
    });
  } else if (aksi === 'hapus') {
    var lama = glItemLama;
    askConfirm({
      title: 'Hapus ' + j.satuan + '?',
      text: '"' + lama.a.slice(0, 80) + '" dihapus dari ' + j.nama + '.',
      ok: 'Hapus',
      action: function () {
        var n = cur.layers.length >= 3 && /^page:buku-detail:/.test(cur.layers[cur.layers.length - 3]) ? 3 : 2;
        back(n, function () {
          var o = glSemua();
          o[j.id] = o[j.id].filter(function (x) {
            return x.id !== lama.id;
          });
          glSimpanSemua(o);
          renderGaleryTab();
          glRenderDaftar();
          toast(j.satuan.charAt(0).toUpperCase() + j.satuan.slice(1) + ' dihapus');
        });
      }
    });
  } else if (aksi === 'cocok') {
    var idC = glItemLama.id,
      qC = glItemLama.a;
    var lanjut = function () {
      back(1, function () {
        fmCocok = idC;
        fmCariQ = qC;
        fmCariJ = '';
        openLayer('page:film-cari');
      });
    };
    if (!glItemKotor) lanjut();
    else
      askConfirm({
        title: 'Buang perubahan?',
        text: 'Isian yang belum disimpan tidak ikut.',
        ok: 'Lanjut',
        tone: 'primary',
        action: function () {
          back(1, lanjut);
        }
      });
  } else if (aksi === 'simpan') glItemSimpan(j);
});
function glItemSimpan(j) {
  var a = $('#glA')
      .value.trim()
      .slice(0, j.aPanjang ? GL_A_PANJANG : GL_A_MAKS),
    b = $('#glB').value.trim().slice(0, GL_B_MAKS);
  var uIn = $('#glUrl') ? $('#glUrl').value.trim() : '',
    url = glUrlSah(uIn),
    c = $('#glC').value.replace(/\s+$/, '').slice(0, GL_C_MAKS);
  if (!a) {
    toast('Isi ' + j.a.toLowerCase() + ' dulu');
    $('#glA').focus();
    return;
  }
  if (uIn && !url) {
    toast('Link harus diawali https://');
    $('#glUrl').focus();
    return;
  }
  if (j.urlWajib && !url) {
    toast('Isi alamat link dulu');
    $('#glUrl').focus();
    return;
  }
  var o = glSemua(),
    d = o[j.id],
    kini = Date.now(),
    baru = !glItemLama;
  if (baru) {
    if (d.length >= glMaks(j)) {
      toast('Maksimal ' + glMaks(j) + ' ' + j.satuan);
      return;
    }
    d.unshift({
      id: uid(),
      a: a,
      b: b,
      url: url,
      s: glItemS,
      c: c,
      dibuat: kini,
      diubah: kini,
      bk:
        j.id === 'buku'
          ? {
              hl: 0,
              fmt: 'cetak',
              mil: 'sendiri',
              mulai: glItemS === 'sedang' || glItemS === 'selesai' ? (typeof bkHariIni === 'function' ? bkHariIni() : undefined) : undefined
            }
          : undefined
    });
  } else {
    o[j.id] = d.map(function (x) {
      return x.id === glItemLama.id
        ? { id: x.id, a: a, b: b, url: url, s: glItemS, c: c, dibuat: x.dibuat, diubah: kini, yt: x.yt, tm: x.tm, bk: x.bk }
        : x;
    });
  }
  if (glPenuh(o)) {
    toast('Ruang tab Lainnya penuh. Hapus beberapa item dulu.');
    return;
  }
  glSimpanSemua(o);
  glItemKotor = false;
  back(1, function () {
    renderGaleryTab();
    toast(baru ? 'Disimpan ke ' + j.nama : 'Perubahan disimpan');
  });
}
