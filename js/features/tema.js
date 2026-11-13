/* Stivora — Tema warna: daftar tema, pratinjau, penerapan */
'use strict';

/* =========================================================
   TEMA
   Cara menambah tema baru: tambahkan satu objek ke TEMA di bawah.
     id     : nama unik tanpa spasi, contoh 'senja-ungu'
     nama   : nama yang tampil
     jenis  : 'gelap' atau 'terang' (menentukan tab & mode)
     gambar : (opsional) gambar sampul, contoh 'assets/tema/senja.jpg'
     warna  : bg, surface, surface2, text, text2, line, accent, accent2
   ========================================================= */
var K_TEMA = 'stivora.tema';
var TEMA = [
  {
    id: 'ungu-terang',
    nama: 'Ungu',
    jenis: 'terang',
    bawaan: true,
    warna: {
      bg: '#f6f5fb',
      surface: '#ffffff',
      surface2: '#efedf7',
      text: '#17142b',
      text2: '#615c7a',
      line: '#e3e0ef',
      accent: '#6a4cf5',
      accent2: '#b14cf0'
    }
  },
  {
    id: 'ungu-gelap',
    nama: 'Ungu',
    jenis: 'gelap',
    bawaan: true,
    warna: {
      bg: '#0e0c17',
      surface: '#181526',
      surface2: '#221e33',
      text: '#f1eefc',
      text2: '#a39dbd',
      line: '#2c2742',
      accent: '#8d73ff',
      accent2: '#c77dff'
    }
  },
  {
    id: 'taman-sakura',
    nama: 'Taman Sakura',
    jenis: 'gelap',
    gambar: 'assets/tema/taman-sakura.jpg',
    warna: {
      bg: '#031235',
      surface: '#0c1c4a',
      surface2: '#15275c',
      text: '#f6effc',
      text2: '#aab3d6',
      line: '#22336b',
      accent: '#ec6fae',
      accent2: '#b48cff'
    }
  },
  {
    id: 'romantis',
    nama: 'Romantis',
    jenis: 'gelap',
    gambar: 'assets/tema/romantis.jpg',
    warna: {
      bg: '#0b0f4a',
      surface: '#141a5e',
      surface2: '#1d2470',
      text: '#f6f0ff',
      text2: '#a9aedb',
      line: '#283080',
      accent: '#d63c78',
      accent2: '#8b5cff'
    }
  },
  {
    id: 'pegunungan-gelap',
    nama: 'Pegunungan gelap',
    jenis: 'gelap',
    gambar: 'assets/tema/pegunungan-gelap.jpg',
    warna: {
      bg: '#061630',
      surface: '#0d2142',
      surface2: '#152c52',
      text: '#e8f0fa',
      text2: '#93a8c6',
      line: '#1d365f',
      accent: '#2f78c0',
      accent2: '#f2b84b'
    }
  },
  {
    id: 'nostalgia',
    nama: 'Nostalgia',
    jenis: 'gelap',
    gambar: 'assets/tema/nostalgia.jpg',
    warna: {
      bg: '#020b1e',
      surface: '#0a1834',
      surface2: '#122242',
      text: '#f2f0ea',
      text2: '#a3abc0',
      line: '#1a2b50',
      accent: '#b9783a',
      accent2: '#e8c36a'
    }
  },
  {
    id: 'komedi-putar',
    nama: 'Komedi putar',
    jenis: 'gelap',
    gambar: 'assets/tema/komedi-putar.jpg',
    warna: {
      bg: '#141a72',
      surface: '#1c2280',
      surface2: '#262c90',
      text: '#f7f2ff',
      text2: '#b4b6e6',
      line: '#30369c',
      accent: '#d6457f',
      accent2: '#ffb627'
    }
  },
  {
    id: 'harbourbay',
    nama: 'Harbourbay',
    jenis: 'gelap',
    gambar: 'assets/tema/harbourbay.jpg',
    warna: {
      bg: '#022a6a',
      surface: '#0a2f6e',
      surface2: '#123a7e',
      text: '#eef6ff',
      text2: '#a2bce0',
      line: '#1b4588',
      accent: '#c06a14',
      accent2: '#ffc15e'
    }
  },
  {
    id: 'halloween',
    nama: 'Halloween',
    jenis: 'gelap',
    gambar: 'assets/tema/halloween.jpg',
    warna: {
      bg: '#04031a',
      surface: '#120c26',
      surface2: '#1c1434',
      text: '#fbeee3',
      text2: '#b4a6c4',
      line: '#2a1f45',
      accent: '#e0620e',
      accent2: '#9b5cff'
    }
  },
  {
    id: 'costabay',
    nama: 'Costabay',
    jenis: 'gelap',
    gambar: 'assets/tema/costabay.jpg',
    warna: {
      bg: '#011767',
      surface: '#0a1f6e',
      surface2: '#132a80',
      text: '#f0f2ff',
      text2: '#a6b0e0',
      line: '#1d3290',
      accent: '#d9364f',
      accent2: '#8b4dff'
    }
  },
  {
    id: 'kolam-ikan',
    nama: 'Kolam ikan',
    jenis: 'terang',
    gambar: 'assets/tema/kolam-ikan.jpg',
    warna: {
      bg: '#eef8fb',
      surface: '#ffffff',
      surface2: '#e2f1f6',
      text: '#0b2a36',
      text2: '#4f6f7a',
      line: '#d0e5ec',
      accent: '#0b74b8',
      accent2: '#f2862e'
    }
  },
  {
    id: 'taman-hijau',
    nama: 'Taman hijau',
    jenis: 'terang',
    gambar: 'assets/tema/taman-hijau.jpg',
    warna: {
      bg: '#f2f8ef',
      surface: '#ffffff',
      surface2: '#e3f0dd',
      text: '#10280f',
      text2: '#55704f',
      line: '#d3e4cc',
      accent: '#23853f',
      accent2: '#7cc242'
    }
  }
  /* Tema buatanmu taruh di sini, contoh:
  ,{ id: 'senja', nama: 'Senja', jenis: 'gelap', gambar: 'assets/tema/senja.jpg',
     warna: { bg: '#1b1020', surface: '#26162d', surface2: '#321d3a', text: '#fbeefd', text2: '#c3a7c9', line: '#3d2646', accent: '#ff7a59', accent2: '#ffb347' } } */
];
var temaTab = null;
function temaById(id) {
  for (var i = 0; i < TEMA.length; i++) if (TEMA[i].id === id) return TEMA[i];
  return null;
}
/* Tema pilihan untuk tiap jenis (gelap & terang disimpan terpisah) */
function temaPilihan(jenis) {
  var m = store.get(K_TEMA, {}) || {};
  return (
    temaById(m[jenis]) ||
    TEMA.filter(function (t) {
      return t.jenis === jenis && t.bawaan;
    })[0]
  );
}
var VAR_MAP = {
  bg: '--bg',
  surface: '--surface',
  surface2: '--surface-2',
  text: '--text',
  text2: '--text-2',
  line: '--line',
  accent: '--accent',
  accent2: '--accent-2'
};
function hexA(hex, a) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  var n = parseInt(h, 16);
  return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + a + ')';
}
function applyTemaColors(dark) {
  var root = document.documentElement.style;
  var t = temaPilihan(dark ? 'gelap' : 'terang');
  Object.keys(VAR_MAP).forEach(function (k) {
    root.removeProperty(VAR_MAP[k]);
  });
  root.removeProperty('--accent-soft');
  root.removeProperty('--tema-img');
  document.documentElement.classList.toggle('tema-img', !!(t && !t.bawaan && t.gambar));
  if (t && !t.bawaan && t.gambar) root.setProperty('--tema-img', 'url("' + new URL(t.gambar, document.baseURI).href + '")');
  if (t && !t.bawaan && t.warna) {
    Object.keys(VAR_MAP).forEach(function (k) {
      if (t.warna[k]) root.setProperty(VAR_MAP[k], t.warna[k]);
    });
    if (t.warna.accent) root.setProperty('--accent-soft', hexA(t.warna.accent, dark ? 0.16 : 0.12));
  }
  var b = $('#temaValue');
  if (b && t) b.textContent = t.nama;
}

