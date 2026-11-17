/* ============================================================
   Stivora — Impian · tab Keuangan (5.32.0)
   Semua angka dihitung dari transaksi; saldo tidak diketik manual.
   Data (ikut sinkron cloud, enkripsi, dan cadangan):
     'stivora.keuangan.atur'   = { dompet:[{id,nama,emoji,awal}], kategori:[{id,nama,emoji,jenis:'keluar'|'masuk',anggaran}],
                                   darurat:{mode:'otomatis'|'manual',target}, kantong:[{id,nama,hexId,target}],
                                   berulang:[{id,jenis,nama,jumlah,kategori,dompet,hari,terakhir:'YYYY-MM'}] }
     'stivora.keuangan.tx.YYYY' = [{ id, jenis:'keluar'|'masuk'|'pindah'|'setor'|'tarik', jumlah, kategori, dompet,
                                    keDompet, kantong:'darurat'|kantongId, tanggal:'YYYY-MM-DD', catatan, dibuat, diubah }]
     'stivora.keuangan.hutang' = [{ id, jenis:'aku'|'orang', nama, jumlah, tempo, catatan, bayar:[{id,jumlah,tanggal}], dibuat }]
   Hutang terpisah dari saldo. Dana darurat & tabungan impian = kantong terpisah (setor mengurangi dompet).
   ============================================================ */
'use strict';

var K_KU_ATUR = 'stivora.keuangan.atur',
  K_KU_HUTANG = 'stivora.keuangan.hutang',
  K_KU_TX = 'stivora.keuangan.tx.',
  K_KU_SEMBUNYI = 'stivora.keuangan.sembunyi';
var KU_BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var KU_BLN_P = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
var KU_WARNA = ['#f97316', '#14b8a6', '#8b5cf6', '#ec4899', '#3b82f6', '#eab308', '#22c55e', '#ef4444', '#64748b', '#06b6d4'];
var KU_MAKS_JUMLAH = 999999999999999,
  KU_CATATAN = 200,
  KU_NAMA = 30;
var KU_BAWAAN = {
  dompet: [{ id: 'tunai', nama: 'Tunai', emoji: '💵', awal: 0 }],
  kategori: [
    { id: 'makan', nama: 'Makan', emoji: '🍜', jenis: 'keluar', anggaran: 0 },
    { id: 'transport', nama: 'Transport', emoji: '🛵', jenis: 'keluar', anggaran: 0 },
    { id: 'belanja', nama: 'Belanja', emoji: '🛒', jenis: 'keluar', anggaran: 0 },
    { id: 'tagihan', nama: 'Tagihan', emoji: '🧾', jenis: 'keluar', anggaran: 0 },
    { id: 'topup', nama: 'Top-up', emoji: '🎮', jenis: 'keluar', anggaran: 0 },
    { id: 'kesehatan', nama: 'Kesehatan', emoji: '💊', jenis: 'keluar', anggaran: 0 },
    { id: 'hiburan', nama: 'Hiburan', emoji: '🎬', jenis: 'keluar', anggaran: 0 },
    { id: 'lain-k', nama: 'Lainnya', emoji: '📦', jenis: 'keluar', anggaran: 0 },
    { id: 'gaji', nama: 'Gaji', emoji: '💼', jenis: 'masuk', anggaran: 0 },
    { id: 'usaha', nama: 'Usaha', emoji: '🏪', jenis: 'masuk', anggaran: 0 },
    { id: 'bonus', nama: 'Bonus', emoji: '🎁', jenis: 'masuk', anggaran: 0 },
    { id: 'lain-m', nama: 'Lainnya', emoji: '💰', jenis: 'masuk', anggaran: 0 }
  ],
  darurat: { mode: 'otomatis', target: 0 },
  kantong: [],
  berulang: []
};
var KU_IK = {
  mata: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  tutup:
    '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.3 7.8A16.6 16.6 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 4-.8"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/></svg>',
  pensil: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  pindah: '<svg viewBox="0 0 24 24"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  kiri: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  kanan: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  payung: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6a2 2 0 0 0 4 0"/></svg>',
  target:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
  hutang: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>',
  ulang:
    '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.6M20 4v4.6h-4.6"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.4M4 20v-4.6h4.6"/></svg>',
  riwayat: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  grafik: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  dompet:
    '<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4"/><rect x="4" y="9" width="17" height="11" rx="2.5"/><circle cx="16.5" cy="14.5" r="1.2"/></svg>',
  hapus: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  bawah: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  cari: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  lonceng: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>'
};

/* ---------- Data ---------- */
function kuJml(v) {
  var n = Math.round(+v || 0);
  return Math.max(0, Math.min(KU_MAKS_JUMLAH, n));
}
function kuAtur() {
  var d = store.get(K_KU_ATUR, null),
    b = JSON.parse(JSON.stringify(KU_BAWAAN));
  if (!d || typeof d !== 'object') return b;
  var o = {
    dompet: (Array.isArray(d.dompet) && d.dompet.length ? d.dompet : b.dompet).map(function (x) {
      return {
        id: String(x.id),
        nama: String(x.nama || 'Dompet').slice(0, KU_NAMA),
        emoji: String(x.emoji || '👛').slice(0, 8),
        awal: Math.round(+x.awal || 0)
      };
    }),
    kategori: (Array.isArray(d.kategori) ? d.kategori : b.kategori).map(function (x) {
      return {
        id: String(x.id),
        nama: String(x.nama || 'Kategori').slice(0, KU_NAMA),
        emoji: String(x.emoji || '🏷️').slice(0, 8),
        jenis: x.jenis === 'masuk' ? 'masuk' : 'keluar',
        anggaran: kuJml(x.anggaran)
      };
    }),
    darurat: { mode: d.darurat && d.darurat.mode === 'manual' ? 'manual' : 'otomatis', target: kuJml(d.darurat && d.darurat.target) },
    kantong: (Array.isArray(d.kantong) ? d.kantong : []).map(function (x) {
      return { id: String(x.id), nama: String(x.nama || 'Tabungan').slice(0, 40), hexId: String(x.hexId || ''), target: kuJml(x.target) };
    }),
    berulang: (Array.isArray(d.berulang) ? d.berulang : []).map(function (x) {
      return {
        id: String(x.id),
        jenis: x.jenis === 'masuk' ? 'masuk' : 'keluar',
        nama: String(x.nama || '').slice(0, 40),
        jumlah: kuJml(x.jumlah),
        kategori: String(x.kategori || ''),
        dompet: String(x.dompet || ''),
        hari: Math.max(1, Math.min(28, parseInt(x.hari, 10) || 1)),
        terakhir: /^\d{4}-\d{2}$/.test(x.terakhir || '') ? x.terakhir : ''
      };
    })
  };
  return o;
}
function kuSimpanAtur(a) {
  store.set(K_KU_ATUR, a);
}
function kuTahunAda() {
  var t = [];
  store.kunci(K_KU_TX).forEach(function (k) {
    if (/^\d{4}$/.test(k.slice(K_KU_TX.length))) t.push(+k.slice(K_KU_TX.length));
  });
  return t.sort();
}
function kuTxTahun(y) {
  var d = store.get(K_KU_TX + y, []);
  return Array.isArray(d)
    ? d.filter(function (x) {
        return x && x.id && x.tanggal;
      })
    : [];
}
function kuSemuaTx() {
  var o = [];
  kuTahunAda().forEach(function (y) {
    o = o.concat(kuTxTahun(y));
  });
  return o;
}
function kuSimpanTxTahun(y, l) {
  if (l.length) store.set(K_KU_TX + y, l);
  else if (store.ada(K_KU_TX + y)) store.set(K_KU_TX + y, []);
}
function kuSimpanTx(tx, lama) {
  if (lama) {
    var yl = lama.tanggal.slice(0, 4);
    kuSimpanTxTahun(
      yl,
      kuTxTahun(yl).filter(function (x) {
        return x.id !== lama.id;
      })
    );
  }
  var y = tx.tanggal.slice(0, 4),
    l = kuTxTahun(y).filter(function (x) {
      return x.id !== tx.id;
    });
  l.push(tx);
  kuSimpanTxTahun(y, l);
}
function kuHapusTx(tx) {
  var y = tx.tanggal.slice(0, 4);
  kuSimpanTxTahun(
    y,
    kuTxTahun(y).filter(function (x) {
      return x.id !== tx.id;
    })
  );
  /* Transaksi dari pengingat berulang dihapus → pengingat bulan itu muncul lagi */
  if (tx.br) {
    var a = kuAtur(),
      r = a.berulang.filter(function (x) {
        return x.id === tx.br;
      })[0];
    if (r && r.terakhir === tx.tanggal.slice(0, 7)) {
      r.terakhir = '';
      kuSimpanAtur(a);
    }
  }
}
function kuHutang() {
  var d = store.get(K_KU_HUTANG, []);
  return Array.isArray(d)
    ? d.filter(function (x) {
        return x && x.id;
      })
    : [];
}

