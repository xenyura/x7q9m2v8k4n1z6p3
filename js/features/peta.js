/* Stivora — Peta 3D di halaman Impian (CesiumJS) — Tahap 1: Eksplore */
'use strict';

/* =========================================================
   PETA (CesiumJS)
   - Cesium dimuat hanya saat halaman Impian dibuka, versi dikunci (1.146). Urutan sumber:
     jsDelivr → CDN resmi cesium.com → unpkg (jika satu gagal, coba berikutnya).
   - Cesium 1.139+ menjalankan eval saat dimuat (CesiumGS/cesium#13412), jadi CSP di index.html memuat 'unsafe-eval'.
     Tanpa itu Cesium berhenti di tengah dan peta tampil "Cesium tidak lengkap".
   - Jika peta gagal, alasannya tampil kecil di bawah "Peta gagal dimuat" dan tercatat di Log error.
   - Citra:
       • CESIUM_ION_TOKEN kosong → satelit Sentinel-2 cloudless (EOX), tanpa relief 3D.
       • CESIUM_ION_TOKEN diisi  → satelit Bing (Cesium ion) + relief gunung 3D.
   - Hanya CesiumWidget (tanpa widget bawaan) agar ringan.
   - Hemat baterai: layar hanya digambar ulang saat ada perubahan (requestRenderMode).
   - Data wilayah: js/data/wilayah.js. Pencarian kota lain: Nominatim (OpenStreetMap).
   - Disimpan di perangkat: posisi kamera (stivora.peta.kamera), mode 3D/2D (stivora.peta.dimensi),
     jejak lokasi yang dibuka (stivora.peta.jejak) — untuk mode Journey nanti.
   ========================================================= */
var CESIUM_CDN = [
  'https://cdn.jsdelivr.net/npm/cesium@1.146.0/Build/Cesium/',
  'https://cesium.com/downloads/cesiumjs/releases/1.146/Build/Cesium/',
  'https://unpkg.com/cesium@1.146.0/Build/Cesium/'
];
var EOX_SATELIT = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg';
var EOX_KREDIT =
  'Sentinel-2 cloudless – <a href="https://s2maps.eu" target="_blank" rel="noopener">s2maps.eu</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)';
/* Jenis peta (seperti Google Maps). Tanpa token: Default = OpenStreetMap, Satelit = EOX, Medan = OpenTopoMap.
   Dengan token Cesium ion: Default = Bing jalan, Satelit = Bing udara, Medan = OpenTopoMap (+ relief 3D). */
var K_JENIS = 'stivora.peta.jenis';
var JENIS_PETA = [
  { k: 'default', nama: 'Default' },
  { k: 'satelit', nama: 'Satelit' },
  { k: 'medan', nama: 'Medan' }
];
var OSM_JALAN = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
var OSM_KREDIT = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
var TOPO_MEDAN = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
var TOPO_KREDIT =
  'Peta: © OpenStreetMap contributors, SRTM · Gaya: © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)';
function jenisPeta() {
  var j = store.raw(K_JENIS);
  return j === 'default' || j === 'medan' ? j : 'satelit';
}
function buatCitra(jenis) {
  var C = Cesium,
    token = adaToken();
  if (jenis === 'medan')
    return new C.ImageryLayer(
      new C.UrlTemplateImageryProvider({ url: TOPO_MEDAN, subdomains: ['a', 'b', 'c'], maximumLevel: 17, credit: TOPO_KREDIT })
    );
  if (jenis === 'default')
    return token
      ? awasiIon(C.ImageryLayer.fromWorldImagery({ style: C.IonWorldImageryStyle.ROAD }), 'citra jalan')
      : new C.ImageryLayer(new C.UrlTemplateImageryProvider({ url: OSM_JALAN, maximumLevel: 19, credit: OSM_KREDIT }));
  return token
    ? awasiIon(C.ImageryLayer.fromWorldImagery({ style: C.IonWorldImageryStyle.AERIAL }), 'citra satelit')
    : new C.ImageryLayer(new C.UrlTemplateImageryProvider({ url: EOX_SATELIT, maximumLevel: 14, credit: EOX_KREDIT }));
}
/* Seberapa dekat kamera boleh mendekat (meter dari permukaan), sesuai ketajaman citra:
   token (Bing satelit/jalan) sampai tingkat atap rumah; peta gratis dibatasi agar tidak sekadar buram. */
function batasZoom() {
  if (!peta) return;
  var j = jenisPeta(),
    m = 300;
  if (adaToken() && j !== 'medan') m = 20;
  else if (j === 'default') m = 60; // OpenStreetMap tajam sampai skala jalan
  peta.scene.screenSpaceCameraController.minimumZoomDistance = m;
}
function gantiJenisPeta(jenis) {
  store.raw(K_JENIS, jenis);
  if (!peta) return;
  peta.imageryLayers.removeAll();
  peta.imageryLayers.add(buatCitra(jenis));
  batasZoom();
  peta.scene.requestRender();
}
var NOMINATIM = 'https://nominatim.openstreetmap.org/search';
var K_KAMERA = 'stivora.peta.kamera',
  K_DIMENSI = 'stivora.peta.dimensi',
  K_JEJAK = 'stivora.peta.jejak';
var TINGGI_KOTA = 35000; // meter

var peta = null,
  petaMuat = null,
  petaSedang = false;
var petaLabelWilayah = null;
var petaLokasi = { prov: null }; // posisi daftar jelajah: null = Indonesia, angka = indeks provinsi