function temaPreview(t) {
  var w = t.warna;
  var cover = t.gambar
    ? '<span class="tp-cover" style="background-image:url(\'' + esc(t.gambar) + '\')"></span>'
    : '<span class="tp-cover" style="background:linear-gradient(135deg,' +
      w.accent +
      ',' +
      w.accent2 +
      ')"><i class="tp-star">' +
      ICON.star +
      '</i></span>';
  var line = function (wd) {
    return '<i style="background:' + w.surface2 + ';width:' + wd + '%"></i>';
  };
  var card = function (tiles) {
    return (
      '<span class="tp-card" style="background:' +
      w.surface +
      ';border-color:' +
      w.line +
      '">' +
      '<span class="tp-head">' +
      line(42) +
      '<em style="background:' +
      w.surface2 +
      '"></em></span>' +
      line(62) +
      line(88) +
      (tiles
        ? '<span class="tp-tiles">' +
          [0, 1, 2, 3]
            .map(function () {
              return '<u style="background:' + w.surface2 + '"></u>';
            })
            .join('') +
          '</span>'
        : '') +
      '</span>'
    );
  };
  return (
    '<span class="tp" style="background:' +
    w.bg +
    '">' +
    cover +
    '<span class="tp-body">' +
    card(false) +
    card(true) +
    '</span>' +
    '<span class="tp-nav" style="background:' +
    w.surface +
    ';border-color:' +
    w.line +
    '">' +
    '<i style="background:' +
    w.surface2 +
    '"></i>' +
    '<b style="background:' +
    w.accent +
    '">' +
    ICON.plus +
    '</b>' +
    '<i style="background:' +
    w.surface2 +
    '"></i></span></span>'
  );
}

