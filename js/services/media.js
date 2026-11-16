/* Stivora — Layanan media: foto/video ⇄ Cloudflare Worker ⇄ R2 */
'use strict';

/* ---------- Media: Firestore (catatan) + Worker/R2 (file) ---------- */
function authHeader() {
  return user.getIdToken().then(function (t) {
    return { Authorization: 'Bearer ' + t };
  });
}
function workerFetch(method, id, opts) {
  opts = opts || {};
  return authHeader()
    .then(function (h) {
      var headers = Object.assign(h, opts.headers || {});
      return fetch(workerUrl(id), { method: method, headers: headers, body: opts.body });
    })
    .then(function (res) {
      if (res.ok || (method === 'DELETE' && res.status === 404)) return res;
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (j) {
          var err = new Error(j.error || 'HTTP ' + res.status);
          err.worker = true;
          err.status = res.status;
          throw err;
        });
    });
}

function mediaMeta(rec) {
  return {
    caption: String(rec.caption || '').slice(0, 100),
    markerId: rec.markerId || null,
    type: String(rec.type || (rec.blob && rec.blob.type) || 'application/octet-stream').slice(0, 100),
    size: Math.round(rec.size || (rec.blob && rec.blob.size) || 1),
    name: String(rec.name || '').slice(0, 200),
    createdAt: Math.round(rec.createdAt || Date.now()),
    updatedAt: Math.round(rec.updatedAt || rec.createdAt || Date.now())
  };
}

/* Catatan media untuk cloud: biasa, atau terenkripsi jika file-nya terenkripsi */
function metaCloud(rec) {
  var m = mediaMeta(rec);
  if (!rec.enc) return Promise.resolve(m);
  if (!e2e.key) return Promise.reject(new Error('Kunci enkripsi tidak ada'));
  return enkripsiJSON(e2e.key, { caption: m.caption, markerId: m.markerId, type: m.type, name: m.name }).then(function (e) {
    return { e: e, size: Math.round(rec.encSize || m.size), createdAt: m.createdAt, updatedAt: m.updatedAt };
  });
}
/* Buka catatan media dari cloud (dekripsi bila perlu); null = tidak bisa dibaca */
function bukaMetaMedia(r) {
  if (!r || typeof r.e !== 'string') return Promise.resolve(r);
  if (!e2e.key) return Promise.resolve(null);
  return dekripsiJSON(e2e.key, r.e).then(
    function (x) {
      x.size = r.size;
      x.createdAt = r.createdAt;
      x.updatedAt = r.updatedAt;
      x.enc = true;
      return x;
    },
    function () {
      return null;
    }
  );
}

function uploadRec(rec, uidNow) {
  var F = fb.F;
  var type = rec.type || rec.blob.type;
  var enc = e2eAktif();
  var siap = enc ? enkripsiBlob(e2e.key, rec.blob) : Promise.resolve(rec.blob);
  return siap
    .then(function (body) {
      return workerFetch('PUT', rec.id, {
        headers: enc
          ? { 'Content-Type': 'application/octet-stream', 'X-File-Name': '' }
          : { 'Content-Type': type, 'X-File-Name': encodeURIComponent(rec.name || '') },
        body: body
      }).then(function () {
        rec.enc = enc;
        rec.encSize = enc ? body.size : 0;
        return metaCloud(rec);
      });
    })
    .then(function (meta) {
      return F.setDoc(F.doc(fb.db, 'users', uidNow, 'media', rec.id), meta);
    })
    .then(function () {
      rec.uploaded = true;
      rec.metaDirty = false;
      return idb.put(rec);
    });
}

