/* Stivora — Peta Tahap 5a: Journey (perjalanan antar marker + Putar Perjalanan)
   Perjalanan = daftar marker berurutan + nama + warna. Data: store (IndexedDB) 'stivora.peta.jalur',
   tersinkron ke Firestore users/{uid}/jalur (sync.js) dan ikut file cadangan.
   Mode Journey: hanya perjalanan terpilih yang tampil (garis lengkung + pin-pinnya); bar bawah: pilih perjalanan, Putar. */
'use strict';

var K_JALUR = 'stivora.peta.jalur';
var K_JALUR_PILIH = 'stivora.peta.jalur.pilih';
var petaJalur = store.get(K_JALUR, []);
if (!Array.isArray(petaJalur)) petaJalur = [];
var jalurPilih = store.raw(K_JALUR_PILIH) || '';
var jalurDraft = null; // isian halaman perjalanan
var jalurGaris = null; // PolylineCollection
var putar = null; // { jalurId, i, timer } saat Putar Perjalanan berjalan

function jalurCari(id) {
  for (var i = 0; i < petaJalur.length; i++) if (petaJalur[i].id === id) return petaJalur[i];
  return null;
}
function jalurSimpanSemua() {
  store.set(K_JALUR, petaJalur);
  schedulePush();
}
/* Titik yang masih ada (marker yang sudah dihapus dilewati) */
function jalurTitik(j) {
  return ((j && j.titik) || []).map(mkCari).filter(Boolean);
}
function jalurAktif() {
  var j = jalurCari(jalurPilih);
  if (!j && petaJalur.length) {
    j = petaJalur[0];
    jalurPilih = j.id;
  }
  return j || null;
}
/* ---------- Kendaraan per bagian perjalanan ----------
   j.kendaraan sejajar dengan j.titik: kendaraan[i] = naik apa untuk TIBA di titik ke-i (kendaraan[0] tidak dipakai). */
/* Gambar & daftar kendaraan ada di peta-kendaraan.js (KEND_JENIS, kendUrai, kendKanvas, kendImg) */
function kendaraanSah(v) {
  var u = kendUrai(v);
  return u ? u.nilai : '';
}
function kendaraanAuto(a, b) {
  return a && b && jarakKm(a, b) > 600 ? 'pesawat:jet' : 'mobil:sedan';
}
/* Waktu berangkat 'YYYY-MM-DDTHH:MM' → '20 Agu 2019 · 07.30' */
function waktuSah(w) {
  return typeof w === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(w) ? w : '';
}
function teksWaktu(w) {
  w = waktuSah(w);
  if (!w) return '';
  var t = w.split('T');
  return mkTanggalTeks(t[0]) + (t[1] ? ' · ' + t[1].replace(':', '.') : '');
}
/* Urutan titik yang masih ada beserta kendaraan menuju titik itu */
function jalurLangkah(j) {
  var hasil = [];
  ((j && j.titik) || []).forEach(function (id, i) {
    var m = mkCari(id);
    if (!m) return;
    var k = kendaraanSah(j.kendaraan && j.kendaraan[i]);
    hasil.push({
      m: m,
      kend: hasil.length ? k || kendaraanAuto(hasil[hasil.length - 1].m, m) : '',
      berangkat: hasil.length ? waktuSah(j.berangkat && j.berangkat[i]) : ''
    });
  });
  return hasil;
}
/* Dipakai markerTampil(): di mode Journey hanya pin dari perjalanan terpilih; saat Putar hanya yang sudah/sedang dituju */
function jalurPunya(markerId) {
  if (putar) {
    for (var i = 0; i <= Math.min(putar.tuju, putar.langkah.length - 1); i++) if (putar.langkah[i].m.id === markerId) return true;
    return false;
  }
  var j = jalurAktif();
  return !!(j && j.titik.indexOf(markerId) >= 0);
}

/* ---------- Jarak ---------- */
function jarakKm(a, b) {
  var R = 6371,
    r = Math.PI / 180;
  var dLat = (b.lat - a.lat) * r,
    dLon = (b.lon - a.lon) * r;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function jalurJarak(titik) {
  var t = 0;
  for (var i = 1; i < titik.length; i++) t += jarakKm(titik[i - 1], titik[i]);
  return t;
}
function teksJarak(km) {
  return km < 1
    ? Math.round(km * 1000) + ' m'
    : (km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km).toLocaleString('id-ID')) + ' km';
}

