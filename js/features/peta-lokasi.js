/* Stivora — Peta: Lokasi saya
   Tombol di kanan bawah peta → minta posisi dari HP (GPS/jaringan) → kamera terbang ke sana + titik biru.
   - Pertama kali dipakai: dialog konfirmasi dulu (pilihan tidak biasa), lalu browser meminta izin lokasi.
   - Posisi TIDAK disimpan dan TIDAK dikirim ke mana pun; hanya dipakai saat itu untuk peta.
   - Butuh koneksi aman (https / localhost): GitHub Pages dan preview SPCK sudah memenuhi. */
'use strict';

var K_LOKASI_SETUJU = 'stivora.peta.lokasi.setuju'; // hanya tanda "sudah setuju", bukan posisi
var lokasiTitik = null; // PointPrimitiveCollection titik biru
var lokasiSedang = false;

function tombolLokasiSibuk(sibuk) {
  var b = $('#petaLokasi');
  if (!b) return;
  lokasiSedang = sibuk;
  b.classList.toggle('sibuk', sibuk);
  b.setAttribute('aria-busy', sibuk ? 'true' : 'false');
}
function gambarLokasiSaya(lon, lat) {
  if (!peta || !window.Cesium) return;
  var C = Cesium;
  if (!lokasiTitik) lokasiTitik = peta.scene.primitives.add(new C.PointPrimitiveCollection());
  lokasiTitik.removeAll();
  var pos = C.Cartesian3.fromDegrees(lon, lat);
  /* lingkaran luar transparan + titik biru dengan tepi putih */
  lokasiTitik.add({
    position: pos,
    pixelSize: 26,
    color: C.Color.fromCssColorString('#3b82f6').withAlpha(0.25),
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
  lokasiTitik.add({
    position: pos,
    pixelSize: 13,
    color: C.Color.fromCssColorString('#3b82f6'),
    outlineColor: C.Color.WHITE,
    outlineWidth: 3,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
  peta.scene.requestRender();
}
function ambilLokasiSaya() {
  if (lokasiSedang) return;
  tombolLokasiSibuk(true);
  navigator.geolocation.getCurrentPosition(
    function (p) {
      tombolLokasiSibuk(false);
      if (!peta) return;
      var lon = p.coords.longitude,
        lat = p.coords.latitude,
        akurasi = Math.round(p.coords.accuracy || 0);
      gambarLokasiSaya(lon, lat);
      terbang(lon, lat, Math.max(1500, Math.min(60000, akurasi * 8)));
      toast(akurasi ? 'Lokasimu (akurasi ±' + akurasi.toLocaleString('id-ID') + ' m)' : 'Lokasimu');
    },
    function (err) {
      tombolLokasiSibuk(false);
      var kode = err && err.code;
      toast(
        kode === 1
          ? 'Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan browser.'
          : kode === 3
            ? 'Lokasi terlalu lama didapat. Coba lagi di tempat terbuka.'
            : 'Lokasi tidak ditemukan. Pastikan GPS/lokasi HP menyala.'
      );
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
  );
}
function lokasiSaya() {
  if (!peta) {
    toast('Peta belum siap');
    return;
  }
  if (!('geolocation' in navigator)) {
    toast('Perangkat ini tidak mendukung lokasi');
    return;
  }
  if (!window.isSecureContext) {
    toast('Lokasi hanya bisa dipakai lewat https');
    return;
  }
  if (store.raw(K_LOKASI_SETUJU) === '1') {
    ambilLokasiSaya();
    return;
  }
  askConfirm({
    title: 'Pakai lokasimu?',
    text: 'Stivora akan meminta izin lokasi untuk menunjukkan posisimu di peta. Lokasi hanya dipakai saat itu di perangkat ini, tidak disimpan dan tidak dikirim ke mana pun.',
    ok: 'Izinkan',
    tone: 'primary',
    action: function () {
      store.raw(K_LOKASI_SETUJU, '1');
      back(1, ambilLokasiSaya);
    }
  });
}
