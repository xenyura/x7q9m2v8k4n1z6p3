/* Stivora — Tab Impian: profil (foto + pita) & daftar impian berbentuk hexagon, serta halaman Edit (5.19.0)
   Data lokal:
     'stivora.impian.profil' = { foto: dataURL (dari galeri HP) | 'https://…' (link) | '', judul: '' }
     'stivora.impian.daftar' = [{ id, emoji, nama, nilai, target, satuan, dendam: [], cara: [], sumber: [], dukungan: [], dibuat, diubah }]
       dendam / cara / sumber / dukungan = daftar poin (teks) — tampil di halaman detail saat hexagon dibuka
   Urutan di daftar = angka di lingkaran kecil hexagon (impian ke-5 → 5). */
'use strict';

var K_IM_PROFIL = 'stivora.impian.profil',
  K_IM_DAFTAR = 'stivora.impian.daftar';
var IM_JUDUL_AWAL = 'Impianku',
  IM_JUDUL_MAKS = 40,
  IM_NAMA_MAKS = 50,
  IM_SATUAN_MAKS = 100,
  IM_MAKS = 200;
var IM_IKON_ORANG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-4 4.1-6 7.5-6s6.3 2 7.5 6"/></svg>';
var IM_IKON_PENSIL = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
var IM_POIN_MAKS = 100,
  IM_POIN_PANJANG = 300;
/* 3 bagian poin pada setiap impian */
var IM_BAGIAN = [
  {
    k: 'dendam',
    judul: 'Dendam karena pengalaman buruk apa?',
    isian: 'mis. Pernah diremehkan karena tidak punya uang',
    ikon: '<svg viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.3 1.6 1.1 2.6 2.3 3.1C11 8.6 11 5.6 12 3z"/></svg>'
  },
  {
    k: 'cara',
    judul: 'Cara mencapai',
    isian: 'mis. Menabung 2 juta per bulan',
    ikon: '<svg viewBox="0 0 24 24"><path d="M4 19c4 0 4-6 8-6s4-6 8-6"/><circle cx="4" cy="19" r="1.6"/><path d="M17 4h3v3"/></svg>'
  },
  {
    k: 'sumber',
    judul: 'Sumberdaya yang diperlukan',
    isian: 'mis. Modal, laptop, kursus',
    ikon: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>'
  },
  {
    k: 'dukungan',
    judul: 'Dukungan dari orang lain',
    isian: 'mis. Orang tua: doa & restu',
    ikon: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.7-3.3 3-5 6-5s5.3 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14c2.6.1 4.3 1.6 5 4"/></svg>'
  }
];
function imPoin(a) {
  return (Array.isArray(a) ? a : [])
    .map(function (x) {
      return String(x || '')
        .trim()
        .slice(0, IM_POIN_PANJANG);
    })
    .filter(Boolean)
    .slice(0, IM_POIN_MAKS);
}
var IM_EMOJI = [
  '🏠',
  '🚗',
  '✈️',
  '🎓',
  '💰',
  '💼',
  '📚',
  '💪',
  '❤️',
  '👨‍👩‍👧',
  '🕌',
  '🌍',
  '🏆',
  '🎯',
  '📱',
  '💻',
  '🎮',
  '🏍️',
  '🏝️',
  '⛰️',
  '🌱',
  '🍳',
  '🎸',
  '⭐'
];

