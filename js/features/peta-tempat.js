/* Stivora — Peta Tahap 3: My Places
   - Mode "My Places": nama provinsi/kota disembunyikan, kamera menampilkan semua marker.
   - Layer: nyala/mati nama provinsi & kota, marker, dan tiap jenis ikon marker.
   - Ketuk pin → kartu info di peta → "Detail" → halaman tempat (catatan, tanggal, media, arah). */
'use strict';

var K_MODE_PETA = 'stivora.peta.mode';
var K_LAYER = 'stivora.peta.layer';
var petaMode = { tempat: 1, peristiwa: 1, perjalanan: 1 }[store.raw(K_MODE_PETA)] ? store.raw(K_MODE_PETA) : 'eksplore';
var petaLayer = store.get(K_LAYER, null);
if (!petaLayer || typeof petaLayer !== 'object') petaLayer = {};
if (typeof petaLayer.wilayah !== 'boolean') petaLayer.wilayah = true;
if (typeof petaLayer.marker !== 'boolean') petaLayer.marker = true;
if (!petaLayer.sembunyi || typeof petaLayer.sembunyi !== 'object') petaLayer.sembunyi = {};
var tempatId = null; // marker yang sedang ditampilkan di kartu info / halaman tempat

/* ---------- Mode ---------- */
function namaMode(k) {
  for (var i = 0; i < MODE_PETA.length; i++) if (MODE_PETA[i].k === k) return MODE_PETA[i].nama;
  return 'Eksplore';
}
function renderNamaMode() {
  var el = $('#petaModeNama');
  if (el) el.textContent = namaMode(petaMode);
}
function pilihModePeta(k) {
  if (typeof hentikanPutar === 'function') hentikanPutar(true);
  var lama = petaMode;
  petaMode = { tempat: 1, peristiwa: 1, perjalanan: 1 }[k] ? k : 'eksplore';
  store.raw(K_MODE_PETA, petaMode);
  renderNamaMode();
  if (lama !== petaMode) toast('Mode ' + namaMode(petaMode)); /* nama mode tidak lagi tertulis di peta */
  tutupInfoTempat();
  terapkanLayer();
  if (petaMode === 'tempat') lihatSemuaTempat();
  if (petaMode === 'peristiwa') mulaiPeristiwa();
  if (petaMode === 'perjalanan') mulaiJalur();
}
/* Kamera menampilkan semua marker yang tampil */
function lihatSemuaTempat() {
  var daftar = petaMarker.filter(markerTampil);
  if (!daftar.length) {
    toast(petaMarker.length ? 'Semua marker sedang disembunyikan lewat Layer' : 'Belum ada marker. Tambah lewat ikon pensil.');
    return;
  }
  if (!peta) return;
  if (daftar.length === 1) {
    fokusMarker(daftar[0].id);
    return;
  }
  var w = 180,
    s = 90,
    e = -180,
    n = -90;
  daftar.forEach(function (m) {
    w = Math.min(w, m.lon);
    e = Math.max(e, m.lon);
    s = Math.min(s, m.lat);
    n = Math.max(n, m.lat);
  });
  var padLon = Math.max(0.05, (e - w) * 0.25),
    padLat = Math.max(0.05, (n - s) * 0.25);
  peta.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      Math.max(-180, w - padLon),
      Math.max(-90, s - padLat),
      Math.min(180, e + padLon),
      Math.min(90, n + padLat)
    ),
    duration: 2.2
  });
}

