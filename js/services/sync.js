/* Stivora — Layanan sinkron: data ⇄ Firestore */
'use strict';

/* ---------- Peta "terakhir tersinkron" (per akun) ---------- */
function mapKey(name) {
  return 'stivora.sync.' + name + '.' + user.uid;
}
function getMap(name) {
  var m = store.get(mapKey(name), {});
  return m && typeof m === 'object' ? m : {};
}
function setMap(name, m) {
  store.set(mapKey(name), m);
}

/* ---------- Sinkronisasi ---------- */
function schedulePush() {
  if (!user || !atur().otomatis) return;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(function () {
    syncNow(false).catch(function () {});
  }, 1500);
}

/* pull: false = kirim saja, true = ambil juga perubahan dari cloud (jika sinkron antar perangkat nyala),
   'paksa' = selalu ambil semuanya (pulihkan / ganti enkripsi).
   sumber: untuk riwayat — 'otomatis' (bawaan), 'manual', 'pulihkan', 'enkripsi-on', 'enkripsi-off' */
function syncNow(pull, sumber) {
  if (!user || !fb) return Promise.resolve();
  if (sync.running) {
    sync.again = pull === 'paksa' || sync.again === 'paksa' ? 'paksa' : sync.again || pull ? true : false;
    if (sumber && sumber !== 'otomatis') sync.againSumber = sumber;
    return sync.running;
  }
  sync.state = 'syncing';
  sync.err = '';
  refreshAccountSheet();
  var uidNow = user.uid;
  sync.running = doSync(pull, uidNow)
    .then(
      function () {
        if (!user || user.uid !== uidNow) return;
        sync.state = 'ok';
        sync.at = Date.now();
        if (pull) sync.lastPull = Date.now();
        catatRiwayat(sumber || 'otomatis', true);
        if (pull) setTimeout(bersihOtomatis, 3000);
        if (typeof cadanganHarianCek === 'function') setTimeout(cadanganHarianCek, 5000);
      },
      function (e) {
        sync.state = 'error';
        sync.err = fbMsg(e);
        if (user) catatRiwayat(sumber || 'otomatis', false, sync.err);
      }
    )
    .then(function () {
      sync.running = null;
      refreshAccountSheet();
      refreshAll();
      if (sync.again !== null) {
        var a = sync.again,
          sb = sync.againSumber;
        sync.again = null;
        sync.againSumber = null;
        return syncNow(a, sb);
      }
    });
  return sync.running;
}

function doSync(pull, uidNow) {
  var tarik = pull === 'paksa' || (!!pull && atur().antar);
  var media = pull === 'paksa' || atur().media;
  return imagesReady
    .then(function () {
      return e2eSiapkan(uidNow);
    })
    .then(function () {
      return hapusDreamsCloud(uidNow);
    })
    .then(function () {
      return tarik ? pullMarker(uidNow) : null;
    })
    .then(function () {
      return pushMarker(uidNow);
    })
    .then(function () {
      return tarik ? pullKoleksi(KOLEKSI_JALUR, uidNow) : null;
    })
    .then(function () {
      return pushKoleksi(KOLEKSI_JALUR, uidNow);
    })
    .then(function () {
      return tarik ? pullKoleksi(KOLEKSI_AREA, uidNow) : null;
    })
    .then(function () {
      return pushKoleksi(KOLEKSI_AREA, uidNow);
    })
    .then(function () {
      return tarik ? pullData(uidNow) : null;
    })
    .then(function () {
      return pushData(uidNow);
    })
    .then(function () {
      return media ? syncMedia(tarik, uidNow) : null;
    });
}

/* Ubah dokumen cloud ⇄ data biasa (dekripsi jika terenkripsi) */
function bukaDocImpian(r) {
  if (!r || typeof r.e !== 'string') return Promise.resolve(r);
  if (!e2e.key) return Promise.resolve(null); // tidak bisa dibaca: lewati
  return dekripsiJSON(e2e.key, r.e).then(
    function (x) {
      x.createdAt = r.createdAt;
      x.updatedAt = r.updatedAt;
      return x;
    },
    function () {
      return null;
    }
  );
}

/* 5.37.0: fitur impian lama (koleksi 'dreams') dihapus — sisa dokumennya di cloud dibersihkan sekali per akun */
function hapusDreamsCloud(uidNow) {
  if (getMap('dreams').dibersihkan) return Promise.resolve();
  var F = fb.F;
  return F.getDocs(F.collection(fb.db, 'users', uidNow, 'dreams'))
    .then(function (snap) {
      var ids = [],
        p = Promise.resolve();
      snap.forEach(function (d) {
        ids.push(d.id);
      });
      for (var i = 0; i < ids.length; i += 400)
        (function (ch) {
          p = p.then(function () {
            var b = F.writeBatch(fb.db);
            ch.forEach(function (id) {
              b.delete(F.doc(fb.db, 'users', uidNow, 'dreams', id));
            });
            return b.commit();
          });
        })(ids.slice(i, i + 400));
      return p;
    })
    .then(
      function () {
        if (user && user.uid === uidNow) setMap('dreams', { dibersihkan: 1 });
      },
      function () {}
    );
}

/* =========================================================
   Marker peta ⇄ Firestore: users/{uid}/marker/{id}
   Bentuk biasa atau terenkripsi { e, createdAt, updatedAt } (sama seperti impian).
   ========================================================= */