/* ---------- Hitungan ---------- */
function kuSaldoDompet(a, tx) {
  var s = {};
  a.dompet.forEach(function (d) {
    s[d.id] = d.awal;
  });
  (tx || kuSemuaTx()).forEach(function (t) {
    var j = +t.jumlah || 0;
    if (t.jenis === 'masuk' || t.jenis === 'tarik') {
      if (t.dompet in s) s[t.dompet] += j;
    } else if (t.jenis === 'keluar' || t.jenis === 'setor') {
      if (t.dompet in s) s[t.dompet] -= j;
    } else if (t.jenis === 'pindah') {
      if (t.dompet in s) s[t.dompet] -= j;
      if (t.keDompet in s) s[t.keDompet] += j;
    }
  });
  return s;
}
function kuSaldoKantong(tx) {
  var s = {};
  (tx || kuSemuaTx()).forEach(function (t) {
    if (t.jenis === 'setor' || t.jenis === 'tarik') s[t.kantong] = (s[t.kantong] || 0) + (t.jenis === 'setor' ? 1 : -1) * (+t.jumlah || 0);
  });
  return s;
}
function kuBulanIni() {
  var n = new Date();
  return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2);
}
function kuHariIni() {
  var n = new Date();
  return kuBulanIni() + '-' + ('0' + n.getDate()).slice(-2);
}
function kuGeserBulan(b, n) {
  var y = +b.slice(0, 4),
    m = +b.slice(5, 7) - 1 + n;
  y += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return y + '-' + ('0' + (m + 1)).slice(-2);
}
function kuNamaBulan(b) {
  return KU_BLN_P[+b.slice(5, 7) - 1] + ' ' + b.slice(0, 4);
}
function kuRingkasBulan(tx, b) {
  var o = { masuk: 0, keluar: 0, kat: {} };
  tx.forEach(function (t) {
    if (t.tanggal.slice(0, 7) !== b) return;
    if (t.jenis === 'masuk') o.masuk += +t.jumlah;
    else if (t.jenis === 'keluar') {
      o.keluar += +t.jumlah;
      o.kat[t.kategori] = (o.kat[t.kategori] || 0) + +t.jumlah;
    }
  });
  return o;
}
/* Target dana darurat otomatis = 6 × rata-rata pengeluaran 3 bulan penuh terakhir yang ada datanya */
function kuTargetDarurat(a, tx) {
  if (a.darurat.mode === 'manual') return a.darurat.target;
  var b = kuBulanIni(),
    tot = 0,
    n = 0;
  for (var i = 1; i <= 3; i++) {
    var r = kuRingkasBulan(tx, kuGeserBulan(b, -i));
    if (r.keluar > 0) {
      tot += r.keluar;
      n++;
    }
  }
  return n ? Math.round((tot / n) * 6) : 0;
}
function kuRp(n) {
  n = Math.round(+n || 0);
  return (n < 0 ? '−Rp ' : 'Rp ') + Math.abs(n).toLocaleString('id-ID');
}
function kuAngka(n) {
  return Math.round(+n || 0).toLocaleString('id-ID');
}
function kuRingkas(n) {
  var a = Math.abs(Math.round(+n || 0)),
    s = n < 0 ? '−' : '',
    f = function (x) {
      return (Math.round(x * 10) / 10).toLocaleString('id-ID');
    };
  if (a >= 1e12) return s + f(a / 1e12) + 'T';
  if (a >= 1e9) return s + f(a / 1e9) + 'M';
  if (a >= 1e6) return s + f(a / 1e6) + 'jt';
  if (a >= 1e3) return s + f(a / 1e3) + 'rb';
  return s + a;
}
function kuFmtTgl(t) {
  var p = t.split('-');
  return +p[2] + ' ' + KU_BLN[+p[1] - 1] + ' ' + p[0];
}
function kuSembunyi() {
  return store.raw(K_KU_SEMBUNYI) === '1';
}
function kuTampilRp(n) {
  return kuSembunyi() ? 'Rp •••••' : kuRp(n);
}
function kuKat(a, id) {
  return (
    a.kategori.filter(function (k) {
      return k.id === id;
    })[0] || null
  );
}
function kuDompet(a, id) {
  return (
    a.dompet.filter(function (d) {
      return d.id === id;
    })[0] || null
  );
}
function kuNamaKantong(a, id) {
  if (id === 'darurat') return 'Dana darurat';
  var k = a.kantong.filter(function (x) {
    return x.id === id;
  })[0];
  return k ? k.nama : 'Kantong';
}
function kuTglSah(t) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t || '')) return false;
  var p = t.split('-'),
    d = new Date(+p[0], +p[1] - 1, +p[2]);
  return d.getMonth() === +p[1] - 1 && +p[0] >= 1900 && +p[0] <= 2100;
}
function kuHutangSisa(h) {
  return Math.max(
    0,
    kuJml(h.jumlah) -
      (h.bayar || []).reduce(function (a, b) {
        return a + kuJml(b.jumlah);
      }, 0)
  );
}
/* Berulang yang jatuh tempo bulan ini dan belum dicatat / dilewati */
function kuBerulangJatuh(a) {
  var b = kuBulanIni(),
    hari = new Date().getDate();
  return a.berulang.filter(function (r) {
    return r.jumlah > 0 && r.terakhir !== b && (!r.terakhir || r.terakhir < b) && hari >= r.hari;
  });
}
/* Tabungan impian yang terhubung ke hexagon: nilai hexagon mengikuti saldo kantong */
function kuSinkronHex(a, sk) {
  if (typeof imDaftar !== 'function') return;
  var l = imDaftar(),
    ubah = false;
  a.kantong.forEach(function (k) {
    if (!k.hexId) return;
    var h = l.filter(function (x) {
      return x.id === k.hexId;
    })[0];
    if (!h) return;
    var nilai = Math.max(0, sk[k.id] || 0),
      target = k.target || +h.target || 0;
    if (+h.nilai !== nilai || +h.target !== target || h.satuan !== 'Rp') {
      h.nilai = nilai;
      h.target = target;
      h.satuan = 'Rp';
      h.diubah = Date.now();
      ubah = true;
    }
  });
  if (ubah) {
    store.set(K_IM_DAFTAR, l);
    if (typeof renderImProfil === 'function') renderImProfil();
  }
}

/* ---------- Tab Keuangan ---------- */
var kuBulan = kuBulanIni(),
  kuFilter = { jenis: 'semua', dompet: '', cari: '' },
  kuBatas = 40,
  kuTabHutang = 'aku';
/* 5.69.0: sub-tab Keuangan (Bulan ini, Riwayat, Kantong, Hutang) — diingat per HP */
var K_KU_TAB = 'stivora.keuangan.tab',
  KU_TAB = [
    ['bulan', 'Bulan ini'],
    ['riwayat', 'Riwayat'],
    ['kantong', 'Kantong'],
    ['hutang', 'Hutang']
  ];