/* ---------- Pesan di dalam bingkai ---------- */
function petaStatus(teks, tombol, alasan) {
  var s = $('#petaStatus');
  if (!teks) {
    s.hidden = true;
    return;
  }
  s.hidden = false;
  s.innerHTML =
    '<span>' +
    esc(teks) +
    '</span>' +
    (alasan ? '<small class="peta-alasan" translate="no">' + esc(String(alasan).slice(0, 160)) + '</small>' : '') +
    (tombol ? '<button type="button" class="peta-coba" id="petaCoba">' + esc(tombol) + '</button>' : '');
}

/* ---------- Muat Cesium (sekali) ---------- */
function muatSkrip(base) {
  return new Promise(function (res, rej) {
    window.CESIUM_BASE_URL = base;
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'Widgets/widgets.css';
    css.crossOrigin = 'anonymous';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = base + 'Cesium.js';
    js.crossOrigin = 'anonymous';
    /* Tangkap error yang terjadi saat Cesium.js dijalankan, agar alasannya bisa ditampilkan */
    var errSkrip = '';
    var tangkap = function (ev) {
      if (String(ev.filename || '').indexOf(base) === 0 && !errSkrip) errSkrip = String(ev.message || '').slice(0, 120);
    };
    window.addEventListener('error', tangkap);
    var selesai = function () {
      window.removeEventListener('error', tangkap);
    };
    js.onload = function () {
      selesai();
      window.Cesium && Cesium.CesiumWidget ? res() : rej(new Error('Cesium tidak lengkap' + (errSkrip ? ' (' + errSkrip + ')' : '')));
    };
    js.onerror = function () {
      selesai();
      css.remove();
      js.remove();
      var e = new Error('unduh');
      e.host = base.split('/')[2];
      rej(e);
    };
    document.head.appendChild(js);
  });
}
function muatCesium() {
  if (window.Cesium && Cesium.CesiumWidget) return Promise.resolve();
  if (petaMuat) return petaMuat;
  var host = [],
    lain = [];
  var catat = function (e) {
    if (!e) return;
    if (e.host) {
      if (host.indexOf(e.host) < 0) host.push(e.host);
    } else if (lain.indexOf(e.message) < 0) lain.push(e.message);
  };
  petaMuat = CESIUM_CDN.reduce(function (p, base) {
    return p.catch(function (e) {
      catat(e);
      return muatSkrip(base);
    });
  }, Promise.reject()).catch(function (e) {
    petaMuat = null;
    catat(e);
    throw new Error(
      (host.length ? 'Cesium tidak bisa diunduh dari: ' + host.join(', ') : '') +
        (lain.length ? (host.length ? ' · ' : '') + lain.join(' · ') : '')
    );
  });
  return petaMuat;
}

/* ---------- Buat peta ---------- */
function adaToken() {
  return !tokenDitolak && typeof CESIUM_ION_TOKEN === 'string' && CESIUM_ION_TOKEN.length > 20;
}

/* ---------- Token Cesium ion ditolak / gagal → kembali ke peta gratis (bukan layar hitam) ----------
   Penyebab umum: token salah/terhapus, alamat situs belum ada di "Allowed URLs" token, atau kuota habis. */
var tokenDitolak = false;
function teksErrorIon(e) {
  if (!e) return 'tidak diketahui';
  var r = e.response,
    bagian = [];
  if (e.statusCode) bagian.push('HTTP ' + e.statusCode);
  if (r) {
    try {
      bagian.push(typeof r === 'string' ? r : r.message || JSON.stringify(r));
    } catch (x) {}
  }
  if (!bagian.length) bagian.push(e.message || String(e));
  return bagian.join(' · ').slice(0, 160);
}
function awasiIon(layer, nama) {
  if (layer && layer.errorEvent)
    layer.errorEvent.addEventListener(function (e) {
      tokenGagal(nama, e);
    });
  return layer;
}
function tokenGagal(sumber, e) {
  var alasan = teksErrorIon(e);
  if (window.catatGalat) catatGalat({ pesan: 'Peta: Cesium ion menolak (' + sumber + '): ' + alasan, jenis: 'peta' });
  if (tokenDitolak) return;
  tokenDitolak = true;
  if (!peta) return;
  try {
    peta.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  } catch (x) {}
  try {
    peta.imageryLayers.removeAll();
    peta.imageryLayers.add(buatCitra(jenisPeta()));
    batasZoom();
    peta.scene.requestRender();
  } catch (x) {}
  toast('Token Cesium ditolak (' + alasan + '). Sementara memakai peta gratis. Cek token & Allowed URLs.');
}
function buatPeta() {
  var C = Cesium;
  C.Ion.defaultAccessToken = adaToken() ? CESIUM_ION_TOKEN : '';
  var dua = store.raw(K_DIMENSI) === '2d';
  var opsi = {
    baseLayer: false,
    sceneMode: dua ? C.SceneMode.SCENE2D : C.SceneMode.SCENE3D,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    msaaSamples: 1,
    showRenderLoopErrors: false // jangan tampilkan kotak error Cesium; ditangani di bawah
  };
  if (adaToken()) {
    var relief = C.Terrain.fromWorldTerrain();
    if (relief && relief.errorEvent)
      relief.errorEvent.addEventListener(function (e) {
        tokenGagal('relief 3D', e);
      });
    opsi.terrain = relief;
  }
  var w = new C.CesiumWidget('peta', opsi);
  w.imageryLayers.add(buatCitra(jenisPeta()));
  w.scene.globe.enableLighting = false;
  w.scene.globe.maximumScreenSpaceError = 2.5; // sedikit lebih ringan untuk HP
  w.scene.screenSpaceCameraController.minimumZoomDistance =
    adaToken() && jenisPeta() !== 'medan' ? 20 : jenisPeta() === 'default' ? 60 : 300; /* lihat batasZoom() */
  /* Jika terjadi error saat menggambar: catat di Log error lalu jalankan lagi (maks. 3× per menit agar tidak berulang terus) */
  if (w.scene.renderError) {
    var ulang = [];
    w.scene.renderError.addEventListener(function (scene, err) {
      if (window.catatGalat) catatGalat({ pesan: 'Peta (gambar): ' + ((err && err.message) || err), jenis: 'peta' });
      var kini = Date.now();
      ulang = ulang.filter(function (t) {
        return kini - t < 60000;
      });
      if (ulang.length >= 3) {
        petaStatus('Peta berhenti karena error', 'Coba lagi', err && err.message);
        return;
      }
      ulang.push(kini);
      setTimeout(function () {
        try {
          w.useDefaultRenderLoop = true;
          w.scene.requestRender();
        } catch (x) {}
      }, 0);
    });
  }
  return w;
}

