/* ============================================================
   Stivora — Galery · Lainnya · Tempat Favorit (5.60.0)
   - Satu data dengan Peta: setiap tempat = marker di Peta 3D ('stivora.peta.marker': nama, ikon, warna, lon, lat, catatan).
     Info tambahan disimpan di 'stivora.galery.tempat' = { v: 1, kol: [{ id, n }], item: [...] }
     (sinkron dipecah: satu dokumen per tempat 'tempat-t-<id>' + 'tempat-urutan'; ikut cadangan).
     Item: { id, mk: id marker, a: nama cadangan (tanpa marker), kat, s: 'ingin'|'sudah', fav, kl: [id koleksi], imp: id impian,
             al: alamat, tel, web, jam: jam buka (format OpenStreetMap), osm, url, c: catatan (tanpa marker),
             kj: [{ i, t: 'YYYY-MM-DD', n: 1-5, h: 0-3 harga, suka, dg, c }], dibuat, diubah }
   - Nama, kategori (ikon & warna) dan catatan diubah di sini → marker ikut berubah, begitu juga sebaliknya.
   - Pencarian & alamat dari OpenStreetMap (Nominatim); peta kecil dari ubin OpenStreetMap.
   - Lokasi HP hanya dipakai saat itu (jarak / "Saya di sini"), tidak disimpan.
   ============================================================ */
'use strict';

var K_TP = 'stivora.galery.tempat';
var TP_MAKS = 3000,
  TP_KJ_MAKS = 500,
  TP_RUANG = 600000;
var TP_KAT = [
  { k: 'kuliner', n: 'Kuliner', ik: 'makan', w: '#f97316' },
  { k: 'kafe', n: 'Kafe', ik: 'kopi', w: '#92400e' },
  { k: 'alam', n: 'Wisata alam', ik: 'gunung', w: '#15803d' },
  { k: 'pantai', n: 'Pantai', ik: 'pantai', w: '#0ea5e9' },
  { k: 'ibadah', n: 'Ibadah', ik: 'masjid', w: '#0f766e' },
  { k: 'belanja', n: 'Belanja', ik: 'belanja', w: '#ec4899' },
  { k: 'inap', n: 'Penginapan', ik: 'hotel', w: '#6d28d9' },
  { k: 'olahraga', n: 'Olahraga', ik: 'bola', w: '#ef4444' },
  { k: 'lain', n: 'Lainnya', ik: 'bintang', w: '#3b82f6' }
];
var TP_HARGA = ['Gratis', 'Rp', 'Rp Rp', 'Rp Rp Rp'];
var TP_DENGAN = ['Sendiri', 'Keluarga', 'Teman', 'Pasangan', 'Teman kantor'];
var TP_URUT = ['Terbaru ditambah', 'Terdekat', 'Nilai saya', 'Nama A–Z'];
var tpS = '',
  tpK = '',
  tpKol = '',
  tpUrut = 0,
  tpPosisi = null,
  tpDraft = null,
  tpTujuan = null,
  tpCariQ = '',
  tpCariNo = 0,
  tpCariT = null,
  tpKjForm = null;

function tpKat(k) {
  return (
    TP_KAT.filter(function (x) {
      return x.k === k;
    })[0] || TP_KAT[TP_KAT.length - 1]
  );
}
function tpStr(v, n) {
  return typeof v === 'string' ? v.slice(0, n) : '';
}
function tpTgl(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : '';
}
function tpHariIni() {
  return typeof bkHariIni === 'function' ? bkHariIni() : new Date().toISOString().slice(0, 10);
}
function tpSah(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string') return null;
  var o = {
    id: x.id.slice(0, 64),
    kat: TP_KAT.some(function (k) {
      return k.k === x.kat;
    })
      ? x.kat
      : 'lain',
    s: x.s === 'sudah' ? 'sudah' : 'ingin',
    dibuat: +x.dibuat || 0,
    diubah: +x.diubah || +x.dibuat || 0
  };
  if (typeof x.mk === 'string' && x.mk) o.mk = x.mk.slice(0, 64);
  ['a', 'al', 'jam'].forEach(function (k) {
    var v = tpStr(x[k], 200).trim();
    if (v) o[k] = v;
  });
  ['tel', 'osm'].forEach(function (k) {
    var v = tpStr(x[k], 40).trim();
    if (v) o[k] = v;
  });
  ['web', 'url'].forEach(function (k) {
    var v = typeof glUrlSah === 'function' ? glUrlSah(x[k]) : '';
    if (v) o[k] = v;
  });
  if (tpStr(x.c, 2000).trim()) o.c = tpStr(x.c, 2000);
  if (x.fav) o.fav = 1;
  if (Array.isArray(x.kl))
    o.kl = x.kl
      .filter(function (k) {
        return typeof k === 'string';
      })
      .slice(0, 50);
  if (typeof x.imp === 'string' && x.imp) o.imp = x.imp.slice(0, 64);
  if (Array.isArray(x.kj))
    o.kj = x.kj
      .filter(function (v) {
        return v && tpTgl(v.t);
      })
      .slice(0, TP_KJ_MAKS)
      .map(function (v) {
        return {
          i: tpStr(v.i, 40) || uid(),
          t: v.t,
          n: +v.n >= 1 && +v.n <= 5 ? Math.floor(+v.n) : 0,
          h: +v.h >= 0 && +v.h <= 3 ? Math.floor(+v.h) : 0,
          suka: tpStr(v.suka, 200),
          dg: tpStr(v.dg, 40),
          c: tpStr(v.c, 1000)
        };
      });
  return o;
}

