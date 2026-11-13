/* Stivora — Penyimpanan: data di IndexedDB + jurnal localStorage (store), media di IndexedDB (idb) */
'use strict';

/* ---------- Penyimpanan data (5.33.0) ----------
   Data utama disimpan di IndexedDB (database 'stivora-data', kapasitas besar) dan dibaca dari memori.
   Agar tidak ada perubahan yang hilang saat aplikasi tiba-tiba ditutup:
     1. setiap perubahan langsung ditulis ke JURNAL di localStorage ('stivora~j~<kunci>'),
     2. lalu disimpan ke IndexedDB,
     3. jurnal dihapus setelah IndexedDB memastikan tersimpan (transaksi selesai),
     4. saat dibuka, jurnal yang tertinggal diputar ulang ke IndexedDB.
   Beberapa pengaturan kecil yang dibutuhkan sebelum aplikasi dimuat tetap di localStorage (LS_TETAP).
   Bila IndexedDB tidak tersedia, semua kembali memakai localStorage seperti sebelumnya. */
var LS_TETAP = ['stivora.theme', 'stivora.tema', 'stivora.lang', 'stivora.kunci', 'stivora.galat', 'stivora.data.waktu'];
var JURNAL = 'stivora~j~';
var dataDb = {
  mode: 'memuat' /* 'memuat' | 'idb' | 'ls' */,
  mem: Object.create(null),
  db: null,
  seq: 0,
  tunda: Object.create(null),
  timer: null,
  sibuk: false,
  gagalTampil: false,
  jurnalPenuh: false,
  bc: null,
  siapP: null
};
function lsTetap(k) {
  return LS_TETAP.indexOf(k) >= 0;
}
function simpanKunciData(k) {
  return typeof k === 'string' && k.indexOf('stivora.') === 0 && !lsTetap(k);
}
function dataBukaDb() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open('stivora-data', 1);
    r.onupgradeneeded = function () {
      var d = r.result;
      d.createObjectStore('kv');
      d.createObjectStore('meta');
      d.createObjectStore('cadanganLs');
    };
    r.onsuccess = function () {
      res(r.result);
    };
    r.onerror = function () {
      rej(r.error);
    };
    r.onblocked = function () {
      rej(new Error('blocked'));
    };
  });
}
function dataTx(nama, mode, isi) {
  return new Promise(function (res, rej) {
    var t = dataDb.db.transaction(nama, mode),
      hasil = {};
    isi(t, hasil);
    t.oncomplete = function () {
      res(hasil);
    };
    t.onerror = function () {
      rej(t.error);
    };
    t.onabort = function () {
      rej(t.error || new Error('abort'));
    };
  });
}
function dataBacaSemua() {
  return dataTx(['kv', 'meta'], 'readonly', function (t, h) {
    h.kv = {};
    t.objectStore('kv').openCursor().onsuccess = function (e) {
      var c = e.target.result;
      if (c) {
        h.kv[c.key] = c.value;
        c.continue();
      }
    };
    t.objectStore('meta').get('migrasi').onsuccess = function (e) {
      h.migrasi = e.target.result;
    };
  });
}
function lsKunciSemua() {
  var o = [];
  try {
    for (var i = 0; i < localStorage.length; i++) o.push(localStorage.key(i));
  } catch (e) {}
  return o;
}
/* Pindahkan data lama dari localStorage (sekali). Salinan asli ikut disimpan di 'cadanganLs'.
   localStorage baru dikosongkan setelah isi IndexedDB dicocokkan sama persis. */