var kuTab = (function () {
  try {
    var t = localStorage.getItem(K_KU_TAB);
    return KU_TAB.some(function (x) {
      return x[0] === t;
    })
      ? t
      : 'bulan';
  } catch (e) {
    return 'bulan';
  }
})();
function kuKartu(judul, ikon, isi, aksi, kelas) {
  return (
    '<section class="ku-kartu' +
    (kelas ? ' ' + kelas : '') +
    '"><div class="ku-kartu-atas"><h3>' +
    ikon +
    '<span>' +
    judul +
    '</span></h3>' +
    (aksi || '') +
    '</div>' +
    isi +
    '</section>'
  );
}
function kuBar(p, warna) {
  return (
    '<div class="pg-bar ku-bar"><i style="width:' +
    Math.max(0, Math.min(100, p)).toFixed(1) +
    '%' +
    (warna ? ';background:' + warna : '') +
    '"></i></div>'
  );
}
function renderKeuangan() {
  var box = $('#kuIsi');
  if (!box) return;
  var a = kuAtur(),
    tx = kuSemuaTx(),
    sd = kuSaldoDompet(a, tx),
    sk = kuSaldoKantong(tx),
    sem = kuSembunyi();
  var total = a.dompet.reduce(function (n, d) {
    return n + sd[d.id];
  }, 0);
  var h = '';
  /* 1. Saldo */
  h +=
    '<section class="ku-kartu ku-saldo"><div class="ku-kartu-atas"><span class="ku-label">Saldo total</span><span class="ku-aksi-ikon">' +
    '<button type="button" class="ku-ikon-btn" data-ku="sembunyi" aria-label="' +
    (sem ? 'Tampilkan saldo' : 'Sembunyikan saldo') +
    '" aria-pressed="' +
    sem +
    '">' +
    (sem ? KU_IK.tutup : KU_IK.mata) +
    '</button>' +
    '<button type="button" class="sd-edit" id="kuAtur" aria-label="Pengaturan keuangan">' +
    KU_IK.pensil +
    '</button></span></div>' +
    '<p class="ku-total' +
    (total < 0 ? ' minus' : '') +
    '">' +
    kuTampilRp(total) +
    '</p>' +
    '<div class="ku-dompet-daftar">' +
    a.dompet
      .map(function (d) {
        return (
          '<div class="ku-dompet"><span class="ku-dompet-nama"><span translate="no">' +
          esc(d.emoji) +
          '</span> <span translate="no">' +
          esc(d.nama) +
          '</span></span><b' +
          (sd[d.id] < 0 ? ' class="minus"' : '') +
          '>' +
          (sem ? '•••' : kuRingkas(sd[d.id])) +
          '</b></div>'
        );
      })
      .join('') +
    '</div></section>';
  /* 2. Tombol cepat */
  h +=
    '<div class="ku-cepat"><button type="button" class="ku-cepat-catat" data-ku-tx="keluar">' +
    KU_IK.plus +
    '<span>Catat</span></button>' +
    '<button type="button" class="ku-cepat-pindah" data-ku-tx="pindah">' +
    KU_IK.pindah +
    '<span>Pindah</span></button></div>';
  /* 3. Pengingat berulang */
  var jatuh = kuBerulangJatuh(a);
  if (jatuh.length)
    h +=
      '<div class="ku-ingat-daftar">' +
      jatuh
        .map(function (r) {
          var k = kuKat(a, r.kategori);
          return (
            '<div class="ku-ingat-baris"><span class="ku-ingat-ik">' +
            KU_IK.lonceng +
            '</span><span class="ku-ingat-teks"><b translate="no">' +
            esc(r.nama || (k ? k.nama : 'Transaksi berulang')) +
            '</b><small><span class="' +
            (r.jenis === 'masuk' ? 'ku-plus' : 'ku-min') +
            '">' +
            (r.jenis === 'masuk' ? '+ ' : '− ') +
            kuRp(r.jumlah) +
            '</span> · tiap tanggal ' +
            r.hari +
            '</small></span>' +
            '<button type="button" class="ku-ingat-catat" data-ku-catat="' +
            esc(r.id) +
            '">Catat</button><button type="button" class="ku-lewati" data-ku-lewati="' +
            esc(r.id) +
            '">Lewati</button></div>'
          );
        })
        .join('') +
      '</div>';
  /* Sub-tab */
  h +=
    '<div class="ku-subtab" role="tablist" aria-label="Bagian keuangan">' +
    KU_TAB.map(function (x) {
      return (
        '<button type="button" role="tab" aria-selected="' +
        (kuTab === x[0]) +
        '" data-ku-subtab="' +
        x[0] +
        '">' +
        x[1] +
        '</button>'
      );
    }).join('') +
    '</div>';
  var hB = '',
    hR = '',
    hK = '',
    hH = '';
  /* 4. Ringkasan bulan */
  var rb = kuRingkasBulan(tx, kuBulan),
    sisa = rb.masuk - rb.keluar,
    kats = Object.keys(rb.kat).sort(function (x, y) {
      return rb.kat[y] - rb.kat[x];
    });
  var nav =
    '<div class="ku-bulan-nav"><button type="button" class="ku-ikon-btn" data-ku-bulan="-1" aria-label="Bulan sebelumnya">' +
    KU_IK.kiri +
    '</button><b>' +
    kuNamaBulan(kuBulan) +
    '</b>' +
    '<button type="button" class="ku-ikon-btn" data-ku-bulan="1" aria-label="Bulan berikutnya"' +
    (kuBulan >= kuBulanIni() ? ' disabled' : '') +
    '>' +
    KU_IK.kanan +
    '</button></div>';
  hB += kuKartu(
    'Ringkasan',
    KU_IK.grafik,
    nav +
      '<div class="ku-dua"><div><span class="ku-label">Masuk</span><b class="ku-plus">+ ' +
      kuAngka(rb.masuk) +
      '</b></div><div><span class="ku-label">Keluar</span><b class="ku-min">− ' +
      kuAngka(rb.keluar) +
      '</b></div></div>' +
      '<p class="ku-sisa"><span>Selisih bulan ini:</span> <b' +
      (sisa < 0 ? ' class="ku-min"' : '') +
      '>' +
      kuRp(sisa) +
      '</b></p>' +
      (kats.length
        ? '<div class="ku-tumpuk">' +
          kats
            .map(function (id, j) {
              return (
                '<i style="width:' +
                ((rb.kat[id] / rb.keluar) * 100).toFixed(2) +
                '%;background:' +
                KU_WARNA[j % KU_WARNA.length] +
                '"></i>'
              );
            })
            .join('') +
          '</div>' +
          '<ul class="ku-kat-daftar">' +
          kats
            .map(function (id, j) {
              var k = kuKat(a, id);
              return (
                '<li><i style="background:' +
                KU_WARNA[j % KU_WARNA.length] +
                '"></i><span translate="no">' +
                esc(k ? k.emoji + ' ' + k.nama : 'Tanpa kategori') +
                '</span><b>' +
                Math.round((rb.kat[id] / rb.keluar) * 100) +
                '%</b></li>'
              );
            })
            .join('') +
          '</ul>'
        : '<p class="ku-kosong-kecil">Belum ada pengeluaran di bulan ini.</p>'),
    '<button type="button" class="ku-tautan" data-ku="laporan">Laporan</button>'
  );
  /* 5. Anggaran */
  var ang = a.kategori.filter(function (k) {
    return k.jenis === 'keluar' && k.anggaran > 0;
  });
  hB += kuKartu(
    'Anggaran',
    KU_IK.target,
    ang.length
      ? ang
          .map(function (k) {
            var pakai = rb.kat[k.id] || 0,
              p = (pakai / k.anggaran) * 100,
              st = p > 100 ? 'lewat' : p >= 80 ? 'awas' : '';
            return (
              '<div class="ku-ang"><div class="ku-ang-atas"><span translate="no">' +
              esc(k.emoji + ' ' + k.nama) +
              '</span><small class="' +
              st +
              '">' +
              kuRingkas(pakai) +
              ' / ' +
              kuRingkas(k.anggaran) +
              (st === 'lewat' ? ' · lewat' : '') +
              '</small></div>' +
              kuBar(p, st === 'lewat' ? 'var(--danger)' : st === 'awas' ? '#e8a317' : '') +
              '</div>'
            );
          })
          .join('')
      : '<p class="ku-kosong-kecil">Belum ada anggaran. Atur batas per kategori lewat ikon pensil di kartu saldo.</p>',
    '<button type="button" class="ku-tautan" data-ku="atur">Atur</button>'
  );
  /* 6. Kantong: dana darurat + tabungan impian */
  var tD = kuTargetDarurat(a, tx),
    sD = sk.darurat || 0;
  hK +=
    '<div class="ku-kantong-grid">' +
    kuKartu(
      'Dana darurat',
      KU_IK.payung,
      '<p class="ku-kantong-nilai">' +
        kuTampilRp(sD) +
        '</p>' +
        '<small class="ku-label">' +
        (tD
          ? 'dari ' +
            (sem ? '•••' : kuRingkas(tD)) +
            ' · ' +
            Math.floor((sD / tD) * 100) +
            '%' +
            (a.darurat.mode === 'otomatis' ? ' (6× rata-rata pengeluaran)' : '')
          : a.darurat.mode === 'otomatis'
            ? 'Target otomatis muncul setelah ada pengeluaran di bulan-bulan sebelumnya'
            : 'Belum ada target') +
        '</small>' +
        (tD ? kuBar((sD / tD) * 100, '#3b82f6') : '') +
        '<div class="ku-kantong-aksi"><button type="button" data-ku-kantong="setor:darurat">Setor</button><button type="button" data-ku-kantong="tarik:darurat">Tarik</button></div>',
      '',
      'ku-kantong'
    ) +
    kuKartu(
      'Tabungan impian',
      KU_IK.target,
      a.kantong.length
        ? a.kantong
            .map(function (k) {
              var s = sk[k.id] || 0,
                p = k.target ? (s / k.target) * 100 : 0;
              return (
                '<button type="button" class="ku-tab-item" data-ku-kantong="setor:' +
                esc(k.id) +
                '"><span class="ku-ang-atas"><span translate="no">' +
                esc(k.nama) +
                '</span><small>' +
                (sem ? '•••' : kuRingkas(s)) +
                (k.target ? ' · ' + Math.floor(p) + '%' : '') +
                '</small></span>' +
                (k.target ? kuBar(p, 'var(--accent)') : '') +
                '</button>'
              );
            })
            .join('') + '<small class="ku-label ku-bantu-kecil">Ketuk untuk setor / tarik</small>'
        : '<p class="ku-kosong-kecil">Belum ada. Tambahkan lewat ikon pensil, bisa dihubungkan ke hexagon impian.</p>',
      '',
      'ku-kantong'
    ) +
    '</div>';
  /* 7. Hutang */
  var hl = kuHutang(),
    hA = hl.filter(function (x) {
      return x.jenis !== 'orang';
    }),
    hO = hl.filter(function (x) {
      return x.jenis === 'orang';
    }),
    aktif = kuTabHutang === 'orang' ? hO : hA;
  var hariIni = kuHariIni();
  aktif = aktif.slice().sort(function (x, y) {
    var lx = kuHutangSisa(x) <= 0,
      ly = kuHutangSisa(y) <= 0;
    if (lx !== ly) return lx ? 1 : -1;
    return (x.tempo || '9999') < (y.tempo || '9999') ? -1 : 1;
  });
  hH += kuKartu(
    'Hutang',
    KU_IK.hutang,
    '<div class="ku-seg" role="tablist"><button type="button" role="tab" aria-selected="' +
      (kuTabHutang !== 'orang') +
      '" data-ku-htab="aku">Hutangku · ' +
      hA.filter(function (x) {
        return kuHutangSisa(x) > 0;
      }).length +
      '</button>' +
      '<button type="button" role="tab" aria-selected="' +
      (kuTabHutang === 'orang') +
      '" data-ku-htab="orang">Hutang orang ke aku · ' +
      hO.filter(function (x) {
        return kuHutangSisa(x) > 0;
      }).length +
      '</button></div>' +
      (aktif.length
        ? aktif
            .map(function (x) {
              var s = kuHutangSisa(x),
                lunas = s <= 0,
                lewat = !lunas && x.tempo && x.tempo < hariIni,
                j = kuJml(x.jumlah);
              return (
                '<button type="button" class="ku-baris' +
                (lunas ? ' lunas' : '') +
                '" data-ku-hutang="' +
                esc(x.id) +
                '"><span class="ku-em">' +
                (x.jenis === 'orang' ? '🤝' : '💳') +
                '</span>' +
                '<span class="ku-baris-teks"><b translate="no">' +
                esc(x.nama) +
                '</b><small' +
                (lewat ? ' class="ku-min"' : '') +
                '>' +
                (lunas
                  ? 'Lunas · ' + kuRp(j)
                  : 'Sisa ' +
                    kuRp(s) +
                    ' dari ' +
                    kuRingkas(j) +
                    (x.tempo ? (lewat ? ' · lewat jatuh tempo ' : ' · jatuh tempo ') + kuFmtTgl(x.tempo) : '')) +
                '</small>' +
                (lunas ? '' : kuBar(((j - s) / (j || 1)) * 100, 'var(--success)')) +
                '</span></button>'
              );
            })
            .join('')
        : '<p class="ku-kosong-kecil">' + (kuTabHutang === 'orang' ? 'Tidak ada yang berhutang padamu.' : 'Tidak ada hutang.') + '</p>') +
      '<button type="button" class="ie-poin-tambah" data-ku="hutang-baru">' +
      KU_IK.plus +
      'Tambah hutang</button><small class="ku-label ku-bantu-kecil">Hutang terpisah dari saldo dompet.</small>'
  );
  /* 9. Riwayat */
  hR += kuKartu(
    'Riwayat',
    KU_IK.riwayat,
    nav +
      '<div class="ku-saring"><div class="ku-cari"><input class="input" id="kuCari" type="search" maxlength="60" placeholder="Cari transaksi" autocomplete="off" value="' +
      esc(kuFilter.cari) +
      '">' +
      KU_IK.cari +
      '</div>' +
      '<select class="input" id="kuFDompet" aria-label="Saring dompet"><option value="">Semua dompet</option>' +
      a.dompet
        .map(function (d) {
          return (
            '<option value="' +
            esc(d.id) +
            '"' +
            (kuFilter.dompet === d.id ? ' selected' : '') +
            '>' +
            esc(d.emoji + ' ' + d.nama) +
            '</option>'
          );
        })
        .join('') +
      '</select></div>' +
      '<div class="ku-chip-baris">' +
      [
        ['semua', 'Semua'],
        ['masuk', 'Masuk'],
        ['keluar', 'Keluar'],
        ['pindah', 'Pindah'],
        ['kantong', 'Kantong']
      ]
        .map(function (x) {
          return (
            '<button type="button" class="ku-chip' +
            (kuFilter.jenis === x[0] ? ' aktif' : '') +
            '" data-ku-fjenis="' +
            x[0] +
            '">' +
            x[1] +
            '</button>'
          );
        })
        .join('') +
      '</div><div id="kuRiwayat"></div>'
  );
  h += '<div class="ku-panel" role="tabpanel">' + (kuTab === 'riwayat' ? hR : kuTab === 'kantong' ? hK : kuTab === 'hutang' ? hH : hB) + '</div>';
  box.innerHTML = h;
  if (kuTab === 'riwayat') kuRenderRiwayat(a, tx);
}
function kuTxCocok(a, t) {
  if (t.tanggal.slice(0, 7) !== kuBulan) return false;
  var f = kuFilter;
  if (f.jenis === 'kantong' ? !(t.jenis === 'setor' || t.jenis === 'tarik') : f.jenis !== 'semua' && t.jenis !== f.jenis) return false;
  if (f.dompet && t.dompet !== f.dompet && t.keDompet !== f.dompet) return false;
  if (f.cari) {
    var k = kuKat(a, t.kategori),
      teks = [t.catatan, k && k.nama, kuJudulTx(a, t), String(t.jumlah)].join(' ').toLowerCase();
    if (teks.indexOf(f.cari.toLowerCase()) < 0 && String(t.jumlah).indexOf(f.cari.replace(/\D/g, '') || '§') < 0) return false;
  }
  return true;
}
function kuJudulTx(a, t) {
  if (t.jenis === 'pindah') {
    var d1 = kuDompet(a, t.dompet),
      d2 = kuDompet(a, t.keDompet);
    return (d1 ? d1.nama : '?') + ' → ' + (d2 ? d2.nama : '?');
  }
  if (t.jenis === 'setor') return 'Setor ke ' + kuNamaKantong(a, t.kantong);
  if (t.jenis === 'tarik') return 'Tarik dari ' + kuNamaKantong(a, t.kantong);
  var k = kuKat(a, t.kategori);
  return t.catatan ? t.catatan : k ? k.nama : 'Tanpa kategori';
}
function kuRenderRiwayat(a, tx) {
  var box = $('#kuRiwayat');
  if (!box) return;
  a = a || kuAtur();
  tx = tx || kuSemuaTx();
  var l = tx
    .filter(function (t) {
      return kuTxCocok(a, t);
    })
    .sort(function (x, y) {
      return x.tanggal < y.tanggal ? 1 : x.tanggal > y.tanggal ? -1 : (y.dibuat || 0) - (x.dibuat || 0);
    });
  if (!l.length) {
    box.innerHTML =
      '<p class="ku-kosong-kecil">' +
      (kuFilter.cari || kuFilter.dompet || kuFilter.jenis !== 'semua'
        ? 'Tidak ada transaksi yang cocok.'
        : 'Belum ada transaksi di bulan ini.') +
      '</p>';
    return;
  }
  var tampil = l.slice(0, kuBatas),
    hariIni = kuHariIni(),
    kemarin = (function () {
      var d = new Date();
      d.setDate(d.getDate() - 1);
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    })(),
    last = '',
    h = '';
  tampil.forEach(function (t) {
    if (t.tanggal !== last) {
      last = t.tanggal;
      h += '<p class="ku-tgl">' + (t.tanggal === hariIni ? 'Hari ini' : t.tanggal === kemarin ? 'Kemarin' : kuFmtTgl(t.tanggal)) + '</p>';
    }
    var k = kuKat(a, t.kategori),
      d = kuDompet(a, t.dompet),
      em =
        t.jenis === 'pindah'
          ? '⇄'
          : t.jenis === 'setor' || t.jenis === 'tarik'
            ? t.kantong === 'darurat'
              ? '☂️'
              : '🎯'
            : k
              ? k.emoji
              : '🏷️';
    var sub =
      t.jenis === 'pindah'
        ? 'Pindah dana'
        : t.jenis === 'setor' || t.jenis === 'tarik'
          ? d
            ? d.nama
            : ''
          : (t.catatan && k ? k.nama + ' · ' : '') + (d ? d.nama : '');
    var kelas = t.jenis === 'masuk' || t.jenis === 'tarik' ? 'ku-plus' : t.jenis === 'pindah' ? '' : 'ku-min',
      tanda = t.jenis === 'masuk' || t.jenis === 'tarik' ? '+ ' : t.jenis === 'pindah' ? '' : '− ';
    h +=
      '<button type="button" class="ku-baris" data-ku-edit="' +
      esc(t.id) +
      '"><span class="ku-em" translate="no">' +
      esc(em) +
      '</span><span class="ku-baris-teks"><b translate="no">' +
      esc(kuJudulTx(a, t)) +
      '</b><small translate="no">' +
      esc(sub) +
      '</small></span>' +
      '<b class="ku-baris-jml ' +
      kelas +
      '">' +
      tanda +
      kuAngka(t.jumlah) +
      '</b></button>';
  });
  if (l.length > kuBatas)
    h += '<button type="button" class="ku-lagi" data-ku="lagi">Tampilkan lebih banyak (' + (l.length - kuBatas) + ')</button>';
  box.innerHTML = '<p class="ku-label ku-jml-tx">' + l.length + ' transaksi</p>' + h;
}