/* ---------- Garis di peta: lengkung (naik di tengah) agar tidak menembus bumi ---------- */
function gambarJalur() {
  if (!peta || !window.Cesium) return;
  var C = Cesium;
  if (!jalurGaris) jalurGaris = peta.scene.primitives.add(new C.PolylineCollection());
  jalurGaris.removeAll();
  if (petaMode === 'perjalanan' && petaLayer.marker && !putar) {
    var j = jalurAktif(),
      titik = jalurTitik(j);
    if (titik.length >= 2) {
      var pos = [];
      for (var i = 1; i < titik.length; i++) {
        for (var s = i === 1 ? 0 : 1; s <= 32; s++) pos.push.apply(pos, titikLengkung(titik[i - 1], titik[i], s / 32));
      }
      jalurGaris.add({
        positions: C.Cartesian3.fromDegreesArrayHeights(pos),
        width: 4,
        material: C.Material.fromType('Color', { color: C.Color.fromCssColorString(mkWarnaSah(j.warna)) })
      });
    }
  }
  peta.scene.requestRender();
}

/* Titik di garis lengkung a→b pada t (0..1): [lon, lat, tinggi] */
function titikLengkung(a, b, t) {
  var puncak = Math.min(jarakKm(a, b) * 1000 * 0.12, 300000);
  return [a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t, 30 + Math.sin(Math.PI * t) * puncak];
}

/* ---------- Mode Journey ---------- */
function mulaiJalur() {
  hentikanPutar(true);
  var j = jalurAktif();
  renderJalur();
  if (j) lihatSeluruhJalur(j);
}
function lihatSeluruhJalur(j) {
  var titik = jalurTitik(j);
  if (!peta || !titik.length) return;
  if (titik.length === 1) {
    fokusMarker(titik[0].id);
    return;
  }
  var w = 180,
    s = 90,
    e = -180,
    n = -90;
  titik.forEach(function (m) {
    w = Math.min(w, m.lon);
    e = Math.max(e, m.lon);
    s = Math.min(s, m.lat);
    n = Math.max(n, m.lat);
  });
  var pl = Math.max(0.05, (e - w) * 0.25),
    pt = Math.max(0.05, (n - s) * 0.25);
  peta.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(Math.max(-180, w - pl), Math.max(-90, s - pt), Math.min(180, e + pl), Math.min(90, n + pt)),
    duration: 2
  });
}
var IKON_JALUR =
  '<svg viewBox="0 0 24 24"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/></svg>';