function dataMigrasi() {
  var lama = {};
  lsKunciSemua().forEach(function (k) {
    if (simpanKunciData(k)) {
      var v = localStorage.getItem(k);
      if (v != null) lama[k] = v;
    }
  });
  var kunci = Object.keys(lama);
  return dataTx(['kv', 'cadanganLs'], 'readwrite', function (t) {
    var kv = t.objectStore('kv'),
      cad = t.objectStore('cadanganLs');
    kunci.forEach(function (k) {
      kv.put(lama[k], k);
      cad.put(lama[k], k);
    });
  })
    .then(function () {
      return dataTx('kv', 'readonly', function (t, h) {
        h.v = {};
        kunci.forEach(function (k) {
          t.objectStore('kv').get(k).onsuccess = function (e) {
            h.v[k] = e.target.result;
          };
        });
      });
    })
    .then(function (h) {
      var cocok = kunci.every(function (k) {
        return h.v[k] === lama[k];
      });
      if (!cocok) throw new Error('migrasi tidak cocok');
      return dataTx('meta', 'readwrite', function (t) {
        t.objectStore('meta').put({ waktu: Date.now(), jumlah: kunci.length }, 'migrasi');
      });
    })
    .then(function () {
      kunci.forEach(function (k) {
        try {
          localStorage.removeItem(k);
        } catch (e) {}
      });
      return lama;
    });
}
function dataPutarJurnal() {
  /* Perubahan yang belum sempat tersimpan ke IndexedDB saat aplikasi terakhir ditutup */
  lsKunciSemua().forEach(function (jk) {
    if (jk.indexOf(JURNAL) !== 0) return;
    var k = jk.slice(JURNAL.length),
      j;
    try {
      j = JSON.parse(localStorage.getItem(jk));
    } catch (e) {
      j = null;
    }
    if (!j || !simpanKunciData(k)) {
      try {
        localStorage.removeItem(jk);
      } catch (e) {}
      return;
    }
    if (j.v === null) delete dataDb.mem[k];
    else dataDb.mem[k] = String(j.v);
    dataDb.tunda[k] = ++dataDb.seq;
  });
}
function dataSiapkan() {
  if (dataDb.siapP) return dataDb.siapP;
  dataDb.siapP = (function () {
    if (!window.indexedDB) return Promise.reject(new Error('tanpa idb'));
    return dataBukaDb()
      .then(function (db) {
        dataDb.db = db;
        db.onversionchange = function () {
          db.close();
        };
        return dataBacaSemua();
      })
      .then(function (h) {
        Object.keys(h.kv).forEach(function (k) {
          dataDb.mem[k] = h.kv[k];
        });
        if (h.migrasi) {
          /* Sisa data lama di localStorage (mis. dari tab versi lama) tidak dipakai; IndexedDB yang berlaku */
          return null;
        }
        return dataMigrasi().then(function (lama) {
          Object.keys(lama).forEach(function (k) {
            dataDb.mem[k] = lama[k];
          });
        });
      })
      .then(function () {
        dataDb.mode = 'idb';
        dataPutarJurnal();
        if (Object.keys(dataDb.tunda).length) dataJadwal(0);
        try {
          if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
        } catch (e) {}
        try {
          dataDb.bc = new BroadcastChannel('stivora-data');
          dataDb.bc.onmessage = function (e) {
            var m = e.data || {};
            if (!simpanKunciData(m.k)) return;
            if (m.v === null) delete dataDb.mem[m.k];
            else dataDb.mem[m.k] = m.v;
            dataDiubahTabLain();
          };
        } catch (e) {}
      });
  })().catch(function (err) {
    /* Cadangan: IndexedDB tidak bisa dipakai → tetap di localStorage seperti versi lama */
    try {
      console.warn('Penyimpanan IndexedDB tidak tersedia, memakai localStorage:', err && err.message);
    } catch (e) {}
    dataDb.mode = 'ls';
    dataDb.mem = Object.create(null);
  });
  return dataDb.siapP;
}
var dataSegarTimer = null;
function dataDiubahTabLain() {
  clearTimeout(dataSegarTimer);
  dataSegarTimer = setTimeout(function () {
    try {
      if (typeof refreshAll === 'function') refreshAll();
    } catch (e) {}
    try {
      if (typeof segarkanDataImpian === 'function') segarkanDataImpian();
    } catch (e) {}
  }, 150);
}
function dataJadwal(ms) {
  clearTimeout(dataDb.timer);
  dataDb.timer = setTimeout(dataSimpanKeDb, ms == null ? 30 : ms);
}
/* Simpan semua perubahan yang tertunda ke IndexedDB dalam satu transaksi; hapus jurnalnya setelah pasti tersimpan */
function dataSimpanKeDb() {
  if (dataDb.mode !== 'idb' || dataDb.sibuk) return;
  var kunci = Object.keys(dataDb.tunda);
  if (!kunci.length) return;
  var seqSaatIni = {};
  kunci.forEach(function (k) {
    seqSaatIni[k] = dataDb.tunda[k];
  });
  dataDb.sibuk = true;
  dataTx('kv', 'readwrite', function (t) {
    var kv = t.objectStore('kv');
    kunci.forEach(function (k) {
      if (k in dataDb.mem) kv.put(dataDb.mem[k], k);
      else kv.delete(k);
    });
  })
    .then(function () {
      dataDb.sibuk = false;
      kunci.forEach(function (k) {
        if (dataDb.tunda[k] === seqSaatIni[k]) {
          delete dataDb.tunda[k];
          try {
            localStorage.removeItem(JURNAL + k);
          } catch (e) {}
        }
      });
      if (Object.keys(dataDb.tunda).length) dataJadwal(0);
    })
    .catch(function (err) {
      dataDb.sibuk = false;
      if (!dataDb.gagalTampil && typeof toast === 'function') {
        dataDb.gagalTampil = true;
        toast(
          err && err.name === 'QuotaExceededError'
            ? 'Penyimpanan HP penuh. Kosongkan ruang agar data tersimpan'
            : 'Gagal menyimpan ke penyimpanan. Perubahan dijaga di jurnal dan dicoba lagi'
        );
      }
      dataJadwal(3000); /* jurnal tetap ada → tidak ada yang hilang; coba lagi */
    });
}
function dataTulis(k, raw) {
  if (dataDb.mode !== 'idb' || !simpanKunciData(k)) {
    try {
      if (raw === null) localStorage.removeItem(k);
      else localStorage.setItem(k, raw);
      return true;
    } catch (e) {
      return false;
    }
  }
  if (raw === null) delete dataDb.mem[k];
  else dataDb.mem[k] = raw;
  dataDb.tunda[k] = ++dataDb.seq;
  try {
    localStorage.setItem(JURNAL + k, JSON.stringify({ v: raw, s: dataDb.seq }));
  } catch (e) {
    /* Jurnal tidak muat (perubahan sangat besar): tetap disimpan langsung ke IndexedDB */
    try {
      localStorage.removeItem(JURNAL + k);
    } catch (e2) {} /* jurnal lama kunci ini jangan sampai menimpa yang baru */
    if (!dataDb.jurnalPenuh && typeof toast === 'function') {
      dataDb.jurnalPenuh = true;
      toast('Perubahan besar disimpan langsung; jangan tutup aplikasi sebentar');
    }
  }
  try {
    if (dataDb.bc) dataDb.bc.postMessage({ k: k, v: raw });
  } catch (e) {}
  dataJadwal();
  return true;
}
function dataBacaRaw(k) {
  if (dataDb.mode !== 'idb' || !simpanKunciData(k)) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  return k in dataDb.mem ? dataDb.mem[k] : null;
}
/* Pastikan semua tersimpan saat aplikasi ditutup / dipindah ke belakang (jurnal tetap menjaga bila tidak sempat) */
document.addEventListener('visibilitychange', function () {
  if (document.hidden) dataSimpanKeDb();
});
window.addEventListener('pagehide', function () {
  dataSimpanKeDb();
});