/* ---------- Penanda provinsi & kota (label di peta) ---------- */
function pasangLabel(w) {
  var C = Cesium;
  var titik = w.scene.primitives.add(new C.PointPrimitiveCollection());
  var label = w.scene.primitives.add(new C.LabelCollection());
  petaLabelWilayah = [titik, label]; /* dinyalakan/dimatikan lewat layer & mode (peta-tempat.js) */
  var jauh = new C.DistanceDisplayCondition(1500000, 1.0e8); // provinsi: terlihat dari jauh
  var dekat = new C.DistanceDisplayCondition(0, 2200000); // kota: terlihat saat mendekat
  WILAYAH.forEach(function (p, i) {
    label.add({
      id: { jenis: 'prov', i: i },
      text: p.nama,
      position: C.Cartesian3.fromDegrees(p.pusat[0], p.pusat[1]),
      font: '600 13px system-ui, sans-serif',
      fillColor: C.Color.WHITE,
      outlineColor: C.Color.fromCssColorString('#1b1830'),
      outlineWidth: 3,
      style: C.LabelStyle.FILL_AND_OUTLINE,
      distanceDisplayCondition: jauh,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new C.NearFarScalar(2.0e6, 1.0, 1.2e7, 0.7)
    });
    p.kota.forEach(function (k, j) {
      var pos = C.Cartesian3.fromDegrees(k[1], k[2]);
      var id = { jenis: 'kota', i: i, j: j };
      titik.add({
        id: id,
        position: pos,
        pixelSize: j === 0 ? 9 : 7,
        color: C.Color.fromCssColorString(j === 0 ? '#ffd166' : '#ffffff'),
        outlineColor: C.Color.fromCssColorString('#1b1830'),
        outlineWidth: 2,
        distanceDisplayCondition: dekat,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      });
      label.add({
        id: id,
        text: k[0],
        position: pos,
        font: '600 12px system-ui, sans-serif',
        fillColor: C.Color.WHITE,
        outlineColor: C.Color.fromCssColorString('#1b1830'),
        outlineWidth: 3,
        style: C.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: C.VerticalOrigin.BOTTOM,
        pixelOffset: new C.Cartesian2(0, -9),
        distanceDisplayCondition: dekat,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      });
    });
  });
  w.scene.requestRender();
}

/* ---------- Kamera ---------- */
function kotakIndonesia() {
  return Cesium.Rectangle.fromDegrees(INDONESIA_KOTAK[0], INDONESIA_KOTAK[1], INDONESIA_KOTAK[2], INDONESIA_KOTAK[3]);
}
function terbang(bujur, lintang, tinggiM, nama, durasi) {
  if (!peta) return;
  var C = Cesium;
  var tiga = peta.scene.mode === C.SceneMode.SCENE3D;
  var target = C.Cartesian3.fromDegrees(bujur, lintang);
  peta.camera.flyToBoundingSphere(new C.BoundingSphere(target, 1), {
    offset: new C.HeadingPitchRange(0, C.Math.toRadians(tiga ? (tinggiM < 100000 ? -45 : -70) : -90), tinggiM),
    duration: durasi == null ? 2.6 : durasi
  });
  if (nama) catatJejak(nama, bujur, lintang);
}
function keIndonesia(durasi) {
  if (!peta) return;
  peta.camera.flyTo({ destination: kotakIndonesia(), duration: durasi == null ? 2 : durasi });
}
/* Dipanggil Cesium di tengah proses menggambar (camera.moveEnd): tidak boleh error, kalau error peta berhenti.
   Saat berganti 2D/3D (MORPHING) Cesium mengembalikan heading/pitch = undefined → lewati. */
function simpanKamera() {
  try {
    if (!peta || peta.scene.mode === Cesium.SceneMode.MORPHING) return;
    var c = peta.camera.positionCartographic,
      cam = peta.camera;
    if (!c || !isFinite(c.longitude) || !isFinite(c.latitude) || !isFinite(c.height)) return;
    var bulat = function (x, n) {
      return isFinite(x) ? +(+x).toFixed(n) : 0;
    };
    store.set(K_KAMERA, {
      lon: bulat(Cesium.Math.toDegrees(c.longitude), 5),
      lat: bulat(Cesium.Math.toDegrees(c.latitude), 5),
      h: Math.round(c.height),
      heading: bulat(cam.heading, 4),
      pitch: isFinite(cam.pitch) ? bulat(cam.pitch, 4) : -1.5708
    });
  } catch (e) {
    /* menyimpan posisi kamera tidak penting dibanding peta tetap jalan */
  }
}
function pulihkanKamera() {
  var k = store.get(K_KAMERA, null);
  if (!k || !isFinite(k.lon)) {
    peta.camera.setView({ destination: kotakIndonesia() });
    return;
  }
  peta.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(k.lon, k.lat, k.h),
    orientation: { heading: k.heading || 0, pitch: k.pitch == null ? -Cesium.Math.PI_OVER_TWO : k.pitch, roll: 0 }
  });
}