/* Klik di tab Keuangan */
$('#itIsi-keuangan').addEventListener('click', function (e) {
  var t = e.target,
    el;
  if ((el = t.closest('[data-ku-tx]'))) {
    kuTxBuka = { mode: el.dataset.kuTx, id: null, kantong: '' };
    openLayer('page:keu-tx');
    return;
  }
  if ((el = t.closest('[data-ku-edit]'))) {
    kuTxBuka = { mode: '', id: el.dataset.kuEdit, kantong: '' };
    openLayer('page:keu-tx');
    return;
  }
  if ((el = t.closest('[data-ku-kantong]'))) {
    var p = el.dataset.kuKantong.split(':');
    kuTxBuka = { mode: p[0], id: null, kantong: p[1] };
    openLayer('page:keu-tx');
    return;
  }
  if ((el = t.closest('[data-ku-hutang]'))) {
    kuHutangBuka = el.dataset.kuHutang;
    openLayer('page:keu-hutang');
    return;
  }
  if ((el = t.closest('[data-ku-bulan]'))) {
    var nb = kuGeserBulan(kuBulan, +el.dataset.kuBulan);
    if (nb > kuBulanIni()) return;
    kuBulan = nb;
    kuBatas = 40;
    renderKeuangan();
    return;
  }
  if ((el = t.closest('[data-ku-subtab]'))) {
    kuTab = el.dataset.kuSubtab;
    try {
      localStorage.setItem(K_KU_TAB, kuTab);
    } catch (er) {}
    renderKeuangan();
    return;
  }
  if ((el = t.closest('[data-ku-htab]'))) {
    kuTabHutang = el.dataset.kuHtab;
    renderKeuangan();
    return;
  }
  if ((el = t.closest('[data-ku-fjenis]'))) {
    kuFilter.jenis = el.dataset.kuFjenis;
    kuBatas = 40;
    $$('#itIsi-keuangan [data-ku-fjenis]').forEach(function (b) {
      b.classList.toggle('aktif', b === el);
    });
    kuRenderRiwayat();
    return;
  }
  if ((el = t.closest('[data-ku-catat]'))) {
    var idC = el.dataset.kuCatat,
      a0 = kuAtur(),
      r0 = a0.berulang.filter(function (x) {
        return x.id === idC;
      })[0];
    if (!r0) return;
    var k0 = kuKat(a0, r0.kategori),
      d0 = kuDompet(a0, r0.dompet) || a0.dompet[0];
    askConfirm({
      title: 'Catat transaksi ini?',
      text:
        (r0.nama || (k0 ? k0.nama : 'Transaksi berulang')) +
        ': ' +
        (r0.jenis === 'masuk' ? '+ ' : '− ') +
        kuRp(r0.jumlah) +
        (d0 ? ' · ' + d0.nama : '') +
        ' · tanggal ' +
        r0.hari +
        ' bulan ini.',
      ok: 'Catat',
      tone: 'primary',
      action: function () {
        back(1, function () {
          var a = kuAtur(),
            r = a.berulang.filter(function (x) {
              return x.id === idC;
            })[0];
          if (!r) return;
          var b = kuBulanIni(),
            dompet = kuDompet(a, r.dompet) ? r.dompet : a.dompet[0].id,
            kini = Date.now();
          kuSimpanTx({
            id: uid(),
            jenis: r.jenis,
            jumlah: r.jumlah,
            kategori: r.kategori,
            dompet: dompet,
            keDompet: '',
            kantong: '',
            tanggal: b + '-' + ('0' + r.hari).slice(-2),
            catatan: r.nama,
            br: r.id,
            dibuat: kini,
            diubah: kini
          });
          r.terakhir = b;
          kuSimpanAtur(a);
          renderKeuangan();
          toast('Dicatat');
        });
      }
    });
    return;
  }
  if ((el = t.closest('[data-ku-lewati]'))) {
    var id = el.dataset.kuLewati;
    askConfirm({
      title: 'Lewati bulan ini?',
      text: 'Transaksi berulang ini tidak dicatat untuk bulan ini. Bulan depan pengingatnya muncul lagi.',
      ok: 'Lewati',
      tone: 'primary',
      action: function () {
        back(1, function () {
          var a2 = kuAtur(),
            r2 = a2.berulang.filter(function (x) {
              return x.id === id;
            })[0];
          if (r2) {
            r2.terakhir = kuBulanIni();
            kuSimpanAtur(a2);
          }
          renderKeuangan();
        });
      }
    });
    return;
  }
  if (!(el = t.closest('[data-ku]')) && !(el = t.closest('#kuAtur'))) return;
  var aksi = el.id === 'kuAtur' ? 'atur' : el.dataset.ku;
  if (aksi === 'atur') openLayer('page:keu-atur');
  else if (aksi === 'laporan') openLayer('page:keu-laporan');
  else if (aksi === 'hutang-baru') {
    kuHutangBuka = null;
    kuHutangJenisBaru = kuTabHutang;
    openLayer('page:keu-hutang');
  } else if (aksi === 'sembunyi') {
    store.raw(K_KU_SEMBUNYI, kuSembunyi() ? '0' : '1');
    renderKeuangan();
  } else if (aksi === 'lagi') {
    kuBatas += 40;
    kuRenderRiwayat();
  }
});
$('#itIsi-keuangan').addEventListener('input', function (e) {
  if (e.target.id === 'kuCari') {
    kuFilter.cari = e.target.value.trim();
    kuBatas = 40;
    kuRenderRiwayat();
  }
});
$('#itIsi-keuangan').addEventListener('change', function (e) {
  if (e.target.id === 'kuFDompet') {
    kuFilter.dompet = e.target.value;
    kuBatas = 40;
    kuRenderRiwayat();
  }
});
$('#impianTab').addEventListener('click', function (e) {
  if (e.target.closest('[data-it="keuangan"]')) renderKeuangan();
});

/* ---------- Isian jumlah (Rp) ---------- */
function kuJumlahHtml(id, nilai, label) {
  return (
    '<div class="field"><label for="' +
    id +
    '">' +
    (label || 'Jumlah') +
    '</label><div class="ku-jumlah"><span>Rp</span><input class="input" id="' +
    id +
    '" type="text" inputmode="numeric" autocomplete="off" placeholder="0" value="' +
    (nilai ? kuAngka(nilai) : '') +
    '"></div></div>'
  );
}
function kuBacaJumlah(el) {
  return kuJml(
    String((el && el.value) || '')
      .replace(/\D/g, '')
      .slice(0, 15)
  );
}
function kuFormatJumlah(el) {
  var n = String(el.value)
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 15);
  el.value = n ? (+n).toLocaleString('id-ID') : '';
}
document.addEventListener(
  'input',
  function (e) {
    if (e.target.matches && e.target.matches('.ku-jumlah input, input[data-ku-rp]')) kuFormatJumlah(e.target);
  },
  true
);

/* ---------- Halaman transaksi (tambah / edit) ---------- */
var kuTxBuka = { mode: 'keluar', id: null, kantong: '' },
  kuTxDraf = null,
  kuTxLama = null,
  kuTxKotor = false;