function markerKeRemote(m) {
  var r = {
    nama: String(m.nama || '').slice(0, 60) || 'Marker',
    ikon: String(m.ikon || 'titik').slice(0, 20),
    warna: String(m.warna || '#3b82f6').slice(0, 20),
    lon: Math.max(-180, Math.min(180, +m.lon || 0)),
    lat: Math.max(-90, Math.min(90, +m.lat || 0)),
    tanggal: /^\d{4}-\d{2}-\d{2}$/.test(m.tanggal || '') ? m.tanggal : '',
    catatan: String(m.catatan || '').slice(0, 2000),
    createdAt: Math.round(m.dibuat || Date.now()),
    updatedAt: Math.round(m.diubah || m.dibuat || Date.now())
  };
  return r;
}
function markerDariRemote(id, r) {
  return {
    id: id,
    nama: String(r.nama || 'Marker'),
    ikon: String(r.ikon || 'titik'),
    warna: String(r.warna || '#3b82f6'),
    lon: +r.lon || 0,
    lat: +r.lat || 0,
    tanggal: r.tanggal || '',
    catatan: r.catatan || '',
    dibuat: r.createdAt || Date.now(),
    diubah: r.updatedAt || Date.now()
  };
}
function hashMarker(m) {
  return JSON.stringify(markerKeRemote(m));
}
function tutupDocMarker(m) {
  var r = markerKeRemote(m);
  if (!e2eAktif()) return Promise.resolve(r);
  return enkripsiJSON(e2e.key, r).then(function (e) {
    return { e: e, createdAt: r.createdAt, updatedAt: r.updatedAt };
  });
}
function markerBerubahDariCloud() {
  store.set(K_MARKER, petaMarker);
  gambarMarker();
  renderMarkerDaftar();
}

function pullMarker(uidNow) {
  var F = fb.F;
  return F.getDocs(F.collection(fb.db, 'users', uidNow, 'marker')).then(function (snap) {
    if (!user || user.uid !== uidNow) return;
    var mentah = [];
    snap.forEach(function (doc) {
      mentah.push({ id: doc.id, data: doc.data() });
    });
    return Promise.all(
      mentah.map(function (m) {
        return bukaDocImpian(m.data);
      })
    ).then(function (isi) {
      if (!user || user.uid !== uidNow) return;
      var remote = {},
        takTerbaca = {};
      mentah.forEach(function (m, i) {
        if (isi[i]) remote[m.id] = isi[i];
        else takTerbaca[m.id] = 1;
      });
      var synced = getMap('marker'),
        changed = false;
      Object.keys(remote).forEach(function (id) {
        var local = mkCari(id),
          r = markerDariRemote(id, remote[id]);
        if (!local) {
          if (synced[id] !== undefined) return; // dihapus di perangkat ini → nanti dihapus dari cloud
          petaMarker.push(r);
          synced[id] = hashMarker(r);
          changed = true;
        } else if ((r.diubah || 0) > (local.diubah || 0)) {
          for (var k in r) local[k] = r[k];
          synced[id] = hashMarker(local);
          changed = true;
        } else if (hashMarker(local) === hashMarker(r)) {
          synced[id] = hashMarker(local);
        }
      });
      petaMarker = petaMarker.filter(function (m) {
        if (!remote[m.id] && !takTerbaca[m.id] && synced[m.id] !== undefined) {
          delete synced[m.id];
          changed = true;
          return false;
        } // dihapus di perangkat lain
        return true;
      });
      setMap('marker', synced);
      if (changed) markerBerubahDariCloud();
    });
  });
}