/* ---------- Jejak (untuk mode Journey nanti) ---------- */
function catatJejak(nama, bujur, lintang) {
  var j = store.get(K_JEJAK, []);
  if (!Array.isArray(j)) j = [];
  if (j[0] && j[0].nama === nama) return;
  j.unshift({ nama: String(nama).slice(0, 120), lon: +(+bujur).toFixed(5), lat: +(+lintang).toFixed(5), t: Date.now() });
  store.set(K_JEJAK, j.slice(0, 200));
}

/* ---------- 3D / 2D ---------- */
function ubahDimensi() {
  if (!peta) return;
  var C = Cesium,
    ke2 = peta.scene.mode === C.SceneMode.SCENE3D;
  if (ke2) peta.scene.morphTo2D(1.2);
  else peta.scene.morphTo3D(1.2);
  store.raw(K_DIMENSI, ke2 ? '2d' : '3d');
  renderTombolDimensi(ke2);
}
function renderTombolDimensi(dua) {
  var b = $('#petaDimensi');
  if (!b) return;
  b.textContent = dua ? '3D' : '2D';
  b.setAttribute('aria-label', dua ? 'Tampilan 3D' : 'Tampilan 2D');
}

/* ---------- Buka peta (dipanggil saat halaman Impian tampil) ---------- */
function bukaPeta() {
  if (peta) {
    try {
      peta.useDefaultRenderLoop = true;
    } catch (x) {}
    petaStatus('');
    peta.resize();
    peta.scene.requestRender();
    return;
  }
  if (petaSedang) return;
  if (!navigator.onLine && !(window.Cesium && Cesium.CesiumWidget)) {
    petaStatus('Peta butuh internet', 'Coba lagi');
    return;
  }
  petaSedang = true;
  petaStatus('Memuat peta…');
  muatCesium()
    .then(function () {
      peta = buatPeta();
      /* Isi tambahan (label, marker, layer) tidak boleh menggagalkan peta: jika satu gagal, peta tetap tampil */
      var aman = function (nama, fn) {
        try {
          fn();
        } catch (x) {
          if (window.catatGalat) catatGalat({ pesan: 'Peta (' + nama + '): ' + ((x && x.message) || x), jenis: 'peta' });
        }
      };
      aman('kamera', pulihkanKamera);
      aman('label wilayah', function () {
        pasangLabel(peta);
      });
      aman('marker', function () {
        if (typeof gambarMarker === 'function') gambarMarker();
      });
      aman('layer', terapkanLayer);
      renderTombolDimensi(store.raw(K_DIMENSI) === '2d');
      peta.camera.moveEnd.addEventListener(simpanKamera);
      /* Ketuk nama provinsi / kota di peta → terbang ke sana */
      var h = new Cesium.ScreenSpaceEventHandler(peta.scene.canvas);
      h.setInputAction(function (gerak) {
        if (areaGambar) {
          tambahSudut(gerak.position);
          return;
        } /* sedang menggambar area */
        if (petaPilih) {
          pilihTitik(gerak.position);
          return;
        } /* mode menaruh / memindah marker */
        var hit = peta.scene.pick(gerak.position);
        var id = hit && hit.id;
        if (!id || !id.jenis) {
          tutupInfoTempat();
          tutupLayerMenu();
          renderModeMenu(false);
          tutupTahunMenu();
          tutupJalurMenu();
          return;
        }
        if (id.jenis === 'marker') bukaInfoTempat(id.mid);
        else if (id.jenis === 'area') {
          if (petaMode !== 'peristiwa') bukaInfoArea(id.aid);
        } else if (id.jenis === 'prov') pilihProvinsi(id.i);
        else pilihKota(id.i, id.j);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      petaStatus('');
    })
    .catch(function (e) {
      if (peta) {
        try {
          peta.destroy();
        } catch (x) {}
        peta = null;
      }
      $('#peta').innerHTML = '';
      petaStatus(
        navigator.onLine
          ? /WebGL/i.test(String(e && e.message))
            ? 'Perangkat ini tidak mendukung peta 3D'
            : 'Peta gagal dimuat'
          : 'Peta butuh internet',
        'Coba lagi',
        navigator.onLine ? (e && e.message) || String(e) : ''
      );
      if (window.catatGalat) catatGalat({ pesan: 'Peta: ' + ((e && e.message) || e), jenis: 'peta' });
    })
    .then(function () {
      petaSedang = false;
    });
}

/* ---------- Jelajah: Indonesia → provinsi → kota (daftar di halaman pensil) ---------- */
function pilihProvinsi(i) {
  var p = WILAYAH[i];
  if (!p) return;
  petaLokasi.prov = i;
  renderJelajah();
  terbang(p.pusat[0], p.pusat[1], p.tinggi * 1000, p.nama);
}
function pilihKota(i, j) {
  var p = WILAYAH[i],
    k = p && p.kota[j];
  if (!k) return;
  petaLokasi.prov = i;
  renderJelajah(j);
  terbang(k[1], k[2], TINGGI_KOTA, k[0] + ', ' + p.nama);
}
/* Indeks daftar diurutkan menurut nama (A–Z); indeks asli tetap dipakai sebagai data-prov / data-kota */
function urutNama(daftar, nama) {
  return daftar
    .map(function (x, i) {
      return i;
    })
    .sort(function (a, b) {
      return nama(daftar[a]).localeCompare(nama(daftar[b]), 'id', { sensitivity: 'base' });
    });
}
function renderJelajah(aktif) {
  var box = $('#petaJelajah');
  if (!box) return;
  var i = petaLokasi.prov,
    p = i == null ? null : WILAYAH[i];
  var jejak =
    '<button type="button" class="jl-remah" data-jl="indonesia">Indonesia</button>' +
    (p ? '<span class="jl-pisah">›</span><b>' + esc(p.nama) + '</b>' : '');
  var isi = p
    ? urutNama(p.kota, function (k) {
        return k[0];
      })
        .map(function (j) {
          var k = p.kota[j];
          return (
            '<button type="button" class="jl-item' +
            (j === aktif ? ' aktif' : '') +
            '" data-kota="' +
            j +
            '">' +
            '<span class="jl-ic">' +
            (j === 0 ? IKON_IBUKOTA : IKON_KOTA) +
            '</span><span>' +
            esc(k[0]) +
            (j === 0 ? '<small>Ibu kota provinsi</small>' : '') +
            '</span></button>'
          );
        })
        .join('')
    : urutNama(WILAYAH, function (w) {
        return w.nama;
      })
        .map(function (n) {
          var w = WILAYAH[n];
          return (
            '<button type="button" class="jl-item" data-prov="' +
            n +
            '"><span class="jl-ic">' +
            IKON_PROV +
            '</span><span>' +
            esc(w.nama) +
            '<small>' +
            w.kota.length +
            ' kota</small></span></button>'
          );
        })
        .join('');
  box.innerHTML =
    '<nav class="jl-jejak kp-jejak" aria-label="Lokasi">' +
    jejak +
    '</nav>' +
    (p ? '<button type="button" class="btn jl-lihat" data-jl="lihat-prov">' + IKON_PROV + 'Lihat provinsi ini di peta</button>' : '') +
    '<div class="jl-daftar">' +
    isi +
    '</div>';
}
var IKON_PROV = '<svg viewBox="0 0 24 24"><path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>';
var IKON_KOTA =
  '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
var IKON_IBUKOTA = '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>';

/* Pilihan di halaman pensil: provinsi → tampilkan kotanya; kota / "lihat di peta" → kembali ke peta lalu terbang */
function keDiPeta(fn) {
  keBingkaiPeta(fn);
}
document.addEventListener('click', function (e) {
  if (!e.target.closest('#petaJelajah')) return;
  var b = e.target.closest('[data-prov]');
  if (b) {
    petaLokasi.prov = +b.dataset.prov;
    renderJelajah();
    return;
  }
  b = e.target.closest('[data-kota]');
  if (b) {
    var i = petaLokasi.prov,
      j = +b.dataset.kota;
    keDiPeta(function () {
      pilihKota(i, j);
    });
    return;
  }
  if (e.target.closest('[data-jl="lihat-prov"]')) {
    var n = petaLokasi.prov;
    keDiPeta(function () {
      pilihProvinsi(n);
    });
    return;
  }
  if (e.target.closest('[data-jl="indonesia"]')) {
    petaLokasi.prov = null;
    renderJelajah();
  }
});

/* ---------- Pencarian (data sendiri dulu, lalu OpenStreetMap) ---------- */
var cariTimer = null,
  cariNomor = 0;
function bukaCari(buka) {
  $('#petaCariBar').hidden = !buka;
  $('#petaHasil').hidden = true;
  if (buka) {
    var i = $('#petaCariInput');
    i.value = '';
    i.focus();
  }
}
function cariLokal(q) {
  q = q.toLowerCase();
  var hasil = [];
  WILAYAH.forEach(function (p, i) {
    if (p.nama.toLowerCase().indexOf(q) >= 0)
      hasil.push({ nama: p.nama, ket: 'Provinsi', lon: p.pusat[0], lat: p.pusat[1], tinggi: p.tinggi * 1000, prov: i });
    p.kota.forEach(function (k, j) {
      if (k[0].toLowerCase().indexOf(q) >= 0)
        hasil.push({ nama: k[0], ket: p.nama, lon: k[1], lat: k[2], tinggi: TINGGI_KOTA, prov: i, kota: j });
    });
  });
  return hasil.slice(0, 6);
}
function tampilHasil(hasil, catatan) {
  var box = $('#petaHasil');
  box.hidden = false;
  box.innerHTML =
    (hasil.length
      ? hasil
          .map(function (h, n) {
            return (
              '<button type="button" class="jl-item" data-hasil="' +
              n +
              '"><span class="jl-ic">' +
              IKON_KOTA +
              '</span><span>' +
              esc(h.nama) +
              '<small>' +
              esc(h.ket) +
              '</small></span></button>'
            );
          })
          .join('')
      : '<p class="sub-note">Tidak ditemukan</p>') + (catatan ? '<p class="sub-note">' + esc(catatan) + '</p>' : '');
  box._hasil = hasil;
}
function jalankanCari(q) {
  q = q.trim();
  if (q.length < 2) {
    $('#petaHasil').hidden = true;
    return;
  }
  var lokal = cariLokal(q);
  tampilHasil(lokal, navigator.onLine ? 'Mencari di OpenStreetMap…' : '');
  if (!navigator.onLine) return;
  var nomor = ++cariNomor;
  fetch(NOMINATIM + '?format=jsonv2&countrycodes=id&limit=6&accept-language=id&q=' + encodeURIComponent(q))
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (nomor !== cariNomor) return;
      var osm = (Array.isArray(data) ? data : [])
        .map(function (d) {
          var bb = (d.boundingbox || []).map(Number); // [selatan, utara, barat, timur]
          var lebar = bb.length === 4 ? Math.max(bb[1] - bb[0], bb[3] - bb[2]) : 0.1;
          return {
            nama: String(d.name || d.display_name || '').slice(0, 80),
            ket: String(d.display_name || '')
              .split(',')
              .slice(1, 3)
              .join(',')
              .trim(),
            lon: +d.lon,
            lat: +d.lat,
            tinggi: Math.min(1500000, Math.max(3000, lebar * 160000))
          };
        })
        .filter(function (h) {
          return isFinite(h.lon) && isFinite(h.lat);
        });
      var nama = {};
      lokal.forEach(function (h) {
        nama[h.nama.toLowerCase()] = 1;
      });
      tampilHasil(
        lokal
          .concat(
            osm.filter(function (h) {
              return !nama[h.nama.toLowerCase()];
            })
          )
          .slice(0, 8),
        'Hasil pencarian © OpenStreetMap'
      );
    })
    .catch(function () {
      if (nomor === cariNomor) tampilHasil(lokal, 'Pencarian online gagal — periksa internet');
    });
}
$('#petaCariInput').addEventListener('input', function (e) {
  clearTimeout(cariTimer);
  var q = e.target.value;
  cariTimer = setTimeout(function () {
    jalankanCari(q);
  }, 700); // jeda: hormati batas OpenStreetMap (1 permintaan/detik)
});
$('#petaCariInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    clearTimeout(cariTimer);
    jalankanCari(e.target.value);
  }
  if (e.key === 'Escape') bukaCari(false);
});
$('#petaHasil').addEventListener('click', function (e) {
  var b = e.target.closest('[data-hasil]');
  if (!b) return;
  var h = $('#petaHasil')._hasil[+b.dataset.hasil];
  if (!h) return;
  bukaCari(false);
  if (h.kota != null) {
    pilihKota(h.prov, h.kota);
    return;
  }
  if (h.prov != null) {
    pilihProvinsi(h.prov);
    return;
  }
  terbang(h.lon, h.lat, h.tinggi, h.nama);
});