function syncMedia(pull, uidNow) {
  var F = fb.F;
  var synced = getMap('media');
  var p = Promise.resolve();
  var changed = false;

  if (pull) {
    p = F.getDocs(F.collection(fb.db, 'users', uidNow, 'media')).then(function (snap) {
      var mentah = [];
      snap.forEach(function (doc) {
        mentah.push({ id: doc.id, data: doc.data() });
      });
      return Promise.all(
        mentah.map(function (m) {
          return bukaMetaMedia(m.data);
        })
      ).then(function (isi) {
        var remote = {},
          takTerbaca = {};
        mentah.forEach(function (m, i) {
          if (isi[i]) remote[m.id] = isi[i];
          else takTerbaca[m.id] = 1;
        });
        var puts = [];
        Object.keys(remote).forEach(function (id) {
          var r = remote[id];
          var local = findImg(id);
          if (!local) {
            if (synced[id]) return; // dihapus di perangkat ini
            var rec = {
              id: id,
              blob: null,
              caption: r.caption || '',
              markerId: r.markerId || null,
              type: r.type,
              size: r.size,
              name: r.name || '',
              createdAt: r.createdAt || Date.now(),
              updatedAt: r.updatedAt || Date.now(),
              uploaded: true,
              enc: !!r.enc,
              encSize: r.enc ? r.size : 0
            };
            images.push(rec);
            puts.push(idb.put(rec));
            synced[id] = 1;
            changed = true;
          } else {
            if (!local.uploaded) {
              local.uploaded = true;
              puts.push(idb.put(local));
            }
            if (!!local.enc !== !!r.enc) {
              local.enc = !!r.enc;
              local.encSize = r.enc ? r.size : 0;
              puts.push(idb.put(local));
            }
            if ((r.updatedAt || 0) > (local.updatedAt || 0)) {
              local.caption = r.caption || '';
              local.markerId = r.markerId || null;
              local.updatedAt = r.updatedAt;
              puts.push(idb.put(local));
              changed = true;
            }
            synced[id] = 1;
          }
        });
        images = images.filter(function (im) {
          if (!remote[im.id] && !takTerbaca[im.id] && synced[im.id]) {
            // dihapus di perangkat lain
            delete synced[im.id];
            puts.push(idb.del(im.id));
            dropUrl(im.id);
            changed = true;
            return false;
          }
          return true;
        });
        images.sort(function (a, b) {
          return b.createdAt - a.createdAt;
        });
        setMap('media', synced);
        return Promise.all(puts);
      });
    });
  }

  return p.then(function () {
    if (changed) refreshAll();
    if (!mediaConfigured()) return;
    var jobs = [];
    /* Hapus di cloud: yang pernah tersinkron tapi sudah tidak ada di perangkat.
       (Dilewati jika penyimpanan perangkat tidak tersedia, agar tidak salah hapus.) */
    Object.keys(synced).forEach(function (id) {
      if (findImg(id) || !idb.ok) return;
      jobs.push(function () {
        return workerFetch('DELETE', id)
          .then(function () {
            return F.deleteDoc(F.doc(fb.db, 'users', uidNow, 'media', id));
          })
          .then(function () {
            delete synced[id];
            setMap('media', synced);
          });
      });
    });
    /* Unggah yang belum ada di cloud; perbarui catatan yang berubah */
    images.forEach(function (rec) {
      if (!rec.uploaded && rec.blob) {
        jobs.push(function () {
          return uploadRec(rec, uidNow).then(function () {
            synced[rec.id] = 1;
            setMap('media', synced);
          });
        });
      } else if (rec.uploaded && rec.metaDirty) {
        jobs.push(function () {
          return metaCloud(rec)
            .then(function (meta) {
              return F.setDoc(F.doc(fb.db, 'users', uidNow, 'media', rec.id), meta);
            })
            .then(function () {
              rec.metaDirty = false;
              return idb.put(rec);
            });
        });
      }
    });
    /* Satu per satu agar hemat kuota & koneksi */
    return jobs.reduce(function (q, job) {
      return q.then(function () {
        if (user && user.uid === uidNow) return job();
      });
    }, Promise.resolve());
  });
}

