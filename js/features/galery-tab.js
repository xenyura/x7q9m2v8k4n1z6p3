/* ============================================================
   Stivora — Tab Galery (5.45.0): Foto · Video · Pola Pikir · Buku Catatan · Lainnya
   Tahap 1: bilah tab + tab Foto (5.45). Tahap 2: tab Video (5.46). Tahap 3: Pola Pikir (5.47, galery-pola.js). Tahap 5: Lainnya (5.49, galery-lainnya.js). 5.50: Foto & Video dari folder di HP (galery-folder.js).
   Foto & video memakai mesin media (images, IndexedDB, sinkron R2). Yang tampil di tab Foto
   adalah media milik Galery (bukan milik marker peta).
   Sematan disimpan di 'stivora.galery.banner'.sematan (ikut sinkron & cadangan).
   ============================================================ */
'use strict';

var K_GT_AKTIF = 'stivora.galery.tab';
var GT_TAB = [
  {
    id: 'foto',
    nama: 'Foto',
    ikon: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="9.5" r="1.8"/><path d="M21 15.5l-5-5-9 9.5"/>'
  },
  {
    id: 'video',
    nama: 'Video',
    ikon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>'
  },
  {
    id: 'pola',
    nama: 'Pola Pikir',
    ikon: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'
  },
  {
    id: 'lainnya',
    nama: 'Lainnya',
    ikon: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'
  }
];
var GT_IKON_CARI = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>';
var GT_IKON_URUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/></svg>';
var GT_IKON_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var GT_IKON_PIN =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3.5l5.5 5.5-3 1-3.5 3.5.5 4-2 2-4-4-4.5 4.5M9.5 11.5l-4-4 2-2 4 .5L15 2.5"/></svg>';

var gtCari = '',
  gtLama = false; /* gtLama: urutan terlama dulu */
function gtAktif() {
  var t = store.get(K_GT_AKTIF, 'foto');
  return GT_TAB.some(function (x) {
    return x.id === t;
  })
    ? t
    : 'foto';
}

/* ---------- Sematan ---------- */
function gtSematan() {
  var s = gbData().sematan;
  return Array.isArray(s)
    ? s
        .filter(function (x) {
          return typeof x === 'string';
        })
        .slice(0, 500)
    : [];
}
function gtDisematkan(id) {
  return gtSematan().indexOf(id) >= 0;
}
function gtSematanToggle(id) {
  var s = gtSematan(),
    i = s.indexOf(id);
  if (i >= 0) s.splice(i, 1);
  else s.unshift(id);
  gbSimpanSemua({ sematan: s });
  renderGaleryTab();
  toast(i >= 0 ? 'Sematan dilepas' : 'Disematkan');
  return i < 0;
}

/* ---------- Data media Galery ---------- */
var GT_MEDIA = { foto: { kata: 'foto' }, video: { kata: 'video' } };
/* 5.50.0: tab Foto & Video hanya menampilkan isi folder di HP (galery-folder.js) */
function gtMediaSemua(j) {
  return typeof gfMedia === 'function' ? gfMedia(j) : [];
}
var GT_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
var GT_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function gtKunciHari(t) {
  var d = new Date(t);
  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
}
function gtJudulHari(t) {
  var d = new Date(t),
    kini = new Date(),
    kemarin = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() - 1);
  var tgl = GT_HARI[d.getDay()] + ', ' + d.getDate() + ' ' + GT_BULAN[d.getMonth()] + ' ' + d.getFullYear();
  if (gtKunciHari(t) === gtKunciHari(kini.getTime())) return 'Hari ini · ' + tgl;
  if (gtKunciHari(t) === gtKunciHari(kemarin.getTime())) return 'Kemarin · ' + tgl;
  return tgl;
}
function gtKotak(im) {
  return (
    '<button type="button" class="gt-kotak" data-gt-id="' +
    esc(im.id) +
    '" aria-label="Buka ' +
    (jenisMedia(im) === 'video' ? 'video' : 'foto') +
    ' ' +
    esc(im.name || '') +
    '">' +
    thumbHTML(im) +
    (gtDisematkan(im.id) ? '<span class="gt-pin" aria-label="Disematkan">' + GT_IKON_PIN + '</span>' : '') +
    (im.dariFolder && typeof GF_IKON !== 'undefined' ? '<span class="gt-folder" aria-hidden="true">' + GF_IKON + '</span>' : '') +
    '</button>'
  );
}