/* ---------- Tombol-tombol di atas peta ---------- */
var MODE_PETA = [
  { k: 'eksplore', nama: 'Eksplore' },
  { k: 'tempat', nama: 'My Places' },
  { k: 'peristiwa', nama: 'Events & Stories' },
  { k: 'perjalanan', nama: 'Journey' }
];
var MODE_SIAP = { eksplore: 1, tempat: 1, peristiwa: 1, perjalanan: 1 };
function renderModeMenu(buka) {
  var m = $('#petaModeMenu');
  m.hidden = !buka;
  if (buka) {
    tutupLayerMenu();
    m.innerHTML = MODE_PETA.map(function (x) {
      return (
        '<button type="button" class="peta-mode-opsi' +
        (x.k === petaMode ? ' aktif' : '') +
        '" data-mode-peta="' +
        x.k +
        '">' +
        x.nama +
        (MODE_SIAP[x.k] ? '' : '<small>Segera hadir</small>') +
        '</button>'
      );
    }).join('');
  }
}
$('#petaBingkai').addEventListener('click', function (e) {
  if (e.target.closest('#petaCoba')) {
    bukaPeta();
    return;
  }
  if (e.target.closest('#petaPilihBatal')) {
    selesaiPilih();
    return;
  }
  if (e.target.closest('#petaCariBtn')) {
    bukaCari($('#petaCariBar').hidden);
    return;
  }
  if (e.target.closest('#petaCariTutup')) {
    bukaCari(false);
    return;
  }
  if (e.target.closest('#petaDimensi')) {
    ubahDimensi();
    return;
  }
  if (e.target.closest('#petaAlatPanah')) {
    aturAlatPeta(!$('#petaAlatWadah').classList.contains('terbuka'));
    return;
  }
  if (e.target.closest('#petaLokasi')) {
    lokasiSaya();
    return;
  }
  if (e.target.closest('#petaRumah')) {
    petaLokasi.prov = null;
    renderJelajah();
    keIndonesia();
    return;
  }
  if (e.target.closest('#petaModeBtn')) {
    renderModeMenu($('#petaModeMenu').hidden);
    return;
  }
  var m = e.target.closest('[data-mode-peta]');
  if (m) {
    renderModeMenu(false);
    if (MODE_SIAP[m.dataset.modePeta]) pilihModePeta(m.dataset.modePeta);
    else toast('Mode ' + m.textContent.replace('Segera hadir', '').trim() + ' segera hadir');
    return;
  }
  if (e.target.closest('#petaLayerBtn')) {
    renderModeMenu(false);
    bukaLayerMenu();
    return;
  }
  if (e.target.closest('#petaLayerMenu')) {
    layerMenuClick(e);
    return;
  }
  if (e.target.closest('#petaInfoTutup')) {
    tutupInfoTempat();
    return;
  }
  if (e.target.closest('#petaInfoDetail')) {
    openLayer('page:tempat');
    return;
  }
  if (e.target.closest('#petaWaktu') || e.target.closest('#petaTahunMenu')) {
    peristiwaClick(e);
    return;
  }
  if (e.target.closest('#petaJalan') || e.target.closest('#petaJalurMenu')) {
    jalurClick(e);
    return;
  }
  if (e.target.closest('#petaArea')) {
    areaBannerClick(e);
    return;
  }
  if (e.target.closest('#petaAreaDetail')) {
    openLayer('page:areainfo');
    return;
  }
  if (e.target.closest('#petaEdit')) {
    if (typeof hentikanPutar === 'function') hentikanPutar(true);
    openLayer('page:kelola-peta');
    return;
  }
});