var KU_JENIS = [
  ['keluar', 'Keluar'],
  ['masuk', 'Masuk'],
  ['pindah', 'Pindah'],
  ['kantong', 'Kantong']
];
PAGES['keu-tx'] = function () {
  var a = kuAtur();
  kuTxLama = null;
  kuTxKotor = false;
  if (kuTxBuka.id) {
    kuTxLama = kuSemuaTx().filter(function (x) {
      return x.id === kuTxBuka.id;
    })[0];
    if (!kuTxLama) return false;
    kuTxDraf = JSON.parse(JSON.stringify(kuTxLama));
  } else {
    var m = kuTxBuka.mode,
      kat = a.kategori.filter(function (k) {
        return k.jenis === (m === 'masuk' ? 'masuk' : 'keluar');
      })[0];
    kuTxDraf = {
      id: uid(),
      jenis: m === 'setor' || m === 'tarik' ? m : m,
      jumlah: 0,
      kategori: kat ? kat.id : '',
      dompet: a.dompet[0].id,
      keDompet: a.dompet[1] ? a.dompet[1].id : '',
      kantong: kuTxBuka.kantong || 'darurat',
      tanggal: kuHariIni(),
      catatan: '',
      dibuat: Date.now(),
      diubah: Date.now()
    };
  }
  $('#subTitle').textContent = kuTxLama ? 'Edit transaksi' : 'Transaksi baru';
  kuTxRender();
  return true;
};
function kuTxGrup(j) {
  return j === 'setor' || j === 'tarik' ? 'kantong' : j;
}
function kuTxRender() {
  var a = kuAtur(),
    d = kuTxDraf,
    g = kuTxGrup(d.jenis),
    sk = kuSaldoKantong();
  var opsiDompet = function (sel, kecuali) {
    return a.dompet
      .filter(function (x) {
        return x.id !== kecuali;
      })
      .map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.emoji + ' ' + x.nama) + '</option>';
      })
      .join('');
  };
  var h =
    '<div class="se ku-form">' +
    '<div class="ku-seg ku-jenis" role="tablist">' +
    KU_JENIS.map(function (x) {
      return (
        '<button type="button" role="tab" aria-selected="' +
        (g === x[0]) +
        '" data-kut-jenis="' +
        x[0] +
        '" class="j-' +
        x[0] +
        '">' +
        x[1] +
        '</button>'
      );
    }).join('') +
    '</div>' +
    '<section class="ie-bagian se-kartu">';
  if (g === 'kantong') {
    h +=
      '<div class="ku-seg ku-arah"><button type="button" aria-selected="' +
      (d.jenis === 'setor') +
      '" data-kut-arah="setor">Setor ke kantong</button><button type="button" aria-selected="' +
      (d.jenis === 'tarik') +
      '" data-kut-arah="tarik">Tarik ke dompet</button></div>' +
      '<div class="field"><label for="kutKantong">Kantong</label><select class="input" id="kutKantong"><option value="darurat"' +
      (d.kantong === 'darurat' ? ' selected' : '') +
      '>☂️ Dana darurat · ' +
      kuRp(sk.darurat || 0) +
      '</option>' +
      a.kantong
        .map(function (k) {
          return (
            '<option value="' +
            esc(k.id) +
            '"' +
            (d.kantong === k.id ? ' selected' : '') +
            '>🎯 ' +
            esc(k.nama) +
            ' · ' +
            kuRp(sk[k.id] || 0) +
            '</option>'
          );
        })
        .join('') +
      '</select></div>';
  }
  h += kuJumlahHtml('kutJumlah', d.jumlah);
  if (g === 'keluar' || g === 'masuk') {
    var kl = a.kategori.filter(function (k) {
      return k.jenis === g;
    });
    h +=
      '<div class="field"><label>Kategori</label><div class="ku-kat-grid">' +
      kl
        .map(function (k) {
          return (
            '<button type="button" class="ku-kat' +
            (k.id === d.kategori ? ' dipilih' : '') +
            '" data-kut-kat="' +
            esc(k.id) +
            '" aria-pressed="' +
            (k.id === d.kategori) +
            '"><span translate="no">' +
            esc(k.emoji) +
            '</span><small translate="no">' +
            esc(k.nama) +
            '</small></button>'
          );
        })
        .join('') +
      '</div></div>';
  }
  if (g === 'pindah') {
    h +=
      '<div class="ku-dua-field"><div class="field"><label for="kutDompet">Dari</label><select class="input" id="kutDompet">' +
      opsiDompet(d.dompet) +
      '</select></div>' +
      '<div class="field"><label for="kutKe">Ke</label><select class="input" id="kutKe">' +
      opsiDompet(d.keDompet, d.dompet) +
      '</select></div></div>';
    if (a.dompet.length < 2) h += '<p class="ku-peringatan">Butuh minimal 2 dompet. Tambahkan dompet lewat ikon pensil di kartu saldo.</p>';
  } else {
    h +=
      '<div class="field"><label for="kutDompet">' +
      (g === 'kantong' ? (d.jenis === 'setor' ? 'Ambil dari dompet' : 'Masuk ke dompet') : 'Dompet') +
      '</label><select class="input" id="kutDompet">' +
      opsiDompet(d.dompet) +
      '</select></div>';
  }
  h +=
    '<div class="field"><label for="kutTgl">Tanggal</label><div class="ku-tgl-baris"><input class="input" id="kutTgl" type="date" value="' +
    esc(d.tanggal) +
    '" max="' +
    kuHariIni() +
    '">' +
    '<button type="button" class="ku-chip" data-kut-tgl="0">Hari ini</button><button type="button" class="ku-chip" data-kut-tgl="-1">Kemarin</button></div></div>' +
    '<div class="field"><label for="kutCatatan">Catatan</label><input class="input" id="kutCatatan" maxlength="' +
    KU_CATATAN +
    '" placeholder="mis. Makan siang bareng tim" value="' +
    esc(d.catatan) +
    '"></div>' +
    (kuTxLama ? '<button type="button" class="se-hapus" data-kut="hapus">' + KU_IK.hapus + 'Hapus transaksi</button>' : '') +
    '</section>' +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-kut="batal">Batal</button><button type="button" class="btn primary" data-kut="simpan">Simpan</button></div></div>';
  $('#subBody').innerHTML = h;
}
function kuTxBacaForm() {
  var d = kuTxDraf,
    j = $('#kutJumlah'),
    dm = $('#kutDompet'),
    ke = $('#kutKe'),
    kt = $('#kutKantong'),
    tg = $('#kutTgl'),
    ct = $('#kutCatatan');
  if (j) d.jumlah = kuBacaJumlah(j);
  if (dm) d.dompet = dm.value;
  if (ke) d.keDompet = ke.value;
  if (kt) d.kantong = kt.value;
  if (tg && kuTglSah(tg.value)) d.tanggal = tg.value;
  if (ct) d.catatan = ct.value.slice(0, KU_CATATAN);
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'keu-tx' || !kuTxDraf) return;
  var t = e.target,
    el,
    d = kuTxDraf,
    a = kuAtur();
  if ((el = t.closest('[data-kut-jenis]'))) {
    kuTxBacaForm();
    var g = el.dataset.kutJenis,
      lama = kuTxGrup(d.jenis);
    if (g === lama) return;
    d.jenis = g === 'kantong' ? 'setor' : g;
    if (g === 'keluar' || g === 'masuk') {
      var k1 = a.kategori.filter(function (k) {
        return k.jenis === g;
      })[0];
      d.kategori = k1 ? k1.id : '';
    }
    if (g === 'pindah' && (!d.keDompet || d.keDompet === d.dompet)) {
      var lain = a.dompet.filter(function (x) {
        return x.id !== d.dompet;
      })[0];
      d.keDompet = lain ? lain.id : '';
    }
    kuTxKotor = true;
    kuTxRender();
    return;
  }
  if ((el = t.closest('[data-kut-arah]'))) {
    kuTxBacaForm();
    d.jenis = el.dataset.kutArah;
    kuTxKotor = true;
    kuTxRender();
    return;
  }
  if ((el = t.closest('[data-kut-kat]'))) {
    d.kategori = el.dataset.kutKat;
    kuTxKotor = true;
    $$('#subBody [data-kut-kat]').forEach(function (b) {
      var on = b === el;
      b.classList.toggle('dipilih', on);
      b.setAttribute('aria-pressed', on);
    });
    return;
  }
  if ((el = t.closest('[data-kut-tgl]'))) {
    var dt = new Date();
    dt.setDate(dt.getDate() + +el.dataset.kutTgl);
    $('#kutTgl').value = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2);
    kuTxKotor = true;
    return;
  }
  if (!(el = t.closest('[data-kut]'))) return;
  var aksi = el.dataset.kut;
  if (aksi === 'batal') {
    if (!kuTxKotor) {
      back(1);
      return;
    }
    askConfirm({
      title: 'Buang perubahan?',
      text: 'Isian transaksi ini tidak disimpan.',
      ok: 'Buang',
      action: function () {
        back(2);
      }
    });
  } else if (aksi === 'hapus') {
    var lama = kuTxLama;
    askConfirm({
      title: 'Hapus transaksi?',
      text:
        '"' + kuJudulTx(a, lama) + '" ' + kuRp(lama.jumlah) + ' (' + kuFmtTgl(lama.tanggal) + ') dihapus permanen. Saldo dihitung ulang.',
      ok: 'Hapus',
      action: function () {
        back(2, function () {
          kuHapusTx(lama);
          kuSinkronHex(kuAtur(), kuSaldoKantong());
          renderKeuangan();
          toast('Transaksi dihapus');
        });
      }
    });
  } else if (aksi === 'simpan') kuTxSimpan();
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'keu-tx' && kuTxDraf) kuTxKotor = true;
  if (pageKind === 'keu-tx' && e.target.id === 'kutDompet') {
  }
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'keu-tx' || !kuTxDraf) return;
  kuTxKotor = true;
  if (e.target.id === 'kutDompet' && $('#kutKe')) {
    kuTxBacaForm();
    if (kuTxDraf.keDompet === kuTxDraf.dompet) {
      var a = kuAtur(),
        lain = a.dompet.filter(function (x) {
          return x.id !== kuTxDraf.dompet;
        })[0];
      kuTxDraf.keDompet = lain ? lain.id : '';
    }
    kuTxRender();
  }
});
function kuTxSimpan() {
  kuTxBacaForm();
  var d = kuTxDraf,
    a = kuAtur(),
    g = kuTxGrup(d.jenis);
  if (!(d.jumlah > 0)) {
    toast('Isi jumlah lebih dari 0');
    $('#kutJumlah').focus();
    return;
  }
  if (!kuTglSah(d.tanggal)) {
    toast('Tanggal tidak valid');
    return;
  }
  if (d.tanggal > kuHariIni()) {
    toast('Tanggal tidak boleh di masa depan');
    return;
  }
  if (!kuDompet(a, d.dompet)) {
    toast('Pilih dompet');
    return;
  }
  if (g === 'pindah') {
    if (a.dompet.length < 2 || !kuDompet(a, d.keDompet) || d.keDompet === d.dompet) {
      toast('Pilih dompet tujuan yang berbeda');
      return;
    }
  }
  if ((g === 'keluar' || g === 'masuk') && !kuKat(a, d.kategori)) {
    toast('Pilih kategori');
    return;
  }
  if (d.jenis === 'tarik') {
    var tx = kuSemuaTx().filter(function (x) {
        return !kuTxLama || x.id !== kuTxLama.id;
      }),
      s = kuSaldoKantong(tx)[d.kantong] || 0;
    if (d.jumlah > s) {
      toast('Saldo ' + kuNamaKantong(a, d.kantong) + ' hanya ' + kuRp(s));
      return;
    }
  }
  var bersih = {
    id: d.id,
    jenis: d.jenis,
    jumlah: kuJml(d.jumlah),
    tanggal: d.tanggal,
    catatan: String(d.catatan || '')
      .trim()
      .slice(0, KU_CATATAN),
    dompet: d.dompet,
    kategori: g === 'keluar' || g === 'masuk' ? d.kategori : '',
    keDompet: g === 'pindah' ? d.keDompet : '',
    kantong: g === 'kantong' ? d.kantong : '',
    br: d.br || undefined,
    dibuat: d.dibuat || Date.now(),
    diubah: Date.now()
  };
  kuSimpanTx(bersih, kuTxLama);
  if (g === 'kantong' || (kuTxLama && kuTxGrup(kuTxLama.jenis) === 'kantong')) kuSinkronHex(a, kuSaldoKantong());
  var baru = !kuTxLama;
  kuTxKotor = false;
  if (bersih.tanggal.slice(0, 7) !== kuBulan && baru) kuBulan = bersih.tanggal.slice(0, 7);
  back(1, function () {
    renderKeuangan();
    toast(baru ? 'Transaksi disimpan' : 'Perubahan disimpan');
  });
}

/* ---------- Halaman hutang (tambah / edit + cicilan) ---------- */
var kuHutangBuka = null,
  kuHutangJenisBaru = 'aku',
  kuHDraf = null,
  kuHKotor = false;
