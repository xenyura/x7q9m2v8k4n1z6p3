/* ============================================================
   Stivora — Gambar mini (thumbnail) media dari folder HP (5.76.0)
   Kenapa: grid lama memakai file asli — setiap video jadi pemutar sungguhan, sehingga
   video yang dibuka harus antre "jalur" pemutar di Chrome HP dan lama mulai diputar.
   Sekarang grid hanya menampilkan gambar kecil (maks 360 px) yang dibuat sekali.
   - Dibuat satu per satu, hanya untuk kotak yang terlihat; berhenti saat penampil terbuka.
   - Disimpan di HP (IndexedDB 'stivora-mini'); dibuat ulang bila file asli berubah
     (kunci: id + ukuran + waktu ubah). Maks GM_MAKS entri, yang lama dibersihkan sendiri.
   - Tidak ikut sinkron/cadangan: hanya salinan kecil dari file di folder HP.
   ============================================================ */
'use strict';

var GM_SISI = 360,
  GM_MAKS = 4000,
  GM_BATAS_WAKTU = 9000;
var GM = { db: null, url: {}, gagal: {}, antre: [], diantre: {}, jalan: false, obs: null };

function gmKunci(rec) {
  return rec.id + '|' + (rec.size || 0) + '|' + (rec.updatedAt || rec.createdAt || 0);
}
function gmBisa(rec) {
  var j = jenisMedia(rec);
  return !!(rec && rec.dariFolder && rec.blob && (j === 'foto' || j === 'video'));
}
function gmHtml(rec, cls) {
  var k = gmKunci(rec),
    u = GM.url[k],
    vid = jenisMedia(rec) === 'video';
  return (
    '<img class="gm' +
    (u ? '' : GM.gagal[k] ? ' gm-gagal' : ' gm-tunggu') +
    (cls ? ' ' + cls : '') +
    '" data-gm="' +
    esc(rec.id) +
    '"' +
    (u ? ' src="' + u + '"' : '') +
    ' alt="" decoding="async" draggable="false">' +
    (vid ? '<span class="g-play">' + ICON.play + '</span>' : '')
  );
}