/* ---------- Render ---------- */
function renderGtTab() {
  var bar = $('#gtTab');
  if (!bar) return;
  var a = gtAktif();
  bar.innerHTML = GT_TAB.map(function (t) {
    return (
      '<button type="button" role="tab" data-gt="' +
      t.id +
      '" aria-selected="' +
      (t.id === a) +
      '"' +
      (t.id === a ? ' class="on"' : '') +
      '>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      t.ikon +
      '</svg><span>' +
      t.nama +
      '</span></button>'
    );
  }).join('');
}
/* Ukuran data dalam byte (penjaga ruang dokumen cloud maks 1 MB, termasuk enkripsi) */
function gtUkuranByte(v) {
  try {
    return new TextEncoder().encode(JSON.stringify(v)).length;
  } catch (e) {
    return JSON.stringify(v).length * 3;
  }
}
/* Saring (cari) + urutkan media */
function gtSaring(list, cari) {
  var c = cari
    ? list.filter(function (im) {
        return (String(im.caption || '') + ' ' + String(im.path || im.name || '')).toLowerCase().indexOf(cari) >= 0;
      })
    : list;
  return c.slice().sort(function (x, y) {
    return gtLama ? x.createdAt - y.createdAt : y.createdAt - x.createdAt;
  });
}
/* Daftar media: "Disematkan" di atas, lalu per tanggal */
function gtDaftarHtml(cocok, M) {
  if (!cocok.length) return '<p class="gt-kosong">Tidak ada ' + M.kata + ' yang cocok.</p>';
  var h = '',
    pin = gtSematan(),
    dipin = cocok
      .filter(function (im) {
        return pin.indexOf(im.id) >= 0;
      })
      .sort(function (x, y) {
        return pin.indexOf(x.id) - pin.indexOf(y.id);
      });
  var biasa = cocok.filter(function (im) {
    return pin.indexOf(im.id) < 0;
  });
  if (dipin.length)
    h += '<h3 class="gt-judul">' + GT_IKON_PIN + 'Disematkan</h3><div class="gt-grid">' + dipin.map(gtKotak).join('') + '</div>';
  var grup = null;
  biasa.forEach(function (im) {
    var k = gtKunciHari(im.createdAt);
    if (k !== grup) {
      if (grup !== null) h += '</div>';
      grup = k;
      h += '<h3 class="gt-judul">' + gtJudulHari(im.createdAt) + '</h3><div class="gt-grid">';
    }
    h += gtKotak(im);
  });
  if (grup !== null) h += '</div>';
  return h;
}
/* Tampilan Semua / Folder (5.52.0) */
var K_GT_MODE = 'stivora.galery.tampilan';
function gtMode() {
  return store.get(K_GT_MODE, 'semua') === 'folder' ? 'folder' : 'semua';
}
function renderGaleryTab() {
  var box = $('#gtIsi');
  if (!box) return;
  var a = gtAktif();
  if (a === 'pola' && typeof renderGtPola === 'function') {
    renderGtPola(box);
    return;
  }
  if (a === 'lainnya' && typeof renderGtLainnya === 'function') {
    renderGtLainnya(box);
    return;
  }
  if (!GT_MEDIA[a]) {
    var t = GT_TAB.filter(function (x) {
      return x.id === a;
    })[0];
    box.innerHTML = '<p class="gt-segera">Tab ' + t.nama + ' sedang disiapkan.</p>';
    return;
  }
  var M = GT_MEDIA[a],
    semua = gtMediaSemua(a),
    cari = gtCari.trim().toLowerCase(),
    mode = gtMode();
  var h =
    '<div class="gt-bar">' +
    '<label class="gt-cari">' +
    GT_IKON_CARI +
    '<input type="search" id="gtCari" placeholder="Cari ' +
    M.kata +
    '" value="' +
    esc(gtCari) +
    '" autocomplete="off"></label>' +
    '<button type="button" class="gt-ib' +
    (gtLama ? ' on' : '') +
    '" id="gtUrut" aria-label="Urutan: ' +
    (gtLama ? 'terlama' : 'terbaru') +
    ' dulu" title="' +
    (gtLama ? 'Terlama dulu' : 'Terbaru dulu') +
    '">' +
    GT_IKON_URUT +
    '</button>' +
    '<button type="button" class="gt-ib ac" id="gtFolder" aria-label="Folder di HP" title="Folder di HP">' +
    (typeof GF_IKON !== 'undefined' ? GF_IKON : '') +
    '</button>' +
    '</div>';
  if (typeof gfInfoHtml === 'function') h += gfInfoHtml();
  var adaFolder = typeof gfMeta === 'function' && gfMeta().length > 0;
  if (adaFolder)
    h +=
      '<div class="gt-mode" role="tablist"><button type="button" data-gt-mode="semua"' +
      (mode === 'semua' ? ' class="on"' : '') +
      '>Semua</button><button type="button" data-gt-mode="folder"' +
      (mode === 'folder' ? ' class="on"' : '') +
      '>Folder</button></div>';
  if (!adaFolder)
    h += '<p class="gt-kosong">Belum ada folder. Ketuk ikon <b>folder</b> untuk menampilkan ' + M.kata + ' dari folder di HP.</p>';
  else if (mode === 'folder' && typeof gfFolderHtml === 'function') h += gfFolderHtml(a, M, cari);
  else if (!semua.length) h += '<p class="gt-kosong">Belum ada ' + M.kata + ' di folder yang terhubung.</p>';
  else h += gtDaftarHtml(gtSaring(semua, cari), M);
  var fokus = document.activeElement && document.activeElement.id === 'gtCari',
    pos = fokus ? document.activeElement.selectionStart : 0;
  box.innerHTML = h;
  if (fokus) {
    var c = $('#gtCari');
    c.focus();
    try {
      c.setSelectionRange(pos, pos);
    } catch (e) {}
  }
}