PAGES['keu-hutang'] = function () {
  var lama = kuHutangBuka
    ? kuHutang().filter(function (x) {
        return x.id === kuHutangBuka;
      })[0]
    : null;
  if (kuHutangBuka && !lama) return false;
  kuHDraf = lama
    ? JSON.parse(JSON.stringify(lama))
    : {
        id: uid(),
        jenis: kuHutangJenisBaru === 'orang' ? 'orang' : 'aku',
        nama: '',
        jumlah: 0,
        tempo: '',
        catatan: '',
        bayar: [],
        dibuat: Date.now()
      };
  if (!Array.isArray(kuHDraf.bayar)) kuHDraf.bayar = [];
  kuHKotor = false;
  $('#subTitle').textContent = lama ? 'Edit hutang' : 'Hutang baru';
  kuHRender();
  return true;
};
function kuHRender() {
  var d = kuHDraf,
    lama = !!kuHutangBuka,
    sisa = kuHutangSisa(d);
  $('#subBody').innerHTML =
    '<div class="se ku-form"><section class="ie-bagian se-kartu">' +
    '<div class="ku-seg"><button type="button" aria-selected="' +
    (d.jenis !== 'orang') +
    '" data-kuh-jenis="aku">Hutangku</button><button type="button" aria-selected="' +
    (d.jenis === 'orang') +
    '" data-kuh-jenis="orang">Hutang orang ke aku</button></div>' +
    '<div class="field"><label for="kuhNama">' +
    (d.jenis === 'orang' ? 'Siapa yang berhutang' : 'Berhutang ke siapa / untuk apa') +
    '</label><input class="input" id="kuhNama" maxlength="40" placeholder="mis. Budi / Cicilan HP" value="' +
    esc(d.nama) +
    '"></div>' +
    kuJumlahHtml('kuhJumlah', d.jumlah, 'Jumlah hutang') +
    '<div class="field"><label for="kuhTempo">Jatuh tempo <small>(boleh kosong)</small></label><input class="input" id="kuhTempo" type="date" value="' +
    esc(d.tempo || '') +
    '"></div>' +
    '<div class="field"><label for="kuhCatatan">Catatan</label><input class="input" id="kuhCatatan" maxlength="' +
    KU_CATATAN +
    '" placeholder="mis. Dibayar tiap gajian" value="' +
    esc(d.catatan || '') +
    '"></div>' +
    '</section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    KU_IK.riwayat +
    'Pembayaran</h3>' +
    '<p class="ku-sisa"><span>Sisa:</span> <b class="' +
    (sisa <= 0 ? 'ku-plus' : '') +
    '">' +
    (sisa <= 0 && kuJml(d.jumlah) > 0 ? 'Lunas' : kuRp(sisa)) +
    '</b></p>' +
    (d.bayar.length
      ? d.bayar
          .slice()
          .sort(function (x, y) {
            return x.tanggal < y.tanggal ? 1 : -1;
          })
          .map(function (b) {
            return (
              '<div class="ku-baris statis"><span class="ku-em">✔️</span><span class="ku-baris-teks"><b>' +
              kuRp(b.jumlah) +
              '</b><small>' +
              kuFmtTgl(b.tanggal) +
              '</small></span>' +
              '<button type="button" class="ie-poin-hapus" data-kuh-hapus-bayar="' +
              esc(b.id) +
              '" aria-label="Hapus pembayaran"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
            );
          })
          .join('')
      : '<p class="ku-kosong-kecil">Belum ada pembayaran.</p>') +
    '<div class="ku-bayar-baru"><div class="ku-jumlah"><span>Rp</span><input class="input" id="kuhBayar" type="text" inputmode="numeric" autocomplete="off" placeholder="Jumlah dibayar" aria-label="Jumlah dibayar"></div>' +
    '<input class="input" id="kuhBayarTgl" type="date" value="' +
    kuHariIni() +
    '" max="' +
    kuHariIni() +
    '" aria-label="Tanggal bayar">' +
    '<button type="button" class="btn primary" data-kuh="bayar">Catat bayar</button>' +
    (sisa > 0 ? '<button type="button" class="ku-chip" data-kuh="lunasi">Lunasi sisa ' + kuRingkas(sisa) + '</button>' : '') +
    '</div>' +
    '<small class="ie-bantu">Pembayaran hutang tidak mengubah saldo dompet. Catat juga sebagai pengeluaran/pemasukan bila perlu.</small>' +
    '</section>' +
    (lama ? '<button type="button" class="se-hapus" data-kuh="hapus">' + KU_IK.hapus + 'Hapus hutang</button>' : '') +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-kuh="batal">Batal</button><button type="button" class="btn primary" data-kuh="simpan">Simpan</button></div></div>';
}
function kuHBaca() {
  var d = kuHDraf,
    n = $('#kuhNama'),
    j = $('#kuhJumlah'),
    t = $('#kuhTempo'),
    c = $('#kuhCatatan');
  if (n) d.nama = n.value.slice(0, 40);
  if (j) d.jumlah = kuBacaJumlah(j);
  if (t) d.tempo = kuTglSah(t.value) ? t.value : '';
  if (c) d.catatan = c.value.slice(0, KU_CATATAN);
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'keu-hutang' || !kuHDraf) return;
  var t = e.target,
    el,
    d = kuHDraf;
  if ((el = t.closest('[data-kuh-jenis]'))) {
    kuHBaca();
    d.jenis = el.dataset.kuhJenis;
    kuHKotor = true;
    kuHRender();
    return;
  }
  if ((el = t.closest('[data-kuh-hapus-bayar]'))) {
    var bid = el.dataset.kuhHapusBayar,
      b = d.bayar.filter(function (x) {
        return x.id === bid;
      })[0];
    if (!b) return;
    askConfirm({
      title: 'Hapus pembayaran?',
      text: 'Pembayaran ' + kuRp(b.jumlah) + ' (' + kuFmtTgl(b.tanggal) + ') dihapus (berlaku setelah Simpan).',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          kuHBaca();
          d.bayar = d.bayar.filter(function (x) {
            return x.id !== bid;
          });
          kuHKotor = true;
          kuHRender();
        });
      }
    });
    return;
  }
  if (!(el = t.closest('[data-kuh]'))) return;
  var aksi = el.dataset.kuh;
  if (aksi === 'bayar' || aksi === 'lunasi') {
    kuHBaca();
    var sisa = kuHutangSisa(d),
      j = aksi === 'lunasi' ? sisa : kuBacaJumlah($('#kuhBayar')),
      tg = $('#kuhBayarTgl').value;
    if (!(kuJml(d.jumlah) > 0)) {
      toast('Isi jumlah hutang dulu');
      return;
    }
    if (!(j > 0)) {
      toast('Isi jumlah yang dibayar');
      $('#kuhBayar').focus();
      return;
    }
    if (j > sisa) {
      toast('Melebihi sisa hutang (' + kuRp(sisa) + ')');
      return;
    }
    if (!kuTglSah(tg)) {
      toast('Tanggal tidak valid');
      return;
    }
    d.bayar.push({ id: uid(), jumlah: j, tanggal: tg });
    kuHKotor = true;
    kuHRender();
    toast(kuHutangSisa(d) <= 0 ? 'Lunas! Ketuk Simpan' : 'Pembayaran ditambahkan. Ketuk Simpan');
  } else if (aksi === 'batal') {
    if (!kuHKotor) {
      back(1);
      return;
    }
    askConfirm({
      title: 'Buang perubahan?',
      text: 'Perubahan hutang ini tidak disimpan.',
      ok: 'Buang',
      action: function () {
        back(2);
      }
    });
  } else if (aksi === 'hapus') {
    askConfirm({
      title: 'Hapus hutang?',
      text: '"' + (d.nama || 'Hutang') + '" beserta riwayat pembayarannya dihapus permanen.',
      ok: 'Hapus',
      action: function () {
        back(2, function () {
          store.set(
            K_KU_HUTANG,
            kuHutang().filter(function (x) {
              return x.id !== d.id;
            })
          );
          renderKeuangan();
          toast('Hutang dihapus');
        });
      }
    });
  } else if (aksi === 'simpan') {
    kuHBaca();
    if (!d.nama.trim()) {
      toast('Isi nama');
      $('#kuhNama').focus();
      return;
    }
    if (!(kuJml(d.jumlah) > 0)) {
      toast('Isi jumlah hutang');
      $('#kuhJumlah').focus();
      return;
    }
    var dibayar = d.bayar.reduce(function (a, b) {
      return a + kuJml(b.jumlah);
    }, 0);
    if (dibayar > kuJml(d.jumlah)) {
      toast('Jumlah hutang lebih kecil dari yang sudah dibayar (' + kuRp(dibayar) + ')');
      return;
    }
    var bersih = {
      id: d.id,
      jenis: d.jenis === 'orang' ? 'orang' : 'aku',
      nama: d.nama.trim().slice(0, 40),
      jumlah: kuJml(d.jumlah),
      tempo: d.tempo || '',
      catatan: String(d.catatan || '')
        .trim()
        .slice(0, KU_CATATAN),
      bayar: d.bayar.map(function (b) {
        return { id: b.id, jumlah: kuJml(b.jumlah), tanggal: b.tanggal };
      }),
      dibuat: d.dibuat || Date.now(),
      diubah: Date.now()
    };
    var l = kuHutang().filter(function (x) {
      return x.id !== bersih.id;
    });
    l.push(bersih);
    store.set(K_KU_HUTANG, l);
    kuTabHutang = bersih.jenis;
    kuHKotor = false;
    back(1, function () {
      renderKeuangan();
      toast('Hutang disimpan');
    });
  }
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind === 'keu-hutang' && kuHDraf && e.target.id !== 'kuhBayar') kuHKotor = true;
});

/* ---------- Halaman pengaturan keuangan ---------- */
var kuADraf = null,
  kuABuka = '',
  kuAKotor = false;
