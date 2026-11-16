/* ============================================================
   Stivora — Ringkasan cadangan & cadangan harian (5.68.0)
   - rkHitung(src): jumlah per jenis data (dipakai cadangan harian, ekspor, impor, pulihkan).
   - Cadangan harian: dibuat sekali sehari saat aplikasi pertama dibuka (sudah masuk, Worker terpasang),
     dikirim ke R2 lewat Worker: users/<uid>/cadangan/<YYYY-MM-DD>.json. Disimpan 30 hari, lalu
     terhapus otomatis oleh Worker. Terenkripsi bila enkripsi end-to-end aktif.
   - Isi: semua data (sama seperti file ekspor) + catatan media yang ada di cloud. File media
     sendiri tetap di R2; media yang dihapus ditahan 30 hari (Worker) agar bisa ikut dipulihkan.
   - Yang tidak ikut: foto & video Galery dari folder HP.
   ============================================================ */
'use strict';

/* ---------- Ringkasan: jumlah per jenis data ---------- */
var RK_JENIS = [
  ['h', 'Hexagon impian', 'Impian'],
  ['f', 'Fase peta jalan', 'Impian'],
  ['pr', 'Proyek software', 'Impian'],
  ['rc', 'Rencana cadangan', 'Impian'],
  ['pe', 'Catatan peristiwa', 'Impian'],
  ['tx', 'Transaksi keuangan', 'Keuangan'],
  ['ht', 'Hutang & piutang', 'Keuangan'],
  ['po', 'Kartu Pola Pikir', 'Galery'],
  ['lg', 'Lagu', 'Galery'],
  ['fm', 'Film', 'Galery'],
  ['bk', 'Buku', 'Galery'],
  ['tp', 'Tempat', 'Galery'],
  ['ch', 'Channel', 'Galery'],
  ['tk', 'Tokoh', 'Galery'],
  ['ln', 'Link', 'Galery'],
  ['mk', 'Marker', 'Peta'],
  ['jl', 'Perjalanan', 'Peta'],
  ['ar', 'Area', 'Peta'],
  ['fo', 'Foto', 'Media'],
  ['vi', 'Video', 'Media'],
  ['au', 'Audio', 'Media'],
  ['do', 'Dokumen', 'Media']
];
function rkPanjang(v, kunci) {
  if (kunci && v && typeof v === 'object' && !Array.isArray(v)) v = v[kunci];
  return Array.isArray(v) ? v.length : 0;
}
/* src: { marker, jalur, area, impianData, media: [{ type, size }] } */
function rkHitung(src) {
  src = src || {};
  var d = src.impianData && typeof src.impianData === 'object' ? src.impianData : {},
    r = {};
  r.h = rkPanjang(d['stivora.impian.daftar']);
  r.f = rkPanjang(d['stivora.impian.progress'], 'fase');
  r.pr = rkPanjang(d['stivora.impian.proyek'], 'item');
  r.rc = rkPanjang(d['stivora.impian.rencana'], 'item');
  r.pe = rkPanjang(d['stivora.peristiwa']);
  r.tx = 0;
  Object.keys(d).forEach(function (k) {
    if (/^stivora\.keuangan\.tx\.\d{4}$/.test(k)) r.tx += rkPanjang(d[k]);
  });
  r.ht = rkPanjang(d['stivora.keuangan.hutang']);
  r.po = rkPanjang(d['stivora.galery.pola'], 'item');
  r.lg = rkPanjang(d['stivora.galery.lainnya'], 'lagu');
  r.fm = rkPanjang(d['stivora.galery.lainnya'], 'film');
  r.bk = rkPanjang(d['stivora.galery.buku'], 'item');
  r.tp = rkPanjang(d['stivora.galery.tempat'], 'item');
  r.ch = rkPanjang(d['stivora.galery.channel'], 'item');
  r.tk = rkPanjang(d['stivora.galery.tokoh'], 'item');
  r.ln = rkPanjang(d['stivora.galery.link'], 'item');
  r.mk = rkPanjang(src.marker);
  r.jl = rkPanjang(src.jalur);
  r.ar = rkPanjang(src.area);
  r.fo = r.vi = r.au = r.do = 0;
  r.mb = 0;
  (Array.isArray(src.media) ? src.media : []).forEach(function (m) {
    var t = String((m && m.type) || '');
    var k = /^image\//.test(t) ? 'fo' : /^video\//.test(t) ? 'vi' : /^audio\//.test(t) ? 'au' : 'do';
    r[k]++;
    r.mb += +(m && m.size) || 0;
  });
  return r;
}
/* Keadaan di HP ini sekarang */
function rkSekarang() {
  return rkHitung({
    marker: typeof petaMarker !== 'undefined' ? petaMarker : [],
    jalur: typeof petaJalur !== 'undefined' ? petaJalur : [],
    area: typeof petaArea !== 'undefined' ? petaArea : [],
    impianData: dataImpianEkspor(),
    media: images.map(function (im) {
      return { type: tipeMedia(im), size: im.size || (im.blob && im.blob.size) || 0 };
    })
  });
}
function rkTotal(r) {
  var n = 0;
  RK_JENIS.forEach(function (j) {
    n += +r[j[0]] || 0;
  });
  return n;
}
/* Satu baris ringkas: "12 hexagon · 340 transaksi · 25 foto …" (maks. n jenis) */
function rkTeks(r, n) {
  var o = [];
  RK_JENIS.forEach(function (j) {
    if (r && r[j[0]]) o.push(r[j[0]] + ' ' + j[1].toLowerCase());
  });
  if (!o.length) return 'Belum ada data';
  return n && o.length > n ? o.slice(0, n).join(' · ') + ' · +' + (o.length - n) + ' lainnya' : o.join(' · ');
}
/* Tabel ringkasan. b = pembanding (mis. sekarang vs cadangan): kolom kedua + tanda selisih */
function rkHtml(a, b, judulA, judulB) {
  var grup = {},
    urut = [];
  RK_JENIS.forEach(function (j) {
    var x = +a[j[0]] || 0,
      y = b ? +b[j[0]] || 0 : 0;
    if (!x && !y) return;
    if (!grup[j[2]]) {
      grup[j[2]] = [];
      urut.push(j[2]);
    }
    grup[j[2]].push({ nama: j[1], x: x, y: y });
  });
  if (!urut.length) return '<p class="rk-kosong">Belum ada data.</p>';
  return (
    '<table class="rk-tabel' +
    (b ? ' rk-banding' : '') +
    '">' +
    (b ? '<thead><tr><th></th><th>' + esc(judulA || 'Sekarang') + '</th><th>' + esc(judulB || 'Cadangan') + '</th></tr></thead>' : '') +
    '<tbody>' +
    urut
      .map(function (g) {
        return (
          '<tr class="rk-grup"><th colspan="' +
          (b ? 3 : 2) +
          '">' +
          esc(g) +
          '</th></tr>' +
          grup[g]
            .map(function (r) {
              var beda = b && r.x !== r.y;
              return (
                '<tr' +
                (beda ? ' class="rk-beda"' : '') +
                '><td>' +
                esc(r.nama) +
                '</td><td>' +
                r.x +
                '</td>' +
                (b ? '<td>' + r.y + (beda ? '<i>' + (r.y > r.x ? '+' : '') + (r.y - r.x) + '</i>' : '') + '</td>' : '') +
                '</tr>'
              );
            })
            .join('')
        );
      })
      .join('') +
    '</tbody></table>'
  );
}