/* ---------- Penyimpanan ---------- */
function tpData() {
  var d = store.get(K_TP, null);
  return d && typeof d === 'object' ? d : { v: 1, kol: [], item: [] };
}
function tpKoleksi() {
  var d = tpData();
  return (Array.isArray(d.kol) ? d.kol : []).filter(function (k) {
    return k && typeof k.id === 'string' && k.n;
  });
}
function tpItems() {
  tpMigrasi();
  return (Array.isArray(tpData().item) ? tpData().item : []).map(tpSah).filter(Boolean);
}
function tpSimpanData(items, kol) {
  glSimpanPecahan(K_TP, tpSah, items, { kol: kol });
}
function tpCari(id) {
  return (
    tpItems().filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function tpUbah(id, f) {
  var hasil = null,
    gagal = false;
  var L = tpItems().map(function (x) {
    if (x.id !== id) return x;
    var z = JSON.parse(JSON.stringify(x));
    f(z);
    z = tpSah(z);
    z.diubah = Date.now();
    if (typeof gtUkuranByte === 'function' && gtUkuranByte(z) > TP_RUANG) {
      gagal = true;
      toast('Data tempat ini sudah terlalu besar. Hapus beberapa kunjungan dulu.');
      return x;
    }
    hasil = z;
    return z;
  });
  if (hasil && !gagal) tpSimpanData(L);
  return gagal ? null : hasil;
}
/* Tempat lama di tab Lainnya (tanpa lokasi) dipindah ke sini */
function tpMigrasi() {
  var d = store.get(K_GL, null);
  if (!d || !Array.isArray(d.tempat) || !d.tempat.length) return;
  var data = tpData(),
    items = Array.isArray(data.item) ? data.item.slice() : [],
    ada = {};
  items.forEach(function (x) {
    if (x && x.id) ada[x.id] = 1;
  });
  d.tempat.forEach(function (x) {
    if (!x || typeof x.id !== 'string' || !x.a || ada[x.id]) return;
    items.push({
      id: x.id,
      a: x.a,
      al: x.b || '',
      s: x.s === 'sudah' ? 'sudah' : 'ingin',
      kat: 'lain',
      url: x.url || '',
      c: x.c || '',
      dibuat: x.dibuat || Date.now(),
      diubah: x.diubah || Date.now()
    });
  });
  var sisa = {};
  Object.keys(d).forEach(function (k) {
    if (k !== 'tempat') sisa[k] = d[k];
  });
  store.set(K_GL, sisa);
  var o = { v: 1 };
  Object.keys(data).forEach(function (k) {
    if (k !== 'item' && k !== 'v') o[k] = data[k];
  });
  o.item = items;
  store.set(K_TP, o);
}

/* ---------- Marker (satu data dengan Peta) ---------- */
function tpMarker(x) {
  return x && x.mk && typeof mkCari === 'function' ? mkCari(x.mk) : null;
}
function tpNama(x) {
  var m = tpMarker(x);
  return (m && m.nama) || x.a || 'Tanpa nama';
}
function tpCatatan(x) {
  var m = tpMarker(x);
  return m ? m.catatan || '' : x.c || '';
}
function tpUbahMarker(x, f) {
  var m = tpMarker(x);
  if (!m) return;
  f(m);
  m.diubah = Date.now();
  if (typeof mkSimpanSemua === 'function') mkSimpanSemua();
  if (typeof gambarMarker === 'function')
    try {
      gambarMarker();
    } catch (e) {}
}
function tpBuatMarker(nama, kat, lon, lat, catatan) {
  var k = tpKat(kat),
    kini = Date.now();
  var m = {
    id: uid(),
    nama: String(nama).slice(0, 60),
    ikon: k.ik,
    warna: k.w,
    lon: +(+lon).toFixed(6),
    lat: +(+lat).toFixed(6),
    tanggal: '',
    catatan: String(catatan || '').slice(0, 2000),
    dibuat: kini,
    diubah: kini
  };
  petaMarker.push(m);
  mkSimpanSemua();
  if (typeof gambarMarker === 'function')
    try {
      gambarMarker();
    } catch (e) {}
  return m;
}
function tpHapusMarker(id) {
  if (!mkCari(id)) return;
  petaMarker = petaMarker.filter(function (x) {
    return x.id !== id;
  });
  if (typeof mkMedia === 'function')
    mkMedia(id).forEach(function (x) {
      x.markerId = null;
      x.updatedAt = Date.now();
      x.metaDirty = true;
      idb.put(x);
    });
  mkSimpanSemua();
  if (typeof gambarMarker === 'function')
    try {
      gambarMarker();
    } catch (e) {}
  if (typeof renderMarkerDaftar === 'function')
    try {
      renderMarkerDaftar();
    } catch (e) {}
}
function tpKatDariIkon(ikon) {
  var k = TP_KAT.filter(function (x) {
    return x.ik === ikon;
  })[0];
  return k ? k.k : 'lain';
}
function tpIkonSvg(ik, kelas) {
  var x = typeof mkIkon === 'function' ? mkIkon(ik) : { svg: '' };
  return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (kelas ? ' class="' + kelas + '"' : '') + '>' + x.svg + '</svg>';
}
/* Ikon & warna pin: dari marker (kalau ada), selain itu dari kategori */
function tpPin(x) {
  var m = tpMarker(x),
    k = tpKat(x.kat);
  return { ik: m ? m.ikon : k.ik, w: m ? mkWarnaSah(m.warna) : k.w };
}

/* ---------- Jarak & lokasi HP ---------- */
function tpJarakKm(a, b) {
  var R = 6371,
    r = Math.PI / 180,
    dLat = (b.lat - a.lat) * r,
    dLon = (b.lon - a.lon) * r;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function tpJarakTeks(km) {
  if (km >= 100) return Math.round(km).toLocaleString('id-ID') + ' km';
  if (km >= 1) return km.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' km';
  return Math.max(1, Math.round(km * 1000)) + ' m';
}
function tpJarak(x) {
  var m = tpMarker(x);
  return m && tpPosisi ? tpJarakKm(tpPosisi, m) : null;
}
function tpMintaLokasi(lalu, gagal) {
  if (!('geolocation' in navigator)) {
    toast('Perangkat ini tidak mendukung lokasi');
    if (gagal) gagal();
    return;
  }
  if (!window.isSecureContext) {
    toast('Lokasi hanya bisa dipakai lewat https');
    if (gagal) gagal();
    return;
  }
  var ambil = function () {
    navigator.geolocation.getCurrentPosition(
      function (p) {
        tpPosisi = { lon: p.coords.longitude, lat: p.coords.latitude, akurasi: Math.round(p.coords.accuracy || 0), t: Date.now() };
        lalu(tpPosisi);
      },
      function (err) {
        var kode = err && err.code;
        toast(
          kode === 1
            ? 'Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan browser.'
            : kode === 3
              ? 'Lokasi terlalu lama didapat. Coba lagi.'
              : 'Lokasi tidak ditemukan. Pastikan GPS menyala.'
        );
        if (gagal) gagal();
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  };
  if (typeof K_LOKASI_SETUJU !== 'undefined' && store.raw(K_LOKASI_SETUJU) === '1') {
    ambil();
    return;
  }
  askConfirm({
    title: 'Pakai lokasimu?',
    text: 'Stivora akan meminta izin lokasi untuk menghitung jarak dan menandai posisimu. Lokasi hanya dipakai saat itu di perangkat ini, tidak disimpan dan tidak dikirim ke mana pun.',
    ok: 'Izinkan',
    tone: 'primary',
    action: function () {
      if (typeof K_LOKASI_SETUJU !== 'undefined') store.raw(K_LOKASI_SETUJU, '1');
      back(1, ambil);
    }
  });
}

/* ---------- Jam buka (format OpenStreetMap, bentuk umum) ---------- */
var TP_HARI = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
function tpJamBuka(s, kini) {
  s = String(s || '').trim();
  if (!s) return null;
  kini = kini || new Date();
  if (/^24\/7$/.test(s)) return { buka: true, teks: 'Buka 24 jam' };
  var hari = kini.getDay(),
    mnt = kini.getHours() * 60 + kini.getMinutes(),
    aturan = s
      .split(';')
      .map(function (x) {
        return x.trim();
      })
      .filter(Boolean);
  var cocokHari = function (spek, d) {
    if (!spek) return true;
    return spek.split(',').some(function (bag) {
      var m = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/.exec(bag.trim());
      if (!m) throw new Error('x');
      var a = TP_HARI.indexOf(m[1]),
        b = m[2] ? TP_HARI.indexOf(m[2]) : a;
      return a <= b ? d >= a && d <= b : d >= a || d <= b;
    });
  };
  var jamHari = function (d) {
    /* rentang [mulai, akhir] menit untuk hari d, aturan terakhir yang cocok menang */
    var hasil = null;
    aturan.forEach(function (r) {
      var m = /^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?,?)+)?\s*(.*)$/.exec(r);
      var spek = m[1] ? m[1].replace(/,$/, '') : '',
        isi = m[2].trim();
      if (!cocokHari(spek, d)) return;
      if (/^(off|closed)$/i.test(isi)) {
        hasil = [];
        return;
      }
      if (/^24\/7$/.test(isi) || isi === '00:00-24:00') {
        hasil = [[0, 1440]];
        return;
      }
      var rentang = isi.split(',').map(function (t) {
        var q = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(t.trim());
        if (!q) throw new Error('x');
        var a = +q[1] * 60 + +q[2],
          b = +q[3] * 60 + +q[4];
        return [a, b <= a ? b + 1440 : b];
      });
      hasil = rentang;
    });
    return hasil;
  };
  var fmt = function (m) {
    m = m % 1440;
    return ('0' + Math.floor(m / 60)).slice(-2) + '.' + ('0' + (m % 60)).slice(-2);
  };
  try {
    var kemarin = jamHari((hari + 6) % 7) || [],
      ini = jamHari(hari) || [];
    var buka = null;
    kemarin.forEach(function (r) {
      if (r[1] > 1440 && mnt < r[1] - 1440) buka = r[1] - 1440;
    });
    ini.forEach(function (r) {
      if (mnt >= r[0] && mnt < r[1]) buka = r[1];
    });
    if (buka !== null) return { buka: true, teks: buka >= 1440 && buka - 1440 === 0 ? 'Buka 24 jam' : 'Tutup pukul ' + fmt(buka) };
    var nanti = ini
      .filter(function (r) {
        return r[0] > mnt;
      })
      .sort(function (a, b) {
        return a[0] - b[0];
      })[0];
    if (nanti) return { buka: false, teks: 'Buka pukul ' + fmt(nanti[0]) };
    for (var i = 1; i <= 7; i++) {
      var r2 = (jamHari((hari + i) % 7) || []).sort(function (a, b) {
        return a[0] - b[0];
      })[0];
      if (r2)
        return {
          buka: false,
          teks:
            'Buka ' +
            (i === 1 ? 'besok' : ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][(hari + i) % 7]) +
            ' ' +
            fmt(r2[0])
        };
    }
    return { buka: false, teks: 'Tutup' };
  } catch (e) {
    return { buka: null, teks: s };
  }
}

/* ---------- Peta kecil dari ubin OpenStreetMap ---------- */
function tpPetaHtml(lon, lat, z, w, h, pin, besar) {
  var n = Math.pow(2, z),
    px = ((lon + 180) / 360) * n * 256;
  var r = (lat * Math.PI) / 180,
    py = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n * 256;
  var x0 = Math.floor((px - w / 2) / 256),
    x1 = Math.floor((px + w / 2) / 256),
    y0 = Math.max(0, Math.floor((py - h / 2) / 256)),
    y1 = Math.min(n - 1, Math.floor((py + h / 2) / 256));
  var t = '';
  for (var ty = y0; ty <= y1; ty++)
    for (var tx = x0; tx <= x1; tx++) {
      var wx = ((tx % n) + n) % n;
      t +=
        '<img src="https://tile.openstreetmap.org/' +
        z +
        '/' +
        wx +
        '/' +
        ty +
        '.png" alt="" loading="lazy" decoding="async" style="left:' +
        Math.round(tx * 256 - px) +
        'px;top:' +
        Math.round(ty * 256 - py) +
        'px">';
    }
  return '<span class="tp-ubin">' + t + '</span>' + tpPinHtml(pin, besar);
}
function tpPinHtml(pin, besar) {
  return (
    '<span class="tp-pin' +
    (besar ? ' besar' : '') +
    '" style="--w:' +
    pin.w +
    '"><svg viewBox="0 0 30 38" class="tp-pin-bentuk"><path d="M15 37s13-12.5 13-22A13 13 0 0 0 2 15c0 9.5 13 22 13 22z"/></svg>' +
    (pin.ik && pin.ik.indexOf('e:') === 0 ? '<b class="tp-pin-emoji">' + esc(pin.ik.slice(2)) + '</b>' : tpIkonSvg(pin.ik, 'tp-pin-ik')) +
    '</span>'
  );
}
function tpSampul(x, w, h, z, besar) {
  var m = tpMarker(x),
    pin = tpPin(x);
  if (!m) return '<span class="tp-peta kosong">' + tpPinHtml(pin, besar) + '<small>Belum ada lokasi</small></span>';
  return '<span class="tp-peta">' + tpPetaHtml(m.lon, m.lat, z, w, h, pin, besar) + '</span>';
}

/* ---------- Ikon kecil ---------- */
var TP_IK = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  hati: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  lokasi:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  peta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>',
  rute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
  telp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  web: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  bagi: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  salin:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  jam: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  ingin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  sudah: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  bintang:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="isi" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  hapus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  kubus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
  impian:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 19H16a2.4 2.4 0 0 0 0-4.75H8a2.4 2.4 0 0 1 0-4.75h9.5"/><path d="M17.5 9.5V2.6"/><path class="isi" d="M17.5 2.6l4.3 2.2-4.3 2.2z"/><circle cx="5.2" cy="19" r="2"/></svg>'
};
function tpImpianDaftar() {
  var d = store.get('stivora.impian.daftar', []);
  return (Array.isArray(d) ? d : []).filter(function (x) {
    return x && x.id && x.nama;
  });
}
function tpImpian(id) {
  return (
    tpImpianDaftar().filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function tpRata(x) {
  var L = (x.kj || []).filter(function (v) {
    return v.n;
  });
  return L.length
    ? Math.round(
        (L.reduce(function (a, v) {
          return a + v.n;
        }, 0) /
          L.length) *
          10
      ) / 10
    : 0;
}

/* ---------- Daftar di halaman Tempat Favorit ---------- */
function tpRenderDaftar(box, q) {
  var semua = tpItems(),
    kol = tpKoleksi();
  if (
    tpKol &&
    !kol.some(function (k) {
      return k.id === tpKol;
    })
  )
    tpKol = '';
  if (!semua.length) {
    box.innerHTML =
      '<div class="lg-kosong tp-kosong">' +
      TP_IK.pin +
      '<p>Belum ada tempat.<br>Ketuk <b>Tambah</b> lalu cari nama tempat, pakai lokasimu sekarang, atau tempel link Google Maps.</p></div>';
    return;
  }
  var n = function (f) {
    return semua.filter(f).length;
  };
  var h =
    '<div class="gp-filter gl-filter">' +
    [
      ['', 'Semua', semua.length],
      [
        'fav',
        '❤️ Favorit',
        n(function (x) {
          return x.fav;
        })
      ],
      [
        'ingin',
        'Ingin dikunjungi',
        n(function (x) {
          return x.s === 'ingin';
        })
      ],
      [
        'sudah',
        'Sudah dikunjungi',
        n(function (x) {
          return x.s === 'sudah';
        })
      ]
    ]
      .filter(function (c) {
        return !c[0] || c[2] || tpS === c[0];
      })
      .map(function (c) {
        return (
          '<button type="button" data-tp-s="' +
          c[0] +
          '"' +
          (tpS === c[0] ? ' class="on"' : '') +
          '>' +
          c[1] +
          ' <small>' +
          c[2] +
          '</small></button>'
        );
      })
      .join('') +
    '</div>';
  var katAda = TP_KAT.filter(function (k) {
    return semua.some(function (x) {
      return x.kat === k.k;
    });
  });
  if (katAda.length > 1)
    h +=
      '<div class="gp-filter gl-filter tp-kat-chip">' +
      katAda
        .map(function (k) {
          return (
            '<button type="button" data-tp-k="' +
            k.k +
            '" style="--w:' +
            k.w +
            '"' +
            (tpK === k.k ? ' class="on"' : '') +
            '><i>' +
            tpIkonSvg(k.ik) +
            '</i>' +
            k.n +
            '</button>'
          );
        })
        .join('') +
      '</div>';
  h +=
    '<h3 class="lg-judul tp-judul"><span>Koleksi</span>' +
    (tpKol ? '<button type="button" data-tp-kol="">Lihat semua</button>' : '') +
    '</h3><div class="tp-kol-list">' +
    kol
      .map(function (k) {
        var ang = semua.filter(function (x) {
            return (x.kl || []).indexOf(k.id) >= 0;
          }),
          c = ang.filter(function (x) {
            return tpMarker(x);
          })[0];
        return (
          '<button type="button" class="tp-kol' +
          (tpKol === k.id ? ' on' : '') +
          '" data-tp-kol="' +
          esc(k.id) +
          '">' +
          (c ? tpSampul(c, 160, 90, 13) : '<span class="tp-peta kosong">' + TP_IK.peta + '</span>') +
          '<b>' +
          esc(k.n) +
          '</b><small>' +
          ang.length +
          ' tempat</small></button>'
        );
      })
      .join('') +
    '<button type="button" class="tp-kol baru" id="tpKolBaru"><span class="tp-peta kosong">' +
    TP_IK.plus +
    '</span><b>Koleksi baru</b></button></div>';
  var L = semua.filter(function (x) {
    return (
      (!tpS || (tpS === 'fav' ? x.fav : x.s === tpS)) &&
      (!tpK || x.kat === tpK) &&
      (!tpKol || (x.kl || []).indexOf(tpKol) >= 0) &&
      (!q ||
        (
          tpNama(x) +
          ' ' +
          (x.al || '') +
          ' ' +
          tpCatatan(x) +
          ' ' +
          (x.kj || [])
            .map(function (v) {
              return v.suka + ' ' + v.c;
            })
            .join(' ')
        )
          .toLowerCase()
          .indexOf(q) >= 0)
    );
  });
  if (tpUrut === 1 && tpPosisi)
    L.sort(function (a, b) {
      var x = tpJarak(a),
        y = tpJarak(b);
      return (x === null ? 1e9 : x) - (y === null ? 1e9 : y);
    });
  else if (tpUrut === 2)
    L.sort(function (a, b) {
      return tpRata(b) - tpRata(a);
    });
  else if (tpUrut === 3)
    L.sort(function (a, b) {
      return tpNama(a).localeCompare(tpNama(b), 'id');
    });
  else
    L.sort(function (a, b) {
      return b.dibuat - a.dibuat;
    });
  var kolNama = tpKol
    ? (
        kol.filter(function (k) {
          return k.id === tpKol;
        })[0] || {}
      ).n
    : '';
  h +=
    '<div class="fm-urut"><span>' +
    L.length +
    ' tempat' +
    (kolNama ? ' · ' + esc(kolNama) : '') +
    '</span><button type="button" id="tpUrut">' +
    FM_IK.urut +
    TP_URUT[tpUrut] +
    '</button></div>';
  if (!tpPosisi)
    h += '<button type="button" class="tp-jarak-btn" id="tpPakaiLokasi">' + TP_IK.lokasi + 'Tampilkan jarak dari lokasiku</button>';
  if (!L.length) h += '<p class="gt-kosong">Tidak ada yang cocok.</p>';
  else
    h +=
      '<div class="tp-daftar">' +
      L.map(function (x) {
        var k = tpKat(x.kat),
          r = tpRata(x),
          j = tpJarak(x),
          jb = tpJamBuka(x.jam),
          im = x.imp ? tpImpian(x.imp) : null;
        return (
          '<button type="button" class="tp-kartu" data-tp="' +
          esc(x.id) +
          '" style="--w:' +
          k.w +
          '">' +
          tpSampul(x, 420, 130, 15) +
          (x.fav ? '<span class="tp-fav">' + TP_IK.hati + '</span>' : '') +
          (j !== null ? '<span class="tp-jr">' + tpJarakTeks(j) + '</span>' : '') +
          '<span class="tp-kartu-tx"><span class="tp-kat-l">' +
          tpIkonSvg(k.ik) +
          k.n +
          '</span><b>' +
          esc(tpNama(x)) +
          '</b>' +
          (x.al ? '<small>' + esc(x.al) + '</small>' : '') +
          '<span class="tp-baris"><span class="tp-st tp-st-' +
          x.s +
          '">' +
          (x.s === 'sudah' ? '✓ Sudah' + ((x.kj || []).length ? ' ' + x.kj.length + '×' : '') : 'Ingin dikunjungi') +
          '</span>' +
          (r ? '<span class="fm-nilai">★ ' + String(r).replace('.', ',') + '</span>' : '') +
          (jb && jb.buka !== null
            ? '<span class="' + (jb.buka ? 'tp-buka' : 'tp-tutup') + '">' + (jb.buka ? 'Buka' : 'Tutup') + '</span>'
            : '') +
          (im ? '<span>🎯 ' + esc(im.nama) + '</span>' : '') +
          (!tpMarker(x) ? '<span class="tp-tutup">Tanpa lokasi</span>' : '') +
          '</span></span></button>'
        );
      }).join('') +
      '</div>';
  var adaLokasi = L.filter(function (x) {
    return tpMarker(x);
  }).length;
  if (adaLokasi)
    h +=
      '<button type="button" class="btn ghost tp-lihat-peta" id="tpLihatPeta">' +
      TP_IK.peta +
      'Lihat ' +
      adaLokasi +
      ' tempat di Peta 3D</button>';
  h += '<p class="fm-atribusi">Peta & data tempat © OpenStreetMap · Tempat juga tampil sebagai marker di Peta</p>';
  box.innerHTML = h;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-koleksi' || glBukaJenis !== 'tempat') return;
  var el;
  if ((el = e.target.closest('[data-tp-s]'))) {
    tpS = el.dataset.tpS;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-tp-k]'))) {
    tpK = tpK === el.dataset.tpK ? '' : el.dataset.tpK;
    glRenderDaftar();
    return;
  }
  if ((el = e.target.closest('[data-tp-kol]'))) {
    tpKol = tpKol === el.dataset.tpKol ? '' : el.dataset.tpKol;
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#tpUrut')) {
    tpUrut = (tpUrut + 1) % TP_URUT.length;
    if (tpUrut === 1 && !tpPosisi) {
      tpMintaLokasi(
        function () {
          glRenderDaftar();
        },
        function () {
          tpUrut = 2;
          glRenderDaftar();
        }
      );
    }
    glRenderDaftar();
    return;
  }
  if (e.target.closest('#tpPakaiLokasi')) {
    tpMintaLokasi(function () {
      if (pageKind === 'galery-koleksi') glRenderDaftar();
      toast('Jarak dihitung dari lokasimu');
    });
    return;
  }
  if (e.target.closest('#tpKolBaru')) {
    tpKoleksiBaru(null, glRenderDaftar);
    return;
  }
  if (e.target.closest('#tpLihatPeta')) {
    var ids = $$('#glDaftar [data-tp]').map(function (b) {
      return b.dataset.tp;
    });
    var ms = ids
      .map(function (id) {
        return tpMarker(tpCari(id));
      })
      .filter(Boolean);
    tpKePeta(function () {
      tpTerbangKe(ms);
    });
    return;
  }
  if (e.target.closest('#tpTambahBtn')) {
    tpTujuan = null;
    tpCariQ = '';
    openLayer('page:tempat-tambah');
    return;
  }
  if ((el = e.target.closest('[data-tp]'))) openLayer('page:tempat-detail:' + el.dataset.tp);
});

/* ---------- Ke Peta 3D ---------- */
function tpKePeta(fn) {
  var lanjut = function () {
    switchTab('impian');
    setTimeout(function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 60);
    var mulai = Date.now();
    (function tunggu() {
      if (typeof peta !== 'undefined' && peta) {
        setTimeout(fn, 250);
        return;
      }
      if (Date.now() - mulai > 20000) {
        toast('Peta belum siap');
        return;
      }
      setTimeout(tunggu, 250);
    })();
  };
  if (cur.layers.length) back(cur.layers.length, lanjut);
  else lanjut();
}
function tpTerbangKe(ms) {
  if (!ms.length || typeof peta === 'undefined' || !peta) return;
  if (ms.length === 1) {
    fokusMarker(ms[0].id);
    return;
  }
  var w = 180,
    s = 90,
    e = -180,
    n = -90;
  ms.forEach(function (m) {
    w = Math.min(w, m.lon);
    e = Math.max(e, m.lon);
    s = Math.min(s, m.lat);
    n = Math.max(n, m.lat);
  });
  var pl = Math.max(0.02, (e - w) * 0.25),
    pt = Math.max(0.02, (n - s) * 0.25);
  peta.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(Math.max(-180, w - pl), Math.max(-90, s - pt), Math.min(180, e + pl), Math.min(90, n + pt)),
    duration: 2.2
  });
}

