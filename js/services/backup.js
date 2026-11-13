/* Stivora — Cadangan file: ekspor dan impor (bisa terenkripsi) */
'use strict';

/* =========================================================
   PENGATURAN: DATA
   ========================================================= */
function blobToDataURL(b) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function () {
      res(r.result);
    };
    r.onerror = function () {
      rej(r.error);
    };
    r.readAsDataURL(b);
  });
}
function dataURLToBlob(s) {
  var m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(s || '');
  if (!m) throw new Error('bad data');
  var bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  var arr = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: m[1] || 'image/jpeg' });
}

/* =========================================================
   EKSPOR
   opsi: { media: true/false, sandi: '' (kosong = tidak dienkripsi) }
   File terenkripsi: { app, version: 2, enc: { alg, kdf, iter, salt }, data: base64(iv + isi) }
   ========================================================= */
var EKSPOR_ITER = 310000;
function unduhFile(blob, nama) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}
function namaFileEkspor(enc) {
  var d = new Date(),
    pad = function (n) {
      return (n < 10 ? '0' : '') + n;
    };
  return 'stivora-cadangan-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + (enc ? '-terenkripsi' : '') + '.json';
}
function doExport(opsi) {
  opsi = opsi || { media: true, sandi: '' };
  toast('Menyiapkan cadangan…');
  var ambil = opsi.media
    ? images.filter(function (im) {
        return im.blob;
      })
    : [];
  return Promise.all(
    ambil.map(function (im) {
      return blobToDataURL(im.blob).then(function (data) {
        return {
          id: im.id,
          caption: im.caption,
          markerId: im.markerId || null,
          createdAt: im.createdAt,
          type: im.type || im.blob.type,
          name: im.name || '',
          data: data
        };
      });
    })
  )
    .then(function (imgs) {
      var payload = {
        app: 'stivora',
        version: 1,
        exportedAt: new Date().toISOString(),
        theme: themeMode(),
        media: !!opsi.media,
        marker: petaMarker,
        jalur: petaJalur,
        area: petaArea,
        impianData: dataImpianEkspor(),
        images: imgs
      };
      var teks = JSON.stringify(payload);
      if (!opsi.sandi) return new Blob([teks], { type: 'application/json' });
      var salt = b64(crypto.getRandomValues(new Uint8Array(16)));
      return turunkanKunci(opsi.sandi, salt)
        .then(function (key) {
          return enkripsiBytes(key, te.encode(teks));
        })
        .then(function (isi) {
          var bungkus = {
            app: 'stivora',
            version: 2,
            exportedAt: payload.exportedAt,
            enc: { alg: 'AES-GCM-256', kdf: 'PBKDF2-SHA256', iter: EKSPOR_ITER, salt: salt },
            data: b64(isi)
          };
          return new Blob([JSON.stringify(bungkus)], { type: 'application/json' });
        });
    })
    .then(function (blob) {
      unduhFile(blob, namaFileEkspor(!!opsi.sandi));
      toast(opsi.sandi ? 'Cadangan terenkripsi diunduh' : 'Cadangan diunduh');
      catatRiwayat('ekspor', true);
    })
    .catch(function () {
      toast('Gagal membuat cadangan');
      catatRiwayat('ekspor', false, 'Gagal membuat file');
    });
}

/* =========================================================
   IMPOR
   ========================================================= */