var IKON_PUTAR = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>';
var IKON_STOP = '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
function renderJalur() {
  var bar = $('#petaJalan'),
    bingkai = $('#petaBingkai');
  if (!bar) return;
  var aktif = petaMode === 'perjalanan';
  bingkai.classList.toggle('mode-jalan', aktif);
  bar.hidden = !aktif;
  gambarJalur();
  if (!aktif) {
    tutupJalurMenu();
    return;
  }
  var j = jalurAktif();
  if (!j) {
    bar.innerHTML =
      '<button type="button" class="jp-btn" data-jl-aksi="kosong" aria-label="Belum ada perjalanan" title="Belum ada perjalanan">' +
      IKON_JALUR +
      '</button>';
    return;
  }
  var titik = jalurTitik(j);
  /* Panel tegak di kiri peta: pilih perjalanan · kecepatan · putar/berhenti (+ kemajuan saat diputar) */
  bar.innerHTML =
    '<button type="button" class="jp-btn jp-jalur" data-jl-aksi="pilih" aria-haspopup="menu"' +
    (putar ? ' disabled' : '') +
    ' aria-label="Pilih perjalanan: ' +
    esc(j.nama) +
    '" title="' +
    esc(j.nama) +
    '">' +
    '<span class="mk-lencana" style="background:' +
    mkWarnaSah(j.warna) +
    '">' +
    IKON_JALUR +
    '</span></button>' +
    '<button type="button" class="jp-btn jp-laju" data-jl-aksi="laju" aria-haspopup="menu" aria-label="Kecepatan animasi" title="Kecepatan animasi">' +
    teksLaju(lajuPutar()) +
    '</button>' +
    (putar
      ? '<button type="button" class="jp-btn jp-putar stop" data-jl-aksi="stop" aria-label="Berhenti" title="Berhenti">' +
        IKON_STOP +
        '</button>' +
        '<span class="jp-prog" aria-label="Titik ' +
        (putar.tuju + 1) +
        ' dari ' +
        putar.langkah.length +
        '">' +
        (putar.tuju + 1) +
        '/' +
        putar.langkah.length +
        '</span>'
      : '<button type="button" class="jp-btn jp-putar" data-jl-aksi="putar"' +
        (titik.length < 2 ? ' disabled' : '') +
        ' aria-label="Putar perjalanan" title="Putar perjalanan">' +
        IKON_PUTAR +
        '</button>');
}
function tutupJalurMenu() {
  var m = $('#petaJalurMenu');
  if (m) {
    m.hidden = true;
    m.dataset.isi = '';
  }
}
function bukaJalurMenu() {
  var menu = $('#petaJalurMenu');
  if (!menu.hidden && menu.dataset.isi === 'jalur') {
    tutupJalurMenu();
    return;
  }
  menu.innerHTML =
    '<b class="peta-layer-judul">Pilih perjalanan</b>' +
    petaJalur
      .map(function (j) {
        var t = jalurTitik(j);
        return (
          '<button type="button" class="peta-mode-opsi' +
          (j.id === jalurPilih ? ' aktif' : '') +
          '" data-jalur="' +
          esc(j.id) +
          '"><span translate="no">' +
          esc(j.nama) +
          '</span><small>' +
          t.length +
          ' titik · ' +
          teksJarak(jalurJarak(t)) +
          '</small></button>'
        );
      })
      .join('');
  menu.dataset.isi = 'jalur';
  menu.hidden = false;
}
function bukaLajuMenu() {
  var menu = $('#petaJalurMenu');
  if (!menu.hidden && menu.dataset.isi === 'laju') {
    tutupJalurMenu();
    return;
  }
  var v = lajuPutar();
  menu.innerHTML =
    '<b class="peta-layer-judul">Kecepatan</b>' +
    LAJU.map(function (x) {
      return (
        '<button type="button" class="peta-mode-opsi' +
        (x === v ? ' aktif' : '') +
        '" data-laju="' +
        x +
        '">' +
        teksLaju(x) +
        (x === 1 ? '<small>Normal</small>' : x < 1 ? '<small>Lambat</small>' : '<small>Cepat</small>') +
        '</button>'
      );
    }).join('');
  menu.dataset.isi = 'laju';
  menu.hidden = false;
}
function jalurClick(e) {
  var b = e.target.closest('[data-jalur]');
  if (b) {
    hentikanPutar(true);
    jalurPilih = b.dataset.jalur;
    store.raw(K_JALUR_PILIH, jalurPilih);
    tutupJalurMenu();
    terapkanLayer();
    lihatSeluruhJalur(jalurAktif());
    return;
  }
  b = e.target.closest('[data-laju]');
  if (b) {
    store.raw(K_LAJU, b.dataset.laju);
    tutupJalurMenu();
    renderJalur();
    return;
  }
  b = e.target.closest('[data-jl-aksi]');
  if (!b || b.disabled) return;
  var a = b.dataset.jlAksi;
  if (a === 'pilih') {
    renderModeMenu(false);
    tutupLayerMenu();
    bukaJalurMenu();
    return;
  }
  if (a === 'laju') {
    renderModeMenu(false);
    tutupLayerMenu();
    bukaLajuMenu();
    return;
  }
  tutupJalurMenu();
  if (a === 'putar') mulaiPutar();
  else if (a === 'stop') hentikanPutar();
  else if (a === 'kosong') toast('Belum ada perjalanan. Buat lewat ikon pensil.');
}

/* ---------- Putar Perjalanan ----------
   Kendaraan bergerak di garis lengkung dari titik ke titik; garis baru muncul di belakangnya.
   Info (nama tempat, waktu berangkat, tanggal, catatan/peristiwa) tampil di atas kendaraan. Kecepatan: 0,2× – 4×. */
var K_LAJU = 'stivora.peta.jalur.laju';
var LAJU = [0.2, 0.3, 0.5, 1, 2, 4];
function lajuPutar() {
  var v = +store.raw(K_LAJU);
  return LAJU.indexOf(v) >= 0 ? v : 1;
}
function teksLaju(v) {
  return String(v).replace('.', ',') + '×';
}
var putarKol = null; // { bb: BillboardCollection, garis: PolylineCollection }
/* Lama bagian perjalanan (detik pada 1×): makin jauh makin lama, tapi tetap wajar */
function lamaBagian(a, b) {
  return Math.min(9, 2.5 + Math.sqrt(jarakKm(a, b)) / 7);
}
function lamaTiba(m) {
  return 2 + (m.catatan ? 1.6 : 0) + (m.tanggal ? 0.4 : 0);
}