/* ---------- Lapisan kecil: isian teks & pilihan (gestur kembali menutupnya) ---------- */
var tpLapisRiwayat = false;
function tpLapisTutup() {
  var w = $('#tpLapis');
  if (w) w.remove();
}
function tpLapisTutupRiwayat() {
  if (tpLapisRiwayat) {
    tpLapisRiwayat = false;
    history.back();
  }
  tpLapisTutup();
}
window.addEventListener('popstate', function () {
  tpLapisRiwayat = false;
  tpLapisTutup();
});
function tpLapisBuka(html, onKlik) {
  tpLapisTutup();
  var w = document.createElement('div');
  w.className = 'bk-dlg tp-lapis';
  w.id = 'tpLapis';
  w.innerHTML = '<div class="bk-dlg-tirai" data-tpl="batal"></div><div class="bk-dlg-kotak">' + html + '</div>';
  w.addEventListener('click', function (e) {
    if (e.target.closest('[data-tpl="batal"]')) {
      tpLapisTutupRiwayat();
      return;
    }
    onKlik(e);
  });
  document.body.appendChild(w);
  try {
    history.pushState(history.state, '');
    tpLapisRiwayat = true;
  } catch (e) {
    tpLapisRiwayat = false;
  }
  return w;
}
function tpMintaTeks(o) {
  var w = tpLapisBuka(
    '<form novalidate><h4>' +
      esc(o.judul) +
      '</h4>' +
      (o.teks ? '<p>' + esc(o.teks) + '</p>' : '') +
      '<input class="input" id="tpLapisIn" maxlength="' +
      (o.maks || 200) +
      '" value="' +
      esc(o.nilai || '') +
      '" placeholder="' +
      esc(o.ph || '') +
      '" autocomplete="off" data-tanpa-hitung>' +
      '<div class="bk-dlg-dua"><button type="button" class="btn ghost" data-tpl="batal">Batal</button><button type="submit" class="btn primary">' +
      esc(o.ok || 'Simpan') +
      '</button></div></form>',
    function () {}
  );
  w.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#tpLapisIn').value.trim();
    tpLapisTutupRiwayat();
    setTimeout(function () {
      o.cb(v);
    }, 40);
  });
  setTimeout(function () {
    var i = $('#tpLapisIn');
    if (i) {
      i.focus();
      i.select();
    }
  }, 60);
}
function tpPilihan(o) {
  tpLapisBuka(
    '<h4>' +
      esc(o.judul) +
      '</h4>' +
      (o.teks ? '<p>' + esc(o.teks) + '</p>' : '') +
      '<div class="tp-pilihan">' +
      o.opsi
        .map(function (p, i) {
          return '<button type="button" class="' + (p.kelas || '') + '" data-tpo="' + i + '">' + (p.html || esc(p.t)) + '</button>';
        })
        .join('') +
      '</div>',
    function (e) {
      var b = e.target.closest('[data-tpo]');
      if (!b) return;
      var p = o.opsi[+b.dataset.tpo];
      tpLapisTutupRiwayat();
      if (p.aksi) setTimeout(p.aksi, 40);
    }
  );
}
function tpKoleksiBaru(tempatId, lalu) {
  tpMintaTeks({
    judul: 'Koleksi baru',
    teks: 'Beri nama koleksimu.',
    ph: 'mis. Rencana liburan Bali',
    maks: 60,
    ok: 'Buat',
    cb: function (v) {
      if (!v) {
        toast('Nama koleksi belum diisi');
        return;
      }
      var kol = tpKoleksi();
      if (kol.length >= 100) {
        toast('Maksimal 100 koleksi');
        return;
      }
      var id = uid();
      kol.push({ id: id, n: v.slice(0, 60) });
      var items = tpItems();
      if (tempatId)
        items = items.map(function (x) {
          if (x.id === tempatId) {
            x.kl = (x.kl || []).concat([id]);
            x.diubah = Date.now();
          }
          return x;
        });
      tpSimpanData(items, kol);
      toast('Koleksi "' + v.slice(0, 40) + '" dibuat');
      if (lalu) lalu();
    }
  });
}