/* ---------- Gerakan di atas peta tidak menggulir halaman ----------
   Sebagian WebView (mis. pratinjau SPCK) tetap menggulir halaman walau touch-action: none — tahan di sini.
   Berlaku untuk seluruh bingkai peta termasuk tombol-tombolnya; menu yang bisa digulir dikecualikan. */
(function () {
  var el = $('#petaBingkai');
  if (!el) return;
  var BISA_GULIR = '.peta-layer-menu, .peta-mode-menu, .peta-tahun-menu, .peta-hasil'; /* menu di atas peta yang isinya bisa digulir */
  function tahan(e) {
    if (e.cancelable && !(e.target.closest && e.target.closest(BISA_GULIR))) e.preventDefault();
  }
  el.addEventListener('touchmove', tahan, { passive: false });
  el.addEventListener('wheel', tahan, { passive: false });
})();

/* ---------- Bantuan singkat di balik ikon "?" (mode pilih titik, gambar area) ---------- */
var bantuanTimer = 0;
function tampilBantuan(tombol, teks) {
  var el = $('#petaBantuan');
  if (!el || !tombol || !teks) return;
  el.textContent = teks;
  el.hidden = false;
  var f = $('#petaBingkai').getBoundingClientRect(),
    r = tombol.getBoundingClientRect();
  el.style.top = r.bottom - f.top + 8 + 'px';
  var w = el.offsetWidth,
    x = r.left - f.left + r.width / 2;
  el.style.left = Math.max(8, Math.min(f.width - w - 8, x - w / 2)) + 'px';
  el.style.setProperty('--panah', x - Math.max(8, Math.min(f.width - w - 8, x - w / 2)) + 'px');
  clearTimeout(bantuanTimer);
  bantuanTimer = setTimeout(tutupBantuan, 5000);
}
function tutupBantuan() {
  clearTimeout(bantuanTimer);
  var el = $('#petaBantuan');
  if (el) el.hidden = true;
}
document.addEventListener(
  'click',
  function (e) {
    var t = e.target.closest('.pb-tanya');
    if (t) {
      var el = $('#petaBantuan');
      if (el && !el.hidden && el.dataset.dari === (t.id || t.dataset.bantuan)) {
        tutupBantuan();
        return;
      }
      var teks = t.id === 'petaPilihTanya' ? teksPilih() : t.dataset.bantuan;
      tampilBantuan(t, teks);
      if (el) el.dataset.dari = t.id || t.dataset.bantuan;
      return;
    }
    if (!e.target.closest('#petaBantuan')) tutupBantuan();
  },
  true
);