PAGES['keu-atur'] = function () {
  kuADraf = kuAtur();
  kuABuka = '';
  kuAKotor = false;
  $('#subTitle').textContent = 'Pengaturan keuangan';
  kuARender();
  return true;
};
function kuAItem(kunci, ringkas, kanan, isi) {
  var buka = kuABuka === kunci;
  return (
    '<article class="se-baris ku-a-item' +
    (buka ? ' buka' : '') +
    '" style="--w:var(--accent)"><button type="button" class="se-ringkas ku-a-ringkas" data-kua-buka="' +
    esc(kunci) +
    '" aria-expanded="' +
    buka +
    '">' +
    '<span class="ku-em" translate="no">' +
    ringkas[0] +
    '</span><span class="se-ringkas-nama" translate="no">' +
    ringkas[1] +
    '</span><small class="se-ringkas-waktu">' +
    kanan +
    '</small><span class="se-panah">' +
    KU_IK.bawah +
    '</span></button>' +
    (buka ? '<div class="se-isi">' + isi + '</div>' : '') +
    '</article>'
  );
}
function kuAOpsi(l, sel, kosong) {
  return (
    (kosong ? '<option value="">' + kosong + '</option>' : '') +
    l
      .map(function (x) {
        return '<option value="' + esc(x[0]) + '"' + (x[0] === sel ? ' selected' : '') + '>' + esc(x[1]) + '</option>';
      })
      .join('')
  );
}
function kuARender() {
  var a = kuADraf,
    sd = kuSaldoDompet(a),
    sk = kuSaldoKantong(),
    hex = typeof imDaftar === 'function' ? imDaftar() : [];
  var hapusBtn = function (jenis, id, label) {
    return '<button type="button" class="se-hapus" data-kua-hapus="' + jenis + ':' + esc(id) + '">' + KU_IK.hapus + label + '</button>';
  };
  var h = '<div class="se pge ku-atur">';
  /* Dompet */
  h +=
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    KU_IK.dompet +
    'Dompet</h3><div class="se-blok">' +
    a.dompet
      .map(function (d) {
        return kuAItem(
          'd:' + d.id,
          [esc(d.emoji), esc(d.nama)],
          kuRingkas(sd[d.id] || 0),
          '<div class="ku-emoji-nama"><div class="field"><label>Emoji</label><input class="input ku-emoji" data-kua="dompet:' +
            esc(d.id) +
            ':emoji" maxlength="8" value="' +
            esc(d.emoji) +
            '"></div>' +
            '<div class="field"><label>Nama</label><input class="input" data-kua="dompet:' +
            esc(d.id) +
            ':nama" maxlength="' +
            KU_NAMA +
            '" value="' +
            esc(d.nama) +
            '"></div></div>' +
            '<div class="field"><label>Saldo awal</label><div class="ku-jumlah"><span>Rp</span><input class="input" data-ku-rp data-kua="dompet:' +
            esc(d.id) +
            ':awal" type="text" inputmode="numeric" value="' +
            (d.awal ? kuAngka(d.awal) : '') +
            '" placeholder="0"></div><small class="ie-bantu">Saldo sebelum mulai mencatat di Stivora.</small></div>' +
            (a.dompet.length > 1 ? hapusBtn('dompet', d.id, 'Hapus dompet') : '')
        );
      })
      .join('') +
    '</div><button type="button" class="ie-poin-tambah" data-kua-tambah="dompet">' +
    KU_IK.plus +
    'Tambah dompet</button></section>';
  /* Kategori + anggaran */
  [
    ['keluar', 'Kategori pengeluaran & anggaran'],
    ['masuk', 'Kategori pemasukan']
  ].forEach(function (g) {
    h +=
      '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
      (g[0] === 'keluar' ? KU_IK.target : KU_IK.plus) +
      g[1] +
      '</h3><div class="se-blok">' +
      a.kategori
        .filter(function (k) {
          return k.jenis === g[0];
        })
        .map(function (k) {
          return kuAItem(
            'k:' + k.id,
            [esc(k.emoji), esc(k.nama)],
            g[0] === 'keluar' ? (k.anggaran ? kuRingkas(k.anggaran) + '/bln' : 'tanpa anggaran') : '',
            '<div class="ku-emoji-nama"><div class="field"><label>Emoji</label><input class="input ku-emoji" data-kua="kategori:' +
              esc(k.id) +
              ':emoji" maxlength="8" value="' +
              esc(k.emoji) +
              '"></div>' +
              '<div class="field"><label>Nama</label><input class="input" data-kua="kategori:' +
              esc(k.id) +
              ':nama" maxlength="' +
              KU_NAMA +
              '" value="' +
              esc(k.nama) +
              '"></div></div>' +
              (g[0] === 'keluar'
                ? '<div class="field"><label>Anggaran per bulan <small>(kosong = tanpa batas)</small></label><div class="ku-jumlah"><span>Rp</span><input class="input" data-ku-rp data-kua="kategori:' +
                  esc(k.id) +
                  ':anggaran" type="text" inputmode="numeric" value="' +
                  (k.anggaran ? kuAngka(k.anggaran) : '') +
                  '" placeholder="0"></div></div>'
                : '') +
              hapusBtn('kategori', k.id, 'Hapus kategori')
          );
        })
        .join('') +
      '</div><button type="button" class="ie-poin-tambah" data-kua-tambah="kategori:' +
      g[0] +
      '">' +
      KU_IK.plus +
      'Tambah kategori</button></section>';
  });
  /* Dana darurat */
  h +=
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    KU_IK.payung +
    'Target dana darurat</h3>' +
    '<div class="ku-seg"><button type="button" aria-selected="' +
    (a.darurat.mode !== 'manual') +
    '" data-kua-darurat="otomatis">Otomatis</button><button type="button" aria-selected="' +
    (a.darurat.mode === 'manual') +
    '" data-kua-darurat="manual">Tentukan sendiri</button></div>' +
    (a.darurat.mode === 'manual'
      ? '<div class="field"><label>Target</label><div class="ku-jumlah"><span>Rp</span><input class="input" data-ku-rp data-kua="darurat::target" type="text" inputmode="numeric" value="' +
        (a.darurat.target ? kuAngka(a.darurat.target) : '') +
        '" placeholder="0"></div></div>'
      : '<small class="ie-bantu">Otomatis = 6× rata-rata pengeluaran bulanan (3 bulan terakhir).</small>') +
    '</section>';
  /* Tabungan impian */
  h +=
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    KU_IK.target +
    'Tabungan impian</h3><div class="se-blok">' +
    a.kantong
      .map(function (k) {
        return kuAItem(
          't:' + k.id,
          ['🎯', esc(k.nama)],
          kuRingkas(sk[k.id] || 0) + (k.target ? ' / ' + kuRingkas(k.target) : ''),
          '<div class="field"><label>Nama</label><input class="input" data-kua="kantong:' +
            esc(k.id) +
            ':nama" maxlength="40" value="' +
            esc(k.nama) +
            '"></div>' +
            '<div class="field"><label>Target</label><div class="ku-jumlah"><span>Rp</span><input class="input" data-ku-rp data-kua="kantong:' +
            esc(k.id) +
            ':target" type="text" inputmode="numeric" value="' +
            (k.target ? kuAngka(k.target) : '') +
            '" placeholder="0"></div></div>' +
            '<div class="field"><label>Hubungkan ke hexagon impian</label><select class="input" data-kua="kantong:' +
            esc(k.id) +
            ':hexId">' +
            kuAOpsi(
              hex.map(function (x) {
                return [x.id, (x.emoji || '⭐') + ' ' + x.nama];
              }),
              k.hexId,
              'Tidak dihubungkan'
            ) +
            '</select>' +
            '<small class="ie-bantu">Bila dihubungkan, nilai hexagon mengikuti saldo tabungan ini (dalam Rp).</small></div>' +
            hapusBtn('kantong', k.id, 'Hapus tabungan')
        );
      })
      .join('') +
    '</div><button type="button" class="ie-poin-tambah" data-kua-tambah="kantong">' +
    KU_IK.plus +
    'Tambah tabungan</button></section>';
  /* Berulang */
  h +=
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    KU_IK.ulang +
    'Transaksi berulang</h3><div class="se-blok">' +
    a.berulang
      .map(function (r) {
        var k = kuKat(a, r.kategori);
        return kuAItem(
          'r:' + r.id,
          [esc(k ? k.emoji : '🔁'), esc(r.nama || (k ? k.nama : 'Transaksi'))],
          (r.jenis === 'masuk' ? '+' : '−') + kuRingkas(r.jumlah) + ' · tgl ' + r.hari,
          '<div class="ku-seg"><button type="button" aria-selected="' +
            (r.jenis !== 'masuk') +
            '" data-kua-rjenis="' +
            esc(r.id) +
            ':keluar">Pengeluaran</button><button type="button" aria-selected="' +
            (r.jenis === 'masuk') +
            '" data-kua-rjenis="' +
            esc(r.id) +
            ':masuk">Pemasukan</button></div>' +
            '<div class="field"><label>Nama</label><input class="input" data-kua="berulang:' +
            esc(r.id) +
            ':nama" maxlength="40" placeholder="mis. Gaji / Langganan" value="' +
            esc(r.nama) +
            '"></div>' +
            '<div class="field"><label>Jumlah</label><div class="ku-jumlah"><span>Rp</span><input class="input" data-ku-rp data-kua="berulang:' +
            esc(r.id) +
            ':jumlah" type="text" inputmode="numeric" value="' +
            (r.jumlah ? kuAngka(r.jumlah) : '') +
            '" placeholder="0"></div></div>' +
            '<div class="ku-dua-field"><div class="field"><label>Kategori</label><select class="input" data-kua="berulang:' +
            esc(r.id) +
            ':kategori">' +
            kuAOpsi(
              a.kategori
                .filter(function (x) {
                  return x.jenis === r.jenis;
                })
                .map(function (x) {
                  return [x.id, x.emoji + ' ' + x.nama];
                }),
              r.kategori
            ) +
            '</select></div>' +
            '<div class="field"><label>Dompet</label><select class="input" data-kua="berulang:' +
            esc(r.id) +
            ':dompet">' +
            kuAOpsi(
              a.dompet.map(function (x) {
                return [x.id, x.emoji + ' ' + x.nama];
              }),
              r.dompet
            ) +
            '</select></div></div>' +
            '<div class="field"><label>Tanggal tiap bulan</label><select class="input" data-kua="berulang:' +
            esc(r.id) +
            ':hari">' +
            kuAOpsi(
              Array.apply(null, Array(28)).map(function (x, i) {
                return [String(i + 1), 'Tanggal ' + (i + 1)];
              }),
              String(r.hari)
            ) +
            '</select>' +
            '<small class="ie-bantu">Pengingat muncul di tab Keuangan mulai tanggal ini; tercatat setelah kamu ketuk "Catat".</small></div>' +
            hapusBtn('berulang', r.id, 'Hapus')
        );
      })
      .join('') +
    '</div><button type="button" class="ie-poin-tambah" data-kua-tambah="berulang">' +
    KU_IK.plus +
    'Tambah berulang</button></section>';
  h +=
    '<div class="se-bawah"><button type="button" class="btn ghost" data-kua-aksi="batal">Batal</button><button type="button" class="btn primary" data-kua-aksi="simpan">Simpan</button></div></div>';
  $('#subBody').innerHTML = h;
}
function kuACari(jenis, id) {
  var l =
    jenis === 'dompet'
      ? kuADraf.dompet
      : jenis === 'kategori'
        ? kuADraf.kategori
        : jenis === 'kantong'
          ? kuADraf.kantong
          : kuADraf.berulang;
  return l.filter(function (x) {
    return x.id === id;
  })[0];
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'keu-atur' || !kuADraf) return;
  var t = e.target,
    el,
    a = kuADraf;
  if ((el = t.closest('[data-kua-buka]'))) {
    var k = el.dataset.kuaBuka;
    kuABuka = kuABuka === k ? '' : k;
    kuARender();
    var r = $('#subBody .ku-a-item.buka');
    if (r) r.scrollIntoView({ block: 'nearest' });
    return;
  }
  if ((el = t.closest('[data-kua-darurat]'))) {
    a.darurat.mode = el.dataset.kuaDarurat;
    kuAKotor = true;
    kuARender();
    return;
  }
  if ((el = t.closest('[data-kua-rjenis]'))) {
    var p = el.dataset.kuaRjenis.split(':'),
      r2 = kuACari('berulang', p[0]);
    if (!r2 || r2.jenis === p[1]) return;
    r2.jenis = p[1];
    var k1 = a.kategori.filter(function (x) {
      return x.jenis === p[1];
    })[0];
    r2.kategori = k1 ? k1.id : '';
    kuAKotor = true;
    kuARender();
    return;
  }
  if ((el = t.closest('[data-kua-tambah]'))) {
    var j = el.dataset.kuaTambah,
      id = uid();
    if (j === 'dompet') {
      if (a.dompet.length >= 20) {
        toast('Maksimal 20 dompet');
        return;
      }
      a.dompet.push({ id: id, nama: 'Dompet baru', emoji: '👛', awal: 0 });
      kuABuka = 'd:' + id;
    } else if (j.indexOf('kategori') === 0) {
      var g = j.split(':')[1];
      if (a.kategori.length >= 60) {
        toast('Maksimal 60 kategori');
        return;
      }
      a.kategori.push({ id: id, nama: 'Kategori baru', emoji: '🏷️', jenis: g, anggaran: 0 });
      kuABuka = 'k:' + id;
    } else if (j === 'kantong') {
      if (a.kantong.length >= 30) {
        toast('Maksimal 30 tabungan');
        return;
      }
      a.kantong.push({ id: id, nama: 'Tabungan baru', hexId: '', target: 0 });
      kuABuka = 't:' + id;
    } else if (j === 'berulang') {
      if (a.berulang.length >= 40) {
        toast('Maksimal 40 transaksi berulang');
        return;
      }
      var k2 = a.kategori.filter(function (x) {
        return x.jenis === 'keluar';
      })[0];
      a.berulang.push({
        id: id,
        jenis: 'keluar',
        nama: '',
        jumlah: 0,
        kategori: k2 ? k2.id : '',
        dompet: a.dompet[0].id,
        hari: 1,
        terakhir: ''
      });
      kuABuka = 'r:' + id;
    }
    kuAKotor = true;
    kuARender();
    var baru = $('#subBody .ku-a-item.buka input:not(.ku-emoji)');
    if (baru) {
      baru.scrollIntoView({ block: 'center' });
      baru.focus();
      if (baru.select) baru.select();
    }
    return;
  }
  if ((el = t.closest('[data-kua-hapus]'))) {
    var q = el.dataset.kuaHapus.split(':'),
      jenis = q[0],
      hid = q[1],
      item = kuACari(jenis, hid);
    if (!item) return;
    var tx = kuSemuaTx();
    if (jenis === 'dompet') {
      var pakai = tx.filter(function (x) {
        return x.dompet === hid || x.keDompet === hid;
      }).length;
      if (pakai) {
        toast('Dompet ini dipakai ' + pakai + ' transaksi. Edit/hapus transaksinya dulu.');
        return;
      }
    }
    if (jenis === 'kantong') {
      var s = kuSaldoKantong(tx)[hid] || 0;
      if (s) {
        toast('Masih ada saldo ' + kuRp(s) + '. Tarik dulu ke dompet.');
        return;
      }
    }
    var teks =
      jenis === 'kategori'
        ? 'Transaksi lama dengan kategori ini tetap ada dan tampil sebagai "Tanpa kategori".'
        : jenis === 'kantong'
          ? 'Riwayat setor/tarik tabungan ini tetap ada.'
          : '';
    var label = { dompet: 'dompet', kategori: 'kategori', kantong: 'tabungan', berulang: 'transaksi berulang' }[jenis];
    askConfirm({
      title: item.nama ? 'Hapus ' + label + ' "' + item.nama + '"?' : 'Hapus ' + label + ' ini?',
      text: (teks ? teks + ' ' : '') + 'Berlaku setelah Simpan.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          if (!kuADraf) return;
          if (jenis === 'dompet')
            kuADraf.dompet = kuADraf.dompet.filter(function (x) {
              return x.id !== hid;
            });
          if (jenis === 'kategori')
            kuADraf.kategori = kuADraf.kategori.filter(function (x) {
              return x.id !== hid;
            });
          if (jenis === 'kantong')
            kuADraf.kantong = kuADraf.kantong.filter(function (x) {
              return x.id !== hid;
            });
          if (jenis === 'berulang')
            kuADraf.berulang = kuADraf.berulang.filter(function (x) {
              return x.id !== hid;
            });
          kuABuka = '';
          kuAKotor = true;
          kuARender();
        });
      }
    });
    return;
  }
  if (!(el = t.closest('[data-kua-aksi]'))) return;
  if (el.dataset.kuaAksi === 'batal') {
    if (!kuAKotor) {
      back(1);
      return;
    }
    askConfirm({
      title: 'Buang perubahan?',
      text: 'Perubahan pengaturan keuangan tidak disimpan.',
      ok: 'Buang',
      action: function () {
        back(2);
      }
    });
    return;
  }
  /* Simpan */
  a.dompet.forEach(function (d) {
    d.nama = d.nama.trim() || 'Dompet';
    d.emoji = (typeof imEmoji1 === 'function' ? imEmoji1(d.emoji) : d.emoji) || '👛';
  });
  a.kategori.forEach(function (k) {
    k.nama = k.nama.trim() || 'Kategori';
    k.emoji = (typeof imEmoji1 === 'function' ? imEmoji1(k.emoji) : k.emoji) || '🏷️';
  });
  a.kantong.forEach(function (k) {
    k.nama = k.nama.trim() || 'Tabungan';
  });
  var tanpa = a.berulang.filter(function (r) {
    return !(r.jumlah > 0);
  });
  if (tanpa.length) {
    kuABuka = 'r:' + tanpa[0].id;
    kuARender();
    toast('Isi jumlah transaksi berulang');
    return;
  }
  a.berulang.forEach(function (r) {
    if (!kuKat(a, r.kategori)) {
      var kk = a.kategori.filter(function (x) {
        return x.jenis === r.jenis;
      })[0];
      r.kategori = kk ? kk.id : '';
    }
    if (!kuDompet(a, r.dompet)) r.dompet = a.dompet[0].id;
  });
  kuSimpanAtur(a);
  kuSinkronHex(a, kuSaldoKantong());
  kuAKotor = false;
  back(1, function () {
    renderKeuangan();
    toast('Pengaturan keuangan disimpan');
  });
});
function kuAUbah(e) {
  if (pageKind !== 'keu-atur' || !kuADraf) return;
  var t = e.target,
    f = t.dataset.kua;
  if (!f) return;
  var p = f.split(':'),
    jenis = p[0],
    id = p[1],
    kol = p[2];
  if (jenis === 'darurat') {
    kuADraf.darurat.target = kuBacaJumlah(t);
    kuAKotor = true;
    return;
  }
  var item = kuACari(jenis, id);
  if (!item) return;
  if (kol === 'awal' || kol === 'anggaran' || kol === 'target' || kol === 'jumlah') {
    var n = String(t.value).replace(/[^\d-]/g, '');
    item[kol] =
      kol === 'awal' ? Math.max(-KU_MAKS_JUMLAH, Math.min(KU_MAKS_JUMLAH, parseInt(n.replace(/(?!^)-/g, ''), 10) || 0)) : kuBacaJumlah(t);
  } else if (kol === 'hari') item.hari = parseInt(t.value, 10) || 1;
  else item[kol] = t.value;
  kuAKotor = true;
}
$('#subBody').addEventListener('input', kuAUbah);
$('#subBody').addEventListener('change', kuAUbah);

