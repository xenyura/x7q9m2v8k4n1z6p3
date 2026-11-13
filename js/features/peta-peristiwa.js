/* Stivora — Peta Tahap 4: Events & Stories
   Peristiwa = marker yang punya Tanggal. Ceritanya = catatan + media marker itu (halaman Detail tempat).
   Garis waktu di bawah peta: ‹ sebelumnya · tanggal & nama (ketuk → cerita) · berikutnya ›, plus saring per tahun. */
'use strict';

var K_TAHUN = 'stivora.peta.tahun';
var peristiwaTahun = store.raw(K_TAHUN) || ''; // '' = semua tahun
var peristiwaId = null; // peristiwa yang sedang dipilih

function tahunDari(m) {
  return (m.tanggal || '').slice(0, 4);
}
/* Dipakai markerTampil(): saat mode peristiwa, hanya marker bertanggal (dan sesuai tahun) yang tampil */
function peristiwaCocok(m) {
  return !!m.tanggal && (!peristiwaTahun || tahunDari(m) === peristiwaTahun);
}
function urutPeristiwa(a, b) {
  return a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : (a.dibuat || 0) - (b.dibuat || 0);
}
function daftarPeristiwa() {
  return petaMarker.filter(markerTampil).sort(urutPeristiwa);
}

function mulaiPeristiwa() {
  /* Tahun yang dipilih sudah tidak punya peristiwa → kembali ke semua tahun */
  if (
    peristiwaTahun &&
    !petaMarker.some(function (m) {
      return m.tanggal && tahunDari(m) === peristiwaTahun;
    })
  )
    setTahun('');
  var d = daftarPeristiwa();
  peristiwaId = d.length ? d[0].id : null;
  renderPeristiwa();
  if (peristiwaId) fokusMarker(peristiwaId);
}
function setTahun(t) {
  peristiwaTahun = t;
  store.raw(K_TAHUN, t);
}

var IKON_KIRI = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
var IKON_KANAN = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
function renderPeristiwa() {
  var bar = $('#petaWaktu'),
    bingkai = $('#petaBingkai');
  if (!bar) return;
  var aktif = petaMode === 'peristiwa';
  bingkai.classList.toggle('mode-peristiwa', aktif);
  bar.hidden = !aktif;
  if (!aktif) {
    tutupTahunMenu();
    return;
  }
  var d = daftarPeristiwa();
  var i = -1;
  for (var k = 0; k < d.length; k++) if (d[k].id === peristiwaId) i = k;
  if (i < 0 && d.length) {
    i = 0;
    peristiwaId = d[0].id;
  }
  var tahunTeks = peristiwaTahun || 'Semua tahun';
  if (!d.length) {
    peristiwaId = null;
    bar.innerHTML =
      '<span class="pw-kosong">' +
      (peristiwaTahun ? 'Tidak ada peristiwa di tahun ini' : 'Belum ada marker bertanggal. Isi Tanggal di marker lewat ikon pensil.') +
      '</span>' +
      (peristiwaTahun ? '<button type="button" class="pw-tahun" data-pw="tahun"><span>' + tahunTeks + '</span>▾</button>' : '');
    return;
  }
  var m = d[i];
  bar.innerHTML =
    '<button type="button" class="pw-nav" data-pw="mundur" aria-label="Peristiwa sebelumnya"' +
    (i === 0 ? ' disabled' : '') +
    '>' +
    IKON_KIRI +
    '</button>' +
    '<button type="button" class="pw-isi" data-pw="cerita">' +
    mkLencana(m) +
    '<span class="pw-teks"><small>' +
    tanggalPanjang(m.tanggal) +
    '</small><b translate="no">' +
    esc(m.nama) +
    '</b></span></button>' +
    '<button type="button" class="pw-tahun" data-pw="tahun"><b>' +
    (i + 1) +
    '/' +
    d.length +
    '</b><span>' +
    tahunTeks +
    '</span></button>' +
    '<button type="button" class="pw-nav" data-pw="maju" aria-label="Peristiwa berikutnya"' +
    (i === d.length - 1 ? ' disabled' : '') +
    '>' +
    IKON_KANAN +
    '</button>';
}
function pilihPeristiwaId(id) {
  peristiwaId = id;
  renderPeristiwa();
  fokusMarker(id);
}
function langkahPeristiwa(arah) {
  var d = daftarPeristiwa(),
    i = -1;
  for (var k = 0; k < d.length; k++) if (d[k].id === peristiwaId) i = k;
  var j = i + arah;
  if (j < 0 || j >= d.length) return;
  pilihPeristiwaId(d[j].id);
}

/* ---------- Menu tahun ---------- */
function tutupTahunMenu() {
  var m = $('#petaTahunMenu');
  if (m) m.hidden = true;
}
function bukaTahunMenu() {
  var menu = $('#petaTahunMenu');
  if (!menu.hidden) {
    menu.hidden = true;
    return;
  }
  var hitung = {},
    semua = 0;
  petaMarker.forEach(function (m) {
    if (!m.tanggal || !petaLayer.marker || petaLayer.sembunyi[mkJenis(m)]) return;
    var t = tahunDari(m);
    hitung[t] = (hitung[t] || 0) + 1;
    semua++;
  });
  var opsi = function (t, nama, n) {
    return (
      '<button type="button" class="peta-mode-opsi' +
      (t === peristiwaTahun ? ' aktif' : '') +
      '" data-tahun="' +
      t +
      '"><span>' +
      nama +
      '</span><small>' +
      n +
      '</small></button>'
    );
  };
  menu.innerHTML =
    opsi('', 'Semua tahun', semua) +
    Object.keys(hitung)
      .sort()
      .map(function (t) {
        return opsi(t, t, hitung[t]);
      })
      .join('');
  menu.hidden = false;
}

function peristiwaClick(e) {
  var b = e.target.closest('[data-tahun]');
  if (b) {
    setTahun(b.dataset.tahun);
    tutupTahunMenu();
    terapkanLayer(); // pin di peta ikut disaring
    var d = daftarPeristiwa();
    peristiwaId = d.length ? d[0].id : null;
    renderPeristiwa();
    if (peristiwaId) fokusMarker(peristiwaId);
    return;
  }
  b = e.target.closest('[data-pw]');
  if (!b) return;
  var aksi = b.dataset.pw;
  if (aksi === 'tahun') {
    renderModeMenu(false);
    tutupLayerMenu();
    bukaTahunMenu();
    return;
  }
  tutupTahunMenu();
  if (aksi === 'mundur') langkahPeristiwa(-1);
  else if (aksi === 'maju') langkahPeristiwa(1);
  else if (aksi === 'cerita' && peristiwaId) {
    tempatId = peristiwaId;
    openLayer('page:tempat');
  }
}

renderPeristiwa();