/* ---------- Barisan alat di kanan bawah: tersembunyi di balik panah ---------- */
var K_ALAT = 'stivora.peta.alat';
function aturAlatPeta(buka) {
  var w = $('#petaAlatWadah'),
    p = $('#petaAlatPanah');
  w.classList.toggle('terbuka', buka);
  p.setAttribute('aria-expanded', buka ? 'true' : 'false');
  p.setAttribute('aria-label', buka ? 'Sembunyikan alat peta' : 'Tampilkan alat peta');
  store.raw(K_ALAT, buka ? '1' : '0');
  if (!buka && typeof tutupLayerMenu === 'function') tutupLayerMenu();
  if (!buka && typeof renderModeMenu === 'function') renderModeMenu(false);
}
aturAlatPeta(store.raw(K_ALAT) === '1');

/* ---------- Halaman Kelola peta (lewat ikon pensil) ----------
   Hub rapi: aksi cepat di atas, lalu koleksi (marker, perjalanan, area) dan jelajah.
   Tiap koleksi punya halaman sendiri (page:kp-marker, kp-jalur, kp-area, kp-jelajah). */
var KP_IKON = {
  marker:
    '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  jalur:
    '<svg viewBox="0 0 24 24"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8"/></svg>',
  area: '<svg viewBox="0 0 24 24"><path d="M5 7l6-3.5 8 3-1.5 10L9 20.5 4 15z"/><circle cx="5" cy="7" r="1.3"/><circle cx="19" cy="6.5" r="1.3"/><circle cx="9" cy="20.5" r="1.3"/></svg>',
  jelajah: '<svg viewBox="0 0 24 24"><path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
  tambah: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  lihat:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  chev: '<svg class="chev-sm" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>'
};
function kpBarisHub(k, warna, judul, sub, jumlah) {
  return (
    '<button type="button" class="row kp-row" data-kp="' +
    k +
    '"><span class="row-ic kp-ic ' +
    warna +
    '">' +
    KP_IKON[k] +
    '</span>' +
    '<span class="row-text"><b>' +
    judul +
    '</b><small>' +
    sub +
    '</small></span>' +
    '<span class="row-end">' +
    KP_IKON.chev +
    '</span></button>'
  );
}
function buildKelolaPeta() {
  var nM = petaMarker.length,
    nJ = typeof petaJalur !== 'undefined' ? petaJalur.length : 0,
    nA = typeof petaArea !== 'undefined' ? petaArea.length : 0;
  $('#subTitle').textContent = 'Kelola peta';
  $('#subBody').innerHTML =
    '<div class="kp">' +
    '<div class="kp-cepat">' +
    '<button type="button" class="kp-aksi" data-kp-aksi="marker"><span class="kp-ic kp-merah">' +
    KP_IKON.marker +
    '<i>' +
    KP_IKON.tambah +
    '</i></span><b>Tambah marker</b></button>' +
    '<button type="button" class="kp-aksi" data-kp-aksi="jalur"><span class="kp-ic kp-ungu">' +
    KP_IKON.jalur +
    '<i>' +
    KP_IKON.tambah +
    '</i></span><b>Buat perjalanan</b></button>' +
    '<button type="button" class="kp-aksi" data-kp-aksi="area"><span class="kp-ic kp-hijau">' +
    KP_IKON.area +
    '<i>' +
    KP_IKON.tambah +
    '</i></span><b>Buat area</b></button>' +
    '</div>' +
    '<div class="group"><h3 class="group-title">Koleksiku</h3><div class="card list-card">' +
    kpBarisHub('marker', 'kp-merah', 'Marker saya', nM ? nM + ' tempat' : 'Belum ada tempat', nM) +
    kpBarisHub('jalur', 'kp-ungu', 'Perjalanan', nJ ? nJ + ' rute' : 'Hubungkan marker menjadi rute', nJ) +
    kpBarisHub('area', 'kp-hijau', 'Area', nA ? nA + ' wilayah' : 'Tandai wilayah di peta', nA) +
    '</div></div>' +
    '<div class="group"><h3 class="group-title">Jelajahi</h3><div class="card list-card">' +
    kpBarisHub('jelajah', 'kp-biru', 'Jelajahi Indonesia', WILAYAH.length + ' provinsi', 0) +
    '</div></div>' +
    '<p class="sub-note kp-catatan">Semua yang kamu tambahkan di sini tampil di peta halaman Impian.</p>' +
    '</div>';
  return true;
}
PAGES['kelola-peta'] = buildKelolaPeta;
function kpHalaman(judul, idIsi, render) {
  $('#subTitle').textContent = judul;
  $('#subBody').innerHTML = '<div class="kp kp-hal"><div id="' + idIsi + '"></div></div>';
  render();
  return true;
}
PAGES['kp-marker'] = function () {
  return kpHalaman('Marker saya', 'petaMarkerDaftar', renderMarkerDaftar);
};
PAGES['kp-jalur'] = function () {
  return kpHalaman('Perjalanan', 'petaJalurDaftar', renderJalurDaftar);
};
PAGES['kp-area'] = function () {
  return kpHalaman('Area', 'petaAreaDaftar', renderAreaDaftar);
};
PAGES['kp-jelajah'] = function () {
  return kpHalaman('Jelajahi Indonesia', 'petaJelajah', function () {
    renderJelajah();
  });
};