function imProfil() {
  var d = store.get(K_IM_PROFIL, {});
  return d && typeof d === 'object' ? d : {};
}
function imSimpanProfil(d) {
  store.set(K_IM_PROFIL, d);
  renderImProfil();
}
function imDaftar() {
  var d = store.get(K_IM_DAFTAR, []);
  return Array.isArray(d) ? d : [];
}
function imFotoSah(f) {
  return typeof f === 'string' && (/^data:image\/(jpeg|png|webp|gif);base64,/.test(f) || /^https:\/\/[^\s"'<>]+$/.test(f)) ? f : '';
}
function imPersen(it) {
  var t = +it.target || 0,
    n = +it.nilai || 0;
  return t > 0 ? Math.max(0, Math.min(100, (n / t) * 100)) : 0;
}
function imAngka(n) {
  n = +n || 0;
  return (Math.round(n * 100) / 100).toLocaleString('id-ID');
}
/* Ambil 1 emoji (grafem pertama) dari teks */
function imEmoji1(t) {
  t = String(t || '').trim();
  if (!t) return '';
  try {
    if (window.Intl && Intl.Segmenter) {
      var it = new Intl.Segmenter('id', { granularity: 'grapheme' }).segment(t)[Symbol.iterator]().next();
      return it.value ? it.value.segment : '';
    }
  } catch (e) {}
  return Array.from(t).slice(0, 2).join('');
}

/* ---------- Impian utama (5.30.0) ----------
   'stivora.impian.utama' = { foto, nama, alasan, hariH: 'YYYY-MM-DD' }
   Hari H di sini juga dipakai tab Progress (peta jalan) dan hanya bisa diubah dari halaman Edit impian. */
var K_IM_UTAMA = 'stivora.impian.utama',
  IU_NAMA_MAKS = 5000,
  IU_ALASAN_MAKS = 5000,
  iuLuas = false;
var IU_BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var IU_IKON = {
  bintang: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  bendera: '<svg viewBox="0 0 24 24"><path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/></svg>',
  kunci: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};
function imTglSah(t) {
  if (typeof t !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  var p = t.split('-'),
    d = new Date(+p[0], +p[1] - 1, +p[2]);
  return d.getMonth() === +p[1] - 1 && d.getDate() === +p[2];
}
function imUtama() {
  var d = store.get(K_IM_UTAMA, {});
  d = d && typeof d === 'object' ? d : {};
  return {
    foto: imFotoSah(d.foto),
    nama: String(d.nama || '').slice(0, IU_NAMA_MAKS),
    alasan: String(d.alasan || '').slice(0, IU_ALASAN_MAKS),
    hariH: imTglSah(d.hariH) ? d.hariH : ''
  };
}
function imHariH() {
  return imUtama().hariH;
}
function imSimpanUtama(d) {
  store.set(K_IM_UTAMA, d);
  renderImUtama();
  if (typeof renderPg === 'function') renderPg();
  if (typeof schedulePush === 'function') schedulePush();
}
function imFmtTgl(t) {
  if (!imTglSah(t)) return '';
  var p = t.split('-');
  return +p[2] + ' ' + IU_BLN[+p[1] - 1] + ' ' + p[0];
}
/* Sisa waktu menuju Hari H dalam tahun · bulan · hari (kalender) */
function imSisa(t) {
  if (!imTglSah(t)) return null;
  var n = new Date(),
    a = new Date(n.getFullYear(), n.getMonth(), n.getDate()),
    p = t.split('-'),
    h = new Date(+p[0], +p[1] - 1, +p[2]);
  if (h.getTime() === a.getTime()) return { status: 'hari-ini' };
  if (h < a) return { status: 'lewat' };
  var y = h.getFullYear() - a.getFullYear(),
    m = h.getMonth() - a.getMonth(),
    d = h.getDate() - a.getDate();
  if (d < 0) {
    m--;
    d += new Date(h.getFullYear(), h.getMonth(), 0).getDate();
  }
  if (m < 0) {
    y--;
    m += 12;
  }
  return { status: 'nanti', thn: y, bln: m, hari: d };
}
function imTeksSisa(t) {
  var s = imSisa(t);
  if (!s) return '';
  if (s.status === 'hari-ini') return 'Hari ini Hari H!';
  if (s.status === 'lewat') return 'Hari H sudah lewat';
  return (s.thn ? s.thn + ' thn ' : '') + (s.bln ? s.bln + ' bln ' : '') + (s.hari || (!s.thn && !s.bln) ? s.hari + ' hari ' : '') + 'lagi';
}
/* Progres impian utama = jumlah impian (hexagon) yang sudah 100% */
function imCapaian() {
  var l = imDaftar(),
    n = l.filter(function (it) {
      return imPersen(it) >= 100;
    }).length;
  return { n: n, m: l.length, p: l.length ? Math.round((n / l.length) * 100) : 0 };
}
function renderImUtama() {
  var box = $('#imUtama'),
    lb = $('#imBagianLabel');
  if (!box) return;
  var u = imUtama(),
    c = imCapaian();
  if (lb) lb.hidden = !c.m;
  if (!u.nama && !u.hariH) {
    box.innerHTML =
      '<div class="iu-kartu iu-kosong"><span class="iu-lencana">' +
      IU_IKON.bintang +
      'Impian utama</span>' +
      '<b>Belum ditentukan</b><p>Ketuk ikon pensil di samping profil untuk menentukan impian utama dan Hari H-nya.</p></div>';
    return;
  }
  var r = 44,
    kel = 2 * Math.PI * r,
    s = imSisa(u.hariH);
  var mundur = !u.hariH
    ? '<p class="iu-status">Hari H belum diatur. Atur lewat ikon pensil di samping profil.</p>'
    : s.status === 'nanti'
      ? '<div class="iu-mundur"><div><b>' +
        s.thn +
        '</b><span>tahun</span></div><div><b>' +
        s.bln +
        '</b><span>bulan</span></div><div><b>' +
        s.hari +
        '</b><span>hari</span></div></div>'
      : '<p class="iu-status ' + (s.status === 'lewat' ? 'lewat' : 'hari-ini') + '">' + imTeksSisa(u.hariH) + '</p>';
  box.innerHTML =
    '<div class="iu-kartu">' +
    '<span class="iu-lencana">' +
    IU_IKON.bintang +
    'Impian utama</span>' +
    '<div class="iu-atas"><div class="iu-cincin" role="img" aria-label="' +
    c.p +
    '% tercapai">' +
    '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="iu-jalur" cx="50" cy="50" r="' +
    r +
    '"/><circle class="iu-isi' +
    (c.p ? '' : ' nol') +
    '" cx="50" cy="50" r="' +
    r +
    '" style="stroke-dasharray:' +
    ((kel * c.p) / 100).toFixed(2) +
    ' ' +
    kel.toFixed(2) +
    '"/></svg>' +
    '<div class="iu-foto' +
    (u.foto ? ' ada-foto' : '') +
    '">' +
    (u.foto ? '<img src="' + esc(u.foto) + '" alt="" referrerpolicy="no-referrer">' : IU_IKON.bintang) +
    '</div></div>' +
    '<div class="iu-teks' +
    (iuLuas ? ' luas' : '') +
    '"><h3 translate="no">' +
    esc(u.nama || 'Impian utama') +
    '</h3>' +
    (u.alasan ? '<p class="iu-alasan" translate="no">"' + esc(u.alasan) + '"</p>' : '') +
    '<button type="button" class="iu-lagi" data-iu-lagi hidden aria-expanded="' +
    iuLuas +
    '">' +
    (iuLuas ? 'Ringkas' : 'Selengkapnya') +
    '</button></div></div>' +
    (u.hariH ? '<p class="iu-h">' + IU_IKON.bendera + '<span><span>Hari H</span> · ' + imFmtTgl(u.hariH) + '</span></p>' : '') +
    mundur +
    '<div class="iu-prog"><span>Bagian tercapai</span><b>' +
    c.n +
    ' dari ' +
    c.m +
    ' · ' +
    c.p +
    '%</b></div>' +
    '<div class="pg-bar iu-bar"><i style="width:' +
    c.p +
    '%"></i></div></div>';
  /* Tombol Selengkapnya hanya muncul bila nama/alasan terpotong */
  var tk = box.querySelector('.iu-teks'),
    tb = box.querySelector('[data-iu-lagi]');
  if (tk && tb) {
    var potong = Array.prototype.some.call(tk.querySelectorAll('h3, .iu-alasan'), function (e) {
      return e.scrollHeight > e.clientHeight + 2;
    });
    tb.hidden = !(iuLuas || potong);
  }
  if (typeof renderKy === 'function') renderKy(); /* jumlah impian tercapai ikut bukti keyakinan */
  var img = box.querySelector('.iu-foto img');
  if (img)
    img.addEventListener(
      'error',
      function () {
        var f = box.querySelector('.iu-foto');
        if (f) {
          f.innerHTML = IU_IKON.bintang;
          f.classList.remove('ada-foto');
        }
      },
      { once: true }
    );
}

/* ---------- Tab Impian: profil + pita + grid hexagon ---------- */
function htmlFoto(foto) {
  return foto ? '<img src="' + esc(foto) + '" alt="Foto profil" referrerpolicy="no-referrer">' : IM_IKON_ORANG;
}
/* Hexagon (ujung atas–bawah) dengan bar progres mengelilingi tepinya */
var IM_HEX_TITIK = '50,3 95,28 95,80 50,105 5,80 5,28';
function htmlHex(it, urut, bisaBuka) {
  var p = imPersen(it),
    selesai = p >= 100;
  return (
    '<div class="im-hex' +
    (selesai ? ' selesai' : '') +
    (bisaBuka ? ' bisa-buka' : '') +
    '" role="listitem" aria-label="' +
    esc(it.nama) +
    ', ' +
    Math.floor(p) +
    '%"' +
    (bisaBuka ? ' data-im-hex="' + esc(it.id) + '" tabindex="0"' : '') +
    '>' +
    '<div class="im-hex-bentuk">' +
    (bisaBuka ? '<span class="im-hex-buka" aria-hidden="true"><b>Buka</b></span>' : '') +
    '<div class="im-hex-kaca"></div>' +
    '<svg class="im-hex-bar" viewBox="0 0 100 108" aria-hidden="true">' +
    '<polygon class="im-hex-jalur" points="' +
    IM_HEX_TITIK +
    '" pathLength="100"/>' +
    '<polygon class="im-hex-isi" points="' +
    IM_HEX_TITIK +
    '" pathLength="100" style="stroke-dasharray:' +
    p.toFixed(2) +
    ' 100"/>' +
    '</svg>' +
    '<span class="im-hex-emoji" translate="no">' +
    esc(it.emoji || '⭐') +
    '</span>' +
    '<b class="im-hex-urut">' +
    urut +
    '</b>' +
    '</div>' +
    '<span class="im-hex-nama" translate="no">' +
    esc(it.nama) +
    '</span>' +
    '<small class="im-hex-target">' +
    imAngka(it.nilai) +
    ' / ' +
    imAngka(it.target) +
    (it.satuan ? ' <span translate="no">' + esc(it.satuan) + '</span>' : '') +
    ' · ' +
    Math.floor(p) +
    '%</small>' +
    '</div>'
  );
}
function renderImProfil() {
  var d = imProfil(),
    f = $('#imFoto'),
    j = $('#imJudul'),
    g = $('#imGrid');
  if (f) {
    var foto = imFotoSah(d.foto);
    f.innerHTML = htmlFoto(foto);
    f.classList.toggle('ada-foto', !!foto);
    imPasangGagal(f);
  }
  if (j)
    j.textContent =
      String(d.judul || '')
        .trim()
        .slice(0, IM_JUDUL_MAKS) || IM_JUDUL_AWAL;
  if (g) {
    var l = imDaftar();
    g.hidden = !l.length;
    g.setAttribute('role', 'list');
    g.innerHTML = l
      .map(function (it, i) {
        return htmlHex(it, i + 1, true);
      })
      .join('');
  }
  renderImUtama();
}
/* Foto dari link yang gagal dimuat → kembali ke ikon orang */
function imPasangGagal(box) {
  var img = box && box.querySelector('img');
  if (!img) return;
  img.addEventListener(
    'error',
    function () {
      box.innerHTML = IM_IKON_ORANG;
      box.classList.remove('ada-foto');
    },
    { once: true }
  );
}
$('#imEdit').addEventListener('click', function () {
  openLayer('page:impian-edit');
});
/* Ketuk hexagon sekali = muncul lapisan "Buka"; ketuk lagi = masuk halaman detail. Ketuk di luar / hexagon lain = lapisan hilang */
var imDetailId = null;
function imTutupBuka(kecuali) {
  $$('#imGrid .im-hex.buka').forEach(function (h) {
    if (h !== kecuali) h.classList.remove('buka');
  });
}
function imKetukHex(h) {
  if (h.classList.contains('buka')) {
    h.classList.remove('buka');
    imDetailId = h.dataset.imHex;
    openLayer('page:impian-detail');
    return;
  }
  imTutupBuka(h);
  h.classList.add('buka');
}
$('#imGrid').addEventListener('click', function (e) {
  var h = e.target.closest('[data-im-hex]');
  if (h) imKetukHex(h);
});
$('#imGrid').addEventListener('keydown', function (e) {
  var h = e.target.closest('[data-im-hex]');
  if (h && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    imKetukHex(h);
  }
});
document.addEventListener(
  'pointerdown',
  function (e) {
    if (!e.target.closest('#imGrid [data-im-hex]')) imTutupBuka(null);
  },
  true
);
renderImProfil();
/* Hitung mundur selalu segar: saat tab Impian dibuka, saat aplikasi kembali dilihat, dan tiap menit */
$('#impianTab').addEventListener('click', function (e) {
  if (e.target.closest('[data-it="impian"]')) renderImUtama();
});
$('#imUtama').addEventListener('click', function (e) {
  if (e.target.closest('[data-iu-lagi]')) {
    iuLuas = !iuLuas;
    renderImUtama();
  }
});
window.addEventListener('resize', function () {
  var p = $('#itIsi-impian');
  if (p && !p.hidden) renderImUtama();
});
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) renderImUtama();
});
setInterval(function () {
  var p = $('#itIsi-impian');
  if (p && !p.hidden && !document.hidden) renderImUtama();
}, 60000);

