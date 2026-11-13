/* Stivora — Pengaturan cadangan, riwayat, dan enkripsi end-to-end */
'use strict';

/* =========================================================
   PENGATURAN CADANGAN (semua bawaan: nyala)
   store (IndexedDB) 'stivora.cadangan' = { otomatis, antar, media, pengingat }
   ========================================================= */
var K_ATUR = 'stivora.cadangan';
function atur() {
  var d = store.get(K_ATUR, {}) || {};
  return { otomatis: d.otomatis !== false, antar: d.antar !== false, media: d.media !== false, pengingat: d.pengingat !== false };
}
function setAtur(k, v) {
  var d = store.get(K_ATUR, {}) || {};
  d[k] = !!v;
  store.set(K_ATUR, d);
}

/* =========================================================
   RIWAYAT CADANGAN (di perangkat ini, maks. 50)
   ========================================================= */
var K_RIWAYAT = 'stivora.cadangan.riwayat';
var K_TERAKHIR = 'stivora.cadangan.terakhir';
function riwayat() {
  var r = store.get(K_RIWAYAT, []);
  return Array.isArray(r) ? r : [];
}
function catatRiwayat(jenis, ok, pesan) {
  var r = riwayat(),
    now = Date.now();
  var e = {
    t: now,
    jenis: jenis,
    ok: !!ok,
    impian: typeof imDaftar === 'function' ? imDaftar().length : 0,
    media: images.length,
    pesan: pesan || ''
  };
  var a = r[0];
  /* Cadangan otomatis digabung per jam agar riwayat tidak penuh */
  if (jenis === 'otomatis' && a && a.jenis === 'otomatis' && a.ok === e.ok && a.pesan === e.pesan && now - (a.mulai || a.t) < 3600000) {
    e.mulai = a.mulai || a.t;
    e.kali = (a.kali || 1) + 1;
    r[0] = e;
  } else {
    r.unshift(e);
  }
  store.set(K_RIWAYAT, r.slice(0, 50));
  if (ok && jenis !== 'bersih') store.set(K_TERAKHIR, now);
}

/* =========================================================
   ENKRIPSI END-TO-END
   - Kunci AES-GCM 256 dari kata sandi (PBKDF2-SHA256, 310.000 putaran).
   - Kata sandi tidak pernah dikirim; cloud hanya menyimpan salt + "cek".
   - Firestore: users/{uid}/pengaturan/e2e = { salt, check, v, updatedAt }
   - Impian terenkripsi: { e, createdAt, updatedAt }
   - Catatan media terenkripsi: { e, size, createdAt, updatedAt }; file di R2 ikut terenkripsi.
   ========================================================= */
var E2E_CEK = 'stivora-e2e-v1';
var e2e = { info: null, dicek: false, key: null }; // info: data dokumen e2e di cloud (null = tidak aktif)
function kunciE2EKey(uidNow) {
  return 'stivora.e2e.' + uidNow;
}

var te = new TextEncoder(),
  td = new TextDecoder();
function b64(buf) {
  var b = new Uint8Array(buf),
    s = '';
  for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(s) {
  var t = atob(s),
    b = new Uint8Array(t.length);
  for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
  return b;
}
function turunkanKunci(sandi, saltB64) {
  return crypto.subtle.importKey('raw', te.encode(sandi), 'PBKDF2', false, ['deriveKey']).then(function (base) {
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: unb64(saltB64), iterations: 310000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  });
}
function enkripsiBytes(key, bytes) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes).then(function (ct) {
    var out = new Uint8Array(12 + ct.byteLength);
    out.set(iv, 0);
    out.set(new Uint8Array(ct), 12);
    return out;
  });
}
function dekripsiBytes(key, bytes) {
  bytes = new Uint8Array(bytes);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12));
}
function enkripsiTeks(key, str) {
  return enkripsiBytes(key, te.encode(str)).then(b64);
}
function dekripsiTeks(key, s) {
  return dekripsiBytes(key, unb64(s)).then(function (b) {
    return td.decode(b);
  });
}
function enkripsiJSON(key, obj) {
  return enkripsiTeks(key, JSON.stringify(obj));
}
function dekripsiJSON(key, s) {
  return dekripsiTeks(key, s).then(JSON.parse);
}
function enkripsiBlob(key, blob) {
  return blob
    .arrayBuffer()
    .then(function (buf) {
      return enkripsiBytes(key, buf);
    })
    .then(function (b) {
      return new Blob([b], { type: 'application/octet-stream' });
    });
}
function dekripsiBlob(key, blob, type) {
  return blob
    .arrayBuffer()
    .then(function (buf) {
      return dekripsiBytes(key, buf);
    })
    .then(function (b) {
      return new Blob([b], { type: type || 'application/octet-stream' });
    });
}

function e2eDoc(uidNow) {
  var F = fb.F;
  return F.doc(fb.db, 'users', uidNow, 'pengaturan', 'e2e');
}
function simpanKunciLokal(uidNow, key) {
  return crypto.subtle.exportKey('raw', key).then(function (raw) {
    store.raw(kunciE2EKey(uidNow), b64(raw));
  });
}
function muatKunciLokal(uidNow) {
  var s = store.raw(kunciE2EKey(uidNow));
  if (!s) return Promise.resolve(null);
  return crypto.subtle.importKey('raw', unb64(s), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']).catch(function () {
    return null;
  });
}
function cocokCek(key, info) {
  return dekripsiTeks(key, info.check).then(
    function (t) {
      return t === E2E_CEK;
    },
    function () {
      return false;
    }
  );
}