/* ---------- Layer ---------- */
function markerTampil(m) {
  if (!petaLayer.marker || petaLayer.sembunyi[mkJenis(m)]) return false;
  if (petaMode === 'peristiwa') return typeof peristiwaCocok === 'function' ? peristiwaCocok(m) : !!m.tanggal; /* hanya marker bertanggal */
  if (petaMode === 'perjalanan') return typeof jalurPunya === 'function' && jalurPunya(m.id); /* hanya titik perjalanan terpilih */
  return true;
}
function simpanLayer() {
  store.set(K_LAYER, petaLayer);
}
function terapkanLayer() {
  if (petaLabelWilayah) {
    var tampil = petaMode === 'eksplore' && petaLayer.wilayah;
    petaLabelWilayah.forEach(function (c) {
      c.show = tampil;
    });
  }
  if (typeof gambarMarker === 'function') gambarMarker();
  if (typeof gambarArea === 'function') gambarArea();
  if (tempatId && !markerTampilId(tempatId)) tutupInfoTempat();
  if (typeof areaInfoId !== 'undefined' && areaInfoId && !(areaTampil() && areaCari(areaInfoId))) tutupInfoTempat();
  if (peta) peta.scene.requestRender();
}
function markerTampilId(id) {
  var m = mkCari(id);
  return !!(m && markerTampil(m));
}
function tutupLayerMenu() {
  var m = $('#petaLayerMenu');
  if (m) m.hidden = true;
}
function bukaLayerMenu() {
  var menu = $('#petaLayerMenu');
  if (!menu.hidden) {
    menu.hidden = true;
    return;
  }
  renderLayerMenu();
  menu.hidden = false;
}
function barisLayer(kunci, nama, nyala, ikon) {
  return (
    '<button type="button" class="peta-layer-opsi" role="menuitemcheckbox" aria-checked="' +
    nyala +
    '" data-layer="' +
    kunci +
    '">' +
    (ikon || '') +
    '<span>' +
    nama +
    '</span><i class="peta-saklar' +
    (nyala ? ' on' : '') +
    '"></i></button>'
  );
}
function renderLayerMenu() {
  var jumlah = {};
  petaMarker.forEach(function (m) {
    var k = mkJenis(m);
    jumlah[k] = (jumlah[k] || 0) + 1;
  });
  var jp = jenisPeta();
  var html =
    '<b class="peta-layer-judul">Jenis peta</b><div class="pj-daftar">' +
    JENIS_PETA.map(function (x) {
      return (
        '<button type="button" class="pj-opsi' +
        (x.k === jp ? ' aktif' : '') +
        '" data-jenis-peta="' +
        x.k +
        '" aria-pressed="' +
        (x.k === jp) +
        '">' +
        '<span class="pj-gambar pj-' +
        x.k +
        '"></span><span>' +
        x.nama +
        '</span></button>'
      );
    }).join('') +
    '</div><b class="peta-layer-judul">Kualitas gambar</b><div class="pk-daftar" role="group" aria-label="Kualitas gambar peta">' +
    KUALITAS_PETA.map(function (x) {
      var on = x.k === kualitasPeta();
      return '<button type="button" class="pk-opsi' + (on ? ' aktif' : '') + '" data-kualitas="' + x.k + '" aria-pressed="' + on + '">' + x.nama + '</button>';
    }).join('') +
    '</div><small class="peta-layer-sub pk-ket">' +
    (kualitasPeta() === 'tajam'
      ? 'Paling jernih, paling berat untuk HP.'
      : kualitasPeta() === 'seimbang'
        ? 'Jernih dan lebih ringan.'
        : 'Paling ringan dan hemat baterai.') +
    ' Disimpan di HP ini saja.</small>' +
    infoCitraHtml() +
    '<b class="peta-layer-judul">Tampilkan</b>';
  if (jp !== 'default' && adaToken() && !googleGagal.label) html += barisLayer('label', 'Label jalan & tempat (Google)', labelPeta());
  if (petaMode === 'eksplore') html += barisLayer('wilayah', 'Nama provinsi & kota', petaLayer.wilayah);
  html += barisLayer('marker', 'Marker saya', petaLayer.marker);
  if (typeof petaArea !== 'undefined' && petaArea.length && petaMode !== 'peristiwa')
    html += barisLayer('area', 'Area saya', petaLayer.area !== false);
  var jenis = MK_IKON.concat([MK_KUSTOM]).filter(function (x) {
    return jumlah[x.k];
  });
  if (petaLayer.marker && jenis.length > 1) {
    html +=
      '<small class="peta-layer-sub">Jenis marker</small>' +
      jenis
        .map(function (x) {
          return barisLayer('ikon:' + x.k, x.nama, !petaLayer.sembunyi[x.k], '<svg viewBox="0 0 24 24">' + x.svg + '</svg>');
        })
        .join('');
  }
  $('#petaLayerMenu').innerHTML = html;
}
/* Keterangan kecil: sumber foto & detail yang sedang tampil (5.70.0) */
function infoCitraHtml() {
  var o = infoCitra();
  if (!o.sumber) return '';
  var t =
    'Sumber: ' +
    o.sumber +
    (o.label ? ' + label' : '') +
    (o.tampil
      ? o.maks && o.tampil > o.maks
        ? ' · foto sumber hanya sampai level ' + o.maks + ', di sini diperbesar (buram)'
        : ' · detail ' + o.tampil + (o.maks ? ' dari ' + o.maks : '')
      : '') +
    (o.tinggi > 0 ? ' · tinggi kamera ' + (o.tinggi >= 10000 ? Math.round(o.tinggi / 1000) + ' km' : o.tinggi + ' m') : '');
  return '<small class="peta-layer-sub pk-ket pk-sumber">' + esc(t) + '</small>';
}
function layerMenuClick(e) {
  var q = e.target.closest('[data-kualitas]');
  if (q) {
    gantiKualitas(q.dataset.kualitas);
    renderLayerMenu();
    return;
  }
  var j = e.target.closest('[data-jenis-peta]');
  if (j) {
    gantiJenisPeta(j.dataset.jenisPeta);
    renderLayerMenu();
    return;
  }
  var b = e.target.closest('[data-layer]');
  if (!b) return;
  var k = b.dataset.layer;
  if (k === 'label') {
    gantiLabelPeta(!labelPeta());
    renderLayerMenu();
    return;
  }
  if (k === 'wilayah') petaLayer.wilayah = !petaLayer.wilayah;
  else if (k === 'marker') petaLayer.marker = !petaLayer.marker;
  else if (k === 'area') petaLayer.area = petaLayer.area === false;
  else if (k.indexOf('ikon:') === 0) {
    var ik = k.slice(5);
    if (petaLayer.sembunyi[ik]) delete petaLayer.sembunyi[ik];
    else petaLayer.sembunyi[ik] = true;
  }
  simpanLayer();
  terapkanLayer();
  renderLayerMenu();
}