/* ---------- Halaman Edit impian ---------- */
var imEditId = null; // id impian yang sedang diedit (null = tambah baru)
PAGES['impian-edit'] = function () {
  var d = imProfil();
  $('#subTitle').textContent = 'Edit impian';
  $('#subBody').innerHTML =
    '<section class="ie-bagian"><h3 class="ie-judul">Foto profil</h3>' +
    '<div class="ie-foto-baris"><div class="im-foto ie-foto" id="ieFoto"></div>' +
    '<div class="ie-foto-aksi">' +
    '<button type="button" class="btn primary ie-btn" data-ie="galeri"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/></svg>Dari galeri</button>' +
    '<button type="button" class="btn ghost ie-btn" data-ie="link"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>Dari link</button>' +
    '<button type="button" class="ie-hapus-foto" data-ie="hapus-foto" id="ieHapusFoto">Hapus foto</button>' +
    '</div></div>' +
    '<div class="ie-link" id="ieLink" hidden><input class="input" id="ieLinkIsi" type="url" inputmode="url" maxlength="2000" placeholder="https://…/gambar.jpg" autocomplete="off">' +
    '<button type="button" class="btn primary" data-ie="link-pakai">Pakai</button></div>' +
    '<input type="file" id="ieFile" accept="image/*" hidden>' +
    '</section>' +
    '<section class="ie-bagian"><h3 class="ie-judul"><label for="ieNamaPita">Nama pita</label></h3>' +
    '<input class="input" id="ieNamaPita" maxlength="' +
    IM_JUDUL_MAKS +
    '" placeholder="' +
    IM_JUDUL_AWAL +
    '" autocomplete="off">' +
    '<small class="ie-bantu">Tampil di pita bawah foto profil. Kosongkan untuk "' +
    IM_JUDUL_AWAL +
    '".</small>' +
    '</section>' +
    '<section class="ie-bagian pge iu-ed"><h3 class="ie-judul iu-ed-judul">' +
    IU_IKON.bintang +
    'Impian utama</h3>' +
    '<div class="ie-foto-baris"><div class="im-foto ie-foto" id="iuFoto"></div>' +
    '<div class="ie-foto-aksi">' +
    '<button type="button" class="btn primary ie-btn" data-iu="galeri"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/></svg>Dari galeri</button>' +
    '<button type="button" class="btn ghost ie-btn" data-iu="link"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>Dari link</button>' +
    '<button type="button" class="ie-hapus-foto" data-iu="hapus-foto" id="iuHapusFoto">Hapus foto</button>' +
    '</div></div>' +
    '<div class="ie-link" id="iuLink" hidden><input class="input" id="iuLinkIsi" type="url" inputmode="url" maxlength="2000" placeholder="https://…/gambar.jpg" autocomplete="off">' +
    '<button type="button" class="btn primary" data-iu="link-pakai">Pakai</button></div>' +
    '<input type="file" id="iuFile" accept="image/*" hidden>' +
    '<div class="field iu-ed-field"><label for="iuNama">Nama impian utama</label><textarea class="input iu-nama-isi" id="iuNama" rows="1" maxlength="' +
    IU_NAMA_MAKS +
    '" placeholder="mis. Bebas finansial di usia 30"></textarea></div>' +
    '<div class="field"><label for="iuAlasan">Alasan</label><textarea class="input iu-alasan-isi" id="iuAlasan" rows="3" maxlength="' +
    IU_ALASAN_MAKS +
    '" placeholder="mis. Supaya keluarga tidak perlu khawatir lagi"></textarea></div>' +
    '<div class="field"><label>Hari H</label><div id="iuHariH"></div></div>' +
    '<small class="ie-bantu">Tersimpan otomatis. Hari H ini juga dipakai di tab Progress.</small>' +
    '</section>' +
    '<section class="ie-bagian"><h3 class="ie-judul">Daftar impian</h3>' +
    '<button type="button" class="btn primary pe-tambah" data-ie="tambah"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Tambah impian</button>' +
    '<div class="ie-form" id="ieForm" hidden>' +
    '<p class="pe-form-judul" id="ieFormJudul">Impian baru</p>' +
    '<div class="field"><label for="ieEmoji">Emoji</label>' +
    '<div class="ie-emoji-baris"><input class="input ie-emoji" id="ieEmoji" maxlength="16" autocomplete="off" aria-label="Emoji"><small class="ie-bantu">Ketik/tempel emoji, atau pilih:</small></div>' +
    '<div class="ie-emoji-pilih" id="ieEmojiPilih">' +
    IM_EMOJI.map(function (e) {
      return '<button type="button" data-ie-emoji="' + e + '">' + e + '</button>';
    }).join('') +
    '</div></div>' +
    '<div class="field"><label for="ieNama">Nama impian</label><input class="input" id="ieNama" maxlength="' +
    IM_NAMA_MAKS +
    '" placeholder="mis. Beli rumah" autocomplete="off"></div>' +
    '<div class="ie-angka">' +
    '<div class="field"><label for="ieNilai">Sekarang</label><input class="input" id="ieNilai" type="number" inputmode="decimal" min="0" step="any" placeholder="0"></div>' +
    '<div class="field"><label for="ieTarget">Target</label><input class="input" id="ieTarget" type="number" inputmode="decimal" min="0" step="any" placeholder="mis. 500"></div>' +
    '<div class="field"><label for="ieSatuan">Satuan</label><input class="input" id="ieSatuan" maxlength="' +
    IM_SATUAN_MAKS +
    '" placeholder="mis. juta" autocomplete="off"></div>' +
    '</div>' +
    IM_BAGIAN.map(function (b) {
      return (
        '<div class="field ie-poin-bagian"><label>' +
        b.judul +
        '</label><div class="ie-poin" data-ie-poin="' +
        b.k +
        '"></div>' +
        '<button type="button" class="ie-poin-tambah" data-ie-poin-tambah="' +
        b.k +
        '"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Tambah poin</button></div>'
      );
    }).join('') +
    '<div class="ie-pratinjau" id="iePratinjau"></div>' +
    '<div class="pe-aksi"><button type="button" class="btn ghost" data-ie="batal">Batal</button><button type="button" class="btn primary" data-ie="simpan" id="ieSimpan">Simpan</button></div>' +
    '<button type="button" class="pe-hapus" data-ie="hapus" id="ieHapus" hidden><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>Hapus impian</button>' +
    '</div>' +
    '<div class="ie-daftar" id="ieDaftar"></div>' +
    '</section>';
  $('#ieNamaPita').value = String(d.judul || '');
  var u = imUtama();
  $('#iuNama').value = u.nama;
  $('#iuAlasan').value = u.alasan;
  ieTinggi($('#iuNama'));
  ieTinggi($('#iuAlasan'));
  imEditId = null;
  ieRenderFoto();
  iuRenderFoto();
  iuRenderHariH();
  ieRenderDaftar();
  return true;
};
function ieRenderFoto() {
  var b = $('#ieFoto');
  if (!b) return;
  var foto = imFotoSah(imProfil().foto);
  b.innerHTML = htmlFoto(foto);
  b.classList.toggle('ada-foto', !!foto);
  imPasangGagal(b);
  $('#ieHapusFoto').hidden = !foto;
}
function iuRenderFoto() {
  var b = $('#iuFoto');
  if (!b) return;
  var foto = imUtama().foto;
  b.innerHTML = foto ? '<img src="' + esc(foto) + '" alt="Foto impian utama" referrerpolicy="no-referrer">' : IU_IKON.bintang;
  b.classList.toggle('ada-foto', !!foto);
  var img = b.querySelector('img');
  if (img)
    img.addEventListener(
      'error',
      function () {
        b.innerHTML = IU_IKON.bintang;
        b.classList.remove('ada-foto');
      },
      { once: true }
    );
  $('#iuHapusFoto').hidden = !foto;
}
function iuTglHtml(v) {
  var y = +v.slice(0, 4),
    m = +v.slice(5, 7) - 1,
    dd = +v.slice(8, 10),
    maks = new Date(y, m + 1, 0).getDate(),
    o = '';
  for (var i = 1; i <= maks; i++) o += '<option value="' + i + '"' + (i === dd ? ' selected' : '') + '>' + i + '</option>';
  return (
    '<div class="pe-waktu pge-tgl" id="iuTgl">' +
    '<div class="pe-w"><small>Tanggal</small><select class="input" data-iu-p="d" aria-label="Tanggal">' +
    o +
    '</select></div>' +
    '<div class="pe-w"><small>Bulan</small><select class="input" data-iu-p="m" aria-label="Bulan">' +
    KAL_BULAN.map(function (n, i) {
      return '<option value="' + i + '"' + (i === m ? ' selected' : '') + '>' + n + '</option>';
    }).join('') +
    '</select></div>' +
    '<div class="pe-w"><small>Tahun</small><div class="pe-thn-step">' +
    '<button type="button" class="pe-step" data-iu-thn="-1" aria-label="Tahun sebelumnya">' +
    IU_IKON.minus +
    '</button>' +
    '<input class="input" data-iu-p="y" type="text" inputmode="numeric" maxlength="4" aria-label="Tahun" value="' +
    y +
    '">' +
    '<button type="button" class="pe-step" data-iu-thn="1" aria-label="Tahun berikutnya">' +
    IU_IKON.plus +
    '</button>' +
    '</div></div></div>'
  );
}
function iuRenderHariH() {
  var b = $('#iuHariH');
  if (!b) return;
  var h = imHariH();
  b.innerHTML = h
    ? iuTglHtml(h) +
      '<div class="iu-h-bawah"><span class="iu-h-sisa" id="iuSisa">' +
      imTeksSisa(h) +
      '</span><button type="button" class="se-reset pge-reset" data-iu="hapus-h">Hapus Hari H</button></div>'
    : '<button type="button" class="ie-poin-tambah iu-atur-h" data-iu="atur-h">' + IU_IKON.bendera + 'Atur Hari H</button>';
}
function iuBacaTgl() {
  var box = $('#iuTgl');
  if (!box) return '';
  var y = parseInt(box.querySelector('[data-iu-p="y"]').value, 10);
  if (!(y >= THN_MIN && y <= THN_MAKS)) return '';
  var m = +box.querySelector('[data-iu-p="m"]').value,
    sel = box.querySelector('[data-iu-p="d"]'),
    maks = new Date(y, m + 1, 0).getDate(),
    d = Math.min(+sel.value || 1, maks);
  if (sel.options.length !== maks) {
    var o = '';
    for (var i = 1; i <= maks; i++) o += '<option value="' + i + '">' + i + '</option>';
    sel.innerHTML = o;
  }
  sel.value = d;
  var z = function (n) {
    return (n < 10 ? '0' : '') + n;
  };
  return y + '-' + z(m + 1) + '-' + z(d);
}
function iuTglBerubah() {
  var v = iuBacaTgl();
  if (!v) return;
  var u = imUtama();
  if (u.hariH === v) return;
  u.hariH = v;
  imSimpanUtama(u);
  var s = $('#iuSisa');
  if (s) s.textContent = imTeksSisa(v);
}
function ieRenderDaftar() {
  var b = $('#ieDaftar');
  if (!b) return;
  var l = imDaftar();
  b.innerHTML = l.length
    ? l
        .map(function (it, i) {
          var p = imPersen(it);
          return (
            '<article class="ie-item' +
            (it.id === imEditId ? ' diedit' : '') +
            '"><b class="ie-urut">' +
            (i + 1) +
            '</b><span class="ie-item-emoji" translate="no">' +
            esc(it.emoji || '⭐') +
            '</span>' +
            '<div class="ie-item-teks"><span translate="no">' +
            esc(it.nama) +
            '</span><small>' +
            imAngka(it.nilai) +
            ' / ' +
            imAngka(it.target) +
            (it.satuan ? ' ' + esc(it.satuan) : '') +
            ' · ' +
            Math.floor(p) +
            '%</small>' +
            '<i class="ie-item-bar"><i style="width:' +
            p.toFixed(1) +
            '%"></i></i></div>' +
            '<span class="ie-geser">' +
            '<button type="button" class="pe-edit" data-ie-geser="-1" data-id="' +
            esc(it.id) +
            '" aria-label="Naikkan urutan"' +
            (i === 0 ? ' hidden' : '') +
            '><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></button>' +
            '<button type="button" class="pe-edit" data-ie-geser="1" data-id="' +
            esc(it.id) +
            '" aria-label="Turunkan urutan"' +
            (i === l.length - 1 ? ' hidden' : '') +
            '><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button></span>' +
            '<button type="button" class="pe-edit" data-ie-edit="' +
            esc(it.id) +
            '" aria-label="Edit impian">' +
            IM_IKON_PENSIL +
            '</button></article>'
          );
        })
        .join('')
    : '<p class="pe-kosong">Belum ada impian. Ketuk "Tambah impian" untuk membuat hexagon pertama.</p>';
}
function iePoinBaris(k, teks, fokus) {
  var box = $('#subBody [data-ie-poin="' + k + '"]');
  if (!box) return;
  if (box.querySelectorAll('.ie-poin-baris').length >= IM_POIN_MAKS) {
    toast('Maksimal ' + IM_POIN_MAKS + ' poin');
    return;
  }
  var b = IM_BAGIAN.filter(function (x) {
      return x.k === k;
    })[0],
    d = document.createElement('div');
  d.className = 'ie-poin-baris';
  d.innerHTML =
    '<b class="ie-poin-no"></b><div class="ie-poin-isi"><textarea class="input" rows="1" maxlength="' +
    IM_POIN_PANJANG +
    '" placeholder="' +
    esc(b.isian) +
    '"></textarea></div>' +
    '<button type="button" class="ie-poin-hapus" data-ie-poin-hapus aria-label="Hapus poin"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  d.querySelector('textarea').value = teks || '';
  box.appendChild(d);
  iePoinNomor(box);
  ieTinggi(d.querySelector('textarea'));
  if (fokus) d.querySelector('textarea').focus();
}
function iePoinNomor(box) {
  Array.prototype.forEach.call(box.querySelectorAll('.ie-poin-baris'), function (r, i) {
    r.querySelector('.ie-poin-no').textContent = i + 1 + '.';
  });
}
function ieTinggi(t) {
  t.style.height = 'auto';
  t.style.height = t.scrollHeight + 2 + 'px';
}
function iePoinIsi(it) {
  IM_BAGIAN.forEach(function (b) {
    var box = $('#subBody [data-ie-poin="' + b.k + '"]');
    if (!box) return;
    box.innerHTML = '';
    imPoin(it && it[b.k]).forEach(function (t) {
      iePoinBaris(b.k, t);
    });
  });
}
function iePoinBaca(k) {
  return imPoin(
    $$('#subBody [data-ie-poin="' + k + '"] textarea').map(function (t) {
      return t.value;
    })
  );
}
function ieBaca() {
  return {
    emoji: imEmoji1($('#ieEmoji').value) || '⭐',
    nama: $('#ieNama').value.trim().slice(0, IM_NAMA_MAKS),
    nilai: Math.max(0, parseFloat($('#ieNilai').value) || 0),
    target: Math.max(0, parseFloat($('#ieTarget').value) || 0),
    satuan: $('#ieSatuan').value.trim().slice(0, IM_SATUAN_MAKS)
  };
}
function ieRenderPratinjau() {
  var b = $('#iePratinjau');
  if (!b) return;
  var it = ieBaca(),
    l = imDaftar(),
    urut = imEditId
      ? l
          .map(function (x) {
            return x.id;
          })
          .indexOf(imEditId) + 1
      : l.length + 1;
  if (!it.nama) it.nama = 'Nama impian';
  b.innerHTML = '<small class="ie-bantu">Pratinjau</small><div class="im-grid ie-pratinjau-grid">' + htmlHex(it, urut) + '</div>';
}
function ieBuka(buka, it) {
  var f = $('#ieForm'),
    t = $('#subBody [data-ie="tambah"]');
  if (!f) return;
  imEditId = buka && it ? it.id : null;
  f.hidden = !buka;
  t.hidden = buka;
  $('#ieFormJudul').textContent = imEditId ? 'Edit impian' : 'Impian baru';
  $('#ieHapus').hidden = !imEditId;
  $('#ieSimpan').textContent = imEditId ? 'Simpan perubahan' : 'Simpan';
  if (buka) {
    $('#ieEmoji').value = it ? it.emoji || '' : '';
    $('#ieNama').value = it ? it.nama || '' : '';
    $('#ieNilai').value = it ? +it.nilai || 0 : '';
    $('#ieTarget').value = it ? +it.target || '' : '';
    $('#ieSatuan').value = it ? it.satuan || '' : '';
    iePoinIsi(it);
    ieRenderPratinjau();
    if (it) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else $('#ieNama').focus();
  }
  ieRenderDaftar();
}
/* Foto dari galeri HP → diperkecil (maks 320px, JPEG) agar ringan disimpan */
function ieFotoBerkas(file, tujuan) {
  if (!file || !/^image\//.test(file.type)) {
    toast('Pilih file gambar');
    return;
  }
  var url = URL.createObjectURL(file),
    img = new Image();
  img.onload = function () {
    var s = 320,
      k = Math.min(1, s / Math.min(img.naturalWidth, img.naturalHeight)),
      w = Math.round(img.naturalWidth * k),
      h = Math.round(img.naturalHeight * k);
    var sisi = Math.min(w, h),
      c = document.createElement('canvas');
    c.width = c.height = sisi;
    c.getContext('2d').drawImage(
      img,
      (w - sisi) / 2 / k,
      (h - sisi) / 2 / k,
      sisi / k,
      sisi / k,
      0,
      0,
      sisi,
      sisi
    ); /* potong persegi di tengah */
    URL.revokeObjectURL(url);
    var data;
    try {
      data = c.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      toast('Gambar tidak bisa dibaca');
      return;
    }
    if (tujuan === 'utama') {
      var u = imUtama();
      u.foto = data;
      imSimpanUtama(u);
      iuRenderFoto();
      toast('Foto impian utama diganti');
      return;
    }
    var d = imProfil();
    d.foto = data;
    imSimpanProfil(d);
    ieRenderFoto();
    toast('Foto profil diganti');
  };
  img.onerror = function () {
    URL.revokeObjectURL(url);
    toast('Gambar tidak bisa dibaca');
  };
  img.src = url;
}
function ieFotoLink(u, tujuan) {
  u = String(u || '').trim();
  var utama = tujuan === 'utama';
  if (!/^https:\/\/[^\s"'<>]+$/.test(u)) {
    toast('Link harus diawali https://');
    $(utama ? '#iuLinkIsi' : '#ieLinkIsi').focus();
    return;
  }
  var img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.onload = function () {
    if (utama) {
      var x = imUtama();
      x.foto = u;
      imSimpanUtama(x);
      iuRenderFoto();
      $('#iuLink').hidden = true;
      toast('Foto impian utama diganti');
      return;
    }
    var d = imProfil();
    d.foto = u;
    imSimpanProfil(d);
    ieRenderFoto();
    $('#ieLink').hidden = true;
    toast('Foto profil diganti');
  };
  img.onerror = function () {
    toast('Gambar dari link ini tidak bisa dimuat');
  };
  img.src = u;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'impian-edit') return;
  var pt = e.target.closest('[data-ie-poin-tambah]');
  if (pt) {
    iePoinBaris(pt.dataset.iePoinTambah, '', true);
    return;
  }
  var ph = e.target.closest('[data-ie-poin-hapus]');
  if (ph) {
    var row = ph.closest('.ie-poin-baris'),
      box = row.parentNode,
      tk = row.querySelector('textarea').value.trim(),
      rk = tk.length > 60 ? tk.slice(0, 60) + '…' : tk;
    askConfirm({
      title: 'Hapus poin?',
      text: (rk ? '"' + rk + '"' : 'Poin kosong ini') + ' dihapus (berlaku setelah Simpan).',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          if (row.isConnected) {
            row.remove();
            iePoinNomor(box);
          }
        });
      }
    });
    return;
  }
  var em = e.target.closest('[data-ie-emoji]');
  if (em) {
    $('#ieEmoji').value = em.dataset.ieEmoji;
    ieRenderPratinjau();
    return;
  }
  var it2 = e.target.closest('[data-iu-thn]');
  if (it2) {
    var yi = $('#iuTgl [data-iu-p="y"]'),
      y2 = (parseInt(yi.value, 10) || new Date().getFullYear()) + +it2.dataset.iuThn;
    yi.value = Math.max(THN_MIN, Math.min(THN_MAKS, y2));
    iuTglBerubah();
    return;
  }
  var iu = e.target.closest('[data-iu]');
  if (iu) {
    var ai = iu.dataset.iu;
    if (ai === 'galeri') $('#iuFile').click();
    else if (ai === 'link') {
      var ln = $('#iuLink');
      ln.hidden = !ln.hidden;
      if (!ln.hidden) {
        var fu = imUtama().foto;
        $('#iuLinkIsi').value = /^https:/.test(fu) ? fu : '';
        $('#iuLinkIsi').focus();
      }
    } else if (ai === 'link-pakai') ieFotoLink($('#iuLinkIsi').value, 'utama');
    else if (ai === 'hapus-foto')
      askConfirm({
        title: 'Hapus foto impian utama?',
        text: 'Foto kembali ke ikon bintang.',
        ok: 'Hapus',
        action: function () {
          back(1, function () {
            var u = imUtama();
            u.foto = '';
            imSimpanUtama(u);
            iuRenderFoto();
            toast('Foto impian utama dihapus');
          });
        }
      });
    else if (ai === 'atur-h') {
      var n0 = new Date(),
        z0 = function (n) {
          return (n < 10 ? '0' : '') + n;
        },
        u0 = imUtama();
      u0.hariH = n0.getFullYear() + 5 + '-' + z0(n0.getMonth() + 1) + '-' + z0(Math.min(n0.getDate(), 28));
      imSimpanUtama(u0);
      iuRenderHariH();
      toast('Hari H diatur 5 tahun lagi. Ubah sesuai keinginan');
    } else if (ai === 'hapus-h')
      askConfirm({
        title: 'Hapus Hari H?',
        text: 'Tanggal Hari H dikosongkan. Hitung mundur di impian utama dan tab Progress ikut hilang.',
        ok: 'Hapus',
        action: function () {
          back(1, function () {
            var u = imUtama();
            u.hariH = '';
            imSimpanUtama(u);
            iuRenderHariH();
            toast('Hari H dihapus');
          });
        }
      });
    return;
  }
  /* Urutan hexagon (5.67.0): ▲ ▼ menukar posisi dengan tetangganya; angka di hexagon ikut berubah */
  var gs = e.target.closest('[data-ie-geser]');
  if (gs) {
    var dg = imDaftar().slice(),
      ig = dg.findIndex(function (x) {
        return x.id === gs.dataset.id;
      }),
      jg = ig + Number(gs.dataset.ieGeser);
    if (ig < 0 || jg < 0 || jg >= dg.length) return;
    var tmp = dg[ig];
    dg[ig] = dg[jg];
    dg[jg] = tmp;
    store.set(K_IM_DAFTAR, dg);
    ieRenderDaftar();
    renderImProfil();
    var fokus = $('#ieDaftar [data-ie-geser="' + gs.dataset.ieGeser + '"][data-id="' + tmp.id + '"]');
    if (fokus && !fokus.hidden) fokus.focus();
    return;
  }
  var ed = e.target.closest('[data-ie-edit]');
  if (ed) {
    var it0 = imDaftar().filter(function (x) {
      return x.id === ed.dataset.ieEdit;
    })[0];
    if (it0) ieBuka(true, it0);
    return;
  }
  var b = e.target.closest('[data-ie]');
  if (!b) return;
  var a = b.dataset.ie;
  if (a === 'galeri') $('#ieFile').click();
  else if (a === 'link') {
    var l = $('#ieLink');
    l.hidden = !l.hidden;
    if (!l.hidden) {
      var f = imProfil().foto;
      $('#ieLinkIsi').value = /^https:/.test(f || '') ? f : '';
      $('#ieLinkIsi').focus();
    }
  } else if (a === 'link-pakai') ieFotoLink($('#ieLinkIsi').value);
  else if (a === 'hapus-foto') {
    askConfirm({
      title: 'Hapus foto profil?',
      text: 'Foto profil kembali ke ikon bawaan.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          var d = imProfil();
          d.foto = '';
          imSimpanProfil(d);
          ieRenderFoto();
          toast('Foto profil dihapus');
        });
      }
    });
  } else if (a === 'tambah') {
    if (imDaftar().length >= IM_MAKS) {
      toast('Maksimal ' + IM_MAKS + ' impian');
      return;
    }
    ieBuka(true);
  } else if (a === 'batal') ieBuka(false);
  else if (a === 'simpan') {
    var v = ieBaca();
    if (!v.nama) {
      toast('Isi nama impian');
      $('#ieNama').focus();
      return;
    }
    if (!(v.target > 0)) {
      toast('Isi target lebih dari 0');
      $('#ieTarget').focus();
      return;
    }
    var d = imDaftar(),
      kini = Date.now(),
      lama =
        imEditId &&
        d.filter(function (x) {
          return x.id === imEditId;
        })[0];
    var poin = {};
    IM_BAGIAN.forEach(function (b) {
      poin[b.k] = iePoinBaca(b.k);
    });
    var it = lama || { id: uid(), dibuat: kini };
    it.emoji = v.emoji;
    it.nama = v.nama;
    it.nilai = v.nilai;
    it.target = v.target;
    it.satuan = v.satuan;
    it.diubah = kini;
    IM_BAGIAN.forEach(function (b) {
      it[b.k] = poin[b.k];
    });
    if (!lama) d.push(it);
    store.set(K_IM_DAFTAR, d);
    ieBuka(false);
    renderImProfil();
    toast(lama ? 'Perubahan disimpan' : 'Impian ditambahkan');
  } else if (a === 'hapus' && imEditId) {
    var id = imEditId,
      nm =
        (
          imDaftar().filter(function (x) {
            return x.id === id;
          })[0] || {}
        ).nama || '';
    askConfirm({
      title: 'Hapus impian?',
      text: '"' + nm + '" akan dihapus permanen dari daftar impian.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          store.set(
            K_IM_DAFTAR,
            imDaftar().filter(function (x) {
              return x.id !== id;
            })
          );
          ieBuka(false);
          renderImProfil();
          toast('Impian dihapus');
        });
      }
    });
  }
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'impian-edit') return;
  if (e.target.id === 'ieNamaPita') {
    var d = imProfil();
    d.judul = e.target.value.slice(0, IM_JUDUL_MAKS);
    imSimpanProfil(d);
  } /* langsung tersimpan */ else if (e.target.id === 'iuNama' || e.target.id === 'iuAlasan') {
    var u = imUtama();
    if (e.target.id === 'iuNama') u.nama = e.target.value.slice(0, IU_NAMA_MAKS);
    else u.alasan = e.target.value.slice(0, IU_ALASAN_MAKS);
    ieTinggi(e.target);
    imSimpanUtama(u);
  } else if (e.target.dataset.iuP === 'y') {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (e.target.value.length === 4) iuTglBerubah();
  } else if (/^ie(Emoji|Nama|Nilai|Target|Satuan)$/.test(e.target.id)) ieRenderPratinjau();
  else if (e.target.closest('.ie-poin-baris')) ieTinggi(e.target);
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind === 'impian-edit' && e.target.id === 'ieFile') {
    ieFotoBerkas(e.target.files && e.target.files[0]);
    e.target.value = '';
  } else if (pageKind === 'impian-edit' && e.target.id === 'iuFile') {
    ieFotoBerkas(e.target.files && e.target.files[0], 'utama');
    e.target.value = '';
  } else if (pageKind === 'impian-edit' && e.target.dataset.iuP) iuTglBerubah();
});
$('#subBody').addEventListener('keydown', function (e) {
  if (pageKind === 'impian-edit' && e.target.id === 'ieLinkIsi' && e.key === 'Enter') {
    e.preventDefault();
    ieFotoLink(e.target.value);
  }
  if (pageKind === 'impian-edit' && e.target.id === 'iuLinkIsi' && e.key === 'Enter') {
    e.preventDefault();
    ieFotoLink(e.target.value, 'utama');
  }
});

/* ---------- Halaman detail impian: 4 hal (dendam, cara, sumberdaya, dukungan) ---------- */
PAGES['impian-detail'] = function () {
  var it = imDaftar().filter(function (x) {
    return x.id === imDetailId;
  })[0];
  if (!it) return false;
  $('#subTitle').textContent = it.nama;
  $('#subBody').innerHTML = IM_BAGIAN.map(function (b) {
    var l = imPoin(it[b.k]);
    return (
      '<section class="ie-bagian id-bagian"><h3 class="ie-judul id-judul">' +
      b.ikon +
      b.judul +
      '</h3>' +
      (l.length
        ? '<ol class="id-daftar">' +
          l
            .map(function (t) {
              return '<li translate="no">' + esc(t) + '</li>';
            })
            .join('') +
          '</ol>'
        : '<p class="pe-kosong">Belum diisi.</p>') +
      '</section>'
    );
  }).join('');
  return true;
};