/* ---------- Halaman tambah ---------- */
PAGES['tempat-tambah'] = function () {
  var tujuan = tpTujuan ? tpCari(tpTujuan) : null;
  if (tpTujuan && !tujuan) tpTujuan = null;
  $('#subTitle').textContent = tujuan ? 'Tentukan lokasi' : 'Tambah tempat';
  $('#subBody').innerHTML =
    '<div class="tp-tambah">' +
    (tujuan
      ? '<p class="lg-ket">Tentukan lokasi untuk <b>' + esc(tpNama(tujuan)) + '</b>. Kunjungan dan catatannya tetap disimpan.</p>'
      : '') +
    '<label class="gt-cari fm-cari-kolom">' +
    GT_IKON_CARI +
    '<input type="search" id="tpQ" placeholder="Cari nama tempat, mis. mie aceh" autocomplete="off" data-tanpa-hitung value="' +
    esc(tpCariQ) +
    '"></label>' +
    '<div class="tp-empat">' +
    '<button type="button" data-tpc="sini"><i>' +
    TP_IK.lokasi +
    '</i><span>Saya di sini<small>Pakai lokasi HP</small></span></button>' +
    '<button type="button" data-tpc="peta"><i>' +
    TP_IK.peta +
    '</i><span>Pilih di peta<small>Tekan lama di Peta 3D</small></span></button>' +
    '<button type="button" data-tpc="link"><i>' +
    TP_IK.link +
    '</i><span>Tempel link<small>Dari Google Maps</small></span></button>' +
    '<button type="button" data-tpc="marker"><i>' +
    TP_IK.pin +
    '</i><span>Dari marker<small>Yang sudah ada di Peta</small></span></button></div>' +
    '<div id="tpHasil" aria-live="polite"></div></div>';
  tpCariJalan();
  return true;
};
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'tempat-tambah' && e.target.id === 'tpQ') {
    tpCariQ = e.target.value;
    clearTimeout(tpCariT);
    tpCariT = setTimeout(tpCariJalan, 700);
  }
});
function tpHasilKotak(h) {
  var b = $('#tpHasil');
  if (b && pageKind === 'tempat-tambah') b.innerHTML = h;
}
var tpHasilTerakhir = [];
function tpKatDariOsm(d) {
  var c = d.category || d.class || '',
    t = d.type || '';
  if (c === 'amenity' && /^(restaurant|fast_food|food_court|ice_cream|bbq)$/.test(t)) return 'kuliner';
  if (c === 'amenity' && /^(cafe|bar|pub)$/.test(t)) return 'kafe';
  if (c === 'natural' && /^(beach|bay)$/.test(t)) return 'pantai';
  if (
    c === 'natural' ||
    (c === 'leisure' && /^(park|nature_reserve|garden)$/.test(t)) ||
    (c === 'tourism' && /^(viewpoint|attraction|picnic_site|camp_site|theme_park|zoo)$/.test(t)) ||
    c === 'waterway'
  )
    return 'alam';
  if (c === 'amenity' && t === 'place_of_worship') return 'ibadah';
  if (c === 'shop' || (c === 'amenity' && t === 'marketplace')) return 'belanja';
  if (c === 'tourism' && /^(hotel|guest_house|hostel|motel|apartment|chalet|resort)$/.test(t)) return 'inap';
  if (c === 'leisure' && /^(sports_centre|stadium|pitch|fitness_centre|swimming_pool|track|golf_course)$/.test(t)) return 'olahraga';
  return 'lain';
}
function tpDariOsm(d) {
  var et = d.extratags || {},
    ad = d.address || {};
  var nama = String(d.name || (d.display_name || '').split(',')[0] || '').slice(0, 60);
  var al = String(d.display_name || '')
    .split(',')
    .map(function (s) {
      return s.trim();
    })
    .filter(function (s, i) {
      return !(i === 0 && s === nama);
    })
    .slice(0, 4)
    .join(', ');
  return {
    nama: nama,
    al: al.slice(0, 200),
    lon: +d.lon,
    lat: +d.lat,
    kat: tpKatDariOsm(d),
    tel: String(et.phone || et['contact:phone'] || '').slice(0, 40),
    web: String(et.website || et['contact:website'] || '').slice(0, 200),
    jam: String(et.opening_hours || '').slice(0, 200),
    osm: d.osm_type && d.osm_id ? String(d.osm_type).charAt(0) + d.osm_id : ''
  };
}
function tpCariJalan() {
  var q = tpCariQ.trim(),
    no = ++tpCariNo;
  if (!q) {
    tpHasilKotak(
      '<p class="lg-ket tp-ket">Ketik nama tempat, atau pilih salah satu cara di atas. Tempat yang disimpan otomatis juga muncul sebagai marker di Peta.</p>'
    );
    return;
  }
  if (q.length < 3) {
    tpHasilKotak('');
    return;
  }
  tpHasilKotak('<div class="lg-muat"><i></i>Mencari di OpenStreetMap…</div>');
  var url = NOMINATIM + '?format=jsonv2&limit=10&addressdetails=1&extratags=1&accept-language=id&q=' + encodeURIComponent(q);
  if (tpPosisi)
    url +=
      '&viewbox=' +
      [tpPosisi.lon - 1, tpPosisi.lat + 1, tpPosisi.lon + 1, tpPosisi.lat - 1]
        .map(function (v) {
          return v.toFixed(4);
        })
        .join(',');
  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (no !== tpCariNo) return;
      var L = (Array.isArray(data) ? data : []).map(tpDariOsm).filter(function (h) {
        return isFinite(h.lon) && isFinite(h.lat) && h.nama;
      });
      if (tpPosisi)
        L.sort(function (a, b) {
          return tpJarakKm(tpPosisi, a) - tpJarakKm(tpPosisi, b);
        });
      tpHasilTerakhir = L;
      if (!L.length) {
        tpHasilKotak('<p class="gt-kosong">Tidak ditemukan. Coba nama lain, atau pakai <b>Pilih di peta</b>.</p>');
        return;
      }
      tpHasilKotak(
        '<div class="tp-hasil">' +
          L.map(function (h, i) {
            var k = tpKat(h.kat);
            return (
              '<button type="button" class="tp-hasil-i" data-tph="' +
              i +
              '" style="--w:' +
              k.w +
              '"><span class="tp-hasil-ik">' +
              tpIkonSvg(k.ik) +
              '</span><span class="tp-hasil-tx"><b>' +
              esc(h.nama) +
              '</b><small>' +
              esc(h.al) +
              '</small></span>' +
              (tpPosisi ? '<span class="tp-hasil-jr">' + tpJarakTeks(tpJarakKm(tpPosisi, h)) + '</span>' : '') +
              '</button>'
            );
          }).join('') +
          '</div><p class="fm-atribusi">' +
          (tpPosisi ? 'Diurutkan dari yang terdekat · ' : '') +
          'Hasil © OpenStreetMap</p>'
      );
    })
    .catch(function () {
      if (no === tpCariNo) tpHasilKotak('<p class="lg-salah">Pencarian gagal. Periksa koneksi internet.</p>');
    });
}
function tpAlamatDari(lon, lat) {
  return fetch(
    NOMINATIM.replace('/search', '/reverse') +
      '?format=jsonv2&addressdetails=1&extratags=1&zoom=18&accept-language=id&lat=' +
      lat +
      '&lon=' +
      lon
  )
    .then(function (r) {
      if (!r.ok) throw new Error('x');
      return r.json();
    })
    .then(function (d) {
      return d && !d.error ? tpDariOsm(d) : null;
    })
    .catch(function () {
      return null;
    });
}
/* Link Google Maps: '!3d<lat>!4d<lon>' (titik tempat), '@lat,lon', '?q=lat,lon', 'll=' */
function tpDariLink(u) {
  u = String(u || '').trim();
  if (!u) return null;
  var s = u;
  try {
    s = decodeURIComponent(u);
  } catch (e) {}
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(s)) return { pendek: true };
  var m =
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(s) ||
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(s) ||
    /[?&](?:q|query|ll|destination|daddr)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(s) ||
    /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/.exec(s);
  if (!m) return null;
  var lat = +m[1],
    lon = +m[2];
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return null;
  var nama = '';
  var p = /\/place\/([^/@]+)/.exec(s);
  if (p) nama = p[1].replace(/\+/g, ' ').trim();
  return { lat: lat, lon: lon, nama: nama.slice(0, 60) };
}
function tpMulaiDraft(o) {
  tpDraft = {
    id: null,
    tujuan: tpTujuan,
    mk: o.mk || null,
    nama: o.nama || '',
    al: o.al || '',
    kat: o.kat || 'lain',
    s: 'ingin',
    lon: o.lon,
    lat: o.lat,
    tel: o.tel || '',
    web: o.web || '',
    jam: o.jam || '',
    osm: o.osm || '',
    ket: o.ket || ''
  };
  if (tpDraft.tujuan) {
    var t = tpCari(tpDraft.tujuan);
    if (t) {
      if (!tpDraft.nama) tpDraft.nama = tpNama(t);
      tpDraft.s = t.s;
      if (t.kat !== 'lain') tpDraft.kat = t.kat;
    }
  }
  if (pageKind === 'tempat-tambah' && opened.page) {
    var L = layerOf('page');
    cur.layers[L.index] = 'page:tempat-baru';
    opened.page = cur.layers[L.index];
    try {
      history.replaceState(cur, '');
    } catch (x) {}
    PAGES['tempat-baru']();
    $('#subBody').scrollTop = 0;
    pageKind = 'tempat-baru';
  } else openLayer('page:tempat-baru');
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'tempat-tambah') return;
  var el;
  if ((el = e.target.closest('[data-tph]'))) {
    var h = tpHasilTerakhir[+el.dataset.tph];
    if (h) tpMulaiDraft(h);
    return;
  }
  if (!(el = e.target.closest('[data-tpc]'))) return;
  var c = el.dataset.tpc;
  if (c === 'sini') {
    tpHasilKotak('<div class="lg-muat"><i></i>Mencari lokasimu…</div>');
    tpMintaLokasi(
      function (p) {
        tpAlamatDari(p.lon, p.lat).then(function (o) {
          if (pageKind !== 'tempat-tambah') return;
          o = o || {};
          tpMulaiDraft({
            nama: '',
            al: o.al ? (o.nama ? o.nama + ', ' : '') + o.al : '',
            kat: 'lain',
            lon: p.lon,
            lat: p.lat,
            ket: 'Lokasimu sekarang' + (p.akurasi ? ' (akurasi ±' + p.akurasi + ' m)' : '') + '. Beri nama tempatnya:'
          });
        });
      },
      function () {
        tpHasilKotak('');
      }
    );
  } else if (c === 'peta') {
    var tj = tpTujuan;
    tpKePeta(function () {
      tpPilihPeta = { tujuan: tj };
      mulaiPilih('tempat');
      toast('Tekan lama di lokasi tempatnya, lalu ketuk ikon lokasi');
    });
  } else if (c === 'link') {
    tpMintaTeks({
      judul: 'Tempel link Google Maps',
      teks: 'Di Google Maps: buka tempatnya → Bagikan → Salin link, lalu tempel di sini. Koordinat (mis. 5.5571, 95.3223) juga bisa.',
      ph: 'https://www.google.com/maps/place/…',
      maks: 2000,
      ok: 'Baca link',
      cb: tpBacaLink
    });
    if (navigator.clipboard && navigator.clipboard.readText)
      navigator.clipboard
        .readText()
        .then(function (t) {
          var i = $('#tpLapisIn');
          if (i && !i.value && /google|maps|goo\.gl|^-?\d/.test(t || '')) i.value = String(t).slice(0, 2000);
        })
        .catch(function () {});
  } else if (c === 'marker') {
    var dipakai = {};
    tpItems().forEach(function (x) {
      if (x.mk) dipakai[x.mk] = 1;
    });
    var L = (typeof petaMarker !== 'undefined' ? petaMarker : []).filter(function (m) {
      return !dipakai[m.id];
    });
    if (!L.length) {
      toast('Semua marker di Peta sudah jadi Tempat Favorit');
      return;
    }
    tpPilihan({
      judul: 'Pilih marker',
      teks: 'Marker di Peta yang belum jadi Tempat Favorit:',
      opsi: L.slice()
        .sort(function (a, b) {
          return a.nama.localeCompare(b.nama, 'id');
        })
        .map(function (m) {
          return {
            kelas: 'tp-opsi-mk',
            html: mkLencana(m) + '<span><b>' + esc(m.nama) + '</b><small>' + mkKoordinat(m) + '</small></span>',
            aksi: function () {
              tpMulaiDraft({
                mk: m.id,
                nama: m.nama,
                kat: tpKatDariIkon(m.ikon),
                lon: m.lon,
                lat: m.lat,
                ket: 'Marker dari Peta dijadikan Tempat Favorit:'
              });
              tpAlamatDari(m.lon, m.lat).then(function (o) {
                if (o && tpDraft && tpDraft.mk === m.id && !tpDraft.al) {
                  tpDraft.al = (o.nama && o.nama !== m.nama ? o.nama + ', ' : '') + o.al;
                  var a = $('#tpfAl');
                  if (a && !a.value) a.value = tpDraft.al;
                }
              });
            }
          };
        })
        .concat([{ t: 'Batal' }])
    });
  }
});
function tpBacaLink(v) {
  var p = tpDariLink(v);
  if (!p) {
    toast('Link tidak berisi lokasi. Pastikan link dari Google Maps.');
    return;
  }
  if (p.pendek) {
    tpPilihan({
      judul: 'Link pendek belum bisa dibaca',
      teks: 'Link maps.app.goo.gl harus dibuka dulu: tempel di browser, tunggu Google Maps terbuka, lalu salin alamat lengkap dari kolom alamat browser dan tempel lagi di sini. Atau cari nama tempatnya.',
      opsi: [{ t: 'Oke' }]
    });
    return;
  }
  tpHasilKotak('<div class="lg-muat"><i></i>Link terbaca. Mencari alamat…</div>');
  tpAlamatDari(p.lon, p.lat).then(function (o) {
    o = o || {};
    tpMulaiDraft({
      nama: p.nama || o.nama || '',
      al: o.al || '',
      kat: o.kat || 'lain',
      lon: p.lon,
      lat: p.lat,
      tel: o.tel,
      web: o.web,
      jam: o.jam,
      osm: o.osm,
      ket: 'Link terbaca: ' + p.lat.toFixed(5) + ', ' + p.lon.toFixed(5)
    });
  });
}
/* Dipanggil dari peta-marker.js setelah titik dipilih (mulaiPilih('tempat')) */
var tpPilihPeta = null;
function tpDariTitik(lon, lat) {
  var t = tpPilihPeta || {};
  tpPilihPeta = null;
  tpTujuan = t.tujuan || null;
  tpAlamatDari(lon, lat).then(function (o) {
    o = o || {};
    tpMulaiDraft({
      nama: o.nama || '',
      al: o.al || '',
      kat: o.kat || 'lain',
      lon: lon,
      lat: lat,
      tel: o.tel,
      web: o.web,
      jam: o.jam,
      osm: o.osm,
      ket: 'Titik dari Peta. Periksa namanya:'
    });
  });
}