/* Dipanggil di awal setiap sinkron: baca status enkripsi akun */
function e2eSiapkan(uidNow) {
  return fb.F.getDoc(e2eDoc(uidNow))
    .then(function (snap) {
      var info = snap.exists() ? snap.data() : null;
      if (!user || user.uid !== uidNow) return;
      e2e.info = info;
      e2e.dicek = true;
      if (!info) {
        e2e.key = null;
        return;
      }
      return muatKunciLokal(uidNow).then(function (key) {
        if (!key) {
          e2e.key = null;
          return;
        }
        return cocokCek(key, info).then(function (ok) {
          if (ok) e2e.key = key;
          else {
            e2e.key = null;
            store.hapus(kunciE2EKey(uidNow));
          }
        });
      });
    })
    .then(function () {
      if (e2e.info && !e2e.key) {
        var err = new Error('e2e');
        err.code = 'e2e-sandi';
        throw err;
      }
    });
}
function e2eAktif() {
  return !!(e2e.info && e2e.key);
}

/* Unduh file yang hanya ada di cloud agar bisa diunggah ulang dalam format baru */
function unduhSemuaMedia(uidNow) {
  return images
    .filter(function (r) {
      return r.uploaded && !r.blob;
    })
    .reduce(function (p, rec) {
      return p.then(function () {
        return workerFetch('GET', rec.id)
          .then(function (res) {
            return res.blob();
          })
          .then(function (blob) {
            if (!rec.enc) return blob;
            if (!e2e.key) throw new Error('Kunci enkripsi tidak ada');
            return dekripsiBlob(e2e.key, blob, rec.type);
          })
          .then(function (blob) {
            rec.blob = blob;
            if (!rec.type) rec.type = blob.type;
            return idb.put(rec);
          });
      });
    }, Promise.resolve());
}
/* Kirim ulang semua data ke cloud dalam format (terenkripsi/biasa) yang berlaku sekarang */
function tandaiKirimUlang() {
  setMap('marker', {});
  setMap('jalur', {});
  setMap('area', {});
  setMap('data', {});
  return Promise.all(
    images
      .filter(function (r) {
        return r.blob;
      })
      .map(function (r) {
        r.uploaded = false;
        return idb.put(r);
      })
  );
}
function tungguSinkron() {
  return sync.running ? sync.running.then(tungguSinkron) : Promise.resolve();
}
function sinkronWajib(pull, sumber) {
  return syncNow(pull, sumber).then(function () {
    if (sync.state === 'error') throw new Error(sync.err);
  });
}

function aktifkanE2E(sandi) {
  if (!user || !fb) return Promise.reject(new Error('Masuk dengan Google dulu'));
  var uidNow = user.uid,
    F = fb.F;
  var salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  var key;
  return tungguSinkron()
    .then(function () {
      return sinkronWajib('paksa', 'otomatis');
    })
    .then(function () {
      if (e2e.info) throw new Error('Enkripsi sudah aktif di akun ini');
      return unduhSemuaMedia(uidNow);
    })
    .then(function () {
      return turunkanKunci(sandi, salt);
    })
    .then(function (k) {
      key = k;
      return enkripsiTeks(key, E2E_CEK);
    })
    .then(function (check) {
      var info = { salt: salt, check: check, v: 1, updatedAt: Date.now() };
      return F.setDoc(e2eDoc(uidNow), info).then(function () {
        e2e.info = info;
        e2e.key = key;
      });
    })
    .then(function () {
      return simpanKunciLokal(uidNow, key);
    })
    .then(tandaiKirimUlang)
    .then(function () {
      return sinkronWajib(false, 'enkripsi-on');
    });
}
function bukaE2E(sandi) {
  if (!user || !fb || !e2e.info) return Promise.reject(new Error('Enkripsi tidak aktif'));
  var uidNow = user.uid,
    info = e2e.info;
  return turunkanKunci(sandi, info.salt)
    .then(function (key) {
      return cocokCek(key, info).then(function (ok) {
        if (!ok) throw new Error('Kata sandi salah');
        e2e.key = key;
        return simpanKunciLokal(uidNow, key);
      });
    })
    .then(function () {
      return sinkronWajib('paksa', 'manual');
    });
}
function matikanE2E(sandi) {
  if (!user || !fb || !e2e.info) return Promise.reject(new Error('Enkripsi tidak aktif'));
  var uidNow = user.uid,
    F = fb.F,
    info = e2e.info;
  return (
    turunkanKunci(sandi, info.salt)
      .then(function (key) {
        return cocokCek(key, info).then(function (ok) {
          if (!ok) throw new Error('Kata sandi salah');
          e2e.key = key;
        });
      })
      .then(tungguSinkron)
      .then(function () {
        return sinkronWajib('paksa', 'otomatis');
      })
      .then(function () {
        return unduhSemuaMedia(uidNow);
      })
      .then(function () {
        return F.deleteDoc(e2eDoc(uidNow));
      })
      /* Kunci tetap di memori sampai semua terkirim ulang, agar sisa data lama masih bisa dibaca */
      .then(function () {
        e2e.info = null;
        return tandaiKirimUlang();
      })
      .then(function () {
        return sinkronWajib(false, 'enkripsi-off');
      })
      .then(function () {
        e2e.key = null;
        store.hapus(kunciE2EKey(uidNow));
      })
  );
}