function buildTemaForm() {
  var dark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (!temaTab) temaTab = dark ? 'gelap' : 'terang';
  var aktif = temaPilihan(dark ? 'gelap' : 'terang');
  var list = TEMA.filter(function (t) {
    return t.jenis === temaTab;
  });
  $('#subTitle').textContent = 'Tema';
  $('#subBody').innerHTML =
    '<div class="tema-tabs" role="tablist">' +
    ['gelap', 'terang']
      .map(function (j) {
        return (
          '<button type="button" class="tema-tab' +
          (j === temaTab ? ' active' : '') +
          '" data-tema-tab="' +
          j +
          '">' +
          (j === 'gelap' ? 'Gelap' : 'Terang') +
          '</button>'
        );
      })
      .join('') +
    '</div>' +
    '<div class="tema-grid">' +
    list
      .map(function (t) {
        var on = aktif && aktif.id === t.id;
        return (
          '<div class="tema-item' +
          (on ? ' active' : '') +
          '">' +
          '<button type="button" class="tema-card" data-tema="' +
          t.id +
          '" aria-label="Tema ' +
          esc(t.nama) +
          '">' +
          temaPreview(t) +
          '</button>' +
          '<span class="tema-name">' +
          esc(t.nama) +
          (t.bawaan ? '<small class="tema-tag">Bawaan</small>' : '') +
          '</span>' +
          '<button type="button" class="tema-use' +
          (on ? ' on' : '') +
          '" data-tema="' +
          t.id +
          '">' +
          (on ? 'Dipakai' : 'Gunakan') +
          '</button>' +
          '</div>'
        );
      })
      .join('') +
    '</div>' +
    (list.length < 2 ? '<p class="sheet-note tema-note">Tema ' + temaTab + ' lainnya akan ditambahkan di sini.</p>' : '');
  return true;
}
function temaClick(e) {
  var tab = e.target.closest('[data-tema-tab]');
  if (tab) {
    temaTab = tab.dataset.temaTab;
    buildTemaForm();
    return;
  }
  var b = e.target.closest('[data-tema]');
  if (!b) return;
  var t = temaById(b.dataset.tema);
  if (!t) return;
  var m = store.get(K_TEMA, {}) || {};
  m[t.jenis] = t.id;
  store.set(K_TEMA, m);
  store.raw(K_THEME, t.jenis === 'gelap' ? 'dark' : 'light'); /* tema gelap → mode gelap, dan sebaliknya */
  applyTheme();
  buildTemaForm();
  toast('Tema ' + t.nama + ' ' + t.jenis + ' dipakai');
}
