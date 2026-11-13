/* Stivora — Peta Tahap 5b: Area (wilayah yang digambar sendiri)
   Area = poligon dari titik-titik sudut yang diketuk di peta + nama, warna, catatan.
   Data: store (IndexedDB) 'stivora.peta.area', tersinkron ke Firestore users/{uid}/area (sync.js) dan ikut file cadangan.
   Tampil di mode Eksplore, My Places, dan Journey; bisa dimatikan lewat Layer ("Area saya"). */
'use strict';

var K_AREA = 'stivora.peta.area';
var petaArea = store.get(K_AREA, []);
if (!Array.isArray(petaArea)) petaArea = [];
var areaDraft = null; // isian halaman area
var areaGambar = null; // sedang menggambar: { titik: [[lon,lat],...] }
var areaInfoId = null; // area yang tampil di kartu info / halaman lihat
var areaPrimitif = []; // primitive poligon di peta
var areaGaris = null; // PolylineCollection: tepi area + garis sementara
var areaTitikSementara = null;
var AREA_MAKS_TITIK = 100;

function areaCari(id) {
  for (var i = 0; i < petaArea.length; i++) if (petaArea[i].id === id) return petaArea[i];
  return null;
}
function areaSimpanSemua() {
  store.set(K_AREA, petaArea);
  schedulePush();
}
function areaTampil() {
  return petaLayer.area !== false && petaMode !== 'peristiwa';
}