var imporTertunda = null; // file terenkripsi yang menunggu kata sandi
function cekFileImpor(data) {
  /* Cadangan lama (≤5.36) masih berisi 'dreams' (fitur impian lama) — tetap bisa diimpor, bagian itu diabaikan */
  return !!(
    data &&
    data.app === 'stivora' &&
    (Array.isArray(data.dreams) ||
      Array.isArray(data.images) ||
      Array.isArray(data.marker) ||
      (data.impianData && typeof data.impianData === 'object'))
  );
}
function bukaFileTerenkripsi(bungkus, sandi) {
  var e = bungkus.enc || {};
  return turunkanKunci(sandi, e.salt)
    .then(function (key) {
      return dekripsiBytes(key, unb64(bungkus.data));
    })
    .then(
      function (buf) {
        return JSON.parse(td.decode(buf));
      },
      function () {
        throw new Error('Kata sandi salah atau file rusak');
      }
    );
}
function mintaSandiImpor(bungkus) {
  imporTertunda = bungkus;
  if (pageKind !== 'transfer') {
    openLayer('page:transfer');
    return;
  }
  buildTransferForm();
}
function lanjutImpor(data) {
  if (!cekFileImpor(data)) {
    toast('Ini bukan file cadangan Stivora');
    return;
  }
  var adaMedia = data.media !== false;
  var nMedia = (data.images || []).length;
  var adaMarker = Array.isArray(data.marker); /* cadangan lama (sebelum v4.8) tidak berisi marker: marker di perangkat tidak diubah */
  var teksMarker = adaMarker
    ? ' Data peta diganti dengan ' +
      data.marker.length +
      ' marker, ' +
      (Array.isArray(data.jalur) ? data.jalur.length : 0) +
      ' perjalanan, dan ' +
      (Array.isArray(data.area) ? data.area.length : 0) +
      ' area dari cadangan.'
    : '';
  /* Data tab Impian (cadangan v5.31.1+); cadangan lama tanpa data ini tidak mengubah tab Impian */
  var adaImpianData = !!(data.impianData && typeof data.impianData === 'object' && !Array.isArray(data.impianData));
  if (adaImpianData)
    teksMarker +=
      ' Data tab Impian (profil, impian, peta jalan, sumberdaya, peristiwa, keuangan) dan data Galery (banner, Pola Pikir, koleksi Lainnya) juga diganti.';
  askConfirm({
    title: 'Pulihkan cadangan?',
    text:
      (adaMedia
        ? 'Media di perangkat ini akan diganti dengan ' + nMedia + ' media dari cadangan. Isi Sampah dikosongkan.'
        : 'File ini tanpa media, jadi media di perangkat ini tidak diubah.') +
      teksMarker +
      (user ? ' Data di cloud akunmu juga ikut diganti.' : ''),
    ok: 'Pulihkan',
    action: function () {
      var recs = [];
      if (adaMedia) {
        try {
          recs = (data.images || []).map(function (x) {
            var bl = dataURLToBlob(x.data);
            var t = x.createdAt || Date.now();
            return {
              id: x.id || uid(),
              blob: bl,
              caption: x.caption || '',
              markerId: x.markerId || null,
              type: x.type || bl.type,
              size: bl.size,
              name: x.name || '',
              createdAt: t,
              updatedAt: Date.now(),
              uploaded: false
            };
          });
        } catch (err) {
          back(1, function () {
            toast('Media di cadangan rusak');
          });
          return;
        }
      }
      var siap = adaMedia
        ? idb.clear().then(function () {
            return Promise.all(
              recs.map(function (x) {
                return idb.put(x);
              })
            );
          })
        : Promise.resolve();
      siap
        .then(function () {
          if (adaMedia) {
            trashMedia = [];
            renderTrashCount();
            Object.keys(urls).forEach(dropUrl);
            images = recs.sort(function (a, b) {
              return b.createdAt - a.createdAt;
            });
          }
          if (adaMarker) {
            petaMarker = data.marker
              .filter(function (m) {
                return m && m.id && m.nama && isFinite(m.lon) && isFinite(m.lat);
              })
              .map(function (m) {
                return {
                  id: String(m.id),
                  nama: String(m.nama).slice(0, 60),
                  ikon: m.ikon || 'titik',
                  warna: m.warna || '#3b82f6',
                  lon: +m.lon,
                  lat: +m.lat,
                  tanggal: m.tanggal || '',
                  catatan: String(m.catatan || '').slice(0, 2000),
                  dibuat: m.dibuat || Date.now(),
                  diubah: Date.now()
                };
              });
            store.set(K_MARKER, petaMarker);
            /* Perjalanan & area (cadangan v4.13+; cadangan v4.8–4.12 belum berisi keduanya → dikosongkan bersama marker) */
            petaJalur = (Array.isArray(data.jalur) ? data.jalur : [])
              .filter(function (j) {
                return j && j.id && j.nama && Array.isArray(j.titik);
              })
              .map(function (j) {
                return {
                  id: String(j.id),
                  nama: String(j.nama).slice(0, 60),
                  warna: j.warna || '#ef4444',
                  titik: j.titik.map(String).slice(0, 50),
                  kendaraan: Array.isArray(j.kendaraan)
                    ? j.kendaraan
                        .map(function (k) {
                          return String(k || '').slice(0, 24);
                        })
                        .slice(0, 50)
                    : [],
                  berangkat: Array.isArray(j.berangkat)
                    ? j.berangkat
                        .map(function (k) {
                          return String(k || '').slice(0, 16);
                        })
                        .slice(0, 50)
                    : [],
                  dibuat: j.dibuat || Date.now(),
                  diubah: Date.now()
                };
              });
            petaArea = (Array.isArray(data.area) ? data.area : [])
              .filter(function (a) {
                return a && a.id && a.nama && Array.isArray(a.titik) && a.titik.length >= 3;
              })
              .map(function (a) {
                return {
                  id: String(a.id),
                  nama: String(a.nama).slice(0, 60),
                  warna: a.warna || '#22c55e',
                  catatan: String(a.catatan || '').slice(0, 2000),
                  titik: a.titik.slice(0, 100).map(function (p) {
                    return [+p[0], +p[1]];
                  }),
                  dibuat: a.dibuat || Date.now(),
                  diubah: Date.now()
                };
              });
            store.set(K_JALUR, petaJalur);
            store.set(K_AREA, petaArea);
            gambarMarker();
            gambarArea();
          }
          if (adaImpianData) dataImpianImpor(data.impianData);
          if (data.theme) {
            store.raw(K_THEME, data.theme);
            applyTheme();
          }
          catatRiwayat('impor', true);
          back(1, function () {
            refreshAll();
            if (pageKind === 'transfer') buildTransferForm();
            toast('Cadangan dipulihkan');
            schedulePush();
          });
        })
        .catch(function () {
          back(1, function () {
            toast('Gagal memulihkan cadangan');
          });
        });
    }
  });
}

$('#importInput').addEventListener('change', function (e) {
  var file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  var r = new FileReader();
  r.onload = function () {
    var data;
    try {
      data = JSON.parse(r.result);
    } catch (err) {
      toast('File cadangan tidak valid');
      return;
    }
    if (data && data.app === 'stivora' && data.enc && typeof data.data === 'string') {
      mintaSandiImpor(data);
      return;
    }
    lanjutImpor(data);
  };
  r.readAsText(file);
});
