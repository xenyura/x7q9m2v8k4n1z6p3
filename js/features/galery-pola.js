/* ============================================================
   Stivora — Galery · tab Pola Pikir (5.53.0)
   7 jenis: Prinsip, Nilai, Model, Pelajaran, Perumpamaan, Renungan, Paradoks.
   Kartu hari ini (pengulangan berjarak), saringan jenis, cari, tampilan Kartu | Peta,
   halaman detail (kematangan, bukti lapangan, catatan renungan, koneksi), form per jenis
   (Model dengan gambar otomatis: siklus, tangga, rumus, timbangan, matriks, corong).
   Data: 'stivora.galery.pola' = { v: 2, item: [...], kon: [[a, b, rel]], hari: {...} }.
   5.56.0: tanpa batas jumlah — di cloud setiap pola pikir satu dokumen 'pola-i-<id>' +
   'pola-urutan' (urutan, koneksi, kartu hari ini); lihat PECAHAN di sync.js. Batas yang tersisa
   hanya ±600 KB per kartu (dokumen Firestore maks 1 MB, termasuk enkripsi).
   ============================================================ */
'use strict';

var K_GP = 'stivora.galery.pola';
var GP_KARTU_RUANG = 600000,
  GP_KEPALA_RUANG = 700000,
  GP_T = 300,
  GP_P = 5000,
  GP_BAG = 12,
  GP_BAG_T = 60,
  GP_ASAL_T = 150;
var GP_HAL = 60,
  GP_PETA_MAKS = 150;
var GP_JENIS = {
  prinsip: {
    nama: 'Prinsip',
    ket: 'Aturan hidup yang kamu pegang. Bisa diuji di lapangan.',
    w: '#7c5cff',
    ik: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'
  },
  nilai: {
    nama: 'Nilai',
    ket: 'Keyakinan pribadi yang penting bagimu. Tanpa meteran.',
    w: '#d4537e',
    ik: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'
  },
  model: {
    nama: 'Model',
    ket: 'Cara kerja sesuatu, digambar: siklus, tangga, rumus, dll.',
    w: '#1d9e75',
    ik: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>'
  },
  pelajaran: {
    nama: 'Pelajaran',
    ket: 'Pikiran lama yang berubah karena sebuah kejadian.',
    w: '#d85a30',
    ik: '<path d="M3 9l9-5 9 5-9 5zM7 11v5c3 2 7 2 10 0v-5"/>'
  },
  perumpamaan: {
    nama: 'Perumpamaan',
    ket: 'Analogi atau cerita yang membuatmu paham.',
    w: '#378add',
    ik: '<path d="M20 4c-7 0-12 5-13 12l-3 4M7 16c5 0 9-3 10-8"/>'
  },
  renungan: {
    nama: 'Renungan',
    ket: 'Pertanyaan yang masih kamu pikirkan.',
    w: '#85837b',
    ik: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>'
  },
  paradoks: {
    nama: 'Paradoks',
    ket: 'Dua hal yang sama-sama benar.',
    w: '#5f9a22',
    ik: '<circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9"/><circle cx="12" cy="7.5" r=".8"/><circle cx="12" cy="16.5" r=".8"/>'
  }
};
var GP_IK = {
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
  asal: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  tempat: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  catat: '<path d="M4 5h16v11H8l-4 4z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  pena: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  hapus: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'
};
function gpIk(n, uk) {
  var p = GP_JENIS[n] ? GP_JENIS[n].ik : GP_IK[n];
  return '<svg class="gp-i" viewBox="0 0 24 24"' + (uk ? ' style="width:' + uk + 'px;height:' + uk + 'px"' : '') + '>' + p + '</svg>';
}
var GP_MAT = ['', 'Renungan', 'Mulai yakin', 'Pegangan'];
var GP_BENTUK = { siklus: 'Siklus', tangga: 'Tangga', rumus: 'Rumus', timbangan: 'Timbangan', matriks: 'Matriks 2×2', corong: 'Corong' };
var GP_REL = { dukung: 'Mendukung', turunan: 'Turunan dari', tentang: 'Bertentangan' };
var GP_ASAL = ['Pengalaman', 'Buku', 'Tokoh', 'Orang tua', 'Teman'];
var GP_JARAK = [7, 14, 30, 60, 120];
var GP_FIELD = {
  prinsip: [
    ['judul', 'Prinsipnya', 'mis. Konsisten lebih penting dari sempurna', 1],
    ['berlaku', 'Berlaku saat', 'mis. Membangun kebiasaan'],
    ['tidak', 'Tidak berlaku saat', 'mis. Pekerjaan yang butuh presisi'],
    ['alasan', 'Alasan', 'Kenapa kamu memegangnya?', 0, 1]
  ],
  nilai: [
    ['judul', 'Nilai yang kamu pegang', 'mis. Kejujuran di atas keuntungan', 1],
    ['alasan', 'Alasan pribadi', 'Kenapa ini penting bagimu?', 0, 1]
  ],
  model: [
    ['judul', 'Nama model', 'mis. Siklus belajar dari gagal', 1],
    ['alasan', 'Penjelasan', 'Apa yang ingin ditunjukkan model ini?', 0, 1]
  ],
  pelajaran: [
    ['lama', 'Pikiran lama', 'mis. Harus sempurna dulu baru mulai', 1],
    ['kejadian', 'Kejadian yang mengubahnya', 'mis. Launching tertunda 3 bulan'],
    ['tgl', 'Kapan', '', 0, 0, 'month'],
    ['baru', 'Pikiran baru', 'mis. Mulai jelek, perbaiki sambil jalan', 1]
  ],
  perumpamaan: [
    ['kalimat', 'Perumpamaan', 'mis. Hidup itu seperti bersepeda…', 1, 1],
    ['arti', 'Artinya', 'Apa maknanya bagimu?', 0, 1]
  ],
  renungan: [['tanya', 'Pertanyaan yang kamu renungkan', 'mis. Apakah sukses harus mengorbankan keluarga?', 1, 1]],
  paradoks: [
    ['a', 'Sisi pertama', 'mis. Sabar menunggu hasil', 1],
    ['b', 'Sisi kedua', 'mis. Bergerak cepat', 1],
    ['kapan', 'Kapan memilih yang mana', 'mis. Sabar untuk hasil, cepat untuk tindakan', 0, 1]
  ]
};
var GP_TEKS = ['judul', 'berlaku', 'tidak', 'alasan', 'lama', 'kejadian', 'tgl', 'baru', 'kalimat', 'arti', 'tanya', 'a', 'b', 'kapan'];

/* ---------- Data ---------- */
function gpPotong(v, n) {
  return String(v == null ? '' : v).slice(0, n);
}
function gpBersihItem(x) {
  if (!x || typeof x.id !== 'string' || !GP_JENIS[x.j]) return null;
  var o = {
    id: x.id.slice(0, 64),
    j: x.j,
    m: Math.max(1, Math.min(3, +x.m || 2)),
    dibuat: +x.dibuat || Date.now(),
    diubah: +x.diubah || +x.dibuat || Date.now(),
    ulang: +x.ulang || 0,
    jarak: Math.max(0, Math.min(GP_JARAK.length, +x.jarak || 0))
  };
  GP_TEKS.forEach(function (k) {
    if (x[k]) o[k] = gpPotong(x[k], /alasan|kalimat|arti|tanya|kapan/.test(k) ? GP_P : GP_T);
  });
  if (x.j === 'model') {
    o.bentuk = GP_BENTUK[x.bentuk] ? x.bentuk : 'siklus';
    o.op = ['+', '×', '−'].indexOf(x.op) >= 0 ? x.op : '+';
    o.bagian = (Array.isArray(x.bagian) ? x.bagian : [])
      .map(function (s) {
        return gpPotong(s, GP_BAG_T);
      })
      .filter(Boolean)
      .slice(0, GP_BAG);
  }
  if (Array.isArray(x.bukti))
    o.bukti = x.bukti.filter(Array.isArray).map(function (b) {
      return [b[0] ? 1 : 0, +b[1] || 0, gpPotong(b[2], GP_T)];
    });
  if (Array.isArray(x.catatan))
    o.catatan = x.catatan.filter(Array.isArray).map(function (c) {
      return [+c[0] || 0, gpPotong(c[1], GP_P)];
    });
  if (Array.isArray(x.asal)) o.asal = [GP_ASAL.indexOf(x.asal[0]) >= 0 ? x.asal[0] : 'Pengalaman', gpPotong(x.asal[1], GP_ASAL_T)];
  return o;
}
function gpData() {
  var d = store.get(K_GP, null);
  if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
  var item = (Array.isArray(d.item) ? d.item : []).map(gpBersihItem).filter(Boolean),
    ids = {},
    unik = [];
  item.forEach(function (x) {
    if (!ids[x.id]) {
      ids[x.id] = 1;
      unik.push(x);
    }
  });
  item = unik;
  ids = {};
  item.forEach(function (x) {
    ids[x.id] = 1;
  });
  var kon = (Array.isArray(d.kon) ? d.kon : []).filter(function (k) {
    return Array.isArray(k) && ids[k[0]] && ids[k[1]] && k[0] !== k[1] && GP_REL[k[2]];
  });
  var hari =
    d.hari && typeof d.hari === 'object'
      ? {
          tgl: String(d.hari.tgl || ''),
          ids: Array.isArray(d.hari.ids)
            ? d.hari.ids.filter(function (i) {
                return ids[i];
              })
            : [],
          selesai: d.hari.selesai && typeof d.hari.selesai === 'object' ? d.hari.selesai : {}
        }
      : { tgl: '', ids: [], selesai: {} };
  return { v: 2, item: item, kon: kon, hari: hari };
}
/* Tidak ada batas jumlah. Yang dijaga: satu kartu ≤ ±600 KB, dan urutan+koneksi ≤ ±700 KB (dokumen cloud maks 1 MB) */
function gpSimpan(d, idUbah) {
  if (typeof gtUkuranByte === 'function') {
    var cek = idUbah
      ? d.item.filter(function (x) {
          return x.id === idUbah;
        })
      : d.item;
    for (var i = 0; i < cek.length; i++)
      if (gtUkuranByte(cek[i]) > GP_KARTU_RUANG) {
        toast('Kartu ini terlalu besar (maks ±600 KB). Pendekkan isinya atau pindahkan sebagian catatan ke kartu baru.');
        return false;
      }
    if (
      gtUkuranByte({
        ids: d.item.map(function (x) {
          return x.id;
        }),
        kon: d.kon,
        hari: d.hari
      }) > GP_KEPALA_RUANG
    ) {
      toast('Koneksi terlalu banyak. Putuskan beberapa koneksi dulu.');
      return false;
    }
  }
  store.set(K_GP, d);
  return true;
}
function gpCari(d, id) {
  return (
    d.item.filter(function (x) {
      return x.id === id;
    })[0] || null
  );
}
function gpJudul(x) {
  return x.judul || x.kalimat || x.tanya || x.baru || (x.a ? x.a + ' ⟷ ' + x.b : '');
}
function gpKonOf(d, id) {
  return d.kon.filter(function (k) {
    return k[0] === id || k[1] === id;
  });
}
function gpTglKunci(t) {
  var a = new Date(t);
  return a.getFullYear() + '-' + ('0' + (a.getMonth() + 1)).slice(-2) + '-' + ('0' + a.getDate()).slice(-2);
}
function gpAwalHari(t) {
  var a = new Date(t);
  a.setHours(0, 0, 0, 0);
  return a.getTime();
}
function gpTglPendek(t) {
  var a = new Date(t);
  return a.getDate() + ' ' + GT_BULAN[a.getMonth()] + ' ' + a.getFullYear();
}