/* ---------- IndexedDB ---------- */
function gmDb() {
  if (GM.db) return GM.db;
  GM.db = new Promise(function (res, rej) {
    try {
      var r = indexedDB.open('stivora-mini', 1);
      r.onupgradeneeded = function () {
        r.result.createObjectStore('mini');
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
  });
  return GM.db;
}
function gmTx(mode, fn) {
  return gmDb().then(function (db) {
    return new Promise(function (res, rej) {
      var tx = db.transaction('mini', mode),
        st = tx.objectStore('mini'),
        hasil = fn(st);
      tx.oncomplete = function () {
        res(hasil && 'result' in hasil ? hasil.result : undefined);
      };
      tx.onerror = function () {
        rej(tx.error);
      };
    });
  });
}
function gmAmbil(k) {
  return gmTx('readonly', function (st) {
    return st.get(k);
  }).catch(function () {
    return null;
  });
}
function gmSimpan(k, blob) {
  return gmTx('readwrite', function (st) {
    st.put({ b: blob, t: Date.now() }, k);
  }).catch(function () {});
}
/* Bersihkan yang paling lama bila lebih dari GM_MAKS (sekali per sesi) */
function gmBersihkan() {
  gmTx('readwrite', function (st) {
    var c = st.count();
    c.onsuccess = function () {
      var lebih = c.result - GM_MAKS;
      if (lebih <= 0) return;
      var semua = [];
      st.openCursor().onsuccess = function (e) {
        var cur = e.target.result;
        if (cur) {
          semua.push([cur.key, (cur.value && cur.value.t) || 0]);
          cur.continue();
        } else {
          semua
            .sort(function (a, b) {
              return a[1] - b[1];
            })
            .slice(0, lebih + 200)
            .forEach(function (x) {
              st.delete(x[0]);
            });
        }
      };
    };
  }).catch(function () {});
}
setTimeout(gmBersihkan, 30000);

/* ---------- Membuat gambar mini ---------- */
function gmKanvas(sumber, w, h) {
  var s = Math.min(1, GM_SISI / Math.min(w, h) || 1),
    c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  c.getContext('2d').drawImage(sumber, 0, 0, c.width, c.height);
  return new Promise(function (res) {
    c.toBlob(
      function (b) {
        res(b);
      },
      'image/jpeg',
      0.72
    );
  });
}
function gmDariFoto(blob) {
  if (typeof createImageBitmap === 'function')
    return createImageBitmap(blob).then(function (bmp) {
      return gmKanvas(bmp, bmp.width, bmp.height).then(function (b) {
        try {
          bmp.close();
        } catch (e) {}
        return b;
      });
    });
  return new Promise(function (res, rej) {
    var u = URL.createObjectURL(blob),
      img = new Image();
    img.onload = function () {
      gmKanvas(img, img.naturalWidth, img.naturalHeight).then(function (b) {
        URL.revokeObjectURL(u);
        res(b);
      });
    };
    img.onerror = function () {
      URL.revokeObjectURL(u);
      rej(new Error('foto tidak terbaca'));
    };
    img.src = u;
  });
}
function gmDariVideo(blob) {
  return new Promise(function (res, rej) {
    var u = URL.createObjectURL(blob),
      v = document.createElement('video'),
      selesai = false;
    var beres = function (err, b) {
      if (selesai) return;
      selesai = true;
      clearTimeout(t);
      try {
        v.removeAttribute('src');
        v.load();
      } catch (e) {}
      URL.revokeObjectURL(u);
      if (err) rej(err);
      else res(b);
    };
    var t = setTimeout(function () {
      beres(new Error('video terlalu lama'));
    }, GM_BATAS_WAKTU);
    v.muted = true;
    v.playsInline = true;
    v.preload = 'metadata';
    v.addEventListener('loadedmetadata', function () {
      var d = isFinite(v.duration) ? v.duration : 0;
      try {
        v.currentTime = d ? Math.min(1, d * 0.1) : 0.1;
      } catch (e) {
        beres(e);
      }
    });
    v.addEventListener('seeked', function () {
      if (!v.videoWidth) return beres(new Error('video tanpa gambar'));
      gmKanvas(v, v.videoWidth, v.videoHeight).then(
        function (b) {
          beres(null, b);
        },
        function (e) {
          beres(e);
        }
      );
    });
    v.addEventListener('error', function () {
      beres(new Error('video tidak terbaca'));
    });
    v.src = u;
  });
}

/* ---------- Antrean: satu per satu, hanya yang terlihat ---------- */
function gmPenampilBuka() {
  return typeof opened !== 'undefined' && !!opened.img;
}
function gmPasang(id, k) {
  var u = GM.url[k];
  $$('img.gm[data-gm="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]').forEach(function (img) {
    img.classList.remove('gm-tunggu');
    if (u) img.src = u;
    else img.classList.add('gm-gagal');
  });
}
function gmAntre(id) {
  if (GM.diantre[id]) return;
  GM.diantre[id] = 1;
  GM.antre.push(id);
  gmJalan();
}
function gmJalan() {
  if (GM.jalan) return;
  GM.jalan = true;
  var lanjut = function () {
    GM.jalan = false;
    if (GM.antre.length) setTimeout(gmJalan, 0);
  };
  if (gmPenampilBuka()) {
    /* Pemutar sedang dipakai: jangan rebutan jalur video */
    GM.jalan = false;
    setTimeout(gmJalan, 1000);
    return;
  }
  var id = GM.antre.shift();
  if (!id) {
    GM.jalan = false;
    return;
  }
  delete GM.diantre[id];
  var rec = typeof findImg === 'function' ? findImg(id) : null;
  if (!rec || !gmBisa(rec)) return lanjut();
  var k = gmKunci(rec);
  if (GM.url[k] || GM.gagal[k]) {
    gmPasang(id, k);
    return lanjut();
  }
  gmAmbil(k)
    .then(function (ada) {
      if (ada && ada.b) return ada.b;
      var buat = jenisMedia(rec) === 'video' ? gmDariVideo(rec.blob) : gmDariFoto(rec.blob);
      return buat.then(function (b) {
        if (b) gmSimpan(k, b);
        return b;
      });
    })
    .then(
      function (b) {
        if (b) GM.url[k] = URL.createObjectURL(b);
        else GM.gagal[k] = 1;
        gmPasang(id, k);
        lanjut();
      },
      function () {
        GM.gagal[k] = 1;
        gmPasang(id, k);
        lanjut();
      }
    );
}
/* Amati kotak yang belum punya gambar mini; masuk antrean saat terlihat */
function gmAmati(akar) {
  if (!('IntersectionObserver' in window)) return;
  if (!GM.obs)
    GM.obs = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          GM.obs.unobserve(e.target);
          gmAntre(e.target.getAttribute('data-gm'));
        });
      },
      { rootMargin: '300px 0px' }
    );
  (akar || document).querySelectorAll('img.gm-tunggu:not([data-gm-amati])').forEach(function (img) {
    img.setAttribute('data-gm-amati', '1');
    GM.obs.observe(img);
  });
}
var gmJadwal = 0;
new MutationObserver(function () {
  if (gmJadwal) return;
  gmJadwal = requestAnimationFrame(function () {
    gmJadwal = 0;
    gmAmati();
  });
}).observe(document.body, { childList: true, subtree: true });
/* Gambar mini yang sudah ada (untuk pemutar: video sebelum/sesudah cukup gambar ini) */
function gmUrl(rec) {
  return rec ? GM.url[gmKunci(rec)] || '' : '';
}