/* ---------- Cadangan harian ---------- */
var HR_SIMPAN_HARI = 30;
var hrJalan = null;
function hrKunci() {
  return 'stivora.harian.' + (user ? user.uid : '');
}
function hrHariIni() {
  var d = new Date(),
    z = function (n) {
      return (n < 10 ? '0' : '') + n;
    };
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
function hrBisa() {
  if (!user || !fb || !mediaConfigured()) return false;
  if (typeof e2e !== 'undefined' && e2e.info && !e2e.key) return false; /* enkripsi aktif tapi kunci belum dibuka: jangan kirim tanpa enkripsi */
  return true;
}
function hrUrl(jalur) {
  return MEDIA_WORKER_URL.replace(/\/+$/, '') + jalur;
}
function hrFetch(jalur, opsi) {
  opsi = opsi || {};
  return authHeader()
    .then(function (h) {
      return fetch(hrUrl(jalur), { method: opsi.method || 'GET', headers: Object.assign(h, opsi.headers || {}), body: opsi.body });
    })
    .then(function (res) {
      if (res.ok) return res;
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (j) {
          var e = new Error(j.error || 'HTTP ' + res.status);
          e.worker = true;
          e.status = res.status;
          throw e;
        });
    });
}
/* Isi cadangan: semua data + catatan media yang sudah ada di cloud */
function hrIsi() {
  var mediaIkut = atur().media && mediaConfigured();
  return {
    app: 'stivora',
    jenis: 'harian',
    version: 1,
    dibuat: new Date().toISOString(),
    versiApp: typeof APP_VERSI !== 'undefined' ? APP_VERSI : '',
    theme: themeMode(),
    mediaIkut: mediaIkut,
    marker: petaMarker,
    jalur: petaJalur,
    area: petaArea,
    impianData: dataImpianEkspor(),
    media: mediaIkut
      ? images
          .filter(function (im) {
            return im.uploaded;
          })
          .map(function (im) {
            return {
              id: im.id,
              caption: im.caption || '',
              markerId: im.markerId || null,
              type: tipeMedia(im),
              size: im.size || (im.blob && im.blob.size) || 0,
              name: im.name || '',
              createdAt: im.createdAt,
              updatedAt: im.updatedAt || im.createdAt,
              enc: !!im.enc,
              encSize: im.encSize || 0
            };
          })
      : []
  };
}
/* Buat cadangan hari ini (paksa = walau sudah ada hari ini) */
function cadanganHarianBuat(paksa) {
  if (!hrBisa()) return Promise.resolve(null);
  if (hrJalan) return hrJalan;
  var tgl = hrHariIni(),
    uidNow = user.uid,
    k = hrKunci();
  if (!paksa && store.get(k, '') === tgl) return Promise.resolve(null);
  var isi = hrIsi(),
    r = rkHitung(isi),
    enc = typeof e2eAktif === 'function' && e2eAktif();
  var siap = enc
    ? Promise.all([enkripsiJSON(e2e.key, isi), enkripsiJSON(e2e.key, r)]).then(function (x) {
        return { body: JSON.stringify({ app: 'stivora', jenis: 'harian', version: 2, e2e: true, data: x[0] }), ringkas: 'E:' + x[1] };
      })
    : Promise.resolve({ body: JSON.stringify(isi), ringkas: JSON.stringify(r) });
  hrJalan = siap
    .then(function (s) {
      if (!user || user.uid !== uidNow) return null;
      return hrFetch('/cadangan/' + tgl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Ringkas': s.ringkas.length <= 1800 ? s.ringkas : '' },
        body: s.body
      }).then(function (res) {
        return res.json().then(function (j) {
          store.set(k, tgl);
          catatRiwayat('harian', true, ukuranTeks(j.size || s.body.length) + ' · ' + rkTeks(r, 3));
          return j;
        });
      });
    })
    .catch(function (e) {
      catatRiwayat('harian', false, fbMsg(e));
      throw e;
    })
    .then(
      function (j) {
        hrJalan = null;
        return j;
      },
      function (e) {
        hrJalan = null;
        throw e;
      }
    );
  return hrJalan;
}
/* Dipanggil setelah sinkron berhasil: sekali sehari per akun */
function cadanganHarianCek() {
  if (!hrBisa() || store.get(hrKunci(), '') === hrHariIni()) return;
  cadanganHarianBuat(false).catch(function () {});
}
/* Daftar cadangan di cloud (ringkasan dibuka bila terenkripsi) */
function hrDaftar() {
  return hrFetch('/cadangan')
    .then(function (res) {
      return res.json();
    })
    .then(function (j) {
      var list = Array.isArray(j.cadangan) ? j.cadangan : [];
      return Promise.all(
        list.map(function (x) {
          var s = String(x.ringkas || '');
          x.enc = s.indexOf('E:') === 0;
          if (!s) {
            x.r = null;
            return x;
          }
          if (!x.enc) {
            try {
              x.r = JSON.parse(s);
            } catch (e) {
              x.r = null;
            }
            return x;
          }
          if (!e2e.key) {
            x.r = null;
            return x;
          }
          return dekripsiJSON(e2e.key, s.slice(2)).then(
            function (r) {
              x.r = r;
              return x;
            },
            function () {
              x.r = null;
              return x;
            }
          );
        })
      );
    });
}
/* Unduh satu cadangan → isi (sudah didekripsi) */
function hrAmbil(tgl) {
  return hrFetch('/cadangan/' + tgl)
    .then(function (res) {
      return res.json();
    })
    .then(function (j) {
      if (j && j.e2e && typeof j.data === 'string') {
        if (!e2e.key) throw new Error('Cadangan ini terenkripsi. Buka dulu enkripsi end-to-end dengan kata sandimu.');
        return dekripsiJSON(e2e.key, j.data).catch(function () {
          throw new Error('Cadangan ini dikunci dengan kata sandi enkripsi lain');
        });
      }
      return j;
    })
    .then(function (d) {
      if (!d || d.app !== 'stivora' || d.jenis !== 'harian') throw new Error('Isi cadangan tidak dikenali');
      return d;
    });
}
/* Pasang media dari cadangan: catatan dikembalikan, file diambil lagi dari cloud saat dibuka */
function hrPasangMedia(list) {
  var lokal = {},
    dalam = {},
    baru = [],
    tugas = [];
  images.forEach(function (im) {
    lokal[im.id] = im;
  });
  list.forEach(function (m) {
    if (!m || !m.id) return;
    dalam[m.id] = 1;
    var l = lokal[m.id];
    if (l) {
      if ((l.caption || '') !== (m.caption || '') || (l.markerId || null) !== (m.markerId || null)) {
        l.caption = m.caption || '';
        l.markerId = m.markerId || null;
        l.updatedAt = Date.now();
        if (l.uploaded) l.metaDirty = true;
        tugas.push(idb.put(l));
      }
      baru.push(l);
      return;
    }
    var rec = {
      id: String(m.id),
      blob: null,
      caption: String(m.caption || '').slice(0, 100),
      markerId: m.markerId || null,
      type: m.type || '',
      size: +m.size || 0,
      name: m.name || '',
      createdAt: m.createdAt || Date.now(),
      updatedAt: Date.now(),
      uploaded: true,
      metaDirty: true,
      enc: !!m.enc,
      encSize: +m.encSize || 0
    };
    baru.push(rec);
    tugas.push(idb.put(rec));
  });
  images.forEach(function (im) {
    if (!dalam[im.id]) {
      tugas.push(idb.del(im.id));
      dropUrl(im.id);
    }
  });
  images = baru.sort(function (a, b) {
    return b.createdAt - a.createdAt;
  });
  return Promise.all(tugas);
}
/* Pulihkan semuanya ke keadaan cadangan */
function hrPulihkan(d) {
  var ids = d.mediaIkut && Array.isArray(d.media) ? d.media.map(function (m) {
    return String((m && m.id) || '');
  }) : [];
  var langkah = ids.length
    ? hrFetch('/media-pulihkan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ids }) }).then(
        function (res) {
          return res.json();
        }
      )
    : Promise.resolve({ dipulihkan: 0, hilang: [] });
  return langkah.then(function (h) {
    pasangDataCadangan(d);
    var m = d.mediaIkut ? hrPasangMedia(d.media || []) : Promise.resolve();
    return m.then(function () {
      catatRiwayat('pulihkan-harian', true, 'Cadangan ' + hrTglTeks(d.dibuat ? hrTglIso(d.dibuat) : ''));
      refreshAll();
      if (typeof schedulePush === 'function') schedulePush();
      return h;
    });
  });
}
function hrTglIso(iso) {
  var d = new Date(iso);
  if (isNaN(d)) return '';
  var z = function (n) {
    return (n < 10 ? '0' : '') + n;
  };
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
function hrTglTeks(tgl) {
  var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl || '');
  if (!p) return tgl || '';
  var d = new Date(+p[1], +p[2] - 1, +p[3]);
  var h = Math.round((new Date(new Date().toDateString()) - d) / 86400000);
  var t = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return h === 0 ? 'Hari ini · ' + t : h === 1 ? 'Kemarin · ' + t : t;
}