/* ---------- Kartu hari ini (pengulangan berjarak) ---------- */
function gpHariIni(d) {
  var kini = Date.now(),
    tgl = gpTglKunci(kini);
  if (d.hari.tgl === tgl && d.hari.ids.length) return d.hari;
  var akhir = gpAwalHari(kini) + 86400000;
  var calon = d.item
    .filter(function (x) {
      return (x.ulang || 0) < akhir;
    })
    .sort(function (a, b) {
      return a.m - b.m || (a.ulang || 0) - (b.ulang || 0) || a.dibuat - b.dibuat;
    });
  if (!calon.length && d.hari.tgl === tgl) return d.hari;
  d.hari = {
    tgl: tgl,
    ids: calon.slice(0, 3).map(function (x) {
      return x.id;
    }),
    selesai: {}
  };
  if (d.item.length) store.set(K_GP, d);
  return d.hari;
}
var gpHariKe = 0;
function gpHariHtml(d) {
  if (!d.item.length) return '';
  var h = gpHariIni(d),
    sisa = h.ids.filter(function (id) {
      return !h.selesai[id];
    });
  if (!h.ids.length) return '';
  if (!sisa.length)
    return (
      '<div class="gp-hari"><div class="gp-hari-kp"><span>' +
      gpIk('sun', 15) +
      'Kartu hari ini</span></div><p class="gp-hari-selesai">Semua kartu hari ini sudah diulang. Sampai besok.</p></div>'
    );
  if (gpHariKe >= sisa.length) gpHariKe = 0;
  var x = gpCari(d, sisa[gpHariKe]);
  return (
    '<div class="gp-hari"><div class="gp-hari-kp"><span>' +
    gpIk('sun', 15) +
    'Kartu hari ini · ' +
    (gpHariKe + 1) +
    ' dari ' +
    sisa.length +
    '</span>' +
    (sisa.length > 1
      ? '<span><button type="button" data-gph="prev" aria-label="Sebelumnya">‹</button><button type="button" data-gph="next" aria-label="Berikutnya">›</button></span>'
      : '') +
    '</div>' +
    '<button type="button" class="gp-hari-q" data-pp-id="' +
    esc(x.id) +
    '">“' +
    esc(gpJudul(x)) +
    '”</button>' +
    '<div class="gp-hari-dua"><button type="button" class="utama" data-gph="resap" data-id="' +
    esc(x.id) +
    '">Sudah meresap</button><button type="button" data-gph="ulang" data-id="' +
    esc(x.id) +
    '">Ulangi besok</button></div></div>'
  );
}