/* ---------- Penyimpanan sederhana (dipakai seluruh aplikasi) ---------- */
var store = {
  get: function (k, d) {
    var v = dataBacaRaw(k);
    if (v == null) return d;
    try {
      return JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set: function (k, v) {
    var raw;
    try {
      raw = JSON.stringify(v);
    } catch (e) {
      return false;
    }
    return dataTulis(k, raw === undefined ? null : raw);
  },
  raw: function (k, v) {
    if (v === undefined) return dataBacaRaw(k);
    dataTulis(k, v === null ? null : String(v));
  },
  ada: function (k) {
    return dataBacaRaw(k) != null;
  },
  hapus: function (k) {
    dataTulis(k, null);
  },
  /* Daftar kunci data yang diawali prefix tertentu */
  kunci: function (prefix) {
    var o = [];
    if (dataDb.mode === 'idb') {
      Object.keys(dataDb.mem).forEach(function (k) {
        if (k.indexOf(prefix) === 0) o.push(k);
      });
    }
    lsKunciSemua().forEach(function (k) {
      if (k.indexOf(prefix) === 0 && k.indexOf(JURNAL) !== 0 && (dataDb.mode !== 'idb' || !simpanKunciData(k)) && o.indexOf(k) < 0)
        o.push(k);
    });
    return o;
  },
  /* Hapus semua data Stivora di perangkat ini kecuali kunci di 'simpan' */
  kosongkan: function (simpan) {
    simpan = simpan || [];
    lsKunciSemua().forEach(function (k) {
      if ((k.indexOf('stivora.') === 0 || k.indexOf(JURNAL) === 0) && simpan.indexOf(k) < 0) {
        try {
          localStorage.removeItem(k);
        } catch (e) {}
      }
    });
    if (dataDb.mode !== 'idb') return Promise.resolve();
    var sisa = Object.create(null);
    simpan.forEach(function (k) {
      if (k in dataDb.mem) sisa[k] = dataDb.mem[k];
    });
    dataDb.mem = sisa;
    dataDb.tunda = Object.create(null);
    return dataTx(['kv', 'cadanganLs'], 'readwrite', function (t) {
      t.objectStore('kv').clear();
      t.objectStore('cadanganLs').clear();
      Object.keys(sisa).forEach(function (k) {
        t.objectStore('kv').put(sisa[k], k);
      });
    }).catch(function () {});
  },
  /* Selesai saat data sudah dimuat dari IndexedDB (atau dipastikan memakai localStorage) */
  siap: function () {
    return dataSiapkan();
  },
  /* Paksa simpan sekarang; selesai saat semua perubahan sudah di IndexedDB */
  simpanSekarang: function () {
    if (dataDb.mode !== 'idb') return Promise.resolve();
    return new Promise(function (res) {
      (function cek(n) {
        if (!Object.keys(dataDb.tunda).length || n > 200) return res();
        dataSimpanKeDb();
        setTimeout(function () {
          cek(n + 1);
        }, 25);
      })(0);
    });
  },
  mode: function () {
    return dataDb.mode;
  }
};
dataSiapkan();

/* ---------- IndexedDB untuk gambar ---------- */
var mem = {}; // cadangan jika IndexedDB tidak tersedia
var idb = {
  p: null,
  ok: true,
  open: function () {
    if (this.p) return this.p;
    var self = this;
    this.p = new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('stivora', 1);
        r.onupgradeneeded = function () {
          r.result.createObjectStore('images', { keyPath: 'id' });
        };
        r.onsuccess = function () {
          res(r.result);
        };
        r.onerror = function () {
          rej(r.error);
        };
      } catch (e) {
        rej(e);
      }
    }).catch(function () {
      self.ok = false;
      return null;
    });
    return this.p;
  },
  tx: function (mode, fn) {
    return this.open().then(function (db) {
      if (!db) return fn(null);
      return new Promise(function (res, rej) {
        var t = db.transaction('images', mode);
        var st = t.objectStore('images');
        var out = fn(st);
        t.oncomplete = function () {
          res(out && out.result !== undefined ? out.result : out);
        };
        t.onerror = function () {
          rej(t.error);
        };
        t.onabort = function () {
          rej(t.error);
        };
      });
    });
  },
  all: function () {
    return this.tx('readonly', function (st) {
      if (!st)
        return Object.keys(mem).map(function (k) {
          return mem[k];
        });
      return st.getAll();
    });
  },
  put: function (rec) {
    return this.tx('readwrite', function (st) {
      if (!st) {
        mem[rec.id] = rec;
        return;
      }
      st.put(rec);
    });
  },
  del: function (id) {
    return this.tx('readwrite', function (st) {
      if (!st) {
        delete mem[id];
        return;
      }
      st.delete(id);
    });
  },
  clear: function () {
    return this.tx('readwrite', function (st) {
      if (!st) {
        mem = {};
        return;
      }
      st.clear();
    });
  }
};
