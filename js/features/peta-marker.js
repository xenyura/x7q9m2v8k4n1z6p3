/* Stivora — Peta Tahap 2a–2b: marker buatan sendiri (tambah, edit, pindah, hapus) + tanggal, catatan, media
   Data: store (IndexedDB) 'stivora.peta.marker', tersinkron ke Firestore users/{uid}/marker (sync.js) dan ikut file cadangan.
   Media marker = media biasa (IndexedDB, ikut tampil di Galery) dengan tanda markerId.
   Alur tambah: pensil → "Tambah marker" → kembali ke peta → tekan lama 1 detik di lokasi → ketuk ikon lokasi → isi nama, ikon, warna → Simpan. */
'use strict';

var K_MARKER = 'stivora.peta.marker';
var petaMarker = store.get(K_MARKER, []);
if (!Array.isArray(petaMarker)) petaMarker = [];
var petaPilih = null; // mode memilih titik: { aksi: 'baru' | 'pindah', id }
var mkDraft = null; // isian halaman marker yang sedang dibuka
var mkKoleksi = null; // { bb: BillboardCollection, lb: LabelCollection }

/* ---------- Pilihan ikon & warna ---------- */
var MK_IKON = [
  { k: 'titik', nama: 'Titik', svg: '<circle cx="12" cy="12" r="4"/>' },
  { k: 'bintang', nama: 'Bintang', svg: '<path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.4l-5.1 2.9 1.1-5.8-4.3-4 5.8-.7z"/>' },
  { k: 'rumah', nama: 'Rumah', svg: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6.5 9.5V20h11V9.5"/>' },
  {
    k: 'hati',
    nama: 'Hati',
    svg: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>'
  },
  { k: 'bendera', nama: 'Bendera', svg: '<path d="M6 21V4"/><path d="M6 4.5h11l-2.2 4 2.2 4H6"/>' },
  { k: 'gunung', nama: 'Gunung', svg: '<path d="M3 19l6.5-11 4 6.5 2.2-3.2L21 19z"/>' },
  {
    k: 'pantai',
    nama: 'Pantai',
    svg: '<path d="M8 11a4 4 0 0 1 8 0"/><path d="M3 15c2.2 0 2.2-1.6 4.5-1.6s2.3 1.6 4.5 1.6 2.3-1.6 4.5-1.6 2.3 1.6 4.5 1.6"/><path d="M3 19c2.2 0 2.2-1.6 4.5-1.6s2.3 1.6 4.5 1.6 2.3-1.6 4.5-1.6 2.3 1.6 4.5 1.6"/>'
  },
  {
    k: 'makan',
    nama: 'Makan',
    svg: '<path d="M7 3v18"/><path d="M4.5 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M17.5 21V3c-2.2 0-3.5 2.5-3.5 6.5h3.5"/>'
  },
  {
    k: 'kopi',
    nama: 'Kopi',
    svg: '<path d="M4.5 9h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M15.5 10.5h1.8a2.6 2.6 0 0 1 0 5.2h-2"/><path d="M8.5 3.5v2.5M11.5 3.5v2.5"/>'
  },
  { k: 'foto', nama: 'Foto', svg: '<path d="M3.5 8h3.5l2-2.5h6L17 8h3.5v11h-17z"/><circle cx="12" cy="13.2" r="3.4"/>' },
  { k: 'pesawat', nama: 'Pesawat', svg: '<path d="M3 11.5l18-7.5-7.5 18-2.6-7.9z"/><path d="M10.9 14.1L21 4"/>' },
  {
    k: 'buku',
    nama: 'Buku',
    svg: '<path d="M3.5 5.5h6a2.5 2.5 0 0 1 2.5 2.5v12a2 2 0 0 0-2-2H3.5z"/><path d="M20.5 5.5h-6A2.5 2.5 0 0 0 12 8v12a2 2 0 0 1 2-2h6.5z"/>'
  },
  {
    k: 'sekolah',
    nama: 'Sekolah',
    svg: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5"/><path d="M21.5 9.5v5"/>'
  },
  { k: 'kantor', nama: 'Kantor', svg: '<path d="M3.5 8h17v11.5h-17z"/><path d="M9 8V5.5h6V8"/><path d="M3.5 13h17"/>' },
  {
    k: 'gedung',
    nama: 'Gedung',
    svg: '<path d="M4.5 20.5V8h6v12.5"/><path d="M10.5 20.5V3.5h9v17"/><path d="M3 20.5h18"/><path d="M13.5 7h3M13.5 10.5h3M13.5 14h3M6.5 11.5h2M6.5 15h2"/>'
  },
  {
    k: 'masjid',
    nama: 'Masjid',
    svg: '<path d="M6 20v-7a6 6 0 0 1 12 0v7"/><path d="M4 20h16"/><path d="M12 7V3.5"/><path d="M10 15.5h4v4.5h-4z"/>'
  },
  { k: 'rs', nama: 'Rumah sakit', svg: '<path d="M4.5 4.5h15v15h-15z"/><path d="M12 8v8M8 12h8"/>' },
  {
    k: 'toko',
    nama: 'Toko',
    svg: '<path d="M4 9.5l1.5-5h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 11.5V20h13v-8.5"/><path d="M10 20v-5h4v5"/>'
  },
  { k: 'belanja', nama: 'Belanja', svg: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>' },
  {
    k: 'hotel',
    nama: 'Penginapan',
    svg: '<path d="M3 19V7"/><path d="M3 15h18v4"/><path d="M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="12" r="1.8"/>'
  },
  {
    k: 'mobil',
    nama: 'Mobil',
    svg: '<path d="M4 15.5l1.8-5.5h12.4l1.8 5.5v3H4z"/><path d="M4 15.5h16"/><circle cx="7.5" cy="18.5" r="1.3"/><circle cx="16.5" cy="18.5" r="1.3"/>'
  },
  {
    k: 'motor',
    nama: 'Motor',
    svg: '<path d="M6 16l4-6h4l4 6"/><path d="M13 10l-1-3h-2"/><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/>'
  },
  {
    k: 'sepeda',
    nama: 'Sepeda',
    svg: '<path d="M6 16l4-7h5l3 7"/><path d="M10 9l2 7"/><path d="M14 6h2.5"/><circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/>'
  },
  {
    k: 'bus',
    nama: 'Bus',
    svg: '<path d="M5 4.5h14v13H5z"/><path d="M5 11h14"/><path d="M7.5 17.5V20M16.5 17.5V20"/><circle cx="8" cy="14.3" r=".8"/><circle cx="16" cy="14.3" r=".8"/>'
  },
  {
    k: 'kereta',
    nama: 'Kereta',
    svg: '<path d="M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v10a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M5 11h14"/><path d="M8 21l1.5-2.5M16 21l-1.5-2.5"/><circle cx="9" cy="15" r=".8"/><circle cx="15" cy="15" r=".8"/>'
  },
  { k: 'kapal', nama: 'Kapal', svg: '<path d="M3 15.5l2 4h14l2-4z"/><path d="M12 3.5v12"/><path d="M12 5l6 8.5h-6"/>' },
  {
    k: 'bensin',
    nama: 'SPBU',
    svg: '<path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20"/><path d="M3.5 20h12"/><path d="M5 10h9"/><path d="M14 8l3 2.5V17a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/>'
  },
  { k: 'parkir', nama: 'Parkir', svg: '<path d="M4.5 4.5h15v15h-15z"/><path d="M10 16.5v-9h3a2.5 2.5 0 0 1 0 5h-3"/>' },
  { k: 'pohon', nama: 'Pohon', svg: '<path d="M12 21v-5"/><path d="M12 3l6 8h-3.5l4 5h-13l4-5H6z"/>' },
  {
    k: 'bunga',
    nama: 'Bunga',
    svg: '<path d="M12 21v-9"/><circle cx="12" cy="6" r="2.5"/><circle cx="8.5" cy="9.5" r="2.5"/><circle cx="15.5" cy="9.5" r="2.5"/>'
  },
  { k: 'air', nama: 'Air', svg: '<path d="M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>' },
  { k: 'kemah', nama: 'Kemah', svg: '<path d="M3 20L12 4l9 16z"/><path d="M9.5 20l2.5-5 2.5 5"/>' },
  {
    k: 'matahari',
    nama: 'Matahari',
    svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'
  },
  { k: 'bulan', nama: 'Bulan', svg: '<path d="M15.5 4.5A8 8 0 1 0 19.5 16 6.5 6.5 0 0 1 15.5 4.5z"/>' },
  {
    k: 'bola',
    nama: 'Olahraga',
    svg: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c-3 3-3 14 0 17"/><path d="M12 3.5c3 3 3 14 0 17"/>'
  },
  { k: 'gym', nama: 'Gym', svg: '<path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11"/>' },
  { k: 'musik', nama: 'Musik', svg: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>' },
  { k: 'film', nama: 'Film', svg: '<path d="M3.5 5.5h17v13h-17z"/><path d="M7.5 5.5v13M16.5 5.5v13M3.5 12h17"/>' },
  {
    k: 'game',
    nama: 'Game',
    svg: '<path d="M7 8.5h10a4 4 0 0 1 4 4v1a3.5 3.5 0 0 1-6.3 2.1L14 15h-4l-.7.6A3.5 3.5 0 0 1 3 13.5v-1a4 4 0 0 1 4-4z"/><path d="M7.5 11v3M6 12.5h3"/><circle cx="15.5" cy="12" r=".7"/><circle cx="17" cy="13.5" r=".7"/>'
  },
  {
    k: 'hadiah',
    nama: 'Hadiah',
    svg: '<path d="M4 9.5h16v3H4z"/><path d="M5.5 12.5V20h13v-7.5"/><path d="M12 9.5V20"/><path d="M12 9.5C10 9.5 7.5 8.5 8 6.5s3 0 4 3c1-3 3.5-5 4-3s-2 3-4 3"/>'
  },
  {
    k: 'kue',
    nama: 'Ulang tahun',
    svg: '<path d="M4.5 13h15v7h-15z"/><path d="M4.5 16.5c2.5 0 2.5-1.5 5-1.5s2.5 1.5 5 1.5 2.5-1.5 5-1.5"/><path d="M12 13V9"/><path d="M12 6.5c-.8-.8-.8-1.8 0-3 .8 1.2.8 2.2 0 3z"/>'
  },
  { k: 'cincin', nama: 'Pernikahan', svg: '<circle cx="12" cy="15" r="5.5"/><path d="M9.5 5h5l-2.5 4z"/>' },
  {
    k: 'keluarga',
    nama: 'Keluarga',
    svg: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M14.5 20a3.6 3.6 0 0 1 6.5-2.3"/>'
  },
  { k: 'orang', nama: 'Orang', svg: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>' },
  { k: 'laptop', nama: 'Kerja', svg: '<path d="M5 5.5h14v10H5z"/><path d="M3 19h18"/>' },
  { k: 'uang', nama: 'Uang', svg: '<path d="M3.5 7h17v10h-17z"/><path d="M6.5 10v4M17.5 10v4"/><circle cx="12" cy="12" r="2.5"/>' },
  { k: 'target', nama: 'Target', svg: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>' },
  {
    k: 'trofi',
    nama: 'Prestasi',
    svg: '<path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6.5H4.5a3 3 0 0 0 3 4"/><path d="M16.5 6.5h3a3 3 0 0 1-3 4"/><path d="M12 14v3.5"/><path d="M8.5 20h7l-.8-2.5H9.3z"/>'
  },
  { k: 'jam', nama: 'Waktu', svg: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>' },
  {
    k: 'hewan',
    nama: 'Hewan',
    svg: '<circle cx="7" cy="9.5" r="1.7"/><circle cx="10.5" cy="6.5" r="1.7"/><circle cx="13.5" cy="6.5" r="1.7"/><circle cx="17" cy="9.5" r="1.7"/><path d="M8.5 16.5c0-2.5 1.8-4.5 3.5-4.5s3.5 2 3.5 4.5c0 2-1.8 3-3.5 2.3-1.7.7-3.5-.3-3.5-2.3z"/>'
  },
  {
    k: 'ikan',
    nama: 'Ikan',
    svg: '<path d="M3 12c3.5-5 10-5 14 0-4 5-10.5 5-14 0z"/><path d="M17 12l4-3.5v7z"/><circle cx="7.5" cy="11" r=".7"/>'
  },
  { k: 'info', nama: 'Info', svg: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>' },
  { k: 'awas', nama: 'Perhatian', svg: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>' }
];
var MK_WARNA = [
  { k: '#ef4444', nama: 'Merah' },
  { k: '#f97316', nama: 'Oranye' },
  { k: '#eab308', nama: 'Kuning' },
  { k: '#22c55e', nama: 'Hijau' },
  { k: '#06b6d4', nama: 'Toska' },
  { k: '#3b82f6', nama: 'Biru' },
  { k: '#8b5cf6', nama: 'Ungu' },
  { k: '#ec4899', nama: 'Merah muda' },
  { k: '#b91c1c', nama: 'Merah tua' },
  { k: '#f59e0b', nama: 'Jingga' },
  { k: '#84cc16', nama: 'Hijau muda' },
  { k: '#15803d', nama: 'Hijau tua' },
  { k: '#0ea5e9', nama: 'Biru langit' },
  { k: '#1d4ed8', nama: 'Biru tua' },
  { k: '#6d28d9', nama: 'Ungu tua' },
  { k: '#92400e', nama: 'Cokelat' },
  { k: '#64748b', nama: 'Abu-abu' },
  { k: '#111827', nama: 'Hitam' }
];
/* Ikon custom = emoji/huruf, disimpan sebagai 'e:<emoji>' (maks. 18 byte agar muat di batas 20 karakter server) */
var MK_KUSTOM = {
  k: 'kustom',
  nama: 'Ikon custom',
  svg: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2a4.2 4.2 0 0 0 7 0"/><path d="M9.3 9.8h.01M14.7 9.8h.01"/>'
};
function mkIkon(k) {
  if (typeof k === 'string' && k.indexOf('e:') === 0) return { k: k, nama: 'Ikon custom', emoji: k.slice(2), svg: '' };
  for (var i = 0; i < MK_IKON.length; i++) if (MK_IKON[i].k === k) return MK_IKON[i];
  return MK_IKON[0];
}
function mkJenis(m) {
  var k = m.ikon || 'titik';
  return k.indexOf('e:') === 0 ? 'kustom' : k;
} /* kunci untuk filter layer */
function mkWarnaSah(w) {
  return typeof w === 'string' && /^#[0-9a-f]{6}$/i.test(w) ? w.toLowerCase() : MK_WARNA[5].k;
}
function mkIsiIkon(ikon) {
  var x = mkIkon(ikon);
  return x.emoji ? '<span class="mk-emoji" translate="no">' + esc(x.emoji) + '</span>' : '<svg viewBox="0 0 24 24">' + x.svg + '</svg>';
}
/* Pilihan warna bersama (marker, perjalanan, area): warna siap pakai + warna custom */
function htmlPilihWarna(attr) {
  return (
    '<div class="mk-warna">' +
    MK_WARNA.map(function (x) {
      return (
        '<button type="button" ' +
        attr +
        '="' +
        x.k +
        '" aria-label="' +
        x.nama +
        '" title="' +
        x.nama +
        '" style="background:' +
        x.k +
        '"></button>'
      );
    }).join('') +
    '<label class="mk-warna-kustom" title="Warna custom"><input type="color" data-warna-kustom="' +
    attr +
    '" aria-label="Warna custom"></label></div>'
  );
}
function segarkanPilihWarna(attr, warna) {
  var w = mkWarnaSah(warna),
    siap = false;
  $$('#subBody [' + attr + ']').forEach(function (b) {
    var on = b.getAttribute(attr) === w;
    if (on) siap = true;
    b.classList.toggle('aktif', on);
  });
  var lab = $('#subBody .mk-warna-kustom'),
    inp = lab && lab.querySelector('input');
  if (!lab) return;
  lab.classList.toggle('aktif', !siap);
  lab.style.setProperty('--kustom', siap ? '' : w);
  if (inp) inp.value = w;
}
document.addEventListener('input', function (e) {
  var inp = e.target.closest && e.target.closest('[data-warna-kustom]');
  if (!inp) return;
  var a = inp.dataset.warnaKustom,
    w = mkWarnaSah(inp.value);
  if (a === 'data-warna' && mkDraft) {
    mkDraft.warna = w;
    mkSegarkanPilihan();
  } else if (a === 'data-jl-warna' && typeof jalurDraft !== 'undefined' && jalurDraft) {
    jalurDraft.warna = w;
    renderJalurIsian();
  } else if (a === 'data-ar-warna' && typeof areaDraft !== 'undefined' && areaDraft) {
    areaDraft.warna = w;
    segarkanWarnaArea();
  }
});
function mkCari(id) {
  for (var i = 0; i < petaMarker.length; i++) if (petaMarker[i].id === id) return petaMarker[i];
  return null;
}
function mkSimpanSemua() {
  store.set(K_MARKER, petaMarker);
  schedulePush();
}
function mkKoordinat(m) {
  return (
    Math.abs(m.lat).toFixed(4) + '° ' + (m.lat < 0 ? 'LS' : 'LU') + ', ' + Math.abs(m.lon).toFixed(4) + '° ' + (m.lon < 0 ? 'BB' : 'BT')
  );
}
/* Lencana ikon berwarna (untuk daftar & halaman marker) */
function mkLencana(m, besar) {
  return (
    '<span class="mk-lencana' +
    (besar ? ' besar' : '') +
    '" style="background:' +
    mkWarnaSah(m.warna) +
    '">' +
    mkIsiIkon(m.ikon) +
    '</span>'
  );
}

/* ---------- Gambar marker di peta (pin SVG berwarna + nama) ---------- */
var mkGambarCache = {};
/* Pin digambar di canvas (bukan gambar SVG) agar pasti tampil di semua HP */
function mkGambarPin(ikon, warna) {
  var kunci = ikon + warna;
  if (mkGambarCache[kunci]) return mkGambarCache[kunci];
  var k = 2,
    cv = document.createElement('canvas');
  cv.width = 48 * k;
  cv.height = 58 * k;
  var g = cv.getContext('2d');
  g.scale(k, k);
  var pin = new Path2D('M24 55.5S4.5 36.5 4.5 22a19.5 19.5 0 0 1 39 0c0 14.5-19.5 33.5-19.5 33.5z');
  g.fillStyle = warna;
  g.fill(pin);
  g.lineWidth = 3;
  g.strokeStyle = '#fff';
  g.stroke(pin);
  var em = mkIkon(ikon).emoji;
  if (em) {
    g.font = '21px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(em, 24, 23);
    mkGambarCache[kunci] = cv;
    return cv;
  }
  g.translate(12, 10);
  g.lineWidth = 2.3;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  var svg = mkIkon(ikon).svg,
    m,
    re = /<path d="([^"]+)"/g;
  while ((m = re.exec(svg))) g.stroke(new Path2D(m[1]));
  re = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g;
  while ((m = re.exec(svg))) {
    g.beginPath();
    g.arc(+m[1], +m[2], +m[3], 0, Math.PI * 2);
    g.stroke();
  }
  mkGambarCache[kunci] = cv;
  return cv;
}
function gambarMarker() {
  if (!peta || !window.Cesium) return;
  var C = Cesium;
  if (!mkKoleksi) {
    mkKoleksi = {
      bb: peta.scene.primitives.add(new C.BillboardCollection()),
      lb: peta.scene.primitives.add(new C.LabelCollection())
    };
  }
  mkKoleksi.bb.removeAll();
  mkKoleksi.lb.removeAll();
  var namaTampil = new C.DistanceDisplayCondition(0, 2500000);
  petaMarker.forEach(function (m) {
    if (typeof markerTampil === 'function' && !markerTampil(m)) return; /* disembunyikan lewat Layer */
    var pos = C.Cartesian3.fromDegrees(m.lon, m.lat);
    var id = { jenis: 'marker', mid: m.id };
    mkKoleksi.bb.add({
      id: id,
      position: pos,
      image: mkGambarPin(m.ikon, mkWarnaSah(m.warna)),
      width: 34,
      height: 41,
      verticalOrigin: C.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    });
    mkKoleksi.lb.add({
      id: id,
      text: m.nama,
      position: pos,
      font: '700 13px system-ui, sans-serif',
      fillColor: C.Color.WHITE,
      outlineColor: C.Color.fromCssColorString('#1b1830'),
      outlineWidth: 3,
      style: C.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: C.VerticalOrigin.BOTTOM,
      pixelOffset: new C.Cartesian2(0, -44),
      distanceDisplayCondition: namaTampil,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    });
  });
  peta.scene.requestRender();
}
function fokusMarker(id) {
  var m = mkCari(id);
  if (!m) return;
  terbang(m.lon, m.lat, 6000, m.nama, null, true); /* orbit setelah tiba (5.67.0) */
}

/* ---------- Mode memilih titik di peta ----------
   Tekan lama (1 detik) di lokasi → muncul ikon lokasi → ketuk ikon itu → halaman marker.
   Ketukan biasa tidak menaruh titik, jadi peta tetap bisa digeser/di-zoom dengan bebas. */
var TEKAN_LAMA = 1000;
var tekan = null; // tekanan yang sedang berjalan: { x, y, timer }
var tekanSelesaiPada = 0; // untuk mengabaikan "klik" yang menyusul setelah tekan lama
function teksPilih() {
  if (!petaPilih) return '';
  if (petaPilih.titik)
    return petaPilih.aksi === 'pindah' ? 'Ketuk ikon lokasi untuk memindah marker ke sana' : 'Ketuk ikon lokasi untuk lanjut';
  return (
    'Tekan lama (1 detik) di lokasi ' +
    (petaPilih.aksi === 'pindah' ? 'baru marker' : 'yang diinginkan') +
    ', lalu ketuk ikon lokasi yang muncul.'
  );
}
function mulaiPilih(aksi, id) {
  petaPilih = { aksi: aksi, id: id || null, titik: null };
  pasangTekanLama();
  $('#petaPilihTeks').textContent = teksPilih();
  $('#petaPilih').hidden = false;
  $('#petaBingkai').classList.add('memilih');
  tampilPinBaru();
  bukaCari(false);
  renderModeMenu(false);
  tutupLayerMenu();
  tutupInfoTempat();
}
function selesaiPilih() {
  petaPilih = null;
  tutupBantuan();
  batalTekan();
  tampilPinBaru();
  $('#petaPilih').hidden = true;
  $('#petaBingkai').classList.remove('memilih');
}
/* Posisi layar di dalam canvas peta → posisi di dalam bingkai (untuk elemen penanda) */
function geserKanvas() {
  var c = peta.scene.canvas.getBoundingClientRect(),
    f = $('#petaBingkai').getBoundingClientRect();
  return { x: c.left - f.left, y: c.top - f.top };
}
function batalTekan() {
  if (!tekan) return;
  clearTimeout(tekan.timer);
  tekan = null;
  $('#petaTekan').hidden = true;
}
function pasangTekanLama() {
  if (!peta || peta.__tekanLama) return;
  peta.__tekanLama = true;
  var kv = peta.scene.canvas,
    aktif = {};
  kv.addEventListener('pointerdown', function (e) {
    aktif[e.pointerId] = 1;
    if (!petaPilih) return;
    tutupBantuan();
    if (Object.keys(aktif).length > 1 || (e.pointerType === 'mouse' && e.button !== 0)) {
      batalTekan();
      return;
    } /* dua jari = zoom */
    batalTekan();
    var r = kv.getBoundingClientRect(),
      x = e.clientX - r.left,
      y = e.clientY - r.top,
      g = geserKanvas();
    tekan = { x: x, y: y, sx: e.clientX, sy: e.clientY };
    var cincin = $('#petaTekan');
    cincin.style.left = g.x + x + 'px';
    cincin.style.top = g.y + y + 'px';
    cincin.style.setProperty('--lama', TEKAN_LAMA + 'ms');
    cincin.hidden = true;
    void cincin.offsetWidth;
    cincin.hidden = false; /* ulang animasi */
    tekan.timer = setTimeout(function () {
      var t = tekan;
      batalTekan();
      if (t) tekanSelesai(t.x, t.y);
    }, TEKAN_LAMA);
  });
  kv.addEventListener('pointermove', function (e) {
    if (tekan && Math.abs(e.clientX - tekan.sx) + Math.abs(e.clientY - tekan.sy) > 12) batalTekan(); /* sedang menggeser peta */
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
    kv.addEventListener(n, function (e) {
      delete aktif[e.pointerId];
      batalTekan();
    });
  });
  kv.addEventListener('contextmenu', function (e) {
    if (petaPilih) e.preventDefault();
  });
  if (peta.scene.postRender && peta.scene.postRender.addEventListener) peta.scene.postRender.addEventListener(tampilPinBaru);
}
function tekanSelesai(x, y) {
  if (!petaPilih || !peta) return;
  var C = Cesium;
  var cart = peta.camera.pickEllipsoid(new C.Cartesian2(x, y), peta.scene.globe.ellipsoid);
  if (!cart) {
    toast('Tekan di permukaan bumi');
    return;
  }
  var cg = C.Cartographic.fromCartesian(cart);
  petaPilih.titik = {
    lon: +C.Math.toDegrees(cg.longitude).toFixed(6),
    lat: +C.Math.toDegrees(cg.latitude).toFixed(6),
    pos: cart,
    x: x,
    y: y
  };
  tekanSelesaiPada = Date.now();
  if (navigator.vibrate) {
    try {
      navigator.vibrate(25);
    } catch (er) {}
  }
  $('#petaPilihTeks').textContent = teksPilih();
  tampilPinBaru();
  peta.scene.requestRender();
}
/* Ikon lokasi mengikuti titiknya saat peta digeser / di-zoom */
function tampilPinBaru() {
  var pin = $('#petaPinBaru');
  if (!pin) return;
  var t = petaPilih && petaPilih.titik;
  if (!t || !peta) {
    pin.hidden = true;
    return;
  }
  var ST = window.Cesium && Cesium.SceneTransforms,
    fn = ST && (ST.worldToWindowCoordinates || ST.wgs84ToWindowCoordinates);
  var p = fn ? fn.call(ST, peta.scene, t.pos) : { x: t.x, y: t.y };
  if (!p || !isFinite(p.x) || !isFinite(p.y)) {
    pin.hidden = true;
    return;
  }
  var g = geserKanvas();
  pin.style.left = g.x + p.x + 'px';
  pin.style.top = g.y + p.y + 'px';
  var ban = $('#petaPilih'),
    batas = ban && !ban.hidden ? ban.offsetTop + ban.offsetHeight + 40 : 40;
  pin.classList.toggle('label-bawah', g.y + p.y - 54 < batas); /* dekat atas: label pindah ke bawah pin agar tidak tertutup */
  pin.querySelector('.ppb-label').textContent = petaPilih.aksi === 'pindah' ? 'Pindah ke sini' : 'Tambah di sini';
  pin.hidden = false;
}
/* Ketukan biasa di peta saat memilih: hanya petunjuk (titik ditaruh lewat tekan lama) */
function pilihTitik() {
  if (Date.now() - tekanSelesaiPada < 600) return;
  if (!petaPilih.titik) tampilBantuan($('#petaPilihTanya'), teksPilih());
}
function lanjutDariPin() {
  var p = petaPilih;
  if (!p || !p.titik) return;
  var lon = p.titik.lon,
    lat = p.titik.lat;
  selesaiPilih();
  if (p.aksi === 'tempat') {
    if (typeof tpDariTitik === 'function') tpDariTitik(lon, lat);
    return;
  } /* Tempat Favorit (5.60.0) */
  if (p.aksi === 'pindah') {
    /* Lokasi baru masuk ke isian yang sedang diedit (nama, catatan, media baru tidak hilang); tersimpan saat Simpan */
    if (!mkDraft || mkDraft.id !== p.id) {
      var m = mkCari(p.id);
      if (!m) return;
      mkDraft = JSON.parse(JSON.stringify(m));
    }
    mkDraft.lon = lon;
    mkDraft.lat = lat;
    openLayer('page:marker');
    toast('Lokasi diubah — ketuk Simpan');
    return;
  }
  /* Marker baru (atau "Pilih ulang" saat mengisi marker baru: isian sebelumnya dipertahankan) */
  mkDraft = mkDraft && !mkDraft.id ? mkDraft : { id: null, nama: '', ikon: 'titik', warna: MK_WARNA[5].k };
  mkDraft.lon = lon;
  mkDraft.lat = lat;
  openLayer('page:marker');
}
document.addEventListener('click', function (e) {
  if (e.target.closest('#petaPinBaru')) lanjutDariPin();
});
/* Tutup semua halaman, kembali ke peta, lalu jalankan fn */
function keBingkaiPeta(fn) {
  if (cur.layers.length) back(cur.layers.length, fn);
  else fn();
}

/* ---------- Bagian "Marker saya" di halaman pensil ---------- */
function renderMarkerDaftar() {
  var box = $('#petaMarkerDaftar');
  if (!box) return;
  if (!petaMarker.length) {
    box.innerHTML = kpKosong(
      'marker',
      'kp-merah',
      'Belum ada marker',
      'Tandai tempat penting: rumah, sekolah, tempat impian. Ketuk Tambah marker, lalu ketuk lokasinya di peta.',
      'marker',
      'Tambah marker'
    );
    return;
  }
  box.innerHTML =
    kpBar(petaMarker.length + ' tempat', 'marker', 'Tambah') +
    '<div class="card kp-daftar">' +
    petaMarker
      .slice()
      .sort(function (a, b) {
        return b.dibuat - a.dibuat;
      })
      .map(function (m) {
        return kpBaris('data-mk-edit', 'data-mk-lihat', m.id, mkLencana(m), m.nama, mkKoordinat(m), mkInfoKecil(m));
      })
      .join('') +
    '</div>';
}
document.addEventListener('click', function (e) {
  if (!e.target.closest('#petaMarkerDaftar')) return;
  if (e.target.closest('[data-mk="tambah"]')) {
    if (!peta) {
      toast('Peta belum siap');
      return;
    }
    mkBuangAntre();
    mkDraft = null;
    keBingkaiPeta(function () {
      mulaiPilih('baru');
    });
    return;
  }
  var b = e.target.closest('[data-mk-lihat]');
  if (b) {
    var id = b.dataset.mkLihat;
    keBingkaiPeta(function () {
      fokusMarker(id);
    });
    return;
  }
  b = e.target.closest('[data-mk-edit]');
  if (b) {
    var m = mkCari(b.dataset.mkEdit);
    if (!m) return;
    mkBuangAntre();
    mkDraft = JSON.parse(JSON.stringify(m));
    openLayer('page:marker');
  }
});

/* Baris kecil di daftar: tanggal & jumlah media (hanya jika ada) */
var MK_IKON_TGL = '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/></svg>';
var MK_IKON_MEDIA =
  '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 15.5l-5-5-8.5 8.5"/></svg>';
var MK_IKON_CATATAN = '<svg viewBox="0 0 24 24"><path d="M5 4h10l4 4v12H5z"/><path d="M8.5 11h7M8.5 15h5"/></svg>';
function mkMedia(id) {
  return images.filter(function (x) {
    return x.markerId === id;
  });
}
function mkTanggalTeks(t) {
  var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || '');
  if (!p) return '';
  return new Date(+p[1], +p[2] - 1, +p[3]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function mkInfoKecil(m) {
  var n = mkMedia(m.id).length,
    bag = [];
  if (m.tanggal) bag.push('<span>' + MK_IKON_TGL + mkTanggalTeks(m.tanggal) + '</span>');
  if (m.catatan) bag.push('<span aria-label="Ada catatan">' + MK_IKON_CATATAN + '</span>');
  if (n) bag.push('<span>' + MK_IKON_MEDIA + n + '</span>');
  return bag.length ? '<span class="mk-info">' + bag.join('') + '</span>' : '';
}

/* ---------- Halaman marker (tambah / edit) ---------- */
function buildMarkerPage() {
  if (!mkDraft) return false;
  var d = mkDraft,
    baru = !d.id;
  $('#subTitle').textContent = baru ? 'Marker baru' : 'Edit marker';
  $('#subBody').innerHTML =
    '<div class="mk-lokasi" id="mkLokasi"></div>' +
    '<div class="field"><label for="mkNama">Nama</label><input class="input" id="mkNama" maxlength="60" autocomplete="off" placeholder="Contoh: Rumah nenek"></div>' +
    '<div class="field"><label>Ikon</label><div class="mk-ikon">' +
    '<button type="button" class="mk-ikon-kustom" data-ikon-kustom aria-label="Ikon custom (emoji)" title="Ikon custom (emoji)"></button>' +
    MK_IKON.map(function (x) {
      return (
        '<button type="button" data-ikon="' +
        x.k +
        '" aria-label="' +
        x.nama +
        '" title="' +
        x.nama +
        '"><svg viewBox="0 0 24 24">' +
        x.svg +
        '</svg></button>'
      );
    }).join('') +
    '</div>' +
    '<div class="mk-emoji-isi" id="mkEmojiIsi" hidden><input class="input" id="mkEmoji" maxlength="16" autocomplete="off" placeholder="Ketik 1 emoji, mis. 🏡 🎓 ❤️"><small>Pakai keyboard emoji HP-mu. Bisa juga 1–2 huruf.</small></div></div>' +
    '<div class="field"><label>Warna</label>' +
    htmlPilihWarna('data-warna') +
    '</div>' +
    '<div class="field"><label for="mkTanggal">Tanggal <small>(opsional)</small></label><input class="input" type="date" id="mkTanggal"></div>' +
    '<div class="field"><label for="mkCatatan">Catatan <small>(opsional)</small></label><textarea class="input" id="mkCatatan" maxlength="2000" rows="4" placeholder="Tulis cerita atau catatan tentang tempat ini…"></textarea></div>' +
    '<div class="field"><label>Media <small>(foto, video, audio, dokumen)</small></label><div class="mk-media" id="mkMedia"></div>' +
    '<input type="file" id="mkFile" accept="' +
    MEDIA_DITERIMA +
    '" multiple hidden></div>' +
    '<button type="button" class="btn primary mk-simpan" data-mk="simpan">Simpan</button>' +
    (baru ? '' : '<button type="button" class="btn danger mk-hapus" data-mk="hapus">Hapus marker</button>');
  $('#mkNama').value = d.nama || '';
  $('#mkTanggal').value = d.tanggal || '';
  $('#mkCatatan').value = d.catatan || '';
  mkSegarkanPilihan();
  mkRenderMedia();
  return true;
}
/* Media marker: yang sudah tersimpan (ketuk → penampil) + file baru yang menunggu Simpan */
function mkRenderMedia() {
  var box = $('#mkMedia'),
    d = mkDraft;
  if (!box || !d) return;
  var lama = d.id ? mkMedia(d.id) : [];
  var baru = d.mediaBaru || [];
  box.innerHTML =
    lama
      .map(function (im) {
        return '<button type="button" class="mk-m" data-mk-media="' + esc(im.id) + '">' + thumbHTML(im) + '</button>';
      })
      .join('') +
    baru
      .map(function (f, i) {
        var j = jenisMedia({ type: f.tipe }),
          isi;
        if (j === 'foto') isi = '<img src="' + f.url + '" alt="">';
        else if (j === 'video') isi = '<video src="' + f.url + '#t=0.1" muted playsinline preload="metadata"></video>';
        else
          isi =
            '<span class="g-file g-' +
            j +
            '">' +
            IKON_JENIS[j] +
            '<b>' +
            esc(ekstensi({ type: f.tipe, name: f.file.name })) +
            '</b><small>' +
            esc(f.file.name) +
            '</small></span>';
        return (
          '<div class="mk-m baru">' +
          isi +
          '<span class="mk-m-baru">Baru</span>' +
          '<button type="button" class="mk-m-batal" data-mk-batal="' +
          i +
          '" aria-label="Batalkan file ini"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
        );
      })
      .join('') +
    '<button type="button" class="mk-m mk-m-tambah" data-mk="media"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>Tambah media</span></button>';
}
function mkSegarkanPilihan() {
  var d = mkDraft;
  $('#mkLokasi').innerHTML =
    mkLencana(d, true) +
    '<span class="mk-teks"><small>Lokasi</small><b>' +
    mkKoordinat(d) +
    '</b></span>' +
    '<button type="button" class="btn mk-pindah" data-mk="pindah">' +
    (d.id ? 'Pindahkan' : 'Pilih ulang') +
    '</button>';
  $$('.mk-ikon [data-ikon]').forEach(function (b) {
    b.classList.toggle('aktif', b.dataset.ikon === d.ikon);
    b.style.color = b.dataset.ikon === d.ikon ? mkWarnaSah(d.warna) : '';
  });
  var em = mkIkon(d.ikon).emoji,
    kb = $('#subBody [data-ikon-kustom]');
  if (kb) {
    kb.classList.toggle('aktif', !!em);
    kb.style.color = em ? mkWarnaSah(d.warna) : '';
    kb.innerHTML = em
      ? '<span class="mk-emoji" translate="no">' + esc(em) + '</span>'
      : '<svg viewBox="0 0 24 24">' + MK_KUSTOM.svg + '<path d="M18.5 3.5v5M16 6h5"/></svg>';
  }
  segarkanPilihWarna('data-warna', d.warna);
}
/* Ambil 1 emoji (atau 1–2 huruf) dari isian; batas 18 byte agar aman di server */
function mkAmbilEmoji(teks) {
  teks = String(teks || '').trim();
  if (!teks) return '';
  var bagian;
  if (window.Intl && Intl.Segmenter)
    bagian = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(teks), function (x) {
      return x.segment;
    });
  else bagian = Array.from(teks);
  bagian = bagian.filter(function (x) {
    return x.trim();
  });
  if (!bagian.length) return '';
  var hasil = /^[\p{L}\p{N}]$/u.test(bagian[0]) && bagian[1] && /^[\p{L}\p{N}]$/u.test(bagian[1]) ? bagian[0] + bagian[1] : bagian[0];
  return new TextEncoder().encode(hasil).length <= 18 ? hasil : '';
}
document.addEventListener('input', function (e) {
  if (e.target.id !== 'mkEmoji' || !mkDraft) return;
  var em = mkAmbilEmoji(e.target.value);
  if (!em) {
    if (e.target.value.trim()) toast('Emoji ini terlalu panjang, coba emoji lain');
    return;
  }
  mkDraft.ikon = 'e:' + em;
  mkSegarkanPilihan();
});
function markerPageClick(e) {
  var d = mkDraft;
  if (!d) return;
  if (mkMenyimpan) return;
  var b = e.target.closest('[data-mk-media]');
  if (b) {
    if (typeof pnSetDaftar === 'function')
      pnSetDaftar(
        Array.prototype.map.call(b.parentNode.querySelectorAll('[data-mk-media]'), function (x) {
          return x.dataset.mkMedia;
        })
      );
    openLayer('img:' + b.dataset.mkMedia);
    return;
  }
  b = e.target.closest('[data-mk-batal]');
  if (b) {
    var ix = +b.dataset.mkBatal;
    askConfirm({
      title: 'Buang file ini?',
      text: 'File yang baru dipilih ini tidak jadi ditambahkan ke marker.',
      ok: 'Buang',
      action: function () {
        back(1, function () {
          var d2 = mkDraft;
          if (!d2) return;
          var f = d2.mediaBaru.splice(ix, 1)[0];
          if (f) URL.revokeObjectURL(f.url);
          mkRenderMedia();
        });
      }
    });
    return;
  }
  if (e.target.closest('[data-mk="media"]')) {
    $('#mkFile').click();
    return;
  }
  if (e.target.closest('[data-ikon-kustom]')) {
    var isi = $('#mkEmojiIsi');
    isi.hidden = false;
    var inp = $('#mkEmoji');
    var em = mkIkon(d.ikon).emoji;
    if (em) inp.value = em;
    inp.focus();
    return;
  }
  b = e.target.closest('[data-ikon]');
  if (b) {
    d.ikon = b.dataset.ikon;
    $('#mkEmojiIsi').hidden = true;
    mkSegarkanPilihan();
    return;
  }
  b = e.target.closest('[data-warna]');
  if (b) {
    d.warna = b.dataset.warna;
    mkSegarkanPilihan();
    return;
  }
  if (e.target.closest('[data-mk="pindah"]')) {
    d.nama = $('#mkNama').value;
    if (!peta) {
      toast('Peta belum siap');
      return;
    }
    if (d.id) {
      var id = d.id;
      keBingkaiPeta(function () {
        mulaiPilih('pindah', id);
      });
    } else
      keBingkaiPeta(function () {
        mulaiPilih('baru');
      });
    return;
  }
  if (e.target.closest('[data-mk="simpan"]')) {
    var nama = $('#mkNama').value.trim().slice(0, 60);
    if (!nama) {
      toast('Nama marker wajib diisi');
      $('#mkNama').focus();
      return;
    }
    var tgl = /^\d{4}-\d{2}-\d{2}$/.test($('#mkTanggal').value) ? $('#mkTanggal').value : '';
    var catatan = $('#mkCatatan').value.trim().slice(0, 2000);
    var sekarang = Date.now(),
      m;
    if (d.id) {
      m = mkCari(d.id);
      if (!m) return;
      m.nama = nama;
      m.ikon = d.ikon;
      m.warna = mkWarnaSah(d.warna);
      m.tanggal = tgl;
      m.catatan = catatan;
      m.lon = d.lon;
      m.lat = d.lat;
      m.diubah = sekarang;
    } else {
      m = {
        id: uid(),
        nama: nama,
        ikon: d.ikon,
        warna: mkWarnaSah(d.warna),
        lon: d.lon,
        lat: d.lat,
        tanggal: tgl,
        catatan: catatan,
        dibuat: sekarang,
        diubah: sekarang
      };
      petaMarker.push(m);
    }
    var baru = !d.id,
      antre = d.mediaBaru || [];
    mkSimpanSemua();
    mkMenyimpan = true;
    var tombol = e.target.closest('[data-mk="simpan"]');
    if (antre.length) tombol.textContent = 'Menyimpan…';
    mkSimpanMedia(m.id, antre).then(function (gagal) {
      mkMenyimpan = false;
      mkDraft = null;
      back(1, function () {
        gambarMarker();
        renderMarkerDaftar();
        if (antre.length) {
          refreshAll();
          schedulePush();
        }
        if (baru) fokusMarker(m.id);
        toast(gagal ? 'Marker disimpan, tapi ' + gagal + ' file gagal disimpan' : 'Marker disimpan');
      });
    });
    return;
  }
  if (e.target.closest('[data-mk="hapus"]')) {
    var hapusId = d.id,
      namaLama = (mkCari(hapusId) || d).nama,
      nMedia = mkMedia(hapusId).length;
    /* 5.67.0: lampiran ikut terhapus permanen (dulu dilepas, tapi tidak tampil di mana pun dan tetap memakan ruang) */
    askConfirm({
      title: 'Hapus marker?',
      text:
        'Marker "' +
        namaLama +
        '" akan dihapus permanen dari peta.' +
        (nMedia ? ' Marker ini punya ' + nMedia + ' lampiran yang ikut terhapus dari HP dan cloud.' : ''),
      ok: 'Hapus',
      action: function () {
        petaMarker = petaMarker.filter(function (x) {
          return x.id !== hapusId;
        });
        hapusMediaPermanen(mkMedia(hapusId), true);
        mkBuangAntre();
        mkDraft = null;
        mkSimpanSemua();
        back(2, function () {
          gambarMarker();
          renderMarkerDaftar();
          toast('Marker dihapus');
        });
      }
    });
  }
}
/* Simpan file-file baru sebagai media yang terhubung ke marker; hasil = jumlah file yang gagal */
var mkMenyimpan = false;
function mkSimpanMedia(markerId, antre) {
  var gagal = 0;
  return antre
    .reduce(function (p, f) {
      return p.then(function () {
        var jenis = jenisMedia({ type: f.tipe });
        return (jenis === 'foto' ? compress(f.file) : Promise.resolve(f.file))
          .then(function (blob) {
            var now = Date.now();
            var rec = {
              id: uid(),
              blob: blob,
              caption: '',
              markerId: markerId,
              type: (jenis === 'foto' && blob.type) || f.tipe,
              size: blob.size,
              name: f.file.name || '',
              createdAt: now,
              updatedAt: now,
              uploaded: false
            };
            return idb.put(rec).then(function () {
              images.unshift(rec);
            });
          })
          .catch(function () {
            gagal++;
          })
          .then(function () {
            URL.revokeObjectURL(f.url);
          });
      });
    }, Promise.resolve())
    .then(function () {
      return gagal;
    });
}
function mkBuangAntre() {
  if (mkDraft && mkDraft.mediaBaru)
    mkDraft.mediaBaru.forEach(function (f) {
      URL.revokeObjectURL(f.url);
    });
}

PAGES.marker = buildMarkerPage;
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'marker') markerPageClick(e);
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'marker' || !mkDraft) return;
  if (e.target.id === 'mkNama') mkDraft.nama = e.target.value;
  else if (e.target.id === 'mkTanggal') mkDraft.tanggal = e.target.value;
  else if (e.target.id === 'mkCatatan') mkDraft.catatan = e.target.value;
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'marker' || !mkDraft || e.target.id !== 'mkFile') return;
  var files = Array.prototype.slice.call(e.target.files || []),
    tolak = 0,
    besar = 0;
  mkDraft.mediaBaru = mkDraft.mediaBaru || [];
  files.forEach(function (file) {
    var tipe = tipeFile(file);
    if (!tipe) {
      tolak++;
      return;
    }
    if (jenisMedia({ type: tipe }) !== 'foto' && file.size > MAX_VIDEO_MB * 1048576) {
      besar++;
      return;
    }
    mkDraft.mediaBaru.push({ file: file, tipe: tipe, url: URL.createObjectURL(file) });
  });
  e.target.value = '';
  if (besar) toast('File terlalu besar (maks ' + MAX_VIDEO_MB + ' MB)');
  else if (tolak) toast('Jenis file ini belum didukung');
  mkRenderMedia();
});
/* Kembali dari penampil (mis. media dihapus) → segarkan kotak media */
window.addEventListener('popstate', function () {
  if (pageKind === 'marker' && opened.page === 'page:marker' && mkDraft) mkRenderMedia();
});