/* ---------- Kejadian ---------- */
$('#gtTab').addEventListener('click', function (e) {
  var b = e.target.closest('[data-gt]');
  if (!b) return;
  store.set(K_GT_AKTIF, b.dataset.gt);
  renderGtTab();
  renderGaleryTab();
});
/* Tahan ±0,5 detik pada foto = sematkan / lepas sematan */
var gtTahan = null,
  gtTahanJadi = false;
$('#gtIsi').addEventListener('pointerdown', function (e) {
  var k = e.target.closest('[data-gt-id]');
  if (!k) return;
  gtTahanJadi = false;
  clearTimeout(gtTahan);
  gtTahan = setTimeout(function () {
    gtTahanJadi = true;
    if (navigator.vibrate)
      try {
        navigator.vibrate(15);
      } catch (x) {}
    gtSematanToggle(k.dataset.gtId);
  }, 500);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
  $('#gtIsi').addEventListener(ev, function () {
    clearTimeout(gtTahan);
    /* klik sesudah tahan diabaikan sekali; tanda dibersihkan agar ketukan berikutnya tetap jalan (kotak bisa dirender ulang) */
    if (gtTahanJadi)
      setTimeout(function () {
        gtTahanJadi = false;
      }, 350);
  });
});
$('#gtIsi').addEventListener('contextmenu', function (e) {
  if (e.target.closest('[data-gt-id]')) e.preventDefault();
});
$('#gtIsi').addEventListener(
  'scroll',
  function () {
    clearTimeout(gtTahan);
  },
  true
);
$('#gtIsi').addEventListener('click', function (e) {
  var k = e.target.closest('[data-gt-id]');
  if (k) {
    if (gtTahanJadi) {
      gtTahanJadi = false;
      return;
    }
    {
      if (typeof pnSetDaftar === 'function') {
        var ids = [];
        Array.prototype.forEach.call(document.querySelectorAll('#gtIsi [data-gt-id]'), function (x) {
          if (ids.indexOf(x.dataset.gtId) < 0) ids.push(x.dataset.gtId);
        });
        pnSetDaftar(ids);
      }
      openLayer('img:' + k.dataset.gtId);
    }
    return;
  }
  if (e.target.closest('#gtUrut')) {
    gtLama = !gtLama;
    renderGaleryTab();
    toast(gtLama ? 'Terlama dulu' : 'Terbaru dulu');
  }
});
$('#gtIsi').addEventListener('input', function (e) {
  if (e.target.id === 'gtCari') {
    gtCari = e.target.value;
    renderGaleryTab();
  }
});
/* Kembali dari penampil (mis. foto dihapus) → segarkan */
window.addEventListener('popstate', function () {
  if (cur.tab === 'galery') renderGaleryTab();
});

renderGtTab();
renderGaleryTab();