/* ---------- Halaman laporan ---------- */
PAGES['keu-laporan'] = function () {
  var tx = kuSemuaTx(),
    a = kuAtur(),
    b = kuBulanIni(),
    data = [],
    maks = 1;
  for (var i = 11; i >= 0; i--) {
    var bb = kuGeserBulan(b, -i),
      r = kuRingkasBulan(tx, bb);
    data.push({ b: bb, r: r });
    maks = Math.max(maks, r.masuk, r.keluar);
  }
  var tot = data.reduce(
      function (o, x) {
        o.m += x.r.masuk;
        o.k += x.r.keluar;
        return o;
      },
      { m: 0, k: 0 }
    ),
    ada =
      data.filter(function (x) {
        return x.r.masuk || x.r.keluar;
      }).length || 1;
  var katTahun = {};
  data.forEach(function (x) {
    Object.keys(x.r.kat).forEach(function (k) {
      katTahun[k] = (katTahun[k] || 0) + x.r.kat[k];
    });
  });
  var kl = Object.keys(katTahun).sort(function (x, y) {
    return katTahun[y] - katTahun[x];
  });
  $('#subTitle').textContent = 'Laporan keuangan';
  $('#subBody').innerHTML =
    '<div class="ku-laporan">' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    KU_IK.grafik +
    '12 bulan terakhir</h3>' +
    '<div class="ku-grafik besar">' +
    data
      .map(function (x) {
        return (
          '<div class="ku-grafik-kol"><div class="ku-grafik-bar"><i class="m" style="height:' +
          ((x.r.masuk / maks) * 100).toFixed(1) +
          '%"></i><i class="k" style="height:' +
          ((x.r.keluar / maks) * 100).toFixed(1) +
          '%"></i></div><small>' +
          KU_BLN[+x.b.slice(5, 7) - 1] +
          '</small></div>'
        );
      })
      .join('') +
    '</div><p class="ku-legenda"><i class="m"></i><span>Masuk</span><i class="k"></i><span>Keluar</span></p>' +
    '<div class="ku-dua"><div><span class="ku-label">Total masuk</span><b class="ku-plus">' +
    kuRp(tot.m) +
    '</b></div><div><span class="ku-label">Total keluar</span><b class="ku-min">' +
    kuRp(tot.k) +
    '</b></div></div>' +
    '<p class="ku-sisa"><span>Rata-rata pengeluaran per bulan:</span> <b>' +
    kuRp(tot.k / ada) +
    '</b></p></section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    KU_IK.target +
    'Pengeluaran per kategori (12 bulan)</h3>' +
    (kl.length
      ? '<ul class="ku-kat-daftar besar">' +
        kl
          .map(function (id, j) {
            var k = kuKat(a, id);
            return (
              '<li><i style="background:' +
              KU_WARNA[j % KU_WARNA.length] +
              '"></i><span translate="no">' +
              esc(k ? k.emoji + ' ' + k.nama : 'Tanpa kategori') +
              '</span><b>' +
              kuRp(katTahun[id]) +
              '</b></li>'
            );
          })
          .join('') +
        '</ul>'
      : '<p class="ku-kosong-kecil">Belum ada pengeluaran.</p>') +
    '</section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    KU_IK.riwayat +
    'Per bulan</h3><div class="ku-tabel">' +
    data
      .slice()
      .reverse()
      .map(function (x) {
        var s = x.r.masuk - x.r.keluar;
        return (
          '<div class="ku-tabel-baris"><b>' +
          KU_BLN[+x.b.slice(5, 7) - 1] +
          ' ' +
          x.b.slice(2, 4) +
          '</b><span class="ku-plus">+' +
          kuRingkas(x.r.masuk) +
          '</span><span class="ku-min">−' +
          kuRingkas(x.r.keluar) +
          '</span><span' +
          (s < 0 ? ' class="ku-min"' : '') +
          '>' +
          kuRingkas(s) +
          '</span></div>'
        );
      })
      .join('') +
    '</div></section></div>';
  return true;
};
renderKeuangan();