function mulaiPutar() {
  var j = jalurAktif(),
    langkah = jalurLangkah(j);
  if (!peta || langkah.length < 2) return;
  var C = Cesium;
  if (!putarKol)
    putarKol = { garis: peta.scene.primitives.add(new C.PolylineCollection()), bb: peta.scene.primitives.add(new C.BillboardCollection()) };
  putarKol.garis.removeAll();
  putarKol.bb.removeAll();
  putar = {
    jalurId: j.id,
    warna: mkWarnaSah(j.warna),
    langkah: langkah,
    tuju: 0,
    fase: 'kamera',
    sisa: 2,
    p: 0,
    jejak: [],
    raf: 0,
    akhir: 0,
    kend: null,
    garisNow: null
  };
  var m0 = langkah[0].m;
  putar.jejak = titikLengkung(m0, m0, 0);
  terbang(m0.lon, m0.lat, 12000, null, 1.8);
  terapkanLayer();
  renderJalur();
  infoPutar('tiba', 0);
  putar.raf = requestAnimationFrame(langkahPutar);
}
function langkahPutar(kini) {
  if (!putar) return;
  if (cur.tab !== 'impian' || cur.layers.length) {
    hentikanPutar(true);
    return;
  } /* halaman lain terbuka */
  var dt = putar.akhir ? Math.min(0.1, (kini - putar.akhir) / 1000) : 0;
  putar.akhir = kini;
  var laju = lajuPutar(),
    L = putar.langkah;
  if (putar.fase === 'kamera' || putar.fase === 'tiba') {
    putar.sisa -= dt * laju;
    if (putar.sisa <= 0) {
      if (putar.fase === 'kamera' && putar.tuju === 0) {
        putar.fase = 'tiba';
        putar.sisa = lamaTiba(L[0].m);
      } else if (putar.fase === 'kamera') {
        putar.fase = 'jalan';
        putar.p = 0;
        mulaiBagian();
      } else if (putar.tuju >= L.length - 1) {
        selesaiPutar();
        return;
      } else {
        putar.tuju++;
        arahkanBagian();
      }
    }
  } else if (putar.fase === 'jalan') {
    var a = L[putar.tuju - 1].m,
      b = L[putar.tuju].m;
    putar.p = Math.min(1, putar.p + (dt * laju) / lamaBagian(a, b));
    var t = putar.p < 0.5 ? 2 * putar.p * putar.p : 1 - Math.pow(-2 * putar.p + 2, 2) / 2; /* pelan di awal & akhir */
    gerakKendaraan(a, b, t);
    if (putar.p >= 1) {
      putar.fase = 'tiba';
      putar.sisa = lamaTiba(b);
      tibaDi(putar.tuju);
    }
  }
  posisiInfoPutar();
  peta.scene.requestRender();
  putar.raf = requestAnimationFrame(langkahPutar);
}
/* Sebelum bagian baru: kamera menampilkan titik asal & tujuan */
function arahkanBagian() {
  var a = putar.langkah[putar.tuju - 1].m,
    b = putar.langkah[putar.tuju].m;
  var w = Math.min(a.lon, b.lon),
    e = Math.max(a.lon, b.lon),
    s = Math.min(a.lat, b.lat),
    n = Math.max(a.lat, b.lat);
  var pl = Math.max(0.03, (e - w) * 0.35),
    pt = Math.max(0.03, (n - s) * 0.35);
  peta.camera.flyTo({ destination: Cesium.Rectangle.fromDegrees(w - pl, s - pt, e + pl, n + pt), duration: 1.2 / lajuPutar() });
  putar.fase = 'kamera';
  putar.sisa = 1.3;
  terapkanLayer();
  renderJalur();
  infoPutar('jalan', putar.tuju);
}
function mulaiBagian() {
  var C = Cesium,
    L = putar.langkah[putar.tuju];
  putarKol.bb.removeAll();
  var a = putar.langkah[putar.tuju - 1].m;
  /* gambar menghadap arah gerak: ke barat → dicerminkan */
  putar.kend = putarKol.bb.add({
    position: C.Cartesian3.fromDegrees(a.lon, a.lat, 30),
    image: kendKanvas(L.kend, L.m.lon < a.lon ? -1 : 1, 2),
    width: 62,
    height: 39,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
  renderJalur();
}
function gerakKendaraan(a, b, t) {
  var C = Cesium,
    n = Math.max(1, Math.round(t * 32)),
    pos = [];
  for (var s = 1; s <= n; s++) pos.push.apply(pos, titikLengkung(a, b, (t * s) / n));
  var ujung = titikLengkung(a, b, t);
  if (putar.kend) putar.kend.position = C.Cartesian3.fromDegrees(ujung[0], ujung[1], ujung[2]);
  /* garis di belakang kendaraan: bagian yang sudah selesai + bagian ini sampai posisi kendaraan */
  var semua = putar.jejak.concat(pos);
  if (!putar.garisNow)
    putar.garisNow = putarKol.garis.add({
      positions: C.Cartesian3.fromDegreesArrayHeights(semua),
      width: 4,
      material: C.Material.fromType('Color', { color: C.Color.fromCssColorString(putar.warna) })
    });
  else putar.garisNow.positions = C.Cartesian3.fromDegreesArrayHeights(semua);
  putar.ujung = ujung;
}
function tibaDi(i) {
  var a = putar.langkah[i - 1].m,
    b = putar.langkah[i].m;
  for (var s = 1; s <= 32; s++) putar.jejak.push.apply(putar.jejak, titikLengkung(a, b, s / 32));
  putar.ujung = [b.lon, b.lat, 30];
  if (putar.kend) putar.kend.position = Cesium.Cartesian3.fromDegrees(b.lon, b.lat, 30);
  renderJalur();
  infoPutar('tiba', i);
}
/* ---------- Kartu info di atas kendaraan ---------- */
function infoPutar(jenis, i) {
  var el = $('#petaPutarInfo');
  if (!el || !putar) return;
  var L = putar.langkah[i],
    m = L.m,
    html;
  if (jenis === 'jalan') {
    var a = putar.langkah[i - 1].m;
    html =
      '<span class="ppi-kecil">' +
      kendImg(L.kend, 'ppi-kend') +
      esc(kendNama(L.kend)) +
      ' · ' +
      teksJarak(jarakKm(a, m)) +
      '</span>' +
      '<b translate="no">Menuju ' +
      esc(m.nama) +
      '</b>' +
      (L.berangkat ? '<span class="ppi-tgl">' + MK_IKON_TGL + 'Berangkat ' + teksWaktu(L.berangkat) + '</span>' : '') +
      '<span class="ppi-dari" translate="no">dari ' +
      esc(a.nama) +
      '</span>';
  } else {
    var cat = (m.catatan || '').trim();
    html =
      '<span class="ppi-kecil">' +
      (i === 0 ? 'Mulai' : 'Tiba · titik ' + (i + 1) + '/' + putar.langkah.length) +
      '</span>' +
      '<b translate="no">' +
      esc(m.nama) +
      '</b>' +
      (m.tanggal ? '<span class="ppi-tgl">' + MK_IKON_TGL + mkTanggalTeks(m.tanggal) + '</span>' : '') +
      (cat ? '<span class="ppi-catatan" translate="no">' + esc(cat.length > 140 ? cat.slice(0, 140) + '…' : cat) + '</span>' : '');
  }
  el.innerHTML = html;
  el.style.setProperty('--warna', putar.warna);
  el.classList.toggle('tiba', jenis === 'tiba');
  el.hidden = false;
  if (jenis === 'tiba') putar.ujung = [m.lon, m.lat, 30];
  else putar.ujung = [putar.langkah[i - 1].m.lon, putar.langkah[i - 1].m.lat, 30];
  posisiInfoPutar();
}
function posisiInfoPutar() {
  var el = $('#petaPutarInfo');
  if (!el || el.hidden || !putar || !putar.ujung) return;
  var ST = Cesium.SceneTransforms,
    fn = ST && (ST.worldToWindowCoordinates || ST.wgs84ToWindowCoordinates);
  var p = fn && fn.call(ST, peta.scene, Cesium.Cartesian3.fromDegrees(putar.ujung[0], putar.ujung[1], putar.ujung[2]));
  var f = $('#petaBingkai'),
    lebar = f.clientWidth;
  if (!p || !isFinite(p.x)) {
    el.classList.add('lepas');
    el.style.left = '';
    el.style.top = '';
    return;
  } /* tanpa posisi: kartu di atas tengah */
  var c = peta.scene.canvas.getBoundingClientRect(),
    r = f.getBoundingClientRect();
  var x = c.left - r.left + p.x,
    y = c.top - r.top + p.y,
    w = el.offsetWidth;
  el.classList.remove('lepas');
  el.style.left = Math.max(w / 2 + 6, Math.min(lebar - w / 2 - 6, x)) + 'px';
  el.style.top = Math.max(el.offsetHeight + 8, y - 26) + 'px';
}
function selesaiPutar() {
  var j = jalurCari(putar.jalurId);
  hentikanPutar(true);
  if (j) lihatSeluruhJalur(j);
  toast('Perjalanan selesai');
}
function hentikanPutar(diam) {
  if (!putar) return;
  cancelAnimationFrame(putar.raf);
  putar = null;
  if (putarKol) {
    putarKol.garis.removeAll();
    putarKol.bb.removeAll();
  }
  var el = $('#petaPutarInfo');
  if (el) el.hidden = true;
  if (petaMode === 'perjalanan') terapkanLayer();
  renderJalur();
  if (peta) peta.scene.requestRender();
  if (!diam) toast('Putar perjalanan dihentikan');
}
/* Pindah halaman/menu atau buka lapisan → hentikan putar */
window.addEventListener('popstate', function () {
  if (putar && (cur.tab !== 'impian' || cur.layers.length)) hentikanPutar(true);
});

/* ---------- Bagian "Perjalanan" di halaman pensil ---------- */
function renderJalurDaftar() {
  var box = $('#petaJalurDaftar');
  if (!box) return;
  if (!petaJalur.length) {
    box.innerHTML =
      petaMarker.length >= 2
        ? kpKosong(
            'jalur',
            'kp-ungu',
            'Belum ada perjalanan',
            'Hubungkan beberapa marker menjadi satu rute, lalu putar perjalananmu di peta.',
            'jalur',
            'Buat perjalanan'
          )
        : kpKosong(
            'jalur',
            'kp-ungu',
            'Butuh minimal 2 marker',
            'Perjalanan menghubungkan marker-markermu. Tambah minimal 2 marker dulu.',
            'marker',
            'Tambah marker'
          );
    return;
  }
  box.innerHTML =
    kpBar(petaJalur.length + ' rute', petaMarker.length >= 2 ? 'jalur' : '', 'Buat') +
    '<div class="card kp-daftar">' +
    petaJalur
      .map(function (j) {
        var titik = jalurTitik(j);
        return kpBaris(
          'data-jl-edit',
          'data-jl-lihat',
          j.id,
          '<span class="mk-lencana" style="background:' + mkWarnaSah(j.warna) + '">' + IKON_JALUR + '</span>',
          j.nama,
          titik.length + ' titik · ' + teksJarak(jalurJarak(titik))
        );
      })
      .join('') +
    '</div>';
}
document.addEventListener('click', function (e) {
  if (!e.target.closest('#petaJalurDaftar')) return;
  if (e.target.closest('[data-jl-baru]')) {
    jalurDraft = { id: null, nama: '', warna: MK_WARNA[0].k, titik: [] };
    openLayer('page:jalur');
    return;
  }
  var b = e.target.closest('[data-jl-lihat]');
  if (b) {
    var id = b.dataset.jlLihat;
    keBingkaiPeta(function () {
      jalurPilih = id;
      store.raw(K_JALUR_PILIH, id);
      pilihModePeta('perjalanan');
    });
    return;
  }
  b = e.target.closest('[data-jl-edit]');
  if (b) {
    var j = jalurCari(b.dataset.jlEdit);
    if (!j) return;
    jalurDraft = JSON.parse(JSON.stringify(j));
    openLayer('page:jalur');
  }
});

/* ---------- Halaman perjalanan (buat / edit) ---------- */
function buildJalurPage() {
  if (!jalurDraft) return false;
  var d = jalurDraft;
  $('#subTitle').textContent = d.id ? 'Edit perjalanan' : 'Perjalanan baru';
  $('#subBody').innerHTML =
    '<div class="field"><label for="jlNama">Nama</label><input class="input" id="jlNama" maxlength="60" autocomplete="off" placeholder="Contoh: Mudik Lebaran 2026"></div>' +
    '<div class="field"><label>Warna garis</label>' +
    htmlPilihWarna('data-jl-warna') +
    '</div>' +
    '<div class="field"><label>Urutan titik <small>(minimal 2)</small></label><div id="jlUrutan"></div></div>' +
    '<div class="field"><label>Tambah titik <small>(ketuk marker)</small></label><div class="jl-pilihan" id="jlPilihan"></div></div>' +
    '<button type="button" class="btn primary mk-simpan" data-jl="simpan">Simpan</button>' +
    (d.id ? '<button type="button" class="btn danger mk-hapus" data-jl="hapus">Hapus perjalanan</button>' : '');
  $('#jlNama').value = d.nama || '';
  renderJalurIsian();
  return true;
}
function renderJalurIsian() {
  var d = jalurDraft;
  if (!d) return;
  segarkanPilihWarna('data-jl-warna', d.warna);
  if (!Array.isArray(d.kendaraan)) d.kendaraan = [];
  if (!Array.isArray(d.berangkat)) d.berangkat = [];
  var kd = [],
    bw = [];
  d.titik = d.titik.filter(function (id, i) {
    if (!mkCari(id)) return false;
    kd.push(d.kendaraan[i] || '');
    bw.push(d.berangkat[i] || '');
    return true;
  });
  d.kendaraan = kd;
  d.berangkat = bw;
  var titik = jalurTitik(d);
  $('#jlUrutan').innerHTML = titik.length
    ? '<div class="jl-urutan">' +
      titik
        .map(function (m, i) {
          return (
            (i ? pilihKendaraan(d, i, titik) : '') +
            '<div class="jl-baris"><span class="jl-no">' +
            (i + 1) +
            '</span>' +
            mkLencana(m) +
            '<span class="mk-teks"><b translate="no">' +
            esc(m.nama) +
            '</b>' +
            (i ? '<small>+' + teksJarak(jarakKm(titik[i - 1], m)) + '</small>' : '<small>Awal</small>') +
            '</span>' +
            '<button type="button" class="jl-kecil" data-jl-naik="' +
            i +
            '" aria-label="Naikkan"' +
            (i === 0 ? ' disabled' : '') +
            '><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button>' +
            '<button type="button" class="jl-kecil" data-jl-turun="' +
            i +
            '" aria-label="Turunkan"' +
            (i === titik.length - 1 ? ' disabled' : '') +
            '><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>' +
            '<button type="button" class="jl-kecil" data-jl-buang="' +
            i +
            '" aria-label="Keluarkan dari perjalanan"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
          );
        })
        .join('') +
      '</div><p class="sub-note jl-total">Total ' +
      teksJarak(jalurJarak(titik)) +
      ' (garis lurus)</p>'
    : '<p class="sub-note">Belum ada titik. Ketuk marker di bawah sesuai urutan perjalanan.</p>';
  $('#jlPilihan').innerHTML = petaMarker
    .slice()
    .sort(function (a, b) {
      return a.nama.localeCompare(b.nama);
    })
    .map(function (m) {
      return (
        '<button type="button" class="jl-opsi" data-jl-tambah="' +
        esc(m.id) +
        '">' +
        mkLencana(m) +
        '<span translate="no">' +
        esc(m.nama) +
        '</span><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>'
      );
    })
    .join('');
}
/* Di antara dua titik: naik apa (jenis + model bergambar) dan kapan berangkat */
function pilihKendaraan(d, i, titik) {
  var v = kendaraanSah(d.kendaraan[i]) || kendaraanAuto(titik[i - 1], titik[i]),
    u = kendUrai(v);
  return (
    '<div class="jl-kend">' +
    '<div class="jl-kend-atas">' +
    kendImg(v, 'jl-kend-gambar') +
    '<div class="jl-kend-pilih"><select data-jl-kend="' +
    i +
    '" aria-label="Kendaraan ke titik ' +
    (i + 1) +
    '">' +
    KEND_JENIS.map(function (x) {
      return '<option value="' + x.k + '"' + (x.k === u.jenis.k ? ' selected' : '') + '>' + x.nama + '</option>';
    }).join('') +
    '</select><svg class="jl-kend-panah" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div></div>' +
    '<div class="jl-model" role="radiogroup" aria-label="Model ' +
    esc(u.jenis.nama) +
    '">' +
    u.jenis.model
      .map(function (m) {
        var nilai = u.jenis.k + ':' + m.k;
        return (
          '<button type="button" class="jl-model-opsi' +
          (nilai === u.nilai ? ' aktif' : '') +
          '" role="radio" aria-checked="' +
          (nilai === u.nilai) +
          '" data-jl-model="' +
          i +
          '|' +
          nilai +
          '">' +
          kendImg(nilai, 'jl-model-gambar') +
          '<span>' +
          esc(m.nama) +
          '</span></button>'
        );
      })
      .join('') +
    '</div>' +
    '<label class="jl-waktu"><span>Berangkat</span><input type="datetime-local" class="input" data-jl-waktu="' +
    i +
    '" value="' +
    esc(waktuSah(d.berangkat[i]).length === 10 ? d.berangkat[i] + 'T00:00' : waktuSah(d.berangkat[i])) +
    '"></label>' +
    '</div>'
  );
}
function jalurPageClick(e) {
  var d = jalurDraft;
  if (!d) return;
  var b = e.target.closest('[data-jl-warna]');
  if (b) {
    d.warna = b.dataset.jlWarna;
    renderJalurIsian();
    return;
  }
  b = e.target.closest('[data-jl-model]');
  if (b) {
    var pm = b.dataset.jlModel.split('|');
    d.kendaraan[+pm[0]] = pm[1];
    renderJalurIsian();
    return;
  }
  b = e.target.closest('[data-jl-tambah]');
  if (b) {
    var id = b.dataset.jlTambah;
    if (d.titik[d.titik.length - 1] === id) {
      toast('Marker ini sudah jadi titik terakhir');
      return;
    }
    if (d.titik.length >= 50) {
      toast('Maksimal 50 titik');
      return;
    }
    d.kendaraan[d.titik.length] = '';
    d.berangkat[d.titik.length] = '';
    d.titik.push(id);
    renderJalurIsian();
    return;
  }
  b = e.target.closest('[data-jl-naik]') || e.target.closest('[data-jl-turun]');
  if (b) {
    var i = +(b.dataset.jlNaik != null ? b.dataset.jlNaik : b.dataset.jlTurun),
      j = b.dataset.jlNaik != null ? i - 1 : i + 1;
    if (j < 0 || j >= d.titik.length) return;
    var t = d.titik[i];
    d.titik[i] = d.titik[j];
    d.titik[j] = t;
    t = d.kendaraan[i];
    d.kendaraan[i] = d.kendaraan[j];
    d.kendaraan[j] = t;
    t = d.berangkat[i];
    d.berangkat[i] = d.berangkat[j];
    d.berangkat[j] = t;
    renderJalurIsian();
    return;
  }
  b = e.target.closest('[data-jl-buang]');
  if (b) {
    var ib = +b.dataset.jlBuang;
    askConfirm({
      title: 'Keluarkan titik?',
      text: 'Titik ' + (ib + 1) + ' dikeluarkan dari perjalanan ini (berlaku setelah Simpan). Markernya sendiri tidak terhapus.',
      ok: 'Keluarkan',
      action: function () {
        back(1, function () {
          var d2 = jalurDraft;
          if (!d2) return;
          d2.titik.splice(ib, 1);
          d2.kendaraan.splice(ib, 1);
          d2.berangkat.splice(ib, 1);
          renderJalurIsian();
        });
      }
    });
    return;
  }
  if (e.target.closest('[data-jl="simpan"]')) {
    var nama = $('#jlNama').value.trim().slice(0, 60);
    if (!nama) {
      toast('Nama perjalanan wajib diisi');
      $('#jlNama').focus();
      return;
    }
    if (d.titik.length < 2) {
      toast('Perjalanan butuh minimal 2 titik');
      return;
    }
    var now = Date.now(),
      j2,
      titikD = jalurTitik(d);
    var kend = d.titik.map(function (id, i) {
      return i === 0 ? '' : kendaraanSah(d.kendaraan[i]) || kendaraanAuto(titikD[i - 1], titikD[i]);
    });
    var pergi = d.titik.map(function (id, i) {
      return i === 0 ? '' : waktuSah(d.berangkat[i]);
    });
    if (d.id) {
      j2 = jalurCari(d.id);
      if (!j2) return;
      j2.nama = nama;
      j2.warna = mkWarnaSah(d.warna);
      j2.titik = d.titik.slice();
      j2.kendaraan = kend;
      j2.berangkat = pergi;
      j2.diubah = now;
    } else {
      j2 = {
        id: uid(),
        nama: nama,
        warna: mkWarnaSah(d.warna),
        titik: d.titik.slice(),
        kendaraan: kend,
        berangkat: pergi,
        dibuat: now,
        diubah: now
      };
      petaJalur.push(j2);
    }
    jalurDraft = null;
    jalurSimpanSemua();
    back(1, function () {
      renderJalurDaftar();
      if (petaMode === 'perjalanan') terapkanLayer();
      toast('Perjalanan disimpan');
    });
    return;
  }
  if (e.target.closest('[data-jl="hapus"]')) {
    var hapusId = d.id,
      namaLama = (jalurCari(hapusId) || d).nama;
    askConfirm({
      title: 'Hapus perjalanan?',
      text: 'Perjalanan "' + namaLama + '" akan dihapus permanen. Marker-markernya tetap ada.',
      ok: 'Hapus',
      action: function () {
        hentikanPutar(true);
        petaJalur = petaJalur.filter(function (x) {
          return x.id !== hapusId;
        });
        jalurDraft = null;
        jalurSimpanSemua();
        back(2, function () {
          renderJalurDaftar();
          terapkanLayer();
          toast('Perjalanan dihapus');
        });
      }
    });
  }
}
PAGES.jalur = buildJalurPage;
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'jalur') jalurPageClick(e);
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'jalur' && jalurDraft && e.target.id === 'jlNama') jalurDraft.nama = e.target.value;
});
$('#subBody').addEventListener('change', function (e) {
  var sel = e.target.closest && e.target.closest('[data-jl-kend]');
  var wk = e.target.closest && e.target.closest('[data-jl-waktu]');
  if (pageKind === 'jalur' && jalurDraft && wk) {
    jalurDraft.berangkat[+wk.dataset.jlWaktu] = waktuSah(wk.value);
    return;
  }
  if (pageKind !== 'jalur' || !jalurDraft || !sel) return;
  jalurDraft.kendaraan[+sel.dataset.jlKend] = kendaraanSah(sel.value); /* jenis baru → model pertama */
  renderJalurIsian();
});

renderJalur();