/* ---------- Kartu info (di dalam peta) ---------- */
function tanggalPanjang(t) {
  var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || '');
  if (!p) return '';
  return new Date(+p[1], +p[2] - 1, +p[3]).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function bukaInfoTempat(id, diam) {
  if (typeof areaInfoId !== 'undefined') areaInfoId = null;
  if (petaMode === 'peristiwa') {
    if (!diam) pilihPeristiwaId(id);
    return;
  } /* mode peristiwa: pakai garis waktu */
  if (petaMode === 'perjalanan') {
    if (!diam && mkCari(id)) {
      tempatId = id;
      openLayer('page:tempat');
    }
    return;
  } /* mode Journey: langsung detail */
  var m = mkCari(id);
  if (!m) return;
  tempatId = id;
  renderModeMenu(false);
  tutupLayerMenu();
  bukaCari(false);
  var n = mkMedia(id).length,
    bag = [];
  if (m.tanggal) bag.push(MK_IKON_TGL + mkTanggalTeks(m.tanggal));
  if (n) bag.push(MK_IKON_MEDIA + n + ' media');
  var box = $('#petaInfo');
  box.innerHTML =
    mkLencana(m) +
    '<span class="peta-info-teks"><b translate="no">' +
    esc(m.nama) +
    '</b>' +
    (bag.length || m.catatan
      ? '<small>' +
        bag
          .map(function (x) {
            return '<span>' + x + '</span>';
          })
          .join('') +
        (m.catatan ? '<span aria-label="Ada catatan" title="Ada catatan">' + MK_IKON_CATATAN + '</span>' : '') +
        '</small>'
      : '<small><span>' + mkKoordinat(m) + '</span></small>') +
    '</span>' +
    '<button type="button" class="peta-info-detail" id="petaInfoDetail">Detail</button>' +
    '<button type="button" class="peta-info-tutup" id="petaInfoTutup" aria-label="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  box.hidden = false;
  $('#petaBingkai').classList.add('info-buka');
  if (!diam) fokusMarker(id);
}
function tutupInfoTempat() {
  tempatId = null;
  var box = $('#petaInfo');
  if (box) box.hidden = true;
  $('#petaBingkai').classList.remove('info-buka');
}