/* ---------- Luas & keliling (cukup akurat untuk wilayah kecil–sedang) ---------- */
function areaLuasM2(titik) {
  if (!titik || titik.length < 3) return 0;
  var R = 6371008.8,
    r = Math.PI / 180,
    lat0 = 0;
  titik.forEach(function (p) {
    lat0 += p[1];
  });
  lat0 = (lat0 / titik.length) * r;
  var xy = titik.map(function (p) {
    return [R * p[0] * r * Math.cos(lat0), R * p[1] * r];
  });
  var s = 0;
  for (var i = 0; i < xy.length; i++) {
    var a = xy[i],
      b = xy[(i + 1) % xy.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}
function areaKelilingKm(titik) {
  var t = 0;
  for (var i = 0; i < titik.length; i++) {
    var a = titik[i],
      b = titik[(i + 1) % titik.length];
    t += jarakKm({ lon: a[0], lat: a[1] }, { lon: b[0], lat: b[1] });
  }
  return titik.length < 2 ? 0 : t;
}
function teksLuas(m2) {
  var f = function (n, d) {
    return n.toLocaleString('id-ID', { maximumFractionDigits: d });
  };
  if (m2 < 10000) return f(Math.round(m2), 0) + ' m²';
  if (m2 < 1e6) return f(m2 / 10000, 2) + ' ha';
  return f(m2 / 1e6, 2) + ' km²';
}

/* ---------- Gambar area di peta ---------- */
function gambarArea() {
  if (!peta || !window.Cesium) return;
  var C = Cesium,
    sc = peta.scene;
  areaPrimitif.forEach(function (p) {
    sc.primitives.remove(p);
  });
  areaPrimitif = [];
  if (!areaGaris) areaGaris = sc.primitives.add(new C.PolylineCollection());
  areaGaris.removeAll();
  if (areaTampil()) {
    var kelas = adaToken() ? C.GroundPrimitive : C.Primitive; // dengan terrain: menempel di permukaan
    petaArea.forEach(function (a) {
      if (!a.titik || a.titik.length < 3) return;
      var datar = [];
      a.titik.forEach(function (p) {
        datar.push(p[0], p[1]);
      });
      var warna = C.Color.fromCssColorString(mkWarnaSah(a.warna));
      try {
        areaPrimitif.push(
          sc.primitives.add(
            new kelas({
              geometryInstances: new C.GeometryInstance({
                id: { jenis: 'area', aid: a.id },
                geometry: new C.PolygonGeometry({ polygonHierarchy: new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(datar)) }),
                attributes: { color: C.ColorGeometryInstanceAttribute.fromColor(warna.withAlpha(0.28)) }
              }),
              appearance: new C.PerInstanceColorAppearance({ flat: true, translucent: true }),
              asynchronous: false
            })
          )
        );
      } catch (e) {
        if (window.catatGalat) catatGalat({ pesan: 'Area: ' + ((e && e.message) || e), jenis: 'peta' });
      }
      areaGaris.add({
        positions: C.Cartesian3.fromDegreesArrayHeights(tepiTertutup(a.titik, 15)),
        width: 2.5,
        material: C.Material.fromType('Color', { color: warna })
      });
    });
  }
  gambarSementara();
  sc.requestRender();
}
function tepiTertutup(titik, tinggi) {
  var p = [];
  titik.concat([titik[0]]).forEach(function (t) {
    p.push(t[0], t[1], tinggi);
  });
  return p;
}
/* Garis & titik sudut saat sedang menggambar */
function gambarSementara() {
  if (!peta) return;
  var C = Cesium;
  if (!areaTitikSementara) areaTitikSementara = peta.scene.primitives.add(new C.PointPrimitiveCollection());
  areaTitikSementara.removeAll();
  if (!areaGambar) return;
  var t = areaGambar.titik,
    warna = C.Color.fromCssColorString(mkWarnaSah((areaDraft && areaDraft.warna) || MK_WARNA[3].k));
  t.forEach(function (p) {
    areaTitikSementara.add({
      position: C.Cartesian3.fromDegrees(p[0], p[1]),
      pixelSize: 10,
      color: warna,
      outlineColor: C.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    });
  });
  if (t.length >= 2) {
    areaGaris.add({
      positions: C.Cartesian3.fromDegreesArrayHeights(t.length >= 3 ? tepiTertutup(t, 15) : [t[0][0], t[0][1], 15, t[1][0], t[1][1], 15]),
      width: 2.5,
      material: C.Material.fromType('Color', { color: warna })
    });
  }
}

/* ---------- Mode menggambar ---------- */
function mulaiGambarArea() {
  areaGambar = { titik: [] };
  tutupInfoTempat();
  bukaCari(false);
  renderModeMenu(false);
  tutupLayerMenu();
  $('#petaBingkai').classList.add('memilih');
  $('#petaArea').hidden = false;
  renderBannerArea();
  gambarArea();
}
function renderBannerArea() {
  var n = areaGambar ? areaGambar.titik.length : 0;
  $('#petaArea').innerHTML =
    '<button type="button" class="peta-btn bulat kecil pb-tanya" data-bantuan="Ketuk sudut-sudut area di peta satu per satu (minimal 3 titik), lalu ketuk Selesai." aria-label="Bantuan" title="Bantuan">?</button>' +
    '<span class="pa-teks" aria-live="polite">' +
    (n ? n + ' titik' + (n >= 3 ? ' · ' + teksLuas(areaLuasM2(areaGambar.titik)) : '') : 'Area baru') +
    '</span>' +
    '<button type="button" class="peta-btn bulat kecil" data-pa="urung"' +
    (n ? '' : ' disabled') +
    ' aria-label="Urungkan" title="Urungkan"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>' +
    '<button type="button" class="peta-btn bulat kecil" data-pa="batal" aria-label="Batal" title="Batal"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<button type="button" class="peta-btn kecil-teks pa-selesai" data-pa="selesai"' +
    (n >= 3 ? '' : ' disabled') +
    '>Selesai</button>';
}
function selesaiGambarArea() {
  areaGambar = null;
  tutupBantuan();
  $('#petaArea').hidden = true;
  $('#petaBingkai').classList.remove('memilih');
  gambarArea();
}
function tambahSudut(posisiLayar) {
  var cart = peta.camera.pickEllipsoid(posisiLayar, peta.scene.globe.ellipsoid);
  if (!cart) {
    toast('Ketuk di permukaan bumi');
    return;
  }
  if (areaGambar.titik.length >= AREA_MAKS_TITIK) {
    toast('Maksimal ' + AREA_MAKS_TITIK + ' titik');
    return;
  }
  var cg = Cesium.Cartographic.fromCartesian(cart);
  areaGambar.titik.push([+Cesium.Math.toDegrees(cg.longitude).toFixed(6), +Cesium.Math.toDegrees(cg.latitude).toFixed(6)]);
  renderBannerArea();
  gambarArea();
}
function areaBannerClick(e) {
  var b = e.target.closest('[data-pa]');
  if (!b || b.disabled) return;
  var a = b.dataset.pa;
  if (a === 'urung') {
    areaGambar.titik.pop();
    renderBannerArea();
    gambarArea();
  } else if (a === 'batal') {
    selesaiGambarArea();
    if (areaDraft && areaDraft.id) openLayer('page:area');
    else areaDraft = null;
  } else if (a === 'selesai') {
    var titik = areaGambar.titik.slice();
    selesaiGambarArea();
    areaDraft = areaDraft || { id: null, nama: '', warna: MK_WARNA[3].k, catatan: '' };
    areaDraft.titik = titik;
    openLayer('page:area');
  }
}

/* ---------- Kartu info & halaman lihat ---------- */
var IKON_AREA =
  '<svg viewBox="0 0 24 24"><path d="M4 7l6-3 9 4-2 11-11 1z"/><circle cx="4" cy="7" r="1.4"/><circle cx="19" cy="8" r="1.4"/><circle cx="6" cy="20" r="1.4"/></svg>';
function lencanaArea(a, besar) {
  return '<span class="mk-lencana' + (besar ? ' besar' : '') + '" style="background:' + mkWarnaSah(a.warna) + '">' + IKON_AREA + '</span>';
}
function bukaInfoArea(id) {
  var a = areaCari(id);
  if (!a) return;
  tutupInfoTempat();
  areaInfoId = id;
  renderModeMenu(false);
  tutupLayerMenu();
  bukaCari(false);
  var box = $('#petaInfo');
  box.innerHTML =
    lencanaArea(a) +
    '<span class="peta-info-teks"><b translate="no">' +
    esc(a.nama) +
    '</b><small><span>' +
    teksLuas(areaLuasM2(a.titik)) +
    '</span>' +
    (a.catatan ? '<span aria-label="Ada catatan" title="Ada catatan">' + MK_IKON_CATATAN + '</span>' : '') +
    '</small></span>' +
    '<button type="button" class="peta-info-detail" id="petaAreaDetail">Detail</button>' +
    '<button type="button" class="peta-info-tutup" id="petaInfoTutup" aria-label="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  box.hidden = false;
  $('#petaBingkai').classList.add('info-buka');
}
function lihatArea(a) {
  if (!peta || !a || !a.titik || !a.titik.length) return;
  var w = 180,
    s = 90,
    e = -180,
    n = -90;
  a.titik.forEach(function (p) {
    w = Math.min(w, p[0]);
    e = Math.max(e, p[0]);
    s = Math.min(s, p[1]);
    n = Math.max(n, p[1]);
  });
  var pl = Math.max(0.002, (e - w) * 0.3),
    pt = Math.max(0.002, (n - s) * 0.3);
  peta.camera.flyTo({ destination: Cesium.Rectangle.fromDegrees(w - pl, s - pt, e + pl, n + pt), duration: 2 });
}
function buildAreaInfoPage() {
  var a = areaInfoId && areaCari(areaInfoId);
  if (!a) return false;
  $('#subTitle').textContent = 'Detail area';
  $('#subBody').innerHTML =
    '<div class="tp-kepala">' +
    lencanaArea(a, true) +
    '<span class="mk-teks"><b translate="no">' +
    esc(a.nama) +
    '</b><small>' +
    a.titik.length +
    ' titik sudut</small></span></div>' +
    '<div class="pa-fakta"><div><small>Luas</small><b>' +
    teksLuas(areaLuasM2(a.titik)) +
    '</b></div><div><small>Keliling</small><b>' +
    teksJarak(areaKelilingKm(a.titik)) +
    '</b></div></div>' +
    (a.catatan ? '<h3 class="group-title sub-group">Catatan</h3><p class="tp-catatan" translate="no">' + esc(a.catatan) + '</p>' : '') +
    '<div class="tp-aksi"><button type="button" class="btn primary" data-ai="lihat"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>Lihat di peta</button></div>' +
    '<p class="sub-note pa-catatan">Luas dan keliling adalah perkiraan dari titik-titik yang kamu ketuk.</p>';
  return true;
}

/* ---------- Bagian "Area" di halaman pensil ---------- */
function renderAreaDaftar() {
  var box = $('#petaAreaDaftar');
  if (!box) return;
  if (!petaArea.length) {
    box.innerHTML = kpKosong(
      'area',
      'kp-hijau',
      'Belum ada area',
      'Tandai wilayah seperti kebun, kampung, atau kawasan impian dengan mengetuk sudut-sudutnya di peta.',
      'area',
      'Buat area'
    );
    return;
  }
  box.innerHTML =
    kpBar(petaArea.length + ' wilayah', 'area', 'Buat') +
    '<div class="card kp-daftar">' +
    petaArea
      .map(function (a) {
        return kpBaris(
          'data-ar-edit',
          'data-ar-lihat',
          a.id,
          lencanaArea(a),
          a.nama,
          teksLuas(areaLuasM2(a.titik)) + ' · ' + a.titik.length + ' titik'
        );
      })
      .join('') +
    '</div>';
}
document.addEventListener('click', function (e) {
  if (!e.target.closest('#petaAreaDaftar')) return;
  if (e.target.closest('[data-ar-baru]')) {
    if (!peta) {
      toast('Peta belum siap');
      return;
    }
    areaDraft = null;
    keBingkaiPeta(function () {
      if (petaMode === 'peristiwa') pilihModePeta('tempat');
      mulaiGambarArea();
    });
    return;
  }
  var b = e.target.closest('[data-ar-lihat]');
  if (b) {
    var id = b.dataset.arLihat;
    keBingkaiPeta(function () {
      if (petaMode === 'peristiwa') pilihModePeta('tempat');
      if (petaLayer.area === false) {
        petaLayer.area = true;
        simpanLayer();
        terapkanLayer();
      }
      lihatArea(areaCari(id));
      bukaInfoArea(id);
    });
    return;
  }
  b = e.target.closest('[data-ar-edit]');
  if (b) {
    var a = areaCari(b.dataset.arEdit);
    if (!a) return;
    areaDraft = JSON.parse(JSON.stringify(a));
    openLayer('page:area');
  }
});

/* ---------- Halaman area (buat / edit) ---------- */
function buildAreaPage() {
  if (!areaDraft || !areaDraft.titik) return false;
  var d = areaDraft;
  $('#subTitle').textContent = d.id ? 'Edit area' : 'Area baru';
  $('#subBody').innerHTML =
    '<div class="mk-lokasi">' +
    lencanaArea(d, true) +
    '<span class="mk-teks"><small>' +
    d.titik.length +
    ' titik sudut</small><b>' +
    teksLuas(areaLuasM2(d.titik)) +
    ' · keliling ' +
    teksJarak(areaKelilingKm(d.titik)) +
    '</b></span>' +
    '<button type="button" class="btn mk-pindah" data-ar="ulang">Gambar ulang</button></div>' +
    '<div class="field"><label for="arNama">Nama</label><input class="input" id="arNama" maxlength="60" autocomplete="off" placeholder="Contoh: Kebun keluarga"></div>' +
    '<div class="field"><label>Warna</label>' +
    htmlPilihWarna('data-ar-warna') +
    '</div>' +
    '<div class="field"><label for="arCatatan">Catatan <small>(opsional)</small></label><textarea class="input" id="arCatatan" maxlength="2000" rows="3" placeholder="Tulis keterangan tentang area ini…"></textarea></div>' +
    '<button type="button" class="btn primary mk-simpan" data-ar="simpan">Simpan</button>' +
    (d.id ? '<button type="button" class="btn danger mk-hapus" data-ar="hapus">Hapus area</button>' : '');
  $('#arNama').value = d.nama || '';
  $('#arCatatan').value = d.catatan || '';
  segarkanWarnaArea();
  return true;
}
function segarkanWarnaArea() {
  var d = areaDraft;
  segarkanPilihWarna('data-ar-warna', d.warna);
  var l = $('#subBody .mk-lokasi .mk-lencana');
  if (l) l.style.background = mkWarnaSah(d.warna);
}
function areaPageClick(e) {
  var d = areaDraft;
  if (!d) return;
  var b = e.target.closest('[data-ar-warna]');
  if (b) {
    d.warna = b.dataset.arWarna;
    segarkanWarnaArea();
    return;
  }
  if (e.target.closest('[data-ar="ulang"]')) {
    d.nama = $('#arNama').value;
    d.catatan = $('#arCatatan').value;
    if (!peta) {
      toast('Peta belum siap');
      return;
    }
    keBingkaiPeta(function () {
      if (petaMode === 'peristiwa') pilihModePeta('tempat');
      mulaiGambarArea();
    });
    return;
  }
  if (e.target.closest('[data-ar="simpan"]')) {
    var nama = $('#arNama').value.trim().slice(0, 60);
    if (!nama) {
      toast('Nama area wajib diisi');
      $('#arNama').focus();
      return;
    }
    var now = Date.now(),
      a,
      catatan = $('#arCatatan').value.trim().slice(0, 2000);
    if (d.id) {
      a = areaCari(d.id);
      if (!a) return;
      a.nama = nama;
      a.warna = mkWarnaSah(d.warna);
      a.catatan = catatan;
      a.titik = d.titik.slice();
      a.diubah = now;
    } else {
      a = { id: uid(), nama: nama, warna: mkWarnaSah(d.warna), catatan: catatan, titik: d.titik.slice(), dibuat: now, diubah: now };
      petaArea.push(a);
    }
    var baru = !d.id;
    areaDraft = null;
    areaSimpanSemua();
    back(1, function () {
      gambarArea();
      renderAreaDaftar();
      if (areaInfoId === a.id) bukaInfoArea(a.id);
      if (baru && cur.layers.length === 0) lihatArea(a);
      toast('Area disimpan');
    });
    return;
  }
  if (e.target.closest('[data-ar="hapus"]')) {
    var hapusId = d.id,
      namaLama = (areaCari(hapusId) || d).nama;
    askConfirm({
      title: 'Hapus area?',
      text: 'Area "' + namaLama + '" akan dihapus permanen dari peta.',
      ok: 'Hapus',
      action: function () {
        petaArea = petaArea.filter(function (x) {
          return x.id !== hapusId;
        });
        areaDraft = null;
        areaSimpanSemua();
        if (areaInfoId === hapusId) tutupInfoTempat();
        back(2, function () {
          gambarArea();
          renderAreaDaftar();
          toast('Area dihapus');
        });
      }
    });
  }
}
PAGES.area = buildAreaPage;
PAGES.areainfo = buildAreaInfoPage;
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'area') areaPageClick(e);
  else if (pageKind === 'areainfo' && e.target.closest('[data-ai="lihat"]')) {
    var id = areaInfoId;
    back(1, function () {
      lihatArea(areaCari(id));
    });
  }
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'area' || !areaDraft) return;
  if (e.target.id === 'arNama') areaDraft.nama = e.target.value;
  else if (e.target.id === 'arCatatan') areaDraft.catatan = e.target.value;
});

/* Tutup kartu info area bersama kartu marker */
var tutupInfoTempatAsli = tutupInfoTempat;
tutupInfoTempat = function () {
  areaInfoId = null;
  tutupInfoTempatAsli();
};