/* Ambil file dari R2 (lewat Worker) untuk media yang belum ada di perangkat ini */
function requestBlob(rec) {
  if (rec.blob || loadingBlob[rec.id] || !user || !fb || !mediaConfigured()) return;
  loadingBlob[rec.id] = true;
  if (rec.enc && !e2e.key) {
    delete loadingBlob[rec.id];
    return;
  }
  workerFetch('GET', rec.id)
    .then(function (res) {
      return res.blob();
    })
    .then(function (blob) {
      return rec.enc ? dekripsiBlob(e2e.key, blob, rec.type) : blob;
    })
    .then(function (blob) {
      rec.blob = blob;
      if (!rec.type) rec.type = blob.type;
      return idb.put(rec);
    })
    .then(function () {
      refreshAll();
    })
    .catch(function () {
      /* coba lagi saat dirender berikutnya */
    })
    .then(function () {
      delete loadingBlob[rec.id];
    });
}

/* =========================================================
   PEMELIHARAAN: hapus file R2 "yatim"
   File yatim = ada di R2 tetapi tidak punya catatan di Firestore, tidak ada di
   perangkat ini (misalnya sisa unggahan yang terputus).
   Hanya file yang berumur lebih dari 1 hari yang dihapus, agar unggahan yang
   sedang berjalan di perangkat lain tidak ikut terhapus.
   ========================================================= */
var BERSIH_JEDA = 7 * 86400000,
  BERSIH_UMUR = 86400000;
function kunciBersih(uidNow) {
  return 'stivora.bersih.' + uidNow;
}
function daftarFileCloud() {
  return authHeader()
    .then(function (h) {
      return fetch(MEDIA_WORKER_URL.replace(/\/+$/, '') + '/media', { headers: h });
    })
    .then(function (res) {
      if (!res.ok) {
        var e = new Error('HTTP ' + res.status);
        e.worker = true;
        throw e;
      }
      return res.json();
    })
    .then(function (j) {
      return Array.isArray(j.files) ? j.files : [];
    });
}
function bersihkanYatim(sumber) {
  if (!user || !fb || !mediaConfigured()) return Promise.resolve(null);
  var uidNow = user.uid,
    F = fb.F;
  return Promise.all([daftarFileCloud(), F.getDocs(F.collection(fb.db, 'users', uidNow, 'media'))])
    .then(function (r) {
      var files = r[0],
        simpan = {};
      r[1].forEach(function (doc) {
        simpan[doc.id] = 1;
      });
      images.forEach(function (im) {
        simpan[im.id] = 1;
      });
      var batas = Date.now() - BERSIH_UMUR;
      var yatim = files.filter(function (f) {
        return !simpan[f.id] && (f.uploaded || 0) < batas;
      });
      return yatim
        .reduce(function (p, f) {
          return p.then(function () {
            if (user && user.uid === uidNow) return workerFetch('DELETE', f.id);
          });
        }, Promise.resolve())
        .then(function () {
          store.set(kunciBersih(uidNow), Date.now());
          var hemat = yatim.reduce(function (n, f) {
            return n + (f.size || 0);
          }, 0);
          catatRiwayat(
            'bersih',
            true,
            yatim.length ? yatim.length + ' file yatim dihapus (' + ukuranFile(hemat) + ')' : 'Tidak ada file yatim'
          );
          return { dihapus: yatim.length, total: files.length, hemat: hemat };
        });
    })
    .catch(function (e) {
      if (sumber === 'manual') catatRiwayat('bersih', false, fbMsg(e));
      throw e;
    });
}
/* Otomatis: paling sering seminggu sekali, setelah sinkron yang berhasil */
function bersihOtomatis() {
  if (!user || !mediaConfigured() || !atur().media) return;
  if (Date.now() - store.get(kunciBersih(user.uid), 0) < BERSIH_JEDA) return;
  bersihkanYatim('otomatis').catch(function () {});
}