/* ---------- Gambar model ---------- */
function gpModel(x, besar) {
  var b = (x.bagian || []).filter(Boolean),
    W = 320,
    wr = '#1d9e75',
    isi = 'color-mix(in srgb, #1d9e75 15%, transparent)',
    s = '';
  var teks = function (t, tx, ty, uk) {
    t = String(t);
    return (
      '<text x="' +
      tx +
      '" y="' +
      ty +
      '" text-anchor="middle" dominant-baseline="middle" style="font-size:' +
      (uk || 11) +
      'px;fill:var(--text);font-weight:600">' +
      esc(t.length > 18 ? t.slice(0, 17) + '…' : t) +
      '</text>'
    );
  };
  if (b.length < 1) return '';
  if (x.bentuk === 'siklus') {
    var n = b.length,
      R = besar ? 78 : 62,
      H = R * 2 + 50,
      cx = W / 2,
      cy = H / 2;
    s +=
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + wr + '" stroke-width="1.5" stroke-dasharray="4 4"/>';
    b.forEach(function (t, i) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / n,
        px = cx + R * Math.cos(a),
        py = cy + R * Math.sin(a),
        a2 = a + Math.PI / n,
        ax = cx + R * Math.cos(a2),
        ay = cy + R * Math.sin(a2);
      if (n > 1)
        s +=
          '<path d="M' +
          (ax - 4) +
          ' ' +
          (ay - 4) +
          ' L' +
          (ax + 4) +
          ' ' +
          ay +
          ' L' +
          (ax - 4) +
          ' ' +
          (ay + 4) +
          '" fill="none" stroke="' +
          wr +
          '" stroke-width="1.6" transform="rotate(' +
          ((a2 * 180) / Math.PI + 90) +
          ' ' +
          ax +
          ' ' +
          ay +
          ')"/>';
      s +=
        '<rect x="' +
        (px - 44) +
        '" y="' +
        (py - 14) +
        '" width="88" height="28" rx="14" fill="var(--surface)" stroke="' +
        wr +
        '"/><rect x="' +
        (px - 44) +
        '" y="' +
        (py - 14) +
        '" width="88" height="28" rx="14" fill="' +
        isi +
        '"/>' +
        teks(t, px, py);
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Siklus">' + s + '</svg>';
  }
  if (x.bentuk === 'tangga') {
    var n2 = b.length,
      sw = (W - 10) / n2,
      H2 = 30 + n2 * 22;
    b.forEach(function (t, i) {
      var h = 26 + i * 22,
        xx = 5 + i * sw;
      s +=
        '<rect x="' +
        xx +
        '" y="' +
        (H2 - h) +
        '" width="' +
        (sw - 4) +
        '" height="' +
        h +
        '" rx="6" fill="' +
        isi +
        '" stroke="' +
        wr +
        '"/>' +
        teks(t, xx + (sw - 4) / 2, H2 - h + 13, n2 > 5 ? 9 : 10.5);
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H2 + '" role="img" aria-label="Tangga">' + s + '</svg>';
  }
  if (x.bentuk === 'rumus') {
    if (b.length < 2) return '';
    var hasil = b[b.length - 1],
      kiri = b.slice(0, -1),
      part = [];
    kiri.forEach(function (t, i) {
      part.push(['k', t]);
      if (i < kiri.length - 1) part.push(['o', x.op || '+']);
    });
    part.push(['o', '=']);
    part.push(['h', hasil]);
    return (
      '<div class="gp-rumus">' +
      part
        .map(function (p) {
          return p[0] === 'o' ? '<b>' + esc(p[1]) + '</b>' : '<span' + (p[0] === 'h' ? ' class="hasil"' : '') + '>' + esc(p[1]) + '</span>';
        })
        .join('') +
      '</div>'
    );
  }
  if (x.bentuk === 'timbangan') {
    s +=
      '<path d="M160 22 L160 92 M130 96 L190 96" stroke="var(--text-2)" stroke-width="2"/><path d="M60 40 L260 40" stroke="' +
      wr +
      '" stroke-width="3"/><circle cx="160" cy="40" r="5" fill="' +
      wr +
      '"/>' +
      '<path d="M60 40 L35 70 M60 40 L85 70 M260 40 L235 70 M260 40 L285 70" stroke="var(--text-2)" stroke-width="1"/>' +
      '<rect x="10" y="70" width="100" height="26" rx="8" fill="' +
      isi +
      '" stroke="' +
      wr +
      '"/>' +
      teks(b[0] || '', 60, 83) +
      '<rect x="210" y="70" width="100" height="26" rx="8" fill="' +
      isi +
      '" stroke="' +
      wr +
      '"/>' +
      teks(b[1] || '', 260, 83);
    return '<svg viewBox="0 0 320 104" role="img" aria-label="Timbangan">' + s + '</svg>';
  }
  if (x.bentuk === 'matriks') {
    for (var q = 0; q < 4; q++) {
      var qx = 10 + (q % 2) * 152,
        qy = 6 + Math.floor(q / 2) * 54;
      s +=
        '<rect x="' +
        qx +
        '" y="' +
        qy +
        '" width="146" height="48" rx="8" fill="' +
        (q === 0 ? wr : isi) +
        '" stroke="' +
        wr +
        '"/><text x="' +
        (qx + 73) +
        '" y="' +
        (qy + 24) +
        '" text-anchor="middle" dominant-baseline="middle" style="font-size:10.5px;font-weight:600;fill:' +
        (q === 0 ? '#fff' : 'var(--text)') +
        '">' +
        esc(String(b[q] || '').slice(0, 26)) +
        '</text>';
    }
    return '<svg viewBox="0 0 320 116" role="img" aria-label="Matriks">' + s + '</svg>';
  }
  if (x.bentuk === 'corong') {
    var n3 = b.length,
      H3 = n3 * 30 + 6;
    b.forEach(function (t, i) {
      var w1 = 300 - i * (220 / n3),
        w2 = 300 - (i + 1) * (220 / n3),
        y = 3 + i * 30;
      s +=
        '<path d="M' +
        (160 - w1 / 2) +
        ' ' +
        y +
        ' L' +
        (160 + w1 / 2) +
        ' ' +
        y +
        ' L' +
        (160 + w2 / 2) +
        ' ' +
        (y + 27) +
        ' L' +
        (160 - w2 / 2) +
        ' ' +
        (y + 27) +
        'Z" fill="' +
        isi +
        '" stroke="' +
        wr +
        '"/>' +
        teks(t, 160, y + 14);
    });
    return '<svg viewBox="0 0 320 ' + H3 + '" role="img" aria-label="Corong">' + s + '</svg>';
  }
  return '';
}

/* ---------- Kartu ---------- */
function gpTag(j) {
  return '<span class="gp-tag">' + gpIk(j) + GP_JENIS[j].nama + '</span>';
}
function gpMatHtml(m) {
  return (
    '<span class="gp-mat">' +
    [1, 2, 3]
      .map(function (i) {
        return '<b' + (i <= m ? ' class="on"' : '') + '></b>';
      })
      .join('') +
    '<span>' +
    GP_MAT[m] +
    '</span></span>'
  );
}
function gpBuktiHtml(x) {
  var tot = (x.bukti || []).length;
  if (!tot) return '';
  var ok = x.bukti.filter(function (b) {
    return b[0];
  }).length;
  return (
    '<div class="gp-bukti"><div class="gp-bar"><i style="width:' +
    Math.round((ok / tot) * 100) +
    '%"></i></div><span class="ok">' +
    ok +
    ' terbukti</span><span class="no">' +
    (tot - ok) +
    ' tidak</span></div>'
  );
}
function gpIsiKartu(x) {
  if (x.j === 'prinsip')
    return (
      '<div class="gp-jdl">' +
      esc(x.judul) +
      '</div>' +
      (x.berlaku
        ? '<div class="gp-ket">' +
          gpIk('tempat', 12) +
          ' Berlaku saat ' +
          esc(x.berlaku.charAt(0).toLowerCase() + x.berlaku.slice(1)) +
          '</div>'
        : '') +
      gpBuktiHtml(x)
    );
  if (x.j === 'nilai')
    return '<div class="gp-jdl">' + esc(x.judul) + '</div>' + (x.alasan ? '<div class="gp-ket gp-klip">' + esc(x.alasan) + '</div>' : '');
  if (x.j === 'model') return '<div class="gp-jdl">' + esc(x.judul) + '</div><div class="gp-model">' + gpModel(x) + '</div>';
  if (x.j === 'pelajaran')
    return (
      (x.lama ? '<div class="gp-lama">' + esc(x.lama) + '</div><div class="gp-panah">↓ ' + esc(x.kejadian || 'berubah') + '</div>' : '') +
      '<div class="gp-baru">' +
      esc(x.baru) +
      '</div>'
    );
  if (x.j === 'perumpamaan')
    return (
      '<div class="gp-kutip">“' + esc(x.kalimat) + '”</div>' + (x.arti ? '<div class="gp-ket">Artinya: ' + esc(x.arti) + '</div>' : '')
    );
  if (x.j === 'renungan')
    return (
      '<div class="gp-jdl gp-miring">' +
      esc(x.tanya) +
      '</div><div class="gp-ket">' +
      gpIk('catat', 12) +
      ' ' +
      (x.catatan || []).length +
      ' catatan pemikiran</div>'
    );
  if (x.j === 'paradoks')
    return (
      '<div class="gp-dua"><div>' +
      esc(x.a) +
      '</div><i>⟷</i><div>' +
      esc(x.b) +
      '</div></div>' +
      (x.kapan ? '<div class="gp-ket" style="margin-top:6px">' + esc(x.kapan) + '</div>' : '')
    );
  return '';
}
function gpKartu(d, x) {
  var k = gpKonOf(d, x.id).length,
    asal = x.asal && (x.asal[1] || x.asal[0]);
  var pin = typeof gtDisematkan === 'function' && gtDisematkan(x.id);
  return (
    '<button type="button" class="gp-kartu gpj-' +
    x.j +
    '" data-pp-id="' +
    esc(x.id) +
    '"><span class="gp-kep">' +
    gpTag(x.j) +
    '<span class="gp-kep-kanan">' +
    gpMatHtml(x.m) +
    (pin ? '<span class="gp-pin" aria-label="Disematkan">' + GT_IKON_PIN + '</span>' : '') +
    '</span></span>' +
    gpIsiKartu(x) +
    '<span class="gp-kaki">' +
    (k ? '<span>' + gpIk('link', 13) + k + ' koneksi</span>' : '') +
    (asal ? '<span>' + gpIk('asal', 13) + esc(asal) + '</span>' : '') +
    '</span></button>'
  );
}

/* ---------- Tab ---------- */
var gpFilter = '',
  gpCariTeks = '',
  gpTampil = 'kartu',
  gpTampilN = GP_HAL,
  gpKunciDaftar = '';
function gpTeksCari(x) {
  return GP_TEKS.map(function (k) {
    return x[k] || '';
  })
    .concat(
      x.bagian || [],
      (x.catatan || []).map(function (c) {
        return c[1];
      }),
      x.asal ? [x.asal[1]] : []
    )
    .join(' ')
    .toLowerCase();
}
function gpCocok(d) {
  var q = gpCariTeks.trim().toLowerCase();
  return d.item
    .filter(function (x) {
      return (!gpFilter || x.j === gpFilter) && (!q || gpTeksCari(x).indexOf(q) >= 0);
    })
    .sort(function (a, b) {
      return gtLama ? a.dibuat - b.dibuat : b.dibuat - a.dibuat;
    });
}
function renderGtPola(box) {
  var d = gpData(),
    hit = {};
  d.item.forEach(function (x) {
    hit[x.j] = (hit[x.j] || 0) + 1;
  });
  if (gpFilter && !hit[gpFilter]) gpFilter = '';
  var h =
    gpHariHtml(d) +
    '<div class="gt-bar"><label class="gt-cari">' +
    GT_IKON_CARI +
    '<input type="search" id="gpCari" placeholder="Cari pola pikir" value="' +
    esc(gpCariTeks) +
    '" autocomplete="off"></label>' +
    '<button type="button" class="gt-ib' +
    (gtLama ? ' on' : '') +
    '" id="gtUrut" aria-label="Urutan: ' +
    (gtLama ? 'terlama' : 'terbaru') +
    ' dulu" title="' +
    (gtLama ? 'Terlama dulu' : 'Terbaru dulu') +
    '">' +
    GT_IKON_URUT +
    '</button>' +
    '<button type="button" class="gt-ib ac" id="gpTambah" aria-label="Tambah pola pikir">' +
    GT_IKON_PLUS +
    '</button></div>';
  if (d.item.length) {
    h +=
      '<div class="gp-baris2"><div class="gt-mode gp-seg" role="tablist"><button type="button" data-gpv="kartu"' +
      (gpTampil === 'kartu' ? ' class="on"' : '') +
      '>Kartu</button><button type="button" data-gpv="peta"' +
      (gpTampil === 'peta' ? ' class="on"' : '') +
      '>Peta</button></div></div>' +
      '<div class="gp-chips"><button type="button" class="gp-chip gpj-semua' +
      (!gpFilter ? ' on' : '') +
      '" data-gpf="">Semua <small>' +
      d.item.length +
      '</small></button>' +
      Object.keys(GP_JENIS)
        .filter(function (j) {
          return hit[j];
        })
        .map(function (j) {
          return (
            '<button type="button" class="gp-chip gpj-' +
            j +
            (gpFilter === j ? ' on' : '') +
            '" data-gpf="' +
            j +
            '">' +
            gpIk(j, 14) +
            GP_JENIS[j].nama +
            ' <small>' +
            hit[j] +
            '</small></button>'
          );
        })
        .join('') +
      '</div>';
  }
  var list = gpCocok(d),
    kunciDaftar = gpFilter + '|' + gpCariTeks + '|' + gtLama;
  if (kunciDaftar !== gpKunciDaftar) {
    gpKunciDaftar = kunciDaftar;
    gpTampilN = GP_HAL;
  }
  if (!d.item.length) h += '<p class="gt-kosong">Belum ada pola pikir. Ketuk <b>+</b> untuk mencatat yang pertama.</p>';
  else if (!list.length) h += '<p class="gt-kosong">Tidak ada pola pikir yang cocok.</p>';
  else if (gpTampil === 'peta')
    h +=
      (list.length > GP_PETA_MAKS
        ? '<p class="gp-ket gp-peta-ket">Menampilkan ' +
          GP_PETA_MAKS +
          ' dari ' +
          list.length +
          ' pola pikir (yang paling banyak koneksi). Saring jenis atau cari untuk melihat yang lain.</p>'
        : '') +
      '<div class="gp-peta" id="gpPeta"><svg id="gpPetaSvg"><g id="gpPetaG"></g></svg><div class="gp-zoom"><button type="button" data-gpz="1.25" aria-label="Perbesar">+</button><button type="button" data-gpz="0.8" aria-label="Perkecil">−</button><button type="button" data-gpz="0" aria-label="Tampilkan semua">⌂</button></div>' +
      '<div class="gp-leg">' +
      Object.keys(GP_JENIS)
        .filter(function (j) {
          return hit[j];
        })
        .map(function (j) {
          return '<span><i style="background:' + GP_JENIS[j].w + '"></i>' + GP_JENIS[j].nama + '</span>';
        })
        .join('') +
      '<span><i class="garis"></i>bertentangan</span></div></div>';
  else {
    var pin = gtSematan(),
      dipin = list
        .filter(function (x) {
          return pin.indexOf(x.id) >= 0;
        })
        .sort(function (a, b) {
          return pin.indexOf(a.id) - pin.indexOf(b.id);
        });
    var biasa = list.filter(function (x) {
      return pin.indexOf(x.id) < 0;
    });
    if (dipin.length)
      h +=
        '<h3 class="gt-judul">' +
        GT_IKON_PIN +
        'Disematkan</h3><div class="gp-daftar">' +
        dipin
          .map(function (x) {
            return gpKartu(d, x);
          })
          .join('') +
        '</div>' +
        (biasa.length ? '<h3 class="gt-judul">Pola pikir lain</h3>' : '');
    var tampil = biasa.slice(0, Math.max(GP_HAL, gpTampilN - dipin.length));
    if (biasa.length)
      h +=
        '<div class="gp-daftar' +
        (dipin.length ? ' gp-daftar-lanjut' : '') +
        '">' +
        tampil
          .map(function (x) {
            return gpKartu(d, x);
          })
          .join('') +
        '</div>';
    if (tampil.length < biasa.length)
      h +=
        '<button type="button" class="btn gp-lebar gp-lagi" id="gpLagi" data-gplagi>Tampilkan lebih banyak (' +
        (biasa.length - tampil.length) +
        ' lagi)</button>';
  }
  var fokus = document.activeElement && document.activeElement.id === 'gpCari',
    pos = fokus ? document.activeElement.selectionStart : 0;
  box.innerHTML = h;
  if (fokus) {
    var c = $('#gpCari');
    c.focus();
    try {
      c.setSelectionRange(pos, pos);
    } catch (e) {}
  }
  if (gpTampil === 'peta' && list.length && d.item.length) gpRenderPeta(d, list);
  gpPasangLagi();
}
/* Muat bertahap: 60 kartu dulu, berikutnya otomatis saat tombol "lebih banyak" terlihat */
var gpLagiObs = null;
function gpPasangLagi() {
  var b = $('#gpLagi');
  if (gpLagiObs) {
    gpLagiObs.disconnect();
    gpLagiObs = null;
  }
  if (!b || !window.IntersectionObserver) return;
  gpLagiObs = new IntersectionObserver(
    function (en) {
      if (en[0].isIntersecting) {
        gpLagiObs.disconnect();
        gpLagiObs = null;
        gpTampilN += GP_HAL;
        renderGaleryTab();
      }
    },
    { rootMargin: '400px' }
  );
  gpLagiObs.observe(b);
}
function gpBuka(id) {
  openLayer('page:pola-detail:' + id);
}
function gpBaru(j) {
  openLayer('page:pola-form:' + (j || ''));
}
$('#gtIsi').addEventListener('click', function (e) {
  if (gtAktif() !== 'pola') return;
  var el, d;
  if ((el = e.target.closest('[data-gph]'))) {
    d = gpData();
    var h = gpHariIni(d),
      a = el.dataset.gph,
      n = h.ids.filter(function (i) {
        return !h.selesai[i];
      }).length;
    if (a === 'next') gpHariKe = (gpHariKe + 1) % n;
    else if (a === 'prev') gpHariKe = (gpHariKe - 1 + n) % n;
    else {
      var x = gpCari(d, el.dataset.id);
      if (!x) return;
      if (a === 'resap') {
        x.ulang = gpAwalHari(Date.now()) + GP_JARAK[Math.min(x.jarak, GP_JARAK.length - 1)] * 86400000;
        x.jarak = Math.min(x.jarak + 1, GP_JARAK.length);
        toast('Bagus! Muncul lagi ' + GP_JARAK[Math.min(x.jarak - 1, GP_JARAK.length - 1)] + ' hari lagi');
      } else {
        x.ulang = gpAwalHari(Date.now()) + 86400000;
        x.jarak = 0;
        toast('Akan muncul lagi besok');
      }
      d.hari.selesai[x.id] = 1;
      gpSimpan(d);
    }
    renderGaleryTab();
    return;
  }
  if ((el = e.target.closest('[data-pp-id]'))) {
    if (gpTahanJadi) {
      gpTahanJadi = false;
      return;
    }
    gpBuka(el.dataset.ppId);
    return;
  }
  if ((el = e.target.closest('[data-gpf]'))) {
    gpFilter = el.dataset.gpf;
    renderGaleryTab();
    return;
  }
  if ((el = e.target.closest('[data-gpv]'))) {
    gpTampil = el.dataset.gpv;
    renderGaleryTab();
    return;
  }
  if (e.target.closest('[data-gplagi]')) {
    gpTampilN += GP_HAL;
    renderGaleryTab();
    return;
  }
  if (e.target.closest('#gpTambah')) {
    gpIsiAwal = null;
    gpBaru('');
    return;
  }
  if ((el = e.target.closest('[data-gpz]'))) {
    var z = +el.dataset.gpz,
      p = $('#gpPeta');
    if (!z) gpPusatkan();
    else gpZoomPeta(z, p.clientWidth / 2, p.clientHeight / 2);
  }
});
/* Tahan kartu ±0,5 detik = sematkan / lepas sematan */
var gpTahan = null,
  gpTahanJadi = false,
  gpTahanXY = null;
$('#gtIsi').addEventListener('pointerdown', function (e) {
  if (gtAktif() !== 'pola') return;
  var k = e.target.closest('.gp-kartu[data-pp-id]');
  if (!k) return;
  gpTahanJadi = false;
  gpTahanXY = [e.clientX, e.clientY];
  clearTimeout(gpTahan);
  gpTahan = setTimeout(function () {
    gpTahanJadi = true;
    if (navigator.vibrate)
      try {
        navigator.vibrate(15);
      } catch (x) {}
    gtSematanToggle(k.dataset.ppId);
  }, 500);
});
$('#gtIsi').addEventListener('pointermove', function (e) {
  if (gpTahanXY && Math.hypot(e.clientX - gpTahanXY[0], e.clientY - gpTahanXY[1]) > 10) {
    clearTimeout(gpTahan);
    gpTahanXY = null;
  }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
  $('#gtIsi').addEventListener(ev, function () {
    clearTimeout(gpTahan);
    gpTahanXY = null;
    if (gpTahanJadi)
      setTimeout(function () {
        gpTahanJadi = false;
      }, 350);
  });
});
$('#gtIsi').addEventListener('contextmenu', function (e) {
  if (e.target.closest('.gp-kartu')) e.preventDefault();
});
$('#gtIsi').addEventListener('input', function (e) {
  if (e.target.id === 'gpCari') {
    gpCariTeks = e.target.value;
    renderGaleryTab();
  }
});

/* ---------- Peta koneksi ---------- */
var gpPV = { x: 0, y: 0, k: 1, siap: false },
  gpPos = {};
function gpSusun(d, list) {
  var ids = list.map(function (x) {
      return x.id;
    }),
    pos = {},
    n = list.length;
  list.forEach(function (x, i) {
    var a = i * 2.39996,
      r = 40 + 22 * Math.sqrt(i);
    pos[x.id] = gpPos[x.id] ? { x: gpPos[x.id].x, y: gpPos[x.id].y } : { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  var E = d.kon.filter(function (k) {
      return ids.indexOf(k[0]) >= 0 && ids.indexOf(k[1]) >= 0;
    }),
    it,
    i,
    j;
  var putaran = n > 120 ? 120 : 400;
  for (it = 0; it < putaran; it++) {
    var f = {};
    ids.forEach(function (id) {
      f[id] = { x: 0, y: 0 };
    });
    for (i = 0; i < n; i++)
      for (j = i + 1; j < n; j++) {
        var A = pos[ids[i]],
          B = pos[ids[j]],
          dx = A.x - B.x,
          dy = A.y - B.y,
          d2 = Math.max(dx * dx + dy * dy, 25),
          F = 11000 / d2,
          dd = Math.sqrt(d2);
        f[ids[i]].x += (dx / dd) * F;
        f[ids[i]].y += (dy / dd) * F;
        f[ids[j]].x -= (dx / dd) * F;
        f[ids[j]].y -= (dy / dd) * F;
      }
    E.forEach(function (k) {
      var A = pos[k[0]],
        B = pos[k[1]],
        dx = B.x - A.x,
        dy = B.y - A.y,
        dd = Math.sqrt(dx * dx + dy * dy) || 1,
        F = (dd - 150) * 0.04;
      f[k[0]].x += (dx / dd) * F;
      f[k[0]].y += (dy / dd) * F;
      f[k[1]].x -= (dx / dd) * F;
      f[k[1]].y -= (dy / dd) * F;
    });
    ids.forEach(function (id) {
      f[id].x -= pos[id].x * 0.012;
      f[id].y -= pos[id].y * 0.012;
      var m = Math.hypot(f[id].x, f[id].y) || 1,
        s = Math.min(8, m);
      pos[id].x += (f[id].x / m) * s;
      pos[id].y += (f[id].y / m) * s;
    });
  }
  ids.forEach(function (id) {
    gpPos[id] = pos[id];
  });
  return { pos: pos, E: E };
}
function gpRenderPeta(d, list) {
  if (list.length > GP_PETA_MAKS) {
    var jml = {};
    d.kon.forEach(function (k) {
      jml[k[0]] = (jml[k[0]] || 0) + 1;
      jml[k[1]] = (jml[k[1]] || 0) + 1;
    });
    list = list
      .slice()
      .sort(function (a, b) {
        return (jml[b.id] || 0) - (jml[a.id] || 0) || b.dibuat - a.dibuat;
      })
      .slice(0, GP_PETA_MAKS);
  }
  var S = gpSusun(d, list),
    s = '';
  S.E.forEach(function (k) {
    var A = S.pos[k[0]],
      B = S.pos[k[1]],
      t = k[2] === 'tentang';
    s +=
      '<line x1="' +
      A.x +
      '" y1="' +
      A.y +
      '" x2="' +
      B.x +
      '" y2="' +
      B.y +
      '" stroke="' +
      (t ? 'var(--danger)' : 'var(--text-2)') +
      '" stroke-opacity="' +
      (t ? 0.9 : 0.45) +
      '" stroke-width="1.4"' +
      (t ? ' stroke-dasharray="5 4"' : '') +
      '/>';
  });
  list.forEach(function (x) {
    var p = S.pos[x.id],
      r = 9 + Math.min(8, gpKonOf(d, x.id).length) * 2.5,
      t = gpJudul(x);
    t = t.length > 20 ? t.slice(0, 19) + '…' : t;
    s +=
      '<g data-pp-id="' +
      esc(x.id) +
      '" style="cursor:pointer"><circle cx="' +
      p.x +
      '" cy="' +
      p.y +
      '" r="' +
      (r + 6) +
      '" fill="' +
      GP_JENIS[x.j].w +
      '" opacity=".16"/><circle cx="' +
      p.x +
      '" cy="' +
      p.y +
      '" r="' +
      r +
      '" fill="' +
      GP_JENIS[x.j].w +
      '"/>' +
      '<text x="' +
      p.x +
      '" y="' +
      (p.y + r + 13) +
      '" text-anchor="middle" style="font-size:11px;font-weight:600;fill:var(--text);paint-order:stroke;stroke:var(--surface);stroke-width:3px">' +
      esc(t) +
      '</text></g>';
  });
  $('#gpPetaG').innerHTML = s;
  if (!gpPV.siap) {
    gpPV.siap = true;
    gpPusatkan();
  } else gpTerapPeta();
  gpPasangPeta();
}
function gpTerapPeta() {
  var g = $('#gpPetaG');
  if (g) g.setAttribute('transform', 'translate(' + gpPV.x + ' ' + gpPV.y + ') scale(' + gpPV.k + ')');
}
function gpPusatkan() {
  var el = $('#gpPeta');
  if (!el) return;
  var W = el.clientWidth,
    H = el.clientHeight,
    xs = [],
    ys = [],
    d = gpData();
  d.item.forEach(function (x) {
    if (gpPos[x.id]) {
      xs.push(gpPos[x.id].x);
      ys.push(gpPos[x.id].y);
    }
  });
  if (!xs.length) {
    gpPV.k = 1;
    gpPV.x = W / 2;
    gpPV.y = H / 2;
    gpTerapPeta();
    return;
  }
  var x0 = Math.min.apply(0, xs) - 70,
    x1 = Math.max.apply(0, xs) + 70,
    y0 = Math.min.apply(0, ys) - 40,
    y1 = Math.max.apply(0, ys) + 60;
  gpPV.k = Math.max(0.3, Math.min(1.4, W / (x1 - x0), (H - 50) / (y1 - y0)));
  gpPV.x = W / 2 - ((x0 + x1) / 2) * gpPV.k;
  gpPV.y = (H - 50) / 2 - ((y0 + y1) / 2) * gpPV.k;
  gpTerapPeta();
}
function gpZoomPeta(f, cx, cy) {
  var k2 = Math.max(0.3, Math.min(3, gpPV.k * f));
  f = k2 / gpPV.k;
  gpPV.x = cx - (cx - gpPV.x) * f;
  gpPV.y = cy - (cy - gpPV.y) * f;
  gpPV.k = k2;
  gpTerapPeta();
}
function gpPasangPeta() {
  var el = $('#gpPeta'),
    svg = $('#gpPetaSvg'),
    ptr = {},
    mulai = null,
    pinch = null,
    gerak = 0;
  if (!svg) return;
  svg.addEventListener(
    'wheel',
    function (e) {
      e.preventDefault();
      var r = el.getBoundingClientRect();
      gpZoomPeta(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false }
  );
  svg.addEventListener('pointerdown', function (e) {
    try {
      svg.setPointerCapture(e.pointerId);
    } catch (x) {}
    ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
    gerak = 0;
    var a = Object.keys(ptr).map(function (k) {
      return ptr[k];
    });
    if (a.length === 2) pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, k: gpPV.k };
    else mulai = { x: e.clientX, y: e.clientY, px: gpPV.x, py: gpPV.y };
  });
  svg.addEventListener('pointermove', function (e) {
    if (!ptr[e.pointerId]) return;
    ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
    var a = Object.keys(ptr).map(function (k) {
        return ptr[k];
      }),
      r = el.getBoundingClientRect();
    if (a.length === 2 && pinch) {
      var dd = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      gpZoomPeta((pinch.k * dd) / pinch.d / gpPV.k, (a[0].x + a[1].x) / 2 - r.left, (a[0].y + a[1].y) / 2 - r.top);
      gerak = 99;
      return;
    }
    if (mulai) {
      var dx = e.clientX - mulai.x,
        dy = e.clientY - mulai.y;
      gerak = Math.max(gerak, Math.hypot(dx, dy));
      gpPV.x = mulai.px + dx;
      gpPV.y = mulai.py + dy;
      gpTerapPeta();
    }
  });
  function lepas(e) {
    var ada = ptr[e.pointerId];
    delete ptr[e.pointerId];
    if (Object.keys(ptr).length < 2) pinch = null;
    if (!Object.keys(ptr).length) {
      if (gerak < 6 && ada) {
        var g = document.elementFromPoint(e.clientX, e.clientY);
        g = g && g.closest('g[data-pp-id]');
        if (g) gpBuka(g.getAttribute('data-pp-id'));
      }
      mulai = null;
    }
  }
  svg.addEventListener('pointerup', lepas);
  svg.addEventListener('pointercancel', lepas);
}

/* ---------- Halaman detail ---------- */
function gpIdHalaman() {
  var L = layerOf('page');
  return L ? L.name.split(':').slice(2).join(':') : '';
}
var gpDetailId = null,
  gpBuktiJenis = null;
PAGES['pola-detail'] = function () {
  var id = gpIdHalaman(),
    d = gpData(),
    x = gpCari(d, id);
  if (!x) return false;
  gpDetailId = id;
  gpBuktiJenis = null;
  $('#subTitle').textContent = GP_JENIS[x.j].nama;
  gpRenderDetail(d, x);
  return true;
};
function gpRenderDetail(d, x) {
  var h = '<div class="gp-det">';
  h +=
    '<section class="gp-blok gp-utama gpj-' +
    x.j +
    '"><div class="gp-kep">' +
    gpTag(x.j) +
    '<span class="gp-aksi"><button type="button" class="gp-ib' +
    (gtDisematkan(x.id) ? ' on' : '') +
    '" data-gpd="pin" aria-label="' +
    (gtDisematkan(x.id) ? 'Lepas sematan' : 'Sematkan') +
    '">' +
    GT_IKON_PIN +
    '</button><button type="button" class="gp-ib" data-gpd="edit" aria-label="Edit">' +
    gpIk('pena') +
    '</button><button type="button" class="gp-ib bahaya" data-gpd="hapus" aria-label="Hapus">' +
    gpIk('hapus') +
    '</button></span></div>';
  if (x.j === 'prinsip' || x.j === 'nilai') h += '<div class="gp-besar">' + esc(x.judul) + '</div>';
  if (x.j === 'model') h += '<div class="gp-besar">' + esc(x.judul) + '</div><div class="gp-model">' + gpModel(x, true) + '</div>';
  if (x.j === 'pelajaran') h += gpIsiKartu(x);
  if (x.j === 'perumpamaan') h += '<div class="gp-besar gp-serif">“' + esc(x.kalimat) + '”</div>';
  if (x.j === 'renungan') h += '<div class="gp-besar gp-miring">' + esc(x.tanya) + '</div>';
  if (x.j === 'paradoks')
    h += '<div class="gp-dua" style="margin-top:12px"><div>' + esc(x.a) + '</div><i>⟷</i><div>' + esc(x.b) + '</div></div>';
  h += '</section>';
  var rinci = [];
  if (x.berlaku) rinci.push(['Berlaku saat', x.berlaku]);
  if (x.tidak) rinci.push(['Tidak berlaku', x.tidak]);
  if (x.alasan) rinci.push([x.j === 'nilai' ? 'Alasan pribadi' : x.j === 'model' ? 'Penjelasan' : 'Alasan', x.alasan]);
  if (x.kejadian || x.tgl) rinci.push(['Kejadian', [x.kejadian, x.tgl].filter(Boolean).join(' · ')]);
  if (x.arti) rinci.push(['Artinya', x.arti]);
  if (x.kapan) rinci.push(['Kapan memilih', x.kapan]);
  if (x.bentuk) rinci.push(['Bentuk model', GP_BENTUK[x.bentuk]]);
  if (x.asal) rinci.push(['Asal', x.asal[0] + (x.asal[1] ? ' · ' + x.asal[1] : '')]);
  rinci.push(['Dicatat', gpTglPendek(x.dibuat) + (x.diubah > x.dibuat + 1000 ? ' · diubah ' + gpTglPendek(x.diubah) : '')]);
  h +=
    '<section class="gp-blok"><h3>Rincian</h3><dl class="gp-rinci">' +
    rinci
      .map(function (r) {
        return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>';
      })
      .join('') +
    '</dl></section>';
  h +=
    '<section class="gp-blok"><h3>Tingkat kematangan</h3><div class="gp-pilmat">' +
    [1, 2, 3]
      .map(function (i) {
        return '<button type="button" data-gpmat="' + i + '"' + (x.m === i ? ' class="on"' : '') + '>' + GP_MAT[i] + '</button>';
      })
      .join('') +
    '</div></section>';
  if (x.j === 'prinsip') {
    var tot = (x.bukti || []).length;
    h +=
      '<section class="gp-blok"><h3>Bukti lapangan</h3>' +
      (tot ? gpBuktiHtml(x) : '<p class="gp-ket" style="margin:0">Belum ada bukti. Catat setiap kali kamu menerapkannya.</p>') +
      (gpBuktiJenis === null
        ? '<div class="gp-tbl"><button type="button" class="ok" data-gpd="bukti1">+ Terbukti</button><button type="button" class="no" data-gpd="bukti0">+ Tidak berhasil</button></div>'
        : '<div class="gp-buktiform"><label for="gpBuktiTeks">' +
          (gpBuktiJenis ? 'Terbukti' : 'Tidak berhasil') +
          ' — situasinya (opsional)</label><input class="input" id="gpBuktiTeks" maxlength="' +
          GP_T +
          '" placeholder="mis. Saat penjualan turun" autocomplete="off">' +
          '<div class="gp-tbl"><button type="button" data-gpd="buktiBatal">Batal</button><button type="button" class="utama" data-gpd="buktiSimpan">Simpan bukti</button></div></div>') +
      (tot
        ? '<ul class="gp-log">' +
          x.bukti
            .slice()
            .sort(function (a, b) {
              return b[1] - a[1];
            })
            .map(function (b) {
              return (
                '<li><span class="' +
                (b[0] ? 'ok' : 'no') +
                '">' +
                (b[0] ? '✓' : '✗') +
                '</span><span>' +
                esc(b[2] || (b[0] ? 'Terbukti' : 'Tidak berhasil')) +
                ' · ' +
                gpTglPendek(b[1]) +
                '</span></li>'
              );
            })
            .join('') +
          '</ul>'
        : '') +
      '</section>';
  }
  if (x.j === 'renungan') {
    h +=
      '<section class="gp-blok"><h3>Catatan pemikiran</h3><textarea class="input" id="gpRenung" rows="3" maxlength="' +
      GP_P +
      '" placeholder="Tulis pikiranmu hari ini"></textarea><button type="button" class="btn primary gp-lebar" data-gpd="renung">Tambah catatan</button>' +
      (x.catatan || [])
        .slice()
        .sort(function (a, b) {
          return b[0] - a[0];
        })
        .map(function (c) {
          return '<div class="gp-renung">' + esc(c[1]) + '<small>' + gpTglPendek(c[0]) + '</small></div>';
        })
        .join('') +
      '</section>';
  }
  var ks = gpKonOf(d, x.id);
  h +=
    '<section class="gp-blok"><h3>' +
    gpIk('link', 14) +
    ' Koneksi (' +
    ks.length +
    ')</h3>' +
    ks
      .map(function (k, i) {
        var lain = gpCari(d, k[0] === x.id ? k[1] : k[0]),
          rel = k[2] === 'turunan' ? (k[0] === x.id ? 'Turunan dari' : 'Melahirkan') : GP_REL[k[2]];
        return (
          '<div class="gp-kon gpj-' +
          lain.j +
          '"><button type="button" class="gp-kon-buka" data-gpke="' +
          esc(lain.id) +
          '"><span class="gp-tag gp-tag-i">' +
          gpIk(lain.j) +
          '</span><span class="gp-kon-teks"><small class="' +
          (k[2] === 'tentang' ? 'tentang' : '') +
          '">' +
          rel +
          '</small><b>' +
          esc(gpJudul(lain)) +
          '</b></span></button>' +
          '<button type="button" class="gp-ib" data-gpputus="' +
          i +
          '" aria-label="Putuskan koneksi">×</button></div>'
        );
      })
      .join('') +
    '<button type="button" class="btn gp-lebar gp-sambung" data-gpd="sambung">' +
    gpIk('link', 16) +
    ' Sambungkan ke pola pikir lain</button></section>';
  h += '</div>';
  $('#subBody').innerHTML = h;
}
function gpSegarDetail() {
  if (pageKind !== 'pola-detail') return;
  var d = gpData(),
    x = gpCari(d, gpDetailId);
  if (x) {
    var y = $('#subBody').scrollTop;
    gpRenderDetail(d, x);
    $('#subBody').scrollTop = y;
  }
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'pola-detail') return;
  var d = gpData(),
    x = gpCari(d, gpDetailId),
    el;
  if (!x) return;
  if ((el = e.target.closest('[data-gpmat]'))) {
    x.m = +el.dataset.gpmat;
    x.diubah = Date.now();
    if (gpSimpan(d, x.id)) {
      gpSegarDetail();
      toast('Kematangan: ' + GP_MAT[x.m]);
    }
    return;
  }
  if ((el = e.target.closest('[data-gpke]'))) {
    gpBuka(el.dataset.gpke);
    return;
  }
  if ((el = e.target.closest('[data-gpputus]'))) {
    var ks = gpKonOf(d, x.id),
      k = ks[+el.dataset.gpputus];
    if (!k) return;
    var lain = gpCari(d, k[0] === x.id ? k[1] : k[0]);
    askConfirm({
      title: 'Putuskan koneksi?',
      text: 'Koneksi dengan "' + gpJudul(lain) + '" dihapus. Kedua pola pikir tetap ada.',
      ok: 'Putuskan',
      action: function () {
        back(1, function () {
          var d2 = gpData();
          d2.kon = d2.kon.filter(function (q) {
            return !(q[0] === k[0] && q[1] === k[1] && q[2] === k[2]);
          });
          gpSimpan(d2);
          gpSegarDetail();
          toast('Koneksi diputus');
        });
      }
    });
    return;
  }
  if (!(el = e.target.closest('[data-gpd]'))) return;
  var a = el.dataset.gpd;
  if (a === 'pin') {
    gtSematanToggle(x.id);
    gpSegarDetail();
    return;
  }
  if (a === 'edit') openLayer('page:pola-form:' + x.j + ':' + x.id);
  else if (a === 'hapus')
    askConfirm({
      title: 'Hapus pola pikir?',
      text: '"' + gpJudul(x) + '" dan semua koneksinya dihapus permanen.',
      ok: 'Hapus',
      action: function () {
        back(2, function () {
          var d2 = gpData();
          d2.item = d2.item.filter(function (y) {
            return y.id !== x.id;
          });
          d2.kon = d2.kon.filter(function (k) {
            return k[0] !== x.id && k[1] !== x.id;
          });
          d2.hari.ids = d2.hari.ids.filter(function (i) {
            return i !== x.id;
          });
          gpSimpan(d2);
          if (gtDisematkan(x.id)) gtSematanToggle(x.id);
          renderGaleryTab();
          toast('Pola pikir dihapus');
        });
      }
    });
  else if (a === 'bukti1' || a === 'bukti0') {
    gpBuktiJenis = a === 'bukti1' ? 1 : 0;
    gpSegarDetail();
    var i = $('#gpBuktiTeks');
    if (i) i.focus();
  } else if (a === 'buktiBatal') {
    gpBuktiJenis = null;
    gpSegarDetail();
  } else if (a === 'buktiSimpan') {
    x.bukti = (x.bukti || []).concat([[gpBuktiJenis, Date.now(), gpPotong($('#gpBuktiTeks').value.trim(), GP_T)]]);
    x.diubah = Date.now();
    gpBuktiJenis = null;
    if (gpSimpan(d, x.id)) {
      gpSegarDetail();
      toast('Bukti dicatat');
    }
  } else if (a === 'renung') {
    var v = $('#gpRenung').value.trim();
    if (!v) {
      toast('Tulis dulu catatannya');
      $('#gpRenung').focus();
      return;
    }
    x.catatan = (x.catatan || []).concat([[Date.now(), gpPotong(v, GP_P)]]);
    x.diubah = Date.now();
    if (gpSimpan(d, x.id)) {
      gpSegarDetail();
      toast('Catatan ditambahkan');
    }
  } else if (a === 'sambung') openLayer('page:pola-sambung:' + x.id);
});

/* ---------- Halaman sambungkan ---------- */
var gpRelPilih = 'dukung',
  gpSambungCari = '';
PAGES['pola-sambung'] = function () {
  var id = gpIdHalaman(),
    d = gpData(),
    x = gpCari(d, id);
  if (!x) return false;
  gpDetailId = id;
  gpRelPilih = 'dukung';
  gpSambungCari = '';
  $('#subTitle').textContent = 'Sambungkan';
  gpRenderSambung();
  return true;
};
function gpRenderSambung() {
  var d = gpData(),
    x = gpCari(d, gpDetailId);
  if (!x) return;
  var ada = gpKonOf(d, x.id).map(function (k) {
      return k[0] === x.id ? k[1] : k[0];
    }),
    q = gpSambungCari.trim().toLowerCase();
  var lain = d.item.filter(function (y) {
    return y.id !== x.id && ada.indexOf(y.id) < 0 && (!q || gpJudul(y).toLowerCase().indexOf(q) >= 0);
  });
  var h =
    '<div class="gp-det"><section class="gp-blok"><p class="gp-ket" style="margin:0 0 10px">Hubungan "<b>' +
    esc(gpJudul(x)) +
    '</b>" dengan pola pikir lain:</p><div class="gp-bentuk" id="gpRel">' +
    Object.keys(GP_REL)
      .map(function (r) {
        return '<button type="button" data-gprel="' + r + '"' + (r === gpRelPilih ? ' class="on"' : '') + '>' + GP_REL[r] + '</button>';
      })
      .join('') +
    '</div></section>' +
    '<label class="gt-cari" style="margin-bottom:10px">' +
    GT_IKON_CARI +
    '<input type="search" id="gpSambungCari" placeholder="Cari pola pikir" value="' +
    esc(gpSambungCari) +
    '" autocomplete="off"></label>' +
    (lain.length
      ? '<div class="gp-opsi-daftar">' +
        lain
          .map(function (y) {
            return (
              '<button type="button" class="gp-opsi gpj-' +
              y.j +
              '" data-gppilih="' +
              esc(y.id) +
              '"><span class="gp-tag gp-tag-i">' +
              gpIk(y.j) +
              '</span><span>' +
              esc(gpJudul(y)) +
              '</span></button>'
            );
          })
          .join('') +
        '</div>'
      : '<p class="gt-kosong">' + (q ? 'Tidak ada yang cocok.' : 'Semua pola pikir sudah tersambung.') + '</p>') +
    '</div>';
  var fokus = document.activeElement && document.activeElement.id === 'gpSambungCari';
  $('#subBody').innerHTML = h;
  if (fokus) {
    var c = $('#gpSambungCari');
    c.focus();
    try {
      c.setSelectionRange(c.value.length, c.value.length);
    } catch (e) {}
  }
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'pola-sambung') return;
  var el;
  if ((el = e.target.closest('[data-gprel]'))) {
    gpRelPilih = el.dataset.gprel;
    Array.prototype.forEach.call(document.querySelectorAll('#gpRel button'), function (b) {
      b.classList.toggle('on', b === el);
    });
    return;
  }
  if ((el = e.target.closest('[data-gppilih]'))) {
    var d = gpData(),
      lain = el.dataset.gppilih;
    d.kon.push([gpDetailId, lain, gpRelPilih]);
    if (gpSimpan(d))
      back(1, function () {
        gpSegarDetail();
        toast('Tersambung: ' + GP_REL[gpRelPilih].toLowerCase());
      });
  }
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'pola-sambung' && e.target.id === 'gpSambungCari') {
    gpSambungCari = e.target.value;
    gpRenderSambung();
  }
});

/* ---------- Halaman tambah / edit ---------- */
var gpDraf = null;
var gpIsiAwal = null;
PAGES['pola-form'] = function () {
  var p = gpIdHalaman().split(':'),
    j = p[0],
    id = p[1] || '',
    d = gpData(),
    x = id ? gpCari(d, id) : null;
  if (id && !x) return false;
  if (!GP_JENIS[j]) {
    gpDraf = null;
    $('#subTitle').textContent = 'Pola pikir baru';
    $('#subBody').innerHTML =
      '<div class="gp-det"><p class="gp-ket" style="margin:0 0 12px">Pilih jenis dulu. Isiannya menyesuaikan jenis yang dipilih.</p><div class="gp-pilih-jenis">' +
      Object.keys(GP_JENIS)
        .map(function (k) {
          return (
            '<button type="button" class="gpj-' +
            k +
            '" data-gpjenis="' +
            k +
            '"><b>' +
            gpIk(k) +
            GP_JENIS[k].nama +
            '</b><small>' +
            GP_JENIS[k].ket +
            '</small></button>'
          );
        })
        .join('') +
      '</div></div>';
    return true;
  }
  gpDraf = x
    ? JSON.parse(JSON.stringify(x))
    : { j: j, m: j === 'renungan' ? 1 : 2, bentuk: 'siklus', op: '+', bagian: ['', '', ''], asal: ['Pengalaman', ''] };
  if (j === 'model' && (!gpDraf.bagian || !gpDraf.bagian.length)) gpDraf.bagian = ['', '', ''];
  if (!gpDraf.asal) gpDraf.asal = ['Pengalaman', ''];
  gpDraf._id = id;
  gpDraf._kotor = false;
  /* Isian awal dari luar (5.59.0: kutipan buku → Pola Pikir) */
  if (!x && gpIsiAwal) {
    var f0 = GP_FIELD[j][0][0],
      maks0 = /alasan|kalimat|arti|tanya|kapan/.test(f0) ? GP_P : GP_T;
    gpDraf[f0] = String(gpIsiAwal.teks || '').slice(0, maks0);
    if (gpIsiAwal.asal) gpDraf.asal = [gpIsiAwal.asal[0], String(gpIsiAwal.asal[1] || '').slice(0, GP_ASAL_T)];
    gpIsiAwal = null;
    gpDraf._kotor = true;
  }
  $('#subTitle').textContent = (x ? 'Edit ' : '') + GP_JENIS[j].nama;
  gpRenderForm();
  return true;
};
function gpRenderForm() {
  var d = gpDraf,
    j = d.j,
    h =
      '<div class="se gp-det"><section class="gp-blok gp-utama gpj-' +
      j +
      '"><div class="gp-kep" style="margin-bottom:10px">' +
      gpTag(j) +
      '</div>';
  GP_FIELD[j].forEach(function (f) {
    var v = esc(d[f[0]] || ''),
      maks = /alasan|kalimat|arti|tanya|kapan/.test(f[0]) ? GP_P : GP_T;
    h +=
      '<div class="field"><label for="gpf-' +
      f[0] +
      '">' +
      f[1] +
      (f[3] ? '' : ' <span class="gp-ops">(opsional)</span>') +
      '</label>' +
      (f[4]
        ? '<textarea class="input" id="gpf-' +
          f[0] +
          '" data-gpf-isi="' +
          f[0] +
          '" rows="3" maxlength="' +
          maks +
          '" placeholder="' +
          f[2] +
          '">' +
          v +
          '</textarea>'
        : '<input class="input" id="gpf-' +
          f[0] +
          '" data-gpf-isi="' +
          f[0] +
          '" type="' +
          (f[5] || 'text') +
          '"' +
          (f[5] ? '' : ' maxlength="' + maks + '"') +
          ' placeholder="' +
          f[2] +
          '" value="' +
          v +
          '" autocomplete="off">') +
      '</div>';
  });
  if (j === 'model') {
    h +=
      '<div class="field"><label>Bentuk</label><div class="gp-bentuk">' +
      Object.keys(GP_BENTUK)
        .map(function (b) {
          return (
            '<button type="button" data-gpbentuk="' + b + '"' + (d.bentuk === b ? ' class="on"' : '') + '>' + GP_BENTUK[b] + '</button>'
          );
        })
        .join('') +
      '</div></div>';
    if (d.bentuk === 'rumus')
      h +=
        '<div class="field"><label>Tanda</label><div class="gp-bentuk">' +
        ['+', '×', '−']
          .map(function (o) {
            return '<button type="button" data-gpop="' + o + '"' + (d.op === o ? ' class="on"' : '') + '>' + o + '</button>';
          })
          .join('') +
        '</div></div>';
    var lbl = {
      siklus: 'Langkah (berputar)',
      tangga: 'Anak tangga (bawah → atas)',
      rumus: 'Bagian rumus (terakhir = hasil)',
      timbangan: 'Dua sisi timbangan',
      matriks: 'Empat kotak (kiri atas → kanan bawah)',
      corong: 'Lapisan corong (atas → bawah)'
    }[d.bentuk];
    var maksB = d.bentuk === 'timbangan' ? 2 : d.bentuk === 'matriks' ? 4 : GP_BAG;
    if (d.bentuk === 'timbangan') d.bagian = d.bagian.concat(['', '']).slice(0, 2);
    if (d.bentuk === 'matriks') d.bagian = d.bagian.concat(['', '', '', '']).slice(0, 4);
    h +=
      '<div class="field"><label>' +
      lbl +
      '</label>' +
      d.bagian
        .map(function (t, i) {
          return (
            '<div class="gp-langkah"><input class="input" data-tanpa-hitung data-gpbag="' +
            i +
            '" maxlength="' +
            GP_BAG_T +
            '" value="' +
            esc(t) +
            '" placeholder="Bagian ' +
            (i + 1) +
            '" autocomplete="off">' +
            (d.bagian.length > 2 && maksB > 4
              ? '<button type="button" class="gp-ib" data-gpbuang="' + i + '" aria-label="Buang bagian ' + (i + 1) + '">×</button>'
              : '') +
            '</div>'
          );
        })
        .join('') +
      (d.bagian.length < maksB && maksB > 4
        ? '<button type="button" class="ie-poin-tambah" data-gptambahbag><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Tambah bagian</button>'
        : '') +
      '</div>' +
      '<div class="field"><label>Pratinjau</label><div class="gp-model gp-prat" id="gpPrat">' +
      gpModel(d, true) +
      '</div></div>';
  }
  h +=
    '</section><section class="gp-blok"><h3>Asal-usul</h3><div class="gp-bentuk" style="margin-bottom:8px">' +
    GP_ASAL.map(function (a) {
      return '<button type="button" data-gpasal="' + a + '"' + (d.asal[0] === a ? ' class="on"' : '') + '>' + a + '</button>';
    }).join('') +
    '</div>' +
    '<input class="input" data-gpasalnama maxlength="' +
    GP_ASAL_T +
    '" value="' +
    esc(d.asal[1] || '') +
    '" placeholder="Nama buku / tokoh / orang (opsional)" autocomplete="off"></section>' +
    '<section class="gp-blok"><h3>Tingkat kematangan</h3><div class="gp-pilmat">' +
    [1, 2, 3]
      .map(function (i) {
        return '<button type="button" data-gpfmat="' + i + '"' + (d.m === i ? ' class="on"' : '') + '>' + GP_MAT[i] + '</button>';
      })
      .join('') +
    '</div></section>' +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-gpform="batal">Batal</button><button type="button" class="btn primary" data-gpform="simpan">Simpan</button></div></div>';
  var y = $('#subBody').scrollTop;
  $('#subBody').innerHTML = h;
  $('#subBody').scrollTop = y;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'pola-form') return;
  var el,
    d = gpDraf;
  if ((el = e.target.closest('[data-gpjenis]'))) {
    /* Ganti halaman pilih-jenis dengan form jenis itu (tanpa menambah riwayat) */
    var L = layerOf('page');
    cur.layers[L.index] = 'page:pola-form:' + el.dataset.gpjenis;
    opened.page = cur.layers[L.index];
    try {
      history.replaceState(cur, '');
    } catch (x) {}
    PAGES['pola-form']();
    $('#subBody').scrollTop = 0;
    return;
  }
  if (!d) return;
  if ((el = e.target.closest('[data-gpbentuk]'))) {
    d.bentuk = el.dataset.gpbentuk;
    d._kotor = true;
    gpRenderForm();
    return;
  }
  if ((el = e.target.closest('[data-gpop]'))) {
    d.op = el.dataset.gpop;
    d._kotor = true;
    gpRenderForm();
    return;
  }
  if ((el = e.target.closest('[data-gpbuang]'))) {
    var i = +el.dataset.gpbuang;
    if (!d.bagian[i]) {
      d.bagian.splice(i, 1);
      gpRenderForm();
      return;
    }
    askConfirm({
      title: 'Buang bagian ini?',
      text: '"' + d.bagian[i] + '" dibuang dari model.',
      ok: 'Buang',
      action: function () {
        back(1, function () {
          d.bagian.splice(i, 1);
          d._kotor = true;
          gpRenderForm();
        });
      }
    });
    return;
  }
  if (e.target.closest('[data-gptambahbag]')) {
    d.bagian.push('');
    gpRenderForm();
    var ins = document.querySelectorAll('[data-gpbag]');
    ins[ins.length - 1].focus();
    return;
  }
  if ((el = e.target.closest('[data-gpasal]'))) {
    d.asal[0] = el.dataset.gpasal;
    d._kotor = true;
    Array.prototype.forEach.call(document.querySelectorAll('[data-gpasal]'), function (b) {
      b.classList.toggle('on', b === el);
    });
    return;
  }
  if ((el = e.target.closest('[data-gpfmat]'))) {
    d.m = +el.dataset.gpfmat;
    d._kotor = true;
    Array.prototype.forEach.call(document.querySelectorAll('[data-gpfmat]'), function (b) {
      b.classList.toggle('on', b === el);
    });
    return;
  }
  if (!(el = e.target.closest('[data-gpform]'))) return;
  if (el.dataset.gpform === 'batal') {
    if (!d._kotor) {
      back(1);
      return;
    }
    askConfirm({
      title: 'Buang perubahan?',
      text: 'Isian pola pikir ini tidak disimpan.',
      ok: 'Buang',
      action: function () {
        back(2);
      }
    });
    return;
  }
  gpSimpanForm();
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'pola-form' || !gpDraf) return;
  var t = e.target,
    d = gpDraf;
  if (t.dataset.gpfIsi) d[t.dataset.gpfIsi] = t.value;
  if (t.dataset.gpbag !== undefined) {
    d.bagian[+t.dataset.gpbag] = t.value;
    var p = $('#gpPrat');
    if (p) p.innerHTML = gpModel(d, true);
  }
  if (t.hasAttribute('data-gpasalnama')) d.asal[1] = t.value;
  d._kotor = true;
});
function gpSimpanForm() {
  var f = gpDraf,
    wajib = GP_FIELD[f.j].filter(function (x) {
      return x[3];
    });
  for (var i = 0; i < wajib.length; i++)
    if (!String(f[wajib[i][0]] || '').trim()) {
      toast('Isi "' + wajib[i][1] + '" dulu');
      var el = document.getElementById('gpf-' + wajib[i][0]);
      if (el) el.focus();
      return;
    }
  if (
    f.j === 'model' &&
    f.bagian.filter(function (s) {
      return String(s).trim();
    }).length < 2
  ) {
    toast('Isi minimal 2 bagian model');
    return;
  }
  var d = gpData(),
    id = f._id,
    kini = Date.now(),
    lama = id ? gpCari(d, id) : null;
  var baru = {
    id: id || uid(),
    j: f.j,
    m: f.m,
    dibuat: lama ? lama.dibuat : kini,
    diubah: kini,
    ulang: lama ? lama.ulang : kini,
    jarak: lama ? lama.jarak : 0,
    asal: [f.asal[0], String(f.asal[1] || '').trim()]
  };
  GP_FIELD[f.j].forEach(function (x) {
    var v = String(f[x[0]] || '').trim();
    if (v) baru[x[0]] = v;
  });
  if (f.j === 'model') {
    baru.bentuk = f.bentuk;
    baru.op = f.op;
    baru.bagian = f.bagian
      .map(function (s) {
        return String(s).trim();
      })
      .filter(Boolean);
  }
  if (lama) {
    if (lama.bukti) baru.bukti = lama.bukti;
    if (lama.catatan) baru.catatan = lama.catatan;
  }
  baru = gpBersihItem(baru);
  if (lama)
    d.item = d.item.map(function (x) {
      return x.id === id ? baru : x;
    });
  else d.item.unshift(baru);
  if (!gpSimpan(d, baru.id)) return;
  gpDraf = null;
  back(1, function () {
    renderGaleryTab();
    gpSegarDetail();
    toast(lama ? 'Perubahan disimpan' : 'Pola pikir disimpan');
  });
}