/* Potongan tampilan yang dipakai bersama oleh daftar marker, perjalanan, dan area */
function kpBar(teks, aksi, label) {
  return (
    '<div class="kp-bar"><span>' +
    teks +
    '</span>' +
    (aksi ? '<button type="button" class="kp-tombol" data-kp-aksi="' + aksi + '">' + KP_IKON.tambah + label + '</button>' : '') +
    '</div>'
  );
}
function kpBaris(attrEdit, attrLihat, id, lencana, judul, sub, ekstra) {
  return (
    '<div class="kp-baris"><button type="button" class="kp-utama" ' +
    attrEdit +
    '="' +
    esc(id) +
    '">' +
    lencana +
    '<span class="kp-teks"><b translate="no">' +
    esc(judul) +
    '</b><small>' +
    sub +
    '</small>' +
    (ekstra || '') +
    '</span></button>' +
    '<button type="button" class="kp-lihat" ' +
    attrLihat +
    '="' +
    esc(id) +
    '" aria-label="Lihat di peta" title="Lihat di peta">' +
    KP_IKON.lihat +
    '</button></div>'
  );
}
function kpKosong(ikon, warna, judul, teks, aksi, label) {
  return (
    '<div class="card kp-kosong"><span class="kp-ic besar ' +
    warna +
    '">' +
    KP_IKON[ikon] +
    '</span><b>' +
    judul +
    '</b><p>' +
    teks +
    '</p>' +
    (aksi
      ? '<button type="button" class="btn primary kp-kosong-btn" data-kp-aksi="' + aksi + '">' + KP_IKON.tambah + label + '</button>'
      : '') +
    '</div>'
  );
}
function kpAksi(k) {
  if (k === 'marker') {
    if (!peta) {
      toast('Peta belum siap');
      return;
    }
    mkBuangAntre();
    mkDraft = null;
    keBingkaiPeta(function () {
      mulaiPilih('baru');
    });
  } else if (k === 'jalur') {
    if (petaMarker.length < 2) {
      toast('Buat minimal 2 marker dulu');
      return;
    }
    jalurDraft = { id: null, nama: '', warna: MK_WARNA[0].k, titik: [] };
    openLayer('page:jalur');
  } else if (k === 'area') {
    if (!peta) {
      toast('Peta belum siap');
      return;
    }
    areaDraft = null;
    keBingkaiPeta(function () {
      if (petaMode === 'peristiwa') pilihModePeta('tempat');
      mulaiGambarArea();
    });
  }
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-kp-aksi]');
  if (b && b.closest('#subBody')) {
    kpAksi(b.dataset.kpAksi);
    return;
  }
  b = e.target.closest('[data-kp]');
  if (b && pageKind === 'kelola-peta' && b.closest('#subBody')) openLayer('page:kp-' + b.dataset.kp);
});

window.addEventListener('online', function () {
  if (!peta && cur.tab === 'impian') bukaPeta();
});