function pushMarker(uidNow) {
  var F = fb.F;
  var synced = getMap('marker');
  var ops = [];
  petaMarker.forEach(function (m) {
    var h = hashMarker(m);
    if (synced[m.id] !== h) ops.push({ set: m, h: h });
  });
  Object.keys(synced).forEach(function (id) {
    if (!mkCari(id)) ops.push({ del: id });
  });
  if (!ops.length) return Promise.resolve();
  var chunks = [];
  for (var i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
  return chunks.reduce(function (p, chunk) {
    return p
      .then(function () {
        return Promise.all(
          chunk.map(function (o) {
            return o.set ? tutupDocMarker(o.set) : null;
          })
        );
      })
      .then(function (isi) {
        var b = F.writeBatch(fb.db);
        chunk.forEach(function (o, i) {
          if (o.set) b.set(F.doc(fb.db, 'users', uidNow, 'marker', o.set.id), isi[i]);
          else b.delete(F.doc(fb.db, 'users', uidNow, 'marker', o.del));
        });
        return b.commit().then(function () {
          chunk.forEach(function (o) {
            if (o.set) synced[o.set.id] = o.h;
            else delete synced[o.del];
          });
          setMap('marker', synced);
        });
      });
  }, Promise.resolve());
}

/* =========================================================
   Perjalanan & area ⇄ Firestore: users/{uid}/jalur/{id} dan users/{uid}/area/{id}
   Satu mesin sinkron untuk keduanya (sama seperti marker: biasa atau terenkripsi { e, createdAt, updatedAt }).
   ========================================================= */
var KOLEKSI_JALUR = {
  nama: 'jalur',
  daftar: function () {
    return petaJalur;
  },
  ganti: function (a) {
    petaJalur = a;
  },
  cari: function (id) {
    return jalurCari(id);
  },
  keRemote: function (j) {
    return {
      nama: String(j.nama || '').slice(0, 60) || 'Perjalanan',
      warna: String(j.warna || '#ef4444').slice(0, 20),
      titik: (j.titik || []).slice(0, 50).map(function (x) {
        return String(x).slice(0, 64);
      }),
      kendaraan: (j.titik || []).slice(0, 50).map(function (x, i) {
        return String((j.kendaraan && j.kendaraan[i]) || '').slice(0, 24);
      }),
      berangkat: (j.titik || []).slice(0, 50).map(function (x, i) {
        return String((j.berangkat && j.berangkat[i]) || '').slice(0, 16);
      }),
      createdAt: Math.round(j.dibuat || Date.now()),
      updatedAt: Math.round(j.diubah || j.dibuat || Date.now())
    };
  },
  dariRemote: function (id, r) {
    return {
      id: id,
      nama: String(r.nama || 'Perjalanan'),
      warna: String(r.warna || '#ef4444'),
      titik: Array.isArray(r.titik) ? r.titik.map(String) : [],
      kendaraan: Array.isArray(r.kendaraan) ? r.kendaraan.map(String) : [],
      berangkat: Array.isArray(r.berangkat) ? r.berangkat.map(String) : [],
      dibuat: r.createdAt || Date.now(),
      diubah: r.updatedAt || Date.now()
    };
  },
  berubah: function () {
    store.set(K_JALUR, petaJalur);
    renderJalur();
    renderJalurDaftar();
  }
};
var KOLEKSI_AREA = {
  nama: 'area',
  daftar: function () {
    return petaArea;
  },
  ganti: function (a) {
    petaArea = a;
  },
  cari: function (id) {
    return areaCari(id);
  },
  keRemote: function (a) {
    var k = []; /* Firestore tidak menerima larik di dalam larik → [lon, lat, lon, lat, ...] */
    (a.titik || []).slice(0, 100).forEach(function (p) {
      k.push(Math.max(-180, Math.min(180, +p[0] || 0)), Math.max(-90, Math.min(90, +p[1] || 0)));
    });
    return {
      nama: String(a.nama || '').slice(0, 60) || 'Area',
      warna: String(a.warna || '#22c55e').slice(0, 20),
      catatan: String(a.catatan || '').slice(0, 2000),
      koordinat: k,
      createdAt: Math.round(a.dibuat || Date.now()),
      updatedAt: Math.round(a.diubah || a.dibuat || Date.now())
    };
  },
  dariRemote: function (id, r) {
    var t = [],
      k = Array.isArray(r.koordinat) ? r.koordinat : [];
    for (var i = 0; i + 1 < k.length; i += 2) t.push([+k[i], +k[i + 1]]);
    return {
      id: id,
      nama: String(r.nama || 'Area'),
      warna: String(r.warna || '#22c55e'),
      catatan: r.catatan || '',
      titik: t,
      dibuat: r.createdAt || Date.now(),
      diubah: r.updatedAt || Date.now()
    };
  },
  berubah: function () {
    store.set(K_AREA, petaArea);
    gambarArea();
    renderAreaDaftar();
  }
};
function hashKoleksi(K, x) {
  return JSON.stringify(K.keRemote(x));
}
function tutupDocKoleksi(K, x) {
  var r = K.keRemote(x);
  if (!e2eAktif()) return Promise.resolve(r);
  return enkripsiJSON(e2e.key, r).then(function (e) {
    return { e: e, createdAt: r.createdAt, updatedAt: r.updatedAt };
  });
}
function pullKoleksi(K, uidNow) {
  var F = fb.F;
  return F.getDocs(F.collection(fb.db, 'users', uidNow, K.nama)).then(function (snap) {
    if (!user || user.uid !== uidNow) return;
    var mentah = [];
    snap.forEach(function (doc) {
      mentah.push({ id: doc.id, data: doc.data() });
    });
    return Promise.all(
      mentah.map(function (m) {
        return bukaDocImpian(m.data);
      })
    ).then(function (isi) {
      if (!user || user.uid !== uidNow) return;
      var remote = {},
        takTerbaca = {};
      mentah.forEach(function (m, i) {
        if (isi[i]) remote[m.id] = isi[i];
        else takTerbaca[m.id] = 1;
      });
      var synced = getMap(K.nama),
        changed = false,
        daftar = K.daftar();
      Object.keys(remote).forEach(function (id) {
        var local = K.cari(id),
          r = K.dariRemote(id, remote[id]);
        if (!local) {
          if (synced[id] !== undefined) return; // dihapus di perangkat ini → nanti dihapus dari cloud
          daftar.push(r);
          synced[id] = hashKoleksi(K, r);
          changed = true;
        } else if ((r.diubah || 0) > (local.diubah || 0)) {
          for (var k in r) local[k] = r[k];
          synced[id] = hashKoleksi(K, local);
          changed = true;
        } else if (hashKoleksi(K, local) === hashKoleksi(K, r)) {
          synced[id] = hashKoleksi(K, local);
        }
      });
      K.ganti(
        daftar.filter(function (x) {
          if (!remote[x.id] && !takTerbaca[x.id] && synced[x.id] !== undefined) {
            delete synced[x.id];
            changed = true;
            return false;
          } // dihapus di perangkat lain
          return true;
        })
      );
      setMap(K.nama, synced);
      if (changed) K.berubah();
    });
  });
}
function pushKoleksi(K, uidNow) {
  var F = fb.F;
  var synced = getMap(K.nama),
    ops = [];
  K.daftar().forEach(function (x) {
    var h = hashKoleksi(K, x);
    if (synced[x.id] !== h) ops.push({ set: x, h: h });
  });
  Object.keys(synced).forEach(function (id) {
    if (!K.cari(id)) ops.push({ del: id });
  });
  if (!ops.length) return Promise.resolve();
  var chunks = [];
  for (var i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
  return chunks.reduce(function (p, chunk) {
    return p
      .then(function () {
        return Promise.all(
          chunk.map(function (o) {
            return o.set ? tutupDocKoleksi(K, o.set) : null;
          })
        );
      })
      .then(function (isi) {
        var b = F.writeBatch(fb.db);
        chunk.forEach(function (o, i) {
          if (o.set) b.set(F.doc(fb.db, 'users', uidNow, K.nama, o.set.id), isi[i]);
          else b.delete(F.doc(fb.db, 'users', uidNow, K.nama, o.del));
        });
        return b.commit().then(function () {
          chunk.forEach(function (o) {
            if (o.set) synced[o.set.id] = o.h;
            else delete synced[o.del];
          });
          setMap(K.nama, synced);
        });
      });
  }, Promise.resolve());
}

/* =========================================================
   Data tab Impian ⇄ Firestore: users/{uid}/data/{nama}  (5.31.1)
   Satu dokumen per data: { isi: JSON-teks, updatedAt } atau terenkripsi { e, updatedAt }.
   Yang menang = yang paling baru diubah (per data). Waktu ubah lokal dicatat otomatis
   setiap kali store.set dipanggil untuk kunci di bawah, lalu sinkron dijadwalkan.
   ========================================================= */
var DATA_SINKRON = [
  { nama: 'impian-profil', k: 'stivora.impian.profil' },
  { nama: 'impian-daftar', k: 'stivora.impian.daftar' },
  { nama: 'impian-utama', k: 'stivora.impian.utama' },
  { nama: 'impian-progress', k: 'stivora.impian.progress' },
  { nama: 'impian-keyakinan', k: 'stivora.impian.keyakinan' },
  { nama: 'sumberdaya-waktu', k: 'stivora.sumberdaya.waktu' },
  { nama: 'sumberdaya-tampil', k: 'stivora.sumberdaya.tampil' },
  { nama: 'sumberdaya-info', k: 'stivora.sumberdaya.info' },
  { nama: 'peristiwa', k: 'stivora.peristiwa' },
  { nama: 'keuangan-atur', k: 'stivora.keuangan.atur' },
  { nama: 'keuangan-hutang', k: 'stivora.keuangan.hutang' },
  { nama: 'galery-banner', k: 'stivora.galery.banner' },
  { nama: 'galery-pola', k: 'stivora.galery.pola' },
  { nama: 'galery-lainnya', k: 'stivora.galery.lainnya' },
  { nama: 'galery-folder', k: 'stivora.galery.folder' },
  { nama: 'galery-buku', k: 'stivora.galery.buku' },
  { nama: 'galery-tempat', k: 'stivora.galery.tempat' },
  { nama: 'galery-channel', k: 'stivora.galery.channel' },
  { nama: 'galery-tokoh', k: 'stivora.galery.tokoh' },
  { nama: 'galery-link', k: 'stivora.galery.link' },
  { nama: 'impian-proyek', k: 'stivora.impian.proyek' },
  { nama: 'impian-rencana', k: 'stivora.impian.rencana' }
];
/* Transaksi keuangan disimpan per tahun: 'stivora.keuangan.tx.2026' ⇄ dokumen 'keuangan-tx-2026' */
var DATA_TX_RE = /^stivora\.keuangan\.tx\.(\d{4})$/;
function dataKunciSah(k) {
  return (
    DATA_SINKRON.some(function (d) {
      return d.k === k;
    }) || DATA_TX_RE.test(k)
  );
}
function dataNamaKunci(nama) {
  var d = DATA_SINKRON.filter(function (x) {
    return x.nama === nama;
  })[0];
  if (d) return d.k;
  var m = /^keuangan-tx-(\d{4})$/.exec(nama);
  return m ? 'stivora.keuangan.tx.' + m[1] : '';
}
function dataKunciNama(k) {
  var d = DATA_SINKRON.filter(function (x) {
    return x.k === k;
  })[0];
  if (d) return d.nama;
  var m = DATA_TX_RE.exec(k);
  return m ? 'keuangan-tx-' + m[1] : '';
}
/* Semua data yang disinkron: tetap + transaksi tiap tahun yang ada di perangkat / pernah dicatat waktunya */
function dataDaftar() {
  var o = DATA_SINKRON.map(function (d) {
      return { nama: d.nama, k: d.k };
    }),
    ada = {},
    w = dataWaktu();
  o.forEach(function (d) {
    ada[d.k] = 1;
  });
  var tambah = function (k) {
    if (!ada[k] && DATA_TX_RE.test(k)) {
      ada[k] = 1;
      o.push({ nama: dataKunciNama(k), k: k });
    }
  };
  store.kunci('stivora.keuangan.tx.').forEach(tambah);
  Object.keys(w).forEach(tambah);
  return o;
}
var K_DATA_WAKTU = 'stivora.data.waktu',
  dataSiap = false,
  dataTerap = false;
function dataWaktu() {
  try {
    var w = JSON.parse(localStorage.getItem(K_DATA_WAKTU) || '{}');
    return w && typeof w === 'object' ? w : {};
  } catch (e) {
    return {};
  }
}
function setDataWaktu(w) {
  try {
    localStorage.setItem(K_DATA_WAKTU, JSON.stringify(w));
  } catch (e) {}
}
/* ---------- Data besar dipecah: satu dokumen cloud per item (5.34.0 hexagon, 5.35.0 fase, 5.56.0 pola pikir) ----------
   Di HP tetap satu kunci. Di cloud dipecah supaya tidak melewati batas 1 MB per dokumen Firestore:
     <doc><id>   { isi: '{"id":..,"h":{..}|null}' }        (null = item dihapus)
     <urut>      { isi: '["id1",..]' }  atau  '{"ids":[..],"kepala":{..}}'  (urutan + isi selain daftar)
   Waktu ubah per item di dataWaktu: '<w><id>' dan '<w>@urutan'. Dokumen lama satu-kunci dibaca lalu dihapus. */
var PECAHAN = [
  {
    k: 'stivora.impian.daftar',
    w: 'hex:',
    doc: 'impian-h-',
    urut: 'impian-urutan',
    lama: 'impian-daftar',
    jejak: 'stivora.sinkron.hexjejak',
    ambil: function (v) {
      return Array.isArray(v) ? v : [];
    },
    kepala: function () {
      return null;
    },
    rakit: function (items) {
      return items;
    }
  },
  {
    k: 'stivora.impian.progress',
    w: 'fase:',
    doc: 'impian-f-',
    urut: 'impian-progress-urutan',
    lama: 'impian-progress',
    jejak: 'stivora.sinkron.fasejejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.fase) ? v.fase : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'fase') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.fase = items;
      return o;
    }
  },
  /* Pola Pikir (5.56.0): satu dokumen per kartu; koneksi & kartu hari ini ikut di dokumen urutan */
  {
    k: 'stivora.galery.pola',
    w: 'pola:',
    doc: 'pola-i-',
    urut: 'pola-urutan',
    lama: 'galery-pola',
    jejak: 'stivora.sinkron.polajejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.item) ? v.item : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'item') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.item = items;
      return o;
    }
  },
  /* Readlist Buku (5.59.0): satu dokumen per buku (kemajuan, sesi, kutipan); target tahunan di dokumen urutan */
  {
    k: 'stivora.galery.buku',
    w: 'buku:',
    doc: 'buku-b-',
    urut: 'buku-urutan',
    lama: 'galery-buku',
    jejak: 'stivora.sinkron.bukujejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.item) ? v.item : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'item') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.item = items;
      return o;
    }
  },
  /* Tempat Favorit (5.60.0): satu dokumen per tempat (kunjungan dll.); daftar koleksi di dokumen urutan */
  {
    k: 'stivora.galery.tempat',
    w: 'tempat:',
    doc: 'tempat-t-',
    urut: 'tempat-urutan',
    lama: 'galery-tempat',
    jejak: 'stivora.sinkron.tempatjejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.item) ? v.item : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'item') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.item = items;
      return o;
    }
  },
  /* Channel Favorit (5.61.0): satu dokumen per kreator; topik tambahan di dokumen urutan */
  {
    k: 'stivora.galery.channel',
    w: 'channel:',
    doc: 'channel-c-',
    urut: 'channel-urutan',
    lama: 'galery-channel',
    jejak: 'stivora.sinkron.channeljejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.item) ? v.item : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'item') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.item = items;
      return o;
    }
  },
  /* Tokoh Favorit (5.62.0): satu dokumen per tokoh; bidang tambahan di dokumen urutan */
  {
    k: 'stivora.galery.tokoh',
    w: 'tokoh:',
    doc: 'tokoh-t-',
    urut: 'tokoh-urutan',
    lama: 'galery-tokoh',
    jejak: 'stivora.sinkron.tokohjejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.item) ? v.item : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'item') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.item = items;
      return o;
    }
  },
  /* Koleksi Link (5.63.0): satu dokumen per link; folder & label di dokumen urutan */
  {
    k: 'stivora.galery.link',
    w: 'link:',
    doc: 'link-l-',
    urut: 'link-urutan',
    lama: 'galery-link',
    jejak: 'stivora.sinkron.linkjejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.item) ? v.item : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'item') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.item = items;
      return o;
    }
  },
  /* Proyek Software (5.68.0): satu dokumen per proyek */
  {
    k: 'stivora.impian.proyek',
    w: 'proyek:',
    doc: 'proyek-p-',
    urut: 'proyek-urutan',
    lama: 'impian-proyek',
    jejak: 'stivora.sinkron.proyekjejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.item) ? v.item : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'item') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.item = items;
      return o;
    }
  },
  /* Rencana cadangan (5.68.0): satu dokumen per rencana; buku (aktif, pelajaran) di dokumen urutan */
  {
    k: 'stivora.impian.rencana',
    w: 'rencana:',
    doc: 'rencana-r-',
    urut: 'rencana-urutan',
    lama: 'impian-rencana',
    jejak: 'stivora.sinkron.rencanajejak',
    ambil: function (v) {
      return v && typeof v === 'object' && Array.isArray(v.item) ? v.item : [];
    },
    kepala: function (v) {
      if (!v || typeof v !== 'object') return null;
      var o = {};
      Object.keys(v).forEach(function (x) {
        if (x !== 'item') o[x] = v[x];
      });
      return o;
    },
    rakit: function (items, kepala) {
      if (!kepala && !items.length) return null;
      var o = {};
      Object.keys(kepala || {}).forEach(function (x) {
        o[x] = kepala[x];
      });
      o.item = items;
      return o;
    }
  }
];
function pcUntukKunci(k) {
  for (var i = 0; i < PECAHAN.length; i++) if (PECAHAN[i].k === k) return PECAHAN[i];
  return null;
}
function pcUntukDoc(nama) {
  for (var i = 0; i < PECAHAN.length; i++) {
    var p = PECAHAN[i];
    if (nama === p.urut) return { p: p, urut: true };
    if (nama.indexOf(p.doc) === 0) return { p: p, urut: false };
  }
  return null;
}
function hexHash(t) {
  var h = 2166136261;
  for (var i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + t.length.toString(36);
}
function pcNamaDoc(p, id) {
  id = String(id);
  return p.doc + (/^[A-Za-z0-9_-]{1,60}$/.test(id) ? id : 'x' + hexHash(id));
}
function pcNilai(p) {
  return store.get(p.k, null);
}
function pcItems(p, v) {
  return p
    .ambil(v === undefined ? pcNilai(p) : v)
    .filter(function (x) {
      return x && typeof x === 'object';
    })
    .map(function (x, i) {
      if (x.id == null)
        x.id =
          (p.w === 'fase:'
            ? 'f'
            : p.w === 'pola:'
              ? 'p'
              : p.w === 'buku:'
                ? 'b'
                : p.w === 'tempat:'
                  ? 't'
                  : p.w === 'channel:'
                    ? 'c'
                    : p.w === 'tokoh:'
                      ? 'k'
                      : p.w === 'link:'
                        ? 'l'
                        : p.w === 'proyek:'
                          ? 'p'
                          : p.w === 'rencana:'
                            ? 'r'
                        : 'h') + i;
      return x;
    });
}
function pcUrutIsi(p, v) {
  return {
    ids: pcItems(p, v).map(function (x) {
      return String(x.id);
    }),
    kepala: p.kepala(v)
  };
}
function pcUrutHash(p, v) {
  var u = pcUrutIsi(p, v);
  return hexHash(JSON.stringify(u));
}
function pcJejak(p) {
  var j = store.get(p.jejak, null);
  return j && typeof j === 'object' && j.h && typeof j.h === 'object' ? j : null;
}
function pcSimpanJejak(p, j) {
  var tl = dataTerap;
  dataTerap = true;
  try {
    store.set(p.jejak, j);
  } finally {
    dataTerap = tl;
  }
}
/* Bandingkan isi sekarang dengan jejak terakhir; item yang berubah/dihapus diberi waktu ubah.
   waktuTetap (angka) dipakai saat data datang dari dokumen lama / saat memuat; tanpa itu = perubahan lokal. */
function pcCatat(p, waktuTetap) {
  var v = pcNilai(p),
    arr = pcItems(p, v),
    j = pcJejak(p) || { h: {}, u: '' },
    w = dataWaktu(),
    ada = {},
    ubah = false;
  var beri = function (key) {
    var lama = w[key] || 0;
    w[key] = waktuTetap ? Math.max(waktuTetap, lama) : dataSiap ? Math.max(Date.now(), lama + 1) : lama || 1;
    ubah = true;
  };
  arr.forEach(function (x) {
    var id = String(x.id),
      h = hexHash(JSON.stringify(x));
    ada[id] = 1;
    if (j.h[id] !== h) {
      j.h[id] = h;
      beri(p.w + id);
    }
  });
  Object.keys(j.h).forEach(function (id) {
    if (!ada[id]) {
      delete j.h[id];
      beri(p.w + id);
    }
  });
  var u = pcUrutHash(p, v);
  if (j.u !== u) {
    j.u = u;
    beri(p.w + '@urutan');
  }
  pcSimpanJejak(p, j);
  if (ubah) {
    setDataWaktu(w);
    if (dataSiap && !waktuTetap && typeof schedulePush === 'function') schedulePush();
  }
}
/* Jejak dibangun ulang dari isi sekarang tanpa menandai perubahan (setelah data dari cloud dipasang) */
function pcJejakUlang(p) {
  var v = pcNilai(p),
    j = { h: {}, u: pcUrutHash(p, v) };
  pcItems(p, v).forEach(function (x) {
    j.h[String(x.id)] = hexHash(JSON.stringify(x));
  });
  pcSimpanJejak(p, j);
}
/* Saat memuat: pertama kali → item lama diberi waktu ubah kunci lama; sudah pernah → cocokkan lagi */
function pcSiapkan(p) {
  var w = dataWaktu(),
    t = w[p.k] || 0;
  if (pcJejak(p)) {
    pcCatat(p, t || 1);
    return;
  }
  if (t) {
    pcItems(p).forEach(function (x) {
      var k = p.w + x.id;
      if (!w[k]) w[k] = t;
    });
    if (!w[p.w + '@urutan']) w[p.w + '@urutan'] = t;
    setDataWaktu(w);
  }
  pcJejakUlang(p);
}
function pcCatatSemua() {
  PECAHAN.forEach(function (p) {
    pcCatat(p);
  });
}
/* Item yang perlu dikirim: { nama, kw, isi } */
function pcOps(p, synced, w) {
  var v = pcNilai(p),
    per = {},
    o = [];
  pcItems(p, v).forEach(function (x) {
    per[String(x.id)] = x;
  });
  Object.keys(w).forEach(function (kw) {
    if (kw.indexOf(p.w) !== 0 || !w[kw] || synced[kw] === w[kw]) return;
    var id = kw.slice(p.w.length);
    if (id === '@urutan') {
      var u = pcUrutIsi(p, v);
      o.push({ nama: p.urut, kw: kw, isi: JSON.stringify(p.w === 'hex:' ? u.ids : u) }); /* hexagon: format 5.34.0 tetap */
    } else if (id.charAt(0) !== '@') o.push({ nama: pcNamaDoc(p, id), kw: kw, isi: JSON.stringify({ id: id, h: per[id] || null }) });
  });
  return o;
}
/* Pasang item dari cloud: perubahan = [{ id, h|null, t }], urutan = { ids, kepala, t } | null */
function pcTerap(p, perubahan, urutan, synced) {
  if (!perubahan.length && !urutan) return false;
  var v = pcNilai(p),
    arr = pcItems(p, v),
    per = {},
    urutLokal = arr.map(function (x) {
      return String(x.id);
    }),
    w = dataWaktu(),
    tMaks = w[p.k] || 0;
  arr.forEach(function (x) {
    per[String(x.id)] = x;
  });
  perubahan.forEach(function (c) {
    if (c.h && typeof c.h === 'object') {
      if (c.h.id == null) c.h.id = c.id;
      per[c.id] = c.h;
    } else delete per[c.id];
    w[p.w + c.id] = c.t;
    synced[p.w + c.id] = c.t;
    tMaks = Math.max(tMaks, c.t);
  });
  var ku = p.w + '@urutan';
  if (urutan) {
    w[ku] = urutan.t;
    synced[ku] = urutan.t;
    tMaks = Math.max(tMaks, urutan.t);
  }
  setDataWaktu(w);
  var urut = (urutan ? urutan.ids : urutLokal).concat(urutLokal, Object.keys(per)),
    sudah = {},
    hasil = [];
  urut.forEach(function (id) {
    id = String(id);
    if (!sudah[id] && per[id]) {
      sudah[id] = 1;
      hasil.push(per[id]);
    }
  });
  var kepala = urutan ? (urutan.kepala === undefined ? p.kepala(v) : urutan.kepala) : p.kepala(v);
  terapData(p.k, p.rakit(hasil, kepala), tMaks);
  pcJejakUlang(p);
  /* Hasil gabungan beda dari urutan cloud (ada item baru dari sini) → kirim urutan baru */
  if (
    urutan &&
    JSON.stringify(
      hasil.map(function (x) {
        return String(x.id);
      })
    ) !== JSON.stringify(urutan.ids.map(String))
  ) {
    var w2 = dataWaktu();
    w2[ku] = Math.max(Date.now(), (w2[ku] || 0) + 1);
    setDataWaktu(w2);
  }
  return true;
}
(function () {
  /* Data lama (sebelum sinkron ini ada) diberi waktu 1 → kalah dari salinan cloud mana pun */
  var w = dataWaktu(),
    ubah = false;
  dataDaftar().forEach(function (d) {
    if (!w[d.k] && store.ada(d.k)) {
      w[d.k] = 1;
      ubah = true;
    }
  });
  if (ubah) setDataWaktu(w);
  PECAHAN.forEach(pcSiapkan);
  var asli = store.set;
  store.set = function (k, v) {
    var ok = asli.call(store, k, v);
    if (!dataTerap && dataKunciSah(k)) {
      var w2 = dataWaktu();
      /* Tulisan saat aplikasi baru dimuat (migrasi / bawaan) tidak dianggap perubahan baru */
      w2[k] = dataSiap ? Math.max(Date.now(), (w2[k] || 0) + 1) : w2[k] || 1;
      setDataWaktu(w2);
      var pc = pcUntukKunci(k);
      if (pc) pcCatat(pc);
      if (dataSiap && typeof schedulePush === 'function') schedulePush();
    }
    return ok;
  };
  /* Tulisan selama aplikasi dimuat (migrasi/bawaan) bukan perubahan baru; setelah semua skrip siap, baru dihitung */
  if (window.STIVORA_SIAP) dataSiap = true;
  else
    document.addEventListener('stivora:siap', function () {
      dataSiap = true;
    });
})();
/* Gambar ulang semua tampilan tab Impian setelah data dari cloud / cadangan masuk */
function segarkanDataImpian() {
  try {
    if (typeof renderImProfil === 'function') renderImProfil();
  } catch (e) {}
  try {
    if (typeof renderPg === 'function') renderPg();
  } catch (e) {}
  try {
    if (typeof renderPry === 'function') renderPry();
  } catch (e) {}
  try {
    if (typeof renderRc === 'function') renderRc();
  } catch (e) {}
  try {
    if (typeof sdBukuSidik !== 'undefined') sdBukuSidik = '';
    if (typeof renderSdAnalog === 'function') {
      renderSdAnalog();
      renderSdBuku();
    }
  } catch (e) {}
  try {
    if (typeof peSegarkan === 'function') peSegarkan();
  } catch (e) {}
  try {
    if (typeof renderKeuangan === 'function') renderKeuangan();
  } catch (e) {}
  try {
    if (typeof renderGaleryBanner === 'function') renderGaleryBanner();
  } catch (e) {}
  try {
    if (typeof gfSegarkan === 'function') gfSegarkan();
  } catch (e) {}
  try {
    if (typeof renderGaleryTab === 'function') renderGaleryTab();
  } catch (e) {}
  try {
    if (typeof lgSegarkan === 'function') lgSegarkan();
  } catch (e) {}
  try {
    if (typeof bkSegarkan === 'function') bkSegarkan();
  } catch (e) {}
  try {
    if (typeof tpSegarkan === 'function') tpSegarkan();
  } catch (e) {}
  try {
    if (typeof chSegarkan === 'function') chSegarkan();
  } catch (e) {}
  try {
    if (typeof tkSegarkan === 'function') tkSegarkan();
  } catch (e) {}
  try {
    if (typeof lkSegarkan === 'function') lkSegarkan();
  } catch (e) {}
}
/* Pasang isi data tanpa menandainya sebagai perubahan lokal baru */
function terapData(k, nilai, waktu) {
  dataTerap = true;
  try {
    if (nilai === null || nilai === undefined) store.hapus(k);
    else store.set(k, nilai);
  } finally {
    dataTerap = false;
  }
  var w = dataWaktu();
  w[k] = waktu;
  setDataWaktu(w);
}
function pullData(uidNow) {
  var F = fb.F;
  return F.getDocs(F.collection(fb.db, 'users', uidNow, 'data')).then(function (snap) {
    if (!user || user.uid !== uidNow) return;
    var mentah = [];
    snap.forEach(function (doc) {
      mentah.push({ id: doc.id, data: doc.data() });
    });
    return Promise.all(
      mentah.map(function (m) {
        return bukaDocImpian(m.data);
      })
    ).then(function (isi) {
      if (!user || user.uid !== uidNow) return;
      var synced = getMap('data'),
        w = dataWaktu(),
        changed = false,
        pc = {};
      PECAHAN.forEach(function (p) {
        pc[p.k] = { ubah: [], urutan: null, lama: false };
      });
      mentah.forEach(function (m, i) {
        var r = isi[i];
        if (!r || typeof r.isi !== 'string') return; /* tidak bisa dibuka */
        var tR = +r.updatedAt || 0,
          nilai,
          cari = pcUntukDoc(m.id);
        /* Dokumen pecahan (per hexagon / per fase + urutan) */
        if (cari) {
          var p = cari.p,
            c = pc[p.k];
          try {
            nilai = JSON.parse(r.isi);
          } catch (e) {
            return;
          }
          if (cari.urut) {
            var u = Array.isArray(nilai)
              ? { ids: nilai }
              : nilai && Array.isArray(nilai.ids)
                ? { ids: nilai.ids, kepala: nilai.kepala || null }
                : null;
            if (!u) return;
            var ku = p.w + '@urutan';
            if (tR > (w[ku] || 0)) {
              u.t = tR;
              c.urutan = u;
            } else if (tR === w[ku]) synced[ku] = tR;
          } else {
            if (!nilai || nilai.id == null) return;
            var kw = p.w + nilai.id;
            if (tR > (w[kw] || 0)) c.ubah.push({ id: String(nilai.id), h: nilai.h, t: tR });
            else if (tR === w[kw]) synced[kw] = tR;
          }
          return;
        }
        var d = { k: dataNamaKunci(m.id) };
        if (!d.k) return; /* tidak dikenal */
        var tL = w[d.k] || 0,
          pl = pcUntukKunci(d.k);
        if (pl) {
          /* Dokumen lama satu-kunci (sebelum dipecah): dipasang kalau lebih baru, lalu dihapus dari cloud */
          pc[d.k].lama = true;
          if (tR > tL) {
            try {
              nilai = JSON.parse(r.isi);
            } catch (e) {
              return;
            }
            terapData(d.k, nilai, tR);
            pcCatat(pl, tR);
            changed = true;
          }
          return;
        }
        if (tR > tL) {
          try {
            nilai = JSON.parse(r.isi);
          } catch (e) {
            return;
          }
          terapData(d.k, nilai, tR);
          synced[d.k] = tR;
          changed = true;
        } else if (tR === tL) synced[d.k] = tR;
      });
      PECAHAN.forEach(function (p) {
        var c = pc[p.k];
        if (pcTerap(p, c.ubah, c.urutan, synced)) changed = true;
        synced[p.w + '@lama'] = c.lama ? 0 : 1; /* 0 = dokumen lama masih ada → dihapus saat kirim */
      });
      setMap('data', synced);
      if (changed) segarkanDataImpian();
    });
  });
}
/* Batas Firestore 1 MB per dokumen. Peringatan sejak 70% agar tidak gagal diam-diam. */
var K_DOC_BESAR = 'stivora.sinkron.besar',
  DOC_MAKS = 1048576,
  DOC_PERINGATAN = 0.7;
function docBesar() {
  try {
    var o = JSON.parse(localStorage.getItem(K_DOC_BESAR) || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch (e) {
    return {};
  }
}
function namaDocRamah(k) {
  var m = /keuangan\.tx\.(\d{4})$/.exec(k);
  if (m) return 'Transaksi keuangan ' + m[1];
  var peta = {
    'stivora.keuangan.atur': 'Pengaturan keuangan',
    'stivora.keuangan.hutang': 'Hutang',
    'stivora.galery.lainnya': 'Galery › Lainnya',
    'stivora.galery.banner': 'Banner Galery',
    'stivora.galery.folder': 'Folder Galery',
    'stivora.impian.profil': 'Profil impian',
    'stivora.impian.utama': 'Impian utama',
    'stivora.peristiwa': 'Peristiwa peta'
  };
  return peta[k] || String(k).replace(/^stivora\./, '');
}
function cekUkuranDoc(ops, isi) {
  var o = docBesar(),
    ubah = false,
    enc = typeof TextEncoder === 'function' ? new TextEncoder() : null;
  ops.forEach(function (d, i) {
    var x = isi[i].e || isi[i].isi || '',
      b = (enc ? enc.encode(x).length : x.length * 2) + 300,
      lama = o[d.kw];
    if (b >= DOC_MAKS * DOC_PERINGATAN) {
      if (!lama || Math.floor((b / DOC_MAKS) * 10) > Math.floor((lama / DOC_MAKS) * 10)) {
        catatGalat({
          pesan:
            'Data "' + namaDocRamah(d.kw) + '" hampir penuh: ' + Math.round(b / 1024) + ' KB dari batas 1024 KB per dokumen sinkron. Kalau penuh, data ini tidak bisa dicadangkan ke cloud.',
          sumber: 'sync.js',
          jenis: 'peringatan'
        });
      }
      if (lama !== b) {
        o[d.kw] = b;
        ubah = true;
      }
    } else if (lama) {
      delete o[d.kw];
      ubah = true;
    }
  });
  if (ubah) {
    try {
      localStorage.setItem(K_DOC_BESAR, JSON.stringify(o));
    } catch (e) {}
    if (typeof renderCadanganBesar === 'function') renderCadanganBesar();
  }
}
function docBesarTeks() {
  var o = docBesar();
  return Object.keys(o)
    .sort(function (a, b) {
      return o[b] - o[a];
    })
    .map(function (k) {
      return namaDocRamah(k) + ' (' + Math.round((o[k] / DOC_MAKS) * 100) + '% penuh)';
    });
}
/* Batas Firestore: 500 tulisan & ±10 MB per batch → dipecah aman di 400 tulisan / 4 MB */
var DATA_BATCH_N = 400,
  DATA_BATCH_B = 4000000;
function pushData(uidNow) {
  var F = fb.F;
  var synced = getMap('data'),
    w = dataWaktu();
  var ops = dataDaftar()
    .filter(function (d) {
      return !pcUntukKunci(d.k) && w[d.k] && synced[d.k] !== w[d.k];
    })
    .map(function (d) {
      var raw = store.raw(d.k);
      return { nama: d.nama, kw: d.k, isi: raw == null ? 'null' : raw };
    });
  PECAHAN.forEach(function (p) {
    ops = ops.concat(pcOps(p, synced, w));
  });
  var hapusLama = PECAHAN.filter(function (p) {
    return synced[p.w + '@lama'] === 0;
  });
  if (!ops.length && !hapusLama.length) return Promise.resolve();
  return Promise.all(
    ops.map(function (d) {
      var r = { isi: d.isi, updatedAt: Math.round(w[d.kw]) };
      if (!e2eAktif()) return Promise.resolve(r);
      return enkripsiJSON(e2e.key, r).then(function (e) {
        return { e: e, updatedAt: r.updatedAt };
      });
    })
  ).then(function (isi) {
    cekUkuranDoc(ops, isi);
    var grup = [],
      g = null;
    ops.forEach(function (d, i) {
      var b = (isi[i].e || isi[i].isi).length + 200;
      if (!g || g.n >= DATA_BATCH_N || (g.b + b > DATA_BATCH_B && g.n)) {
        g = { n: 0, b: 0, i: [] };
        grup.push(g);
      }
      g.n++;
      g.b += b;
      g.i.push(i);
    });
    return grup
      .reduce(function (p, gr) {
        return p.then(function () {
          if (!user || user.uid !== uidNow) return;
          var b = F.writeBatch(fb.db);
          gr.i.forEach(function (i) {
            b.set(F.doc(fb.db, 'users', uidNow, 'data', ops[i].nama), isi[i]);
          });
          return b.commit().then(function () {
            gr.i.forEach(function (i) {
              synced[ops[i].kw] = isi[i].updatedAt;
            });
            setMap('data', synced);
          });
        });
      }, Promise.resolve())
      .then(function () {
        if (!hapusLama.length || !user || user.uid !== uidNow) return;
        /* Semua item sudah ada di format pecahan → dokumen lama dihapus */
        return Promise.all(
          hapusLama.map(function (p) {
            var siap =
              pcItems(p).every(function (x) {
                var k = p.w + x.id;
                return synced[k] && synced[k] === w[k];
              }) && synced[p.w + '@urutan'] === w[p.w + '@urutan'];
            if (!siap) return;
            return F.deleteDoc(F.doc(fb.db, 'users', uidNow, 'data', p.lama))
              .then(function () {
                synced[p.w + '@lama'] = 1;
                setMap('data', synced);
              })
              .catch(function () {});
          })
        );
      });
  });
}
/* Isi semua data tab Impian (untuk file cadangan) */
function dataImpianEkspor() {
  var o = {};
  dataDaftar().forEach(function (d) {
    var v = store.get(d.k, null);
    if (v !== null) o[d.k] = v;
  });
  return o;
}
function dataImpianImpor(o) {
  var lokal = dataDaftar();
  Object.keys(o).forEach(function (k) {
    if (dataKunciSah(k)) store.set(k, o[k]);
  });
  lokal.forEach(function (d) {
    if (!Object.prototype.hasOwnProperty.call(o, d.k) && store.ada(d.k)) {
      dataTerap = true;
      try {
        store.hapus(d.k);
      } finally {
        dataTerap = false;
      }
      var w = dataWaktu();
      w[d.k] = Date.now();
      setDataWaktu(w);
      if (typeof schedulePush === 'function') schedulePush();
    }
  });
  pcCatatSemua();
  segarkanDataImpian();
}
function dataImpianKosongkan() {
  dataTerap = true;
  try {
    dataDaftar().forEach(function (d) {
      store.hapus(d.k);
    });
    PECAHAN.forEach(function (p) {
      store.hapus(p.jejak);
    });
  } finally {
    dataTerap = false;
  }
  setDataWaktu({});
  segarkanDataImpian();
}