/* ---------- Halaman isi tempat (baru / ubah info) ---------- */
PAGES['tempat-baru'] = function () {
  var d = tpDraft;
  if (!d) return false;
  var edit = !!d.id;
  $('#subTitle').textContent = edit ? 'Ubah info tempat' : 'Simpan tempat';
  var pin = { ik: tpKat(d.kat).ik, w: tpKat(d.kat).w };
  if (d.mk && !edit) {
    var m0 = mkCari(d.mk);
    if (m0 && d.kat === tpKatDariIkon(m0.ikon)) pin = { ik: m0.ikon, w: mkWarnaSah(m0.warna) };
  }
  var h =
    '<div class="se tp-form">' +
    (d.ket ? '<p class="lg-ket">' + esc(d.ket) + '</p>' : '') +
    '<section class="ie-bagian se-kartu">' +
    (isFinite(d.lon) && d.lon !== undefined
      ? '<div class="tp-form-peta" id="tpFormPeta"><span class="tp-peta">' +
        tpPetaHtml(d.lon, d.lat, 16, 760, 180, pin, true) +
        '</span></div>'
      : '') +
    '<div class="field"><label for="tpfNama">Nama tempat</label><input class="input" id="tpfNama" maxlength="60" autocomplete="off" placeholder="mis. Mie Razali" value="' +
    esc(d.nama) +
    '"></div>' +
    '<div class="field"><label for="tpfAl">Alamat <span class="gl-ops">(opsional)</span></label><input class="input" id="tpfAl" maxlength="200" autocomplete="off" value="' +
    esc(d.al) +
    '"></div>' +
    '<div class="field"><label>Kategori</label><div class="tp-kat-pil">' +
    TP_KAT.map(function (k) {
      return (
        '<button type="button" data-tpk="' +
        k.k +
        '" style="--w:' +
        k.w +
        '"' +
        (d.kat === k.k ? ' class="on"' : '') +
        '><i>' +
        tpIkonSvg(k.ik) +
        '</i><span>' +
        k.n +
        '</span></button>'
      );
    }).join('') +
    '</div></div>' +
    (edit
      ? ''
      : '<div class="field"><label>Status</label><div class="tp-status"><button type="button" data-tpst="ingin"' +
        (d.s === 'ingin' ? ' class="on"' : '') +
        '>Ingin dikunjungi</button><button type="button" data-tpst="sudah"' +
        (d.s === 'sudah' ? ' class="on"' : '') +
        '>Sudah dikunjungi</button></div></div>') +
    '<details class="tp-lebih"' +
    (edit || d.tel || d.web || d.jam ? ' open' : '') +
    '><summary>Telepon, website, jam buka</summary>' +
    '<div class="field"><label for="tpfTel">Telepon</label><input class="input" id="tpfTel" type="tel" inputmode="tel" maxlength="40" value="' +
    esc(d.tel) +
    '"></div>' +
    '<div class="field"><label for="tpfWeb">Website</label><input class="input" id="tpfWeb" type="url" inputmode="url" maxlength="200" placeholder="https://" value="' +
    esc(d.web) +
    '"></div>' +
    '<div class="field"><label for="tpfJam">Jam buka</label><input class="input" id="tpfJam" maxlength="200" placeholder="mis. Mo-Su 07:00-23:00" value="' +
    esc(d.jam) +
    '"><small class="tp-bantu">Format OpenStreetMap: Mo-Fr 08:00-17:00; Sa 08:00-12:00 · 24/7</small></div></details>' +
    (edit && d.mk
      ? '<p class="tp-bantu">Lokasi titik diubah lewat Peta: ikon pensil → Marker saya → ' + esc(d.nama) + ' → Pindahkan.</p>'
      : '') +
    '</section><div class="se-bawah"><button type="button" class="btn ghost" data-back>Batal</button><button type="button" class="btn primary" id="tpfSimpan">Simpan</button></div></div>';
  $('#subBody').innerHTML = h;
  return true;
};
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'tempat-baru' || !tpDraft) return;
  var el,
    d = tpDraft;
  if ((el = e.target.closest('[data-tpk]'))) {
    d.kat = el.dataset.tpk;
    $$('#subBody [data-tpk]').forEach(function (b) {
      b.classList.toggle('on', b === el);
    });
    var k = tpKat(d.kat),
      p = $('#tpFormPeta .tp-pin');
    if (p) {
      p.style.setProperty('--w', k.w);
      var ik = p.querySelector('.tp-pin-ik, .tp-pin-emoji');
      if (ik) ik.outerHTML = tpIkonSvg(k.ik, 'tp-pin-ik');
    }
    return;
  }
  if ((el = e.target.closest('[data-tpst]'))) {
    d.s = el.dataset.tpst;
    $$('#subBody [data-tpst]').forEach(function (b) {
      b.classList.toggle('on', b === el);
    });
    return;
  }
  if (e.target.closest('#tpfSimpan')) tpSimpanDraft();
});
function tpSimpanDraft() {
  var d = tpDraft,
    nama = $('#tpfNama').value.trim().slice(0, 60);
  if (!nama) {
    toast('Isi nama tempat dulu');
    $('#tpfNama').focus();
    return;
  }
  var al = $('#tpfAl').value.trim(),
    tel = $('#tpfTel').value.trim(),
    webIn = $('#tpfWeb').value.trim(),
    web = glUrlSah(webIn),
    jam = $('#tpfJam').value.trim();
  if (webIn && !web) {
    toast('Website harus diawali https://');
    $('#tpfWeb').focus();
    return;
  }
  var kini = Date.now(),
    items = tpItems(),
    tujuan = d.id || d.tujuan,
    k = tpKat(d.kat),
    mkId = d.mk;
  if (!d.id && !tujuan && items.length >= TP_MAKS) {
    toast('Maksimal ' + TP_MAKS + ' tempat');
    return;
  }
  if (d.id) {
    var x0 = tpCari(d.id);
    if (!x0) return;
    var m = tpMarker(x0);
    if (m) {
      var gantiKat = x0.kat !== d.kat;
      tpUbahMarker(x0, function (mm) {
        mm.nama = nama;
        if (gantiKat) {
          mm.ikon = k.ik;
          mm.warna = k.w;
        }
      });
    }
    tpUbah(d.id, function (z) {
      z.a = nama;
      z.al = al;
      z.kat = d.kat;
      z.tel = tel;
      z.web = web;
      z.jam = jam;
    });
    tpDraft = null;
    back(1, function () {
      toast('Info tempat disimpan');
      renderGaleryTab();
    });
    return;
  }
  /* Marker: pakai yang dipilih, atau buat baru */
  if (mkId && mkCari(mkId)) {
    var mm0 = mkCari(mkId);
    if (mm0.nama !== nama || tpKatDariIkon(mm0.ikon) !== d.kat)
      tpUbahMarker({ mk: mkId }, function (mm) {
        mm.nama = nama;
        if (tpKatDariIkon(mm.ikon) !== d.kat) {
          mm.ikon = k.ik;
          mm.warna = k.w;
        }
      });
  } else mkId = tpBuatMarker(nama, d.kat, d.lon, d.lat, tujuan ? (tpCari(tujuan) || {}).c : '').id;
  var id;
  if (tujuan && tpCari(tujuan)) {
    id = tujuan;
    tpUbah(tujuan, function (z) {
      z.mk = mkId;
      z.a = nama;
      z.al = al || z.al;
      z.kat = d.kat;
      z.tel = tel;
      z.web = web;
      z.jam = jam;
      z.osm = d.osm;
      delete z.c;
    });
  } else {
    id = uid();
    items.unshift(
      tpSah({ id: id, mk: mkId, a: nama, al: al, kat: d.kat, s: d.s, tel: tel, web: web, jam: jam, osm: d.osm, dibuat: kini, diubah: kini })
    );
    tpSimpanData(items);
  }
  tpDraft = null;
  tpTujuan = null;
  var dariGalery =
    cur.layers.some(function (n) {
      return n === 'page:galery-koleksi';
    }) && cur.layers[cur.layers.length - 2] !== 'page:tempat-detail:' + id;
  back(1, function () {
    renderGaleryTab();
    if (dariGalery) openLayer('page:tempat-detail:' + id);
    if (typeof renderMarkerDaftar === 'function')
      try {
        renderMarkerDaftar();
      } catch (e) {}
    toast(tujuan ? 'Lokasi ditentukan · juga tampil di Peta' : 'Disimpan · juga muncul sebagai marker di Peta');
    if (!dariGalery && typeof fokusMarker === 'function' && typeof peta !== 'undefined' && peta) fokusMarker(mkId);
  });
}