/* ---------- Halaman tempat (detail) ---------- */
function buildTempatPage() {
  var m = tempatId && mkCari(tempatId);
  if (!m) return false;
  var media = mkMedia(m.id);
  $('#subTitle').textContent = 'Detail tempat';
  var arah = 'https://www.google.com/maps/dir/?api=1&destination=' + m.lat + ',' + m.lon;
  $('#subBody').innerHTML =
    '<div class="tp-kepala">' +
    mkLencana(m, true) +
    '<span class="mk-teks"><b translate="no">' +
    esc(m.nama) +
    '</b><small>' +
    mkKoordinat(m) +
    '</small></span></div>' +
    (m.tanggal ? '<div class="tp-baris">' + MK_IKON_TGL + '<span>' + tanggalPanjang(m.tanggal) + '</span></div>' : '') +
    (m.catatan ? '<h3 class="group-title sub-group">Catatan</h3><p class="tp-catatan" translate="no">' + esc(m.catatan) + '</p>' : '') +
    (media.length
      ? '<h3 class="group-title sub-group">Media <span class="mk-jumlah">' +
        media.length +
        '</span></h3><div class="mk-media">' +
        media
          .map(function (im) {
            return '<button type="button" class="mk-m" data-tp-media="' + esc(im.id) + '">' + thumbHTML(im) + '</button>';
          })
          .join('') +
        '</div>'
      : '') +
    (!m.catatan && !media.length
      ? '<p class="sub-note tp-kosong">Belum ada catatan atau media. Tambahkan lewat ikon pensil di peta.</p>'
      : '') +
    '<div class="tp-aksi">' +
    '<button type="button" class="btn primary" data-tp="lihat"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>Lihat di peta</button>' +
    '<a class="btn tp-arah" href="' +
    arah +
    '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M3 11.5l18-7.5-7.5 18-2.6-7.9z"/></svg>Petunjuk arah</a>' +
    '</div>';
  return true;
}
function tempatPageClick(e) {
  var b = e.target.closest('[data-tp-media]');
  if (b) {
    if (typeof pnSetDaftar === 'function')
      pnSetDaftar(
        Array.prototype.map.call(b.parentNode.querySelectorAll('[data-tp-media]'), function (x) {
          return x.dataset.tpMedia;
        })
      );
    openLayer('img:' + b.dataset.tpMedia);
    return;
  }
  if (e.target.closest('[data-tp="lihat"]')) {
    var id = tempatId;
    back(1, function () {
      fokusMarker(id);
    });
  }
}
PAGES.tempat = buildTempatPage;
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'tempat') tempatPageClick(e);
});
/* Kembali dari penampil (mis. media dihapus) → segarkan halaman tempat */
window.addEventListener('popstate', function () {
  if (pageKind === 'tempat' && opened.page === 'page:tempat') buildTempatPage();
});

/* Data marker berubah (edit/hapus/sinkron) → segarkan kartu info */
var gambarMarkerAsli = gambarMarker;
gambarMarker = function () {
  gambarMarkerAsli();
  /* kartu info yang terbuka ikut diperbarui (tanpa menggerakkan kamera), atau ditutup jika markernya hilang */
  if (tempatId) {
    if (markerTampilId(tempatId)) bukaInfoTempat(tempatId, true);
    else tutupInfoTempat();
  }
  if (typeof renderPeristiwa === 'function') renderPeristiwa();
  if (typeof renderJalur === 'function') renderJalur();
};

renderNamaMode();