/* ---------- Halaman detail ---------- */
function tpIdHalaman() {
  var L = layerOf('page');
  return L ? L.name.split(':').slice(2).join(':') : '';
}
PAGES['tempat-detail'] = function () {
  var x = tpCari(tpIdHalaman());
  if (!x) return false;
  $('#subTitle').textContent = tpNama(x);
  tpRenderDetail(x);
  return true;
};
function tpRenderDetail(x, ulang) {
  var y = ulang ? $('#subBody').scrollTop : 0,
    m = tpMarker(x),
    k = tpKat(x.kat),
    r = tpRata(x),
    j = tpJarak(x),
    jb = tpJamBuka(x.jam),
    kj = x.kj || [],
    kol = tpKoleksi(),
    im = x.imp ? tpImpian(x.imp) : null;
  var h =
    '<div class="tp-det"><div class="tp-det-peta">' +
    tpSampul(x, 1100, 300, 16, true) +
    (m
      ? '<button type="button" class="tp-ke3d" id="tpKe3d">' +
        TP_IK.kubus +
        'Buka di Peta 3D</button><small class="tp-osm">© OpenStreetMap</small>'
      : '') +
    '</div>' +
    '<div class="tp-det-grid"><div class="tp-det-kiri"><div class="tp-det-kp" style="--w:' +
    k.w +
    '"><div class="tp-det-tx"><span class="tp-kat-l">' +
    tpIkonSvg(k.ik) +
    k.n +
    '</span><h2>' +
    esc(tpNama(x)) +
    '</h2>' +
    '<p>' +
    esc(x.al || (m ? mkKoordinat(m) : 'Belum ada lokasi')) +
    (j !== null ? ' · ' + tpJarakTeks(j) + ' dari lokasimu' : '') +
    '</p></div>' +
    '<button type="button" class="tp-favb' +
    (x.fav ? ' on' : '') +
    '" id="tpFav" aria-pressed="' +
    !!x.fav +
    '" aria-label="Favorit">' +
    TP_IK.hati +
    '</button></div>';
  if (jb)
    h +=
      '<p class="tp-jam">' +
      TP_IK.jam +
      (jb.buka === null
        ? '<span>' + esc(jb.teks) + '</span>'
        : '<b class="' +
          (jb.buka ? 'tp-buka' : 'tp-tutup') +
          '">' +
          (jb.buka ? 'Buka sekarang' : 'Tutup') +
          '</b><span>· ' +
          esc(jb.teks) +
          '</span>') +
      '</p>';
  if (!m) h += '<button type="button" class="btn primary tp-tentukan" id="tpTentukan">' + TP_IK.pin + 'Tentukan lokasi</button>';
  h +=
    '<div class="tp-aksi5"><button type="button" class="utama" id="tpRute"' +
    (m ? '' : ' disabled') +
    '><i>' +
    TP_IK.rute +
    '</i>Rute</button>' +
    '<button type="button" id="tpTelp"' +
    (x.tel ? '' : ' disabled') +
    '><i>' +
    TP_IK.telp +
    '</i>Telepon</button>' +
    '<button type="button" id="tpWeb"' +
    (x.web ? '' : ' disabled') +
    '><i>' +
    TP_IK.web +
    '</i>Website</button>' +
    '<button type="button" id="tpBagi"' +
    (m ? '' : ' disabled') +
    '><i>' +
    TP_IK.bagi +
    '</i>Bagikan</button>' +
    '<button type="button" id="tpSalin"' +
    (m ? '' : ' disabled') +
    '><i>' +
    TP_IK.salin +
    '</i>Salin</button></div>';
  /* Status */
  h +=
    '<section class="fm-bag"><h3>Status</h3><div class="fm-kartu-p"><div class="tp-status">' +
    '<button type="button" data-tps="ingin"' +
    (x.s === 'ingin' ? ' class="on"' : '') +
    '>' +
    TP_IK.ingin +
    'Ingin dikunjungi</button><button type="button" data-tps="sudah"' +
    (x.s === 'sudah' ? ' class="on sudah"' : ' class="sudah"') +
    '>' +
    TP_IK.sudah +
    'Sudah dikunjungi</button></div>' +
    (kj.length
      ? '<div class="tp-ringkas"><div><b>' +
        kj.length +
        '×</b><small>Kunjungan</small></div><div><b>' +
        (r ? '★ ' + String(r).replace('.', ',') : '–') +
        '</b><small>Rata-rata nilai</small></div><div><b>' +
        new Date(kj[0].t + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) +
        '</b><small>Terakhir</small></div></div>'
      : '') +
    '</div></section>';
  /* Kunjungan */
  h +=
    '<section class="fm-bag"><h3 class="bk-h3">Riwayat kunjungan <button type="button" id="tpKjTambah">' +
    TP_IK.plus +
    'Catat kunjungan</button></h3>';
  if (tpKjForm && tpKjForm.tp === x.id) {
    var f = tpKjForm;
    h +=
      '<div class="tp-kj-form"><div class="field"><label for="tpkT">Tanggal</label><input class="input" type="date" id="tpkT" value="' +
      esc(f.t) +
      '" max="' +
      tpHariIni() +
      '"></div>' +
      '<div class="field"><label>Nilai</label><div class="fm-bintang tp-bintang">' +
      [1, 2, 3, 4, 5]
        .map(function (n) {
          return (
            '<button type="button" data-tpkn="' +
            n +
            '" class="' +
            (f.n >= n ? 'on' : '') +
            '" aria-label="' +
            n +
            ' bintang">' +
            TP_IK.bintang +
            '</button>'
          );
        })
        .join('') +
      '</div></div>' +
      '<div class="field"><label>Kisaran harga per orang</label><div class="tp-harga">' +
      TP_HARGA.map(function (t, i) {
        return '<button type="button" data-tpkh="' + i + '"' + (f.h === i ? ' class="on"' : '') + '>' + t + '</button>';
      }).join('') +
      '</div></div>' +
      '<div class="field"><label for="tpkSuka">Yang disukai (menu, spot, dll.)</label><input class="input" id="tpkSuka" maxlength="200" placeholder="mis. Mie kepiting, teh tarik" value="' +
      esc(f.suka) +
      '" autocomplete="off"></div>' +
      '<div class="field"><label>Dengan siapa</label><div class="bk-pil">' +
      TP_DENGAN.concat(f.dg && TP_DENGAN.indexOf(f.dg) < 0 ? [f.dg] : [])
        .map(function (t) {
          return '<button type="button" data-tpkd="' + esc(t) + '"' + (f.dg === t ? ' class="on"' : '') + '>' + esc(t) + '</button>';
        })
        .join('') +
      '<button type="button" id="tpkDgLain">+ Lainnya</button></div></div>' +
      '<div class="field"><label for="tpkC">Catatan</label><textarea class="input" id="tpkC" rows="3" maxlength="1000" placeholder="Kesan kunjungan ini…">' +
      esc(f.c) +
      '</textarea></div>' +
      '<div class="bk-dlg-dua"><button type="button" class="btn ghost" id="tpkBatal">Batal</button><button type="button" class="btn primary" id="tpkSimpan">Simpan</button></div></div>';
  }
  h +=
    '<div class="fm-kartu-p">' +
    (kj.length
      ? kj
          .map(function (v) {
            return (
              '<div class="tp-kj"><div class="tp-kj-a"><b>' +
              new Date(v.t + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
              '</b><button type="button" data-tpkhapus="' +
              esc(v.i) +
              '" aria-label="Hapus kunjungan">' +
              TP_IK.hapus +
              '</button></div>' +
              (v.n ? '<div class="tp-kj-bt">' + '★★★★★'.slice(0, v.n) + '<span>' + '★★★★★'.slice(v.n) + '</span></div>' : '') +
              '<div class="tp-kj-tag"><span>' +
              TP_HARGA[v.h] +
              '</span>' +
              (v.dg ? '<span>👥 ' + esc(v.dg) + '</span>' : '') +
              (v.suka ? '<span>❤ ' + esc(v.suka) + '</span>' : '') +
              '</div>' +
              (v.c ? '<p>' + esc(v.c) + '</p>' : '') +
              '</div>'
            );
          })
          .join('')
      : '<p class="fm-tidak">Belum ada kunjungan. Ketuk <b>Catat kunjungan</b> setelah ke sana.</p>') +
    '</div></section>';
  h += '</div><div class="tp-det-kanan">';
  /* Impian */
  h +=
    '<section class="fm-bag"><h3>Impian</h3>' +
    (im
      ? '<div class="tp-impian"><i>' +
        TP_IK.impian +
        '</i><span><b>' +
        esc((im.emoji ? im.emoji + ' ' : '') + im.nama) +
        '</b><small>Tempat ini bagian dari impianmu</small></span><button type="button" id="tpImpLepas">Lepas</button></div>'
      : '<div class="bk-pil"><button type="button" class="tp-tambah-k" id="tpImpPilih">+ Kaitkan ke impian</button></div>') +
    '</section>';
  /* Koleksi */
  h +=
    '<section class="fm-bag"><h3>Koleksi</h3><div class="bk-pil">' +
    kol
      .map(function (c) {
        var on = (x.kl || []).indexOf(c.id) >= 0;
        return (
          '<button type="button" data-tpkl="' +
          esc(c.id) +
          '"' +
          (on ? ' class="on"' : '') +
          '>' +
          (on ? '✓ ' : '') +
          esc(c.n) +
          '</button>'
        );
      })
      .join('') +
    '<button type="button" class="tp-tambah-k" id="tpKolBaru2">+ Koleksi baru</button></div></section>';
  /* Catatan */
  h +=
    '<section class="fm-bag"><h3>Catatan</h3><textarea class="input tp-catatan" id="tpCat" rows="3" maxlength="2000" placeholder="Catatan umum (parkir, jam ramai, dll.)">' +
    esc(tpCatatan(x)) +
    '</textarea></section>';
  /* Info */
  var info = [
    ['Alamat', x.al ? esc(x.al) : ''],
    ['Koordinat', m ? m.lat.toFixed(5) + ', ' + m.lon.toFixed(5) : ''],
    ['Telepon', x.tel ? '<a href="tel:' + esc(x.tel.replace(/[^\d+]/g, '')) + '">' + esc(x.tel) + '</a>' : ''],
    [
      'Website',
      x.web
        ? '<a href="' +
          esc(x.web) +
          '" target="_blank" rel="noopener noreferrer">' +
          esc(x.web.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)) +
          '</a>'
        : ''
    ],
    ['Jam buka', x.jam ? esc(x.jam) : ''],
    ['Link', x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">Buka link</a>' : '']
  ].filter(function (r2) {
    return r2[1];
  });
  h +=
    '<section class="fm-bag"><h3 class="bk-h3">Info <button type="button" id="tpUbahInfo">' +
    TP_IK.edit +
    'Ubah</button></h3><div class="fm-kartu-p">' +
    (info.length
      ? '<dl class="fm-info tp-info">' +
        info
          .map(function (r2) {
            return '<dt>' + r2[0] + '</dt><dd>' + r2[1] + '</dd>';
          })
          .join('') +
        '</dl>'
      : '<p class="fm-tidak">Belum ada info.</p>') +
    (m
      ? '<p class="tp-terhubung">' +
        TP_IK.pin +
        '<span>Tempat ini juga marker di Peta 3D. Mengubah nama, kategori, atau catatan di sini ikut mengubah marker-nya, begitu juga sebaliknya.</span></p>'
      : '') +
    '</div></section>';
  h +=
    '<button type="button" class="se-hapus fm-hapus" id="tpHapus">' +
    TP_IK.hapus +
    'Hapus tempat</button><p class="fm-tmdb">Data tempat & peta © OpenStreetMap</p></div></div></div>';
  $('#subBody').innerHTML = h;
  if (ulang) $('#subBody').scrollTop = y;
}
function tpKini() {
  return tpCari(tpIdHalaman());
}
function tpRenderUlang() {
  var x = tpKini();
  if (x) {
    $('#subTitle').textContent = tpNama(x);
    tpRenderDetail(x, true);
  }
}
function tpLinkMaps(m, nama) {
  return 'https://www.google.com/maps/search/?api=1&query=' + m.lat.toFixed(6) + ',' + m.lon.toFixed(6);
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'tempat-detail') return;
  var x = tpKini();
  if (!x) return;
  var el,
    id = x.id,
    m = tpMarker(x);
  if (e.target.closest('#tpKe3d')) {
    var mid = m.id;
    tpKePeta(function () {
      fokusMarker(mid);
    });
    return;
  }
  if (e.target.closest('#tpTentukan')) {
    tpTujuan = id;
    tpCariQ = tpNama(x);
    var p0 = tpDariLink(x.url);
    if (p0 && !p0.pendek) {
      tpCariQ = '';
      tpMulaiDraft({ nama: tpNama(x), al: x.al, kat: x.kat, lon: p0.lon, lat: p0.lat, ket: 'Lokasi dari link yang tersimpan:' });
      return;
    }
    openLayer('page:tempat-tambah');
    return;
  }
  if (e.target.closest('#tpFav')) {
    var on = !x.fav;
    tpUbah(id, function (z) {
      z.fav = on;
    });
    toast(on ? 'Ditandai favorit ❤️' : 'Tanda favorit dilepas');
    tpRenderUlang();
    return;
  }
  if (e.target.closest('#tpRute') && m) {
    window.open('https://www.google.com/maps/dir/?api=1&destination=' + m.lat.toFixed(6) + ',' + m.lon.toFixed(6), '_blank', 'noopener');
    return;
  }
  if (e.target.closest('#tpTelp') && x.tel) {
    location.href = 'tel:' + x.tel.replace(/[^\d+]/g, '');
    return;
  }
  if (e.target.closest('#tpWeb') && x.web) {
    window.open(x.web, '_blank', 'noopener');
    return;
  }
  if (e.target.closest('#tpBagi') && m) {
    var data = { title: tpNama(x), text: tpNama(x) + (x.al ? ' — ' + x.al : ''), url: tpLinkMaps(m) };
    if (navigator.share) navigator.share(data).catch(function () {});
    else if (navigator.clipboard)
      navigator.clipboard.writeText(data.text + '\n' + data.url).then(function () {
        toast('Link lokasi disalin');
      });
    return;
  }
  if (e.target.closest('#tpSalin') && m) {
    var t = m.lat.toFixed(6) + ', ' + m.lon.toFixed(6);
    if (navigator.clipboard)
      navigator.clipboard.writeText(t).then(
        function () {
          toast('Koordinat disalin: ' + t);
        },
        function () {
          toast('Gagal menyalin');
        }
      );
    return;
  }
  if ((el = e.target.closest('[data-tps]'))) {
    var st = el.dataset.tps;
    if (st === x.s) return;
    tpUbah(id, function (z) {
      z.s = st;
    });
    toast(st === 'sudah' ? 'Status: Sudah dikunjungi' : 'Status: Ingin dikunjungi');
    tpRenderUlang();
    return;
  }
  if (e.target.closest('#tpKjTambah')) {
    tpKjForm = { tp: id, t: tpHariIni(), n: 0, h: 0, suka: '', dg: '', c: '' };
    tpRenderUlang();
    var tf = $('.tp-kj-form');
    if (tf) tf.scrollIntoView({ block: 'nearest' });
    return;
  }
  if (tpKjForm && tpKjForm.tp === id) {
    var f = tpKjForm;
    var baca = function () {
      var a = $('#tpkT');
      if (a) {
        f.t = a.value;
        f.suka = $('#tpkSuka').value;
        f.c = $('#tpkC').value;
      }
    };
    if ((el = e.target.closest('[data-tpkn]'))) {
      f.n = +el.dataset.tpkn === f.n ? 0 : +el.dataset.tpkn;
      $$('#subBody [data-tpkn]').forEach(function (b) {
        b.classList.toggle('on', +b.dataset.tpkn <= f.n);
      });
      return;
    }
    if ((el = e.target.closest('[data-tpkh]'))) {
      f.h = +el.dataset.tpkh;
      $$('#subBody [data-tpkh]').forEach(function (b) {
        b.classList.toggle('on', b === el);
      });
      return;
    }
    if ((el = e.target.closest('[data-tpkd]'))) {
      f.dg = f.dg === el.dataset.tpkd ? '' : el.dataset.tpkd;
      $$('#subBody [data-tpkd]').forEach(function (b) {
        b.classList.toggle('on', b.dataset.tpkd === f.dg);
      });
      return;
    }
    if (e.target.closest('#tpkDgLain')) {
      baca();
      tpMintaTeks({
        judul: 'Dengan siapa?',
        ph: 'mis. Rina',
        maks: 40,
        ok: 'Pilih',
        cb: function (v) {
          if (v) {
            f.dg = v.slice(0, 40);
            tpRenderUlang();
          }
        }
      });
      return;
    }
    if (e.target.closest('#tpkBatal')) {
      tpKjForm = null;
      tpRenderUlang();
      return;
    }
    if (e.target.closest('#tpkSimpan')) {
      baca();
      if (!tpTgl(f.t)) {
        toast('Pilih tanggal kunjungan');
        return;
      }
      if ((x.kj || []).length >= TP_KJ_MAKS) {
        toast('Maksimal ' + TP_KJ_MAKS + ' kunjungan');
        return;
      }
      var v = { i: uid(), t: f.t, n: f.n, h: f.h, suka: f.suka.trim(), dg: f.dg, c: f.c.trim() };
      if (
        tpUbah(id, function (z) {
          z.kj = (z.kj || []).concat([v]).sort(function (a, b) {
            return a.t < b.t ? 1 : -1;
          });
          z.s = 'sudah';
        })
      ) {
        tpKjForm = null;
        toast(x.s === 'sudah' ? 'Kunjungan dicatat' : 'Kunjungan dicatat · status jadi Sudah dikunjungi');
        tpRenderUlang();
        renderGaleryTab();
      }
      return;
    }
  }
  if ((el = e.target.closest('[data-tpkhapus]'))) {
    var ki = el.dataset.tpkhapus,
      kv = (x.kj || []).filter(function (v2) {
        return v2.i === ki;
      })[0];
    if (!kv) return;
    askConfirm({
      title: 'Hapus kunjungan?',
      text:
        'Catatan kunjungan ' +
        new Date(kv.t + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
        ' dihapus.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          tpUbah(id, function (z) {
            z.kj = (z.kj || []).filter(function (v3) {
              return v3.i !== ki;
            });
          });
          tpRenderUlang();
          toast('Kunjungan dihapus');
        });
      }
    });
    return;
  }
  if (e.target.closest('#tpImpPilih')) {
    var D = tpImpianDaftar();
    if (!D.length) {
      toast('Belum ada impian. Buat dulu di tab Impian.');
      return;
    }
    tpPilihan({
      judul: 'Kaitkan ke impian',
      opsi: D.map(function (d) {
        return {
          kelas: 'tp-opsi-imp',
          html: '<i>' + esc(d.emoji || '🎯') + '</i><span><b>' + esc(d.nama) + '</b></span>',
          aksi: function () {
            tpUbah(id, function (z) {
              z.imp = d.id;
            });
            toast('Dikaitkan ke impian');
            tpRenderUlang();
          }
        };
      }).concat([{ t: 'Batal' }])
    });
    return;
  }
  if (e.target.closest('#tpImpLepas')) {
    tpUbah(id, function (z) {
      delete z.imp;
    });
    toast('Kaitan impian dilepas');
    tpRenderUlang();
    return;
  }
  if ((el = e.target.closest('[data-tpkl]'))) {
    var kid = el.dataset.tpkl;
    tpUbah(id, function (z) {
      var a = z.kl || [],
        i = a.indexOf(kid);
      if (i >= 0) a.splice(i, 1);
      else a.push(kid);
      z.kl = a;
    });
    tpRenderUlang();
    return;
  }
  if (e.target.closest('#tpKolBaru2')) {
    tpKoleksiBaru(id, tpRenderUlang);
    return;
  }
  if (e.target.closest('#tpUbahInfo')) {
    tpDraft = {
      id: id,
      mk: x.mk || null,
      nama: tpNama(x),
      al: x.al || '',
      kat: x.kat,
      s: x.s,
      lon: m ? m.lon : undefined,
      lat: m ? m.lat : undefined,
      tel: x.tel || '',
      web: x.web || '',
      jam: x.jam || '',
      osm: x.osm || ''
    };
    openLayer('page:tempat-baru');
    return;
  }
  if (e.target.closest('#tpHapus')) {
    var nama = tpNama(x),
      hapusTempat = function (denganMarker) {
        var L = tpItems().filter(function (z) {
          return z.id !== id;
        });
        tpSimpanData(L);
        if (denganMarker && m) tpHapusMarker(m.id);
        back(1, function () {
          renderGaleryTab();
          if (opened.page && pageKind === 'galery-koleksi') glRenderDaftar();
          toast(denganMarker ? 'Tempat & marker dihapus' : m ? 'Dihapus dari Tempat Favorit · marker tetap di Peta' : 'Tempat dihapus');
        });
      };
    if (!m) {
      askConfirm({
        title: 'Hapus tempat?',
        text: '"' + nama.slice(0, 80) + '" beserta kunjungan dan catatannya dihapus.',
        ok: 'Hapus',
        action: function () {
          back(1, function () {
            hapusTempat(false);
          });
        }
      });
      return;
    }
    tpPilihan({
      judul: 'Hapus "' + nama.slice(0, 60) + '"?',
      teks: 'Tempat ini juga marker di Peta 3D. Kunjungan dan info tambahannya ikut terhapus. Pilih yang ingin dihapus:',
      opsi: [
        {
          kelas: 'lunak',
          html: 'Hapus dari Tempat Favorit saja<small>Marker tetap ada di Peta</small>',
          aksi: function () {
            hapusTempat(false);
          }
        },
        {
          kelas: 'bahaya',
          t: 'Hapus tempat & marker-nya',
          aksi: function () {
            hapusTempat(true);
          }
        },
        { t: 'Batal' }
      ]
    });
  }
});
var tpCatT = null;
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'tempat-detail' || e.target.id !== 'tpCat') return;
  var id = tpIdHalaman(),
    v = e.target.value.replace(/\s+$/, '').slice(0, 2000);
  clearTimeout(tpCatT);
  tpCatT = setTimeout(function () {
    tpSimpanCatatan(id, v);
  }, 700);
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'tempat-detail' || e.target.id !== 'tpCat') return;
  clearTimeout(tpCatT);
  tpSimpanCatatan(tpIdHalaman(), e.target.value.replace(/\s+$/, '').slice(0, 2000));
});
function tpSimpanCatatan(id, v) {
  var x = tpCari(id);
  if (!x) return;
  if (tpMarker(x)) {
    if ((tpMarker(x).catatan || '') !== v)
      tpUbahMarker(x, function (m) {
        m.catatan = v;
      });
  } else
    tpUbah(id, function (z) {
      z.c = v;
    });
}
function tpSegarkan() {
  if (opened.page && pageKind === 'galery-koleksi' && glBukaJenis === 'tempat') glRenderDaftar();
  else if (opened.page && pageKind === 'tempat-detail' && !tpKjForm && document.activeElement && document.activeElement.id !== 'tpCat')
    tpRenderUlang();
}
tpMigrasi();
