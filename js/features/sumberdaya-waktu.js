/* Stivora — Tab Sumberdaya: "1. Sumberdaya waktu" — jam analog, pita hari, buku hitung mundur per blok waktu + halaman edit (5.27.0)
   Data lokal:
     'stivora.sumberdaya.waktu'  = [{ id, nama, warna:'#rrggbb', mulai:'HH:MM', durasi: menit, k1: kalimat saat berjalan, k2: kalimat saat menunggu }]
     'stivora.sumberdaya.info'   = keterangan (halaman ikon ?)
     'stivora.sumberdaya.tampil' = { analog, pita, mini } (true/false)
   Blok boleh melewati tengah malam (mis. 22:00 + 8j → 06:00); tidak boleh bertabrakan; total ≤ 24 jam. */
'use strict';

var K_SD_WAKTU = 'stivora.sumberdaya.waktu',
  K_SD_TAMPIL = 'stivora.sumberdaya.tampil',
  SD_HARI = 1440,
  SD_NAMA_MAKS = 30,
  SD_KAL_MAKS = 120,
  SD_INFO_MAKS = 5000,
  SD_MAKS = 8;
var SD_WARNA = ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16'];
var SD_BAWAAN = [
  { id: 'makan', nama: 'Kerja cari makan', warna: '#f59e0b', mulai: '06:00', durasi: 480 },
  { id: 'modal', nama: 'Kerja cari modal bisnis', warna: '#10b981', mulai: '14:00', durasi: 480 },
  { id: 'istirahat', nama: 'Istirahat', warna: '#6366f1', mulai: '22:00', durasi: 480 }
];

function sdMenit(hhmm) {
  var t = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  return t ? (+t[1] % 24) * 60 + Math.min(59, +t[2]) : 0;
}
function sdHHMM(m) {
  m = ((Math.round(m) % SD_HARI) + SD_HARI) % SD_HARI;
  var h = Math.floor(m / 60),
    n = m % 60;
  return (h < 10 ? '0' : '') + h + ':' + (n < 10 ? '0' : '') + n;
}
function sdDur(m) {
  var h = Math.floor(m / 60),
    n = m % 60;
  return (h ? h + 'j' : '') + (n ? (h ? ' ' : '') + n + 'm' : '') || '0m';
}
function sdWarnaSah(w) {
  return /^#[0-9a-f]{6}$/i.test(w || '') ? w.toLowerCase() : '#6366f1';
}
function sdSah(b) {
  return {
    id: String(b.id || uid()),
    nama:
      String(b.nama || '')
        .trim()
        .slice(0, SD_NAMA_MAKS) || 'Blok',
    warna: sdWarnaSah(b.warna),
    mulai: sdHHMM(sdMenit(b.mulai)),
    durasi: Math.max(15, Math.min(SD_HARI, Math.round(+b.durasi || 0))),
    k1: String(b.k1 || '')
      .trim()
      .slice(0, SD_KAL_MAKS),
    k2: String(b.k2 || '')
      .trim()
      .slice(0, SD_KAL_MAKS)
  };
}
function sdTampil() {
  var t = store.get(K_SD_TAMPIL, {}) || {};
  return { analog: t.analog !== false, pita: t.pita !== false, mini: t.mini !== false };
}
/* Cek tumpang tindih & total; kembalikan pesan galat atau '' */
function sdCek(l) {
  var total = l.reduce(function (a, b) {
    return a + b.durasi;
  }, 0);
  if (total > SD_HARI) return 'Total waktu ' + sdDur(total) + ', melebihi 24 jam';
  for (var i = 0; i < l.length; i++)
    for (var j = i + 1; j < l.length; j++) {
      var a = l[i],
        b = l[j],
        sa = sdMenit(a.mulai),
        sb = sdMenit(b.mulai);
      if ((sb - sa + SD_HARI) % SD_HARI < a.durasi || (sa - sb + SD_HARI) % SD_HARI < b.durasi)
        return '"' + a.nama + '" dan "' + b.nama + '" bertabrakan';
    }
  return '';
}
function sdDaftar() {
  var d = store.get(K_SD_WAKTU, null);
  return (Array.isArray(d) && d.length ? d : SD_BAWAAN).map(sdSah).sort(function (a, b) {
    return sdMenit(a.mulai) - sdMenit(b.mulai);
  });
}
/* Apakah menit m (0..1439) berada di dalam blok b; kembalikan menit yang sudah lewat, atau -1 */
/* ---------- Jam analog 12 jam (klasik, angka 1–12, jarum detik berdetak, hari & tanggal) ---------- */
var SD_HARI3 = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  SD_BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function sdAnalogGambar() {
  var g =
    '<svg viewBox="0 0 200 200" class="sd-analog-svg" aria-hidden="true">' +
    '<defs><radialGradient id="sdMuka" cx="50%" cy="38%" r="70%"><stop offset="0" class="sd-muka-a"/><stop offset="1" class="sd-muka-b"/></radialGradient></defs>' +
    '<circle class="sd-bingkai" cx="100" cy="100" r="96"/><circle class="sd-muka" cx="100" cy="100" r="90" fill="url(#sdMuka)"/>';
  for (var i = 0; i < 60; i++) {
    var a = (i * 6 * Math.PI) / 180,
      besar = i % 5 === 0,
      r1 = besar ? 77 : 82,
      r2 = 86;
    g +=
      '<line class="sd-menit' +
      (besar ? ' besar' : '') +
      '" x1="' +
      (100 + r1 * Math.sin(a)).toFixed(2) +
      '" y1="' +
      (100 - r1 * Math.cos(a)).toFixed(2) +
      '" x2="' +
      (100 + r2 * Math.sin(a)).toFixed(2) +
      '" y2="' +
      (100 - r2 * Math.cos(a)).toFixed(2) +
      '"/>';
  }
  for (var n = 1; n <= 12; n++) {
    var b = (n * 30 * Math.PI) / 180;
    g +=
      '<text class="sd-analog-angka" x="' +
      (100 + 64 * Math.sin(b)).toFixed(2) +
      '" y="' +
      (100 - 64 * Math.cos(b) + 5.4).toFixed(2) +
      '">' +
      n +
      '</text>';
  }
  g +=
    '<g class="sd-tanggal"><rect x="70" y="124" width="60" height="18" rx="9"/><text id="sdTanggal" x="100" y="137"></text></g>' +
    '<g id="sdJJam" class="sd-j-jam"><line x1="100" y1="112" x2="100" y2="54"/></g>' +
    '<g id="sdJMenit" class="sd-j-menit"><line x1="100" y1="116" x2="100" y2="30"/></g>' +
    '<g id="sdJDetik" class="sd-j-detik"><line x1="100" y1="120" x2="100" y2="22"/><circle cx="100" cy="120" r="3.6"/></g>' +
    '<circle class="sd-poros" cx="100" cy="100" r="5"/><circle class="sd-poros-dalam" cx="100" cy="100" r="2"/></svg>';
  return g;
}
function renderSdAnalog() {
  var box = $('#sdAnalog');
  if (!box) return;
  if (!$('#sdJJam')) box.innerHTML = sdAnalogGambar();
  var k = new Date(),
    j = k.getHours(),
    m = k.getMinutes(),
    d = k.getSeconds();
  $('#sdJJam').setAttribute('transform', 'rotate(' + (((j % 12) + m / 60 + d / 3600) * 30).toFixed(3) + ' 100 100)');
  $('#sdJMenit').setAttribute('transform', 'rotate(' + ((m + d / 60) * 6).toFixed(3) + ' 100 100)');
  $('#sdJDetik').setAttribute('transform', 'rotate(' + d * 6 + ' 100 100)'); /* berdetak per detik */
  var t = SD_HARI3[k.getDay()] + ', ' + k.getDate() + ' ' + SD_BLN3[k.getMonth()],
    el = $('#sdTanggal');
  if (el.textContent !== t) el.textContent = t;
  box.setAttribute('aria-label', 'Jam analog ' + sdHHMM(j * 60 + m) + ', ' + t);
}

/* ---------- Kotak buku hitung mundur: 1 per blok waktu (5.24.0) ----------
   Blok berjalan → hitung mundur ke jam selesai; belum berjalan → hitung mundur ke jam mulai. Bar = progres blok. */
var SD_KALIMAT = {
  makan: ['Kerja keras hari ini ⏳ sisa waktunya jangan sampai terbuang', 'Bersiap, waktu cari nafkah segera dimulai 💪'],
  modal: ['Setiap menit di sini adalah modal impianmu 🚀 manfaatkan', 'Sebentar lagi waktunya membangun bisnismu 🚀'],
  istirahat: ['Istirahat yang cukup 🌙 besok kamu lebih kuat', 'Selesaikan harimu dengan baik, waktunya istirahat segera tiba 🌙']
};
function sdKalimat(b, jalan) {
  var sendiri = jalan ? b.k1 : b.k2;
  if (sendiri) return sendiri; /* kalimat buatan sendiri (halaman edit) didahulukan */
  var k = SD_KALIMAT[b.id];
  if (k) return k[jalan ? 0 : 1];
  return jalan ? 'Fokus! Sisa waktu ' + b.nama + ' ⏳ jangan sampai terbuang' : 'Bersiap, ' + b.nama + ' segera dimulai ✨';
}
/* Tata letak (5.26.0): pita hari 24 jam → 1 buku besar (blok yang berjalan; bila tidak ada, blok terdekat) → buku mini (blok lain, 2 kolom) */
var sdBukuSidik = '';
var SD_IKON_BULAN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
var SD_IKON_MATAHARI =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
function sdDua(n) {
  return (n < 10 ? '0' : '') + n;
}
function sdBagianHari(j) {
  return j >= 4 && j < 11 ? 'pagi' : j >= 11 && j < 15 ? 'siang' : j >= 15 && j < 18 ? 'sore' : 'malam';
}
/* Status tiap blok pada detik ke-dt hari ini */
function sdStatus(b, dt) {
  var s = sdMenit(b.mulai) * 60,
    d = b.durasi * 60,
    lewat = (dt - s + 86400) % 86400,
    jalan = lewat < d;
  return { b: b, jalan: jalan, sisa: jalan ? d - lewat : (s - dt + 86400) % 86400, pr: jalan ? (lewat / d) * 100 : 0 };
}
function sdHtmlSeg(l) {
  var seg = '';
  l.forEach(function (b) {
    var s = sdMenit(b.mulai),
      e = s + b.durasi,
      bag =
        e > SD_HARI
          ? [
              [s, SD_HARI],
              [0, e - SD_HARI]
            ]
          : [[s, e]];
    bag.forEach(function (x) {
      seg +=
        '<i class="sd-pita-seg" style="left:' +
        ((x[0] / SD_HARI) * 100).toFixed(3) +
        '%;width:' +
        (((x[1] - x[0]) / SD_HARI) * 100).toFixed(3) +
        '%;background:' +
        b.warna +
        '"></i>';
    });
  });
  return seg;
}
function sdHtmlPita(l) {
  var seg = sdHtmlSeg(l);
  return (
    '<section class="sd-hari"><div class="sd-hari-atas"><b>Pita hari ini</b><span id="sdHariJam"></span></div>' +
    '<div class="sd-hari-pita"><div class="sd-hari-jalur">' +
    seg +
    '</div><div class="sd-hari-penanda" id="sdPenanda"><span id="sdPenandaIkon"></span><i></i></div></div>' +
    '<div class="sd-hari-skala"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>' +
    '<div class="sd-hari-legenda">' +
    l
      .map(function (b) {
        return '<span style="--w:' + b.warna + '"><i></i><em translate="no">' + esc(b.nama) + '</em></span>';
      })
      .join('') +
    '</div></section>'
  );
}
function sdHtmlMini(b) {
  var s = sdMenit(b.mulai);
  return (
    '<article class="sd-mini" data-sd-buku="' +
    esc(b.id) +
    '" style="--w:' +
    b.warna +
    '">' +
    '<header><i></i><span translate="no">' +
    esc(b.nama) +
    '</span></header>' +
    '<div class="sd-mini-buku"><div><b data-k="j">00</b><small>jam</small></div><div><b data-k="m">00</b><small>menit</small></div></div>' +
    '<small class="sd-mini-ket"><span>Mulai dalam</span><span>' +
    sdHHMM(s) +
    '–' +
    sdHHMM(s + b.durasi) +
    '</span></small>' +
    '<div class="sd-mini-bar"><i></i></div></article>'
  );
}
function sdHtmlBuku(b) {
  return (
    '<article class="sd-buku" data-sd-buku="' +
    esc(b.id) +
    '" style="--w:' +
    b.warna +
    '">' +
    '<header class="sd-buku-kepala"><i></i><span translate="no">' +
    esc(b.nama) +
    '</span><em class="sd-buku-status"></em></header>' +
    '<div class="sd-buku-buka">' +
    '<div class="sd-hal kiri"><small class="sd-hal-label">JAM</small><b class="sd-hal-angka" data-k="j">00</b><span class="sd-hal-hias">✦</span>' +
    '<small class="sd-hal-ket">▶ Mulai</small><b class="sd-hal-waktu">' +
    b.mulai +
    '</b></div>' +
    '<div class="sd-hal kanan"><small class="sd-hal-label">MENIT</small><b class="sd-hal-angka" data-k="m">00</b><span class="sd-hal-hias">✦</span>' +
    '<small class="sd-hal-ket">🏁 Selesai</small><b class="sd-hal-waktu">' +
    sdHHMM(sdMenit(b.mulai) + b.durasi) +
    '</b></div>' +
    '<div class="sd-pita"><b data-k="d">00</b><small>dtk</small></div>' +
    '</div>' +
    '<p class="sd-buku-kalimat"></p>' +
    '<div class="sd-buku-bar"><i></i></div><small class="sd-buku-persen"></small>' +
    '</article>'
  );
}
function sdTulis(el, sel, t) {
  var x = el.querySelector(sel);
  if (x && x.textContent !== t) x.textContent = t;
}
function renderSdBuku() {
  var box = $('#sdBuku');
  if (!box) return;
  var l = sdDaftar(),
    k = new Date(),
    dt = k.getHours() * 3600 + k.getMinutes() * 60 + k.getSeconds();
  var st = l.map(function (b) {
    return sdStatus(b, dt);
  });
  var utama =
    st.filter(function (x) {
      return x.jalan;
    })[0] ||
    st.slice().sort(function (a, c) {
      return a.sisa - c.sisa;
    })[0];
  var lain = st
    .filter(function (x) {
      return x !== utama;
    })
    .sort(function (a, c) {
      return a.sisa - c.sisa;
    });
  var tp = sdTampil(),
    sid =
      JSON.stringify(l) +
      JSON.stringify(tp) +
      '|' +
      (utama ? utama.b.id : '') +
      '|' +
      lain
        .map(function (x) {
          return x.b.id;
        })
        .join(',');
  if (sdBukuSidik !== sid) {
    box.innerHTML =
      (tp.pita ? sdHtmlPita(l) : '') +
      (utama ? sdHtmlBuku(utama.b) : '') +
      (tp.mini && lain.length
        ? '<div class="sd-mini-grid">' +
          lain
            .map(function (x) {
              return sdHtmlMini(x.b);
            })
            .join('') +
          '</div>'
        : '');
    var an = $('#sdAnalog');
    if (an) an.hidden = !tp.analog;
    sdBukuSidik = sid;
  }
  /* Pita hari: penanda sekarang (bulan saat malam, matahari saat siang) */
  var pn = $('#sdPenanda');
  if (pn) pn.style.left = ((dt / 86400) * 100).toFixed(3) + '%';
  var siang = k.getHours() >= 6 && k.getHours() < 18,
    ik = $('#sdPenandaIkon');
  if (ik && ik.dataset.siang !== String(siang)) {
    ik.innerHTML = siang ? SD_IKON_MATAHARI : SD_IKON_BULAN;
    ik.dataset.siang = String(siang);
    ik.className = siang ? 'siang' : 'malam';
  }
  var hj = $('#sdHariJam'),
    tj = sdHHMM(k.getHours() * 60 + k.getMinutes()) + ' · ' + sdBagianHari(k.getHours());
  if (hj && hj.textContent !== tj) hj.textContent = tj;
  st.forEach(function (x) {
    var el = box.querySelector('[data-sd-buku="' + x.b.id + '"]');
    if (!el) return;
    var j = Math.floor(x.sisa / 3600),
      m = Math.floor((x.sisa % 3600) / 60);
    sdTulis(el, '[data-k="j"]', sdDua(j));
    sdTulis(el, '[data-k="m"]', sdDua(m));
    sdTulis(el, '[data-k="d"]', sdDua(x.sisa % 60));
    el.classList.toggle('jalan', x.jalan);
    if (el.classList.contains('sd-buku')) {
      sdTulis(el, '.sd-buku-status', x.jalan ? 'Sedang berjalan · sisa' : 'Dimulai dalam');
      sdTulis(el, '.sd-buku-kalimat', sdKalimat(x.b, x.jalan));
      el.querySelector('.sd-buku-bar i').style.width = x.pr.toFixed(2) + '%';
      sdTulis(el, '.sd-buku-persen', x.jalan ? Math.floor(x.pr) + '% berjalan' : 'Belum dimulai');
    }
  });
}

$('#sdEdit').addEventListener('click', function () {
  openLayer('page:sumberdaya-edit');
});
/* Ikon ? di samping judul → halaman keterangan sendiri (isi diatur nanti lewat pensil; disimpan di 'stivora.sumberdaya.info') */
var K_SD_INFO = 'stivora.sumberdaya.info';
$('#sdTanya').addEventListener('click', function () {
  openLayer('page:sumberdaya-info');
});
PAGES['sumberdaya-info'] = function () {
  var teks = String(store.get(K_SD_INFO, '') || '').trim();
  $('#subTitle').textContent = 'Sumberdaya waktu';
  $('#subBody').innerHTML =
    '<section class="ie-bagian sd-info-hal">' +
    (teks
      ? '<p translate="no">' + esc(teks) + '</p>'
      : '<p class="pe-kosong">Belum ada keterangan. Nanti bisa diisi lewat ikon pensil.</p>') +
    '</section>';
  return true;
};
renderSdAnalog();
renderSdBuku();
/* Jarum bergerak tiap detik hanya saat tab Sumberdaya tampil & halaman terlihat (hemat baterai) */
setInterval(function () {
  var p = $('#itIsi-sumberdaya');
  if (p && !p.hidden && !document.hidden) {
    renderSdAnalog();
    renderSdBuku();
  }
}, 1000);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) {
    renderSdAnalog();
    renderSdBuku();
  }
});
$('#impianTab').addEventListener('click', function (e) {
  if (e.target.closest('[data-it="sumberdaya"]')) {
    renderSdAnalog();
    renderSdBuku();
  }
});

/* ---------- Halaman edit sumberdaya waktu (ikon pensil) ----------
   Semua perubahan dikerjakan pada draf; baru tersimpan saat "Simpan". Batal dengan perubahan = konfirmasi buang. */
var seDraf = null,
  seBuka = -1,
  seKotor = false;
var SE_IKON = {
  mata: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  tanya:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17h.01"/></svg>',
  jam: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  tata: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 9.5h17M9.5 9.5v11"/></svg>',
  bawah: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  hapus: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
};
PAGES['sumberdaya-edit'] = function () {
  var tp = sdTampil();
  seDraf = {
    blok: sdDaftar().map(function (b) {
      return Object.assign({}, b);
    }),
    info: String(store.get(K_SD_INFO, '') || ''),
    tampil: tp
  };
  seBuka = -1;
  seKotor = false;
  $('#subTitle').textContent = 'Edit sumberdaya waktu';
  $('#subBody').innerHTML =
    '<div class="se">' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    SE_IKON.mata +
    'Pratinjau</h3>' +
    '<div class="sd-hari-jalur" id="sePita"></div><div class="sd-hari-skala"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>' +
    '<p class="se-total" id="seTotal"></p></section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul"><label for="seInfo">' +
    SE_IKON.tanya +
    'Keterangan</label></h3>' +
    '<textarea class="input se-info" id="seInfo" rows="3" maxlength="' +
    SD_INFO_MAKS +
    '" placeholder="mis. Waktu adalah sumberdaya utama untuk meraih impian"></textarea>' +
    '<small class="ie-bantu">Tampil saat ikon ? diketuk.</small></section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    SE_IKON.jam +
    'Blok waktu</h3>' +
    '<div class="se-blok" id="seBlok"></div>' +
    '<div class="se-blok-aksi"><button type="button" class="ie-poin-tambah" data-se="tambah">' +
    SE_IKON.plus +
    'Tambah blok</button>' +
    '<button type="button" class="se-reset" data-se="reset">Kembalikan ke bawaan</button></div></section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    SE_IKON.tata +
    'Tampilan</h3>' +
    [
      ['analog', 'Jam analog'],
      ['pita', 'Pita hari ini'],
      ['mini', 'Buku mini']
    ]
      .map(function (x) {
        return (
          '<label class="se-saklar"><span>' +
          x[1] +
          '</span><input type="checkbox" data-se-tampil="' +
          x[0] +
          '"' +
          (tp[x[0]] ? ' checked' : '') +
          '><i aria-hidden="true"></i></label>'
        );
      })
      .join('') +
    '</section>' +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-se="batal">Batal</button><button type="button" class="btn primary" data-se="simpan">Simpan</button></div>' +
    '</div>';
  $('#seInfo').value = seDraf.info;
  seRender();
  return true;
};
function seUrut() {
  /* urutkan draf menurut jam mulai, pertahankan blok yang sedang terbuka */
  var id = seBuka >= 0 && seDraf.blok[seBuka] ? seDraf.blok[seBuka].id : null;
  seDraf.blok.sort(function (a, b) {
    return sdMenit(a.mulai) - sdMenit(b.mulai);
  });
  seBuka = id
    ? seDraf.blok
        .map(function (b) {
          return b.id;
        })
        .indexOf(id)
    : -1;
}
function sePratinjau() {
  var l = seDraf.blok,
    total = l.reduce(function (a, b) {
      return a + b.durasi;
    }, 0),
    g = sdCek(l),
    t = $('#seTotal');
  $('#sePita').innerHTML = sdHtmlSeg(l);
  t.textContent = g || 'Terpakai ' + sdDur(total) + ' dari 24j' + (total < SD_HARI ? ' · bebas ' + sdDur(SD_HARI - total) : '');
  t.classList.toggle('galat', !!g);
  $$('#seBlok .se-baris').forEach(function (r, i) {
    var b = l[i];
    if (!b) return;
    var s = sdMenit(b.mulai);
    r.querySelector('.se-ringkas-waktu').textContent = sdHHMM(s) + '–' + sdHHMM(s + b.durasi) + ' · ' + sdDur(b.durasi);
    r.querySelector('.se-ringkas-nama').textContent = b.nama || 'Blok';
    r.style.setProperty('--w', b.warna);
  });
}
function seRender() {
  var box = $('#seBlok');
  if (!box) return;
  box.innerHTML =
    seDraf.blok
      .map(function (b, i) {
        var buka = i === seBuka,
          j = Math.floor(b.durasi / 60),
          n = b.durasi % 60;
        return (
          '<article class="se-baris' +
          (buka ? ' buka' : '') +
          '" data-i="' +
          i +
          '" style="--w:' +
          b.warna +
          '">' +
          '<button type="button" class="se-ringkas" data-se-buka="' +
          i +
          '" aria-expanded="' +
          buka +
          '"><i class="se-titik"></i><span class="se-ringkas-nama" translate="no"></span>' +
          '<small class="se-ringkas-waktu"></small><span class="se-panah">' +
          SE_IKON.bawah +
          '</span></button>' +
          (buka
            ? '<div class="se-isi">' +
              '<div class="field"><label>Nama</label><input class="input" data-se-f="nama" maxlength="' +
              SD_NAMA_MAKS +
              '" placeholder="Nama blok"></div>' +
              '<div class="field"><label>Warna</label><div class="se-warna">' +
              SD_WARNA.map(function (w) {
                return (
                  '<button type="button" class="' +
                  (w === b.warna ? 'dipilih' : '') +
                  '" data-se-warna="' +
                  w +
                  '" style="background:' +
                  w +
                  '" aria-label="Warna ' +
                  w +
                  '"></button>'
                );
              }).join('') +
              '<label class="se-warna-bebas" style="--w:' +
              b.warna +
              '" aria-label="Warna lain"><input type="color" data-se-f="warna" value="' +
              b.warna +
              '"></label></div></div>' +
              '<div class="se-waktu">' +
              '<div class="pe-w"><small>Mulai</small><input class="input" type="time" data-se-f="mulai" value="' +
              b.mulai +
              '"></div>' +
              '<div class="pe-w"><small>Durasi (jam)</small><input class="input" type="number" inputmode="numeric" min="0" max="24" step="1" data-se-f="jam" value="' +
              j +
              '"></div>' +
              '<div class="pe-w"><small>Menit</small><select class="input" data-se-f="menit">' +
              [0, 15, 30, 45]
                .map(function (x) {
                  return '<option value="' + x + '"' + (x === n ? ' selected' : '') + '>' + x + '</option>';
                })
                .join('') +
              '</select></div>' +
              '</div>' +
              '<div class="field"><label>Kalimat saat berjalan</label><input class="input" data-se-f="k1" maxlength="' +
              SD_KAL_MAKS +
              '" placeholder="' +
              esc(sdKalimat(Object.assign({}, b, { k1: '' }), true)) +
              '"></div>' +
              '<div class="field"><label>Kalimat saat menunggu</label><input class="input" data-se-f="k2" maxlength="' +
              SD_KAL_MAKS +
              '" placeholder="' +
              esc(sdKalimat(Object.assign({}, b, { k2: '' }), false)) +
              '"></div>' +
              '<small class="ie-bantu">Kosongkan kalimat untuk memakai kalimat bawaan.</small>' +
              '<button type="button" class="se-hapus" data-se="hapus">' +
              SE_IKON.hapus +
              'Hapus blok</button>' +
              '</div>'
            : '') +
          '</article>'
        );
      })
      .join('') || '<p class="pe-kosong">Belum ada blok. Ketuk "Tambah blok".</p>';
  var isi = $('#seBlok .se-baris.buka');
  if (isi) {
    var b = seDraf.blok[seBuka];
    isi.querySelector('[data-se-f="nama"]').value = b.nama;
    isi.querySelector('[data-se-f="k1"]').value = b.k1 || '';
    isi.querySelector('[data-se-f="k2"]').value = b.k2 || '';
  }
  sePratinjau();
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'sumberdaya-edit' || !seDraf) return;
  var bk = e.target.closest('[data-se-buka]');
  if (bk) {
    var i = +bk.dataset.seBuka;
    seBuka = seBuka === i ? -1 : i;
    seRender();
    var r = $('#seBlok .se-baris.buka');
    if (r) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }
  var w = e.target.closest('[data-se-warna]');
  if (w) {
    seDraf.blok[seBuka].warna = w.dataset.seWarna;
    seKotor = true;
    seRender();
    return;
  }
  var b = e.target.closest('[data-se]');
  if (!b) return;
  var a = b.dataset.se;
  if (a === 'tambah') {
    if (seDraf.blok.length >= SD_MAKS) {
      toast('Maksimal ' + SD_MAKS + ' blok');
      return;
    }
    /* Blok baru diletakkan di waktu bebas pertama (maks 1 jam); bila tidak ada waktu bebas, beri tahu */
    var isi = new Array(SD_HARI).fill(false);
    seDraf.blok.forEach(function (x) {
      for (var q = 0; q < x.durasi; q++) isi[(sdMenit(x.mulai) + q) % SD_HARI] = true;
    });
    var mulai = -1,
      pjg = 0;
    for (var m0 = 0; m0 < SD_HARI && mulai < 0; m0++)
      if (!isi[m0] && (m0 === 0 ? isi[SD_HARI - 1] || seDraf.blok.length === 0 : isi[m0 - 1])) {
        var n0 = 0;
        while (n0 < SD_HARI && !isi[(m0 + n0) % SD_HARI]) n0++;
        if (n0 >= 15) {
          mulai = m0;
          pjg = n0;
        }
      }
    if (mulai < 0) {
      toast('Tidak ada waktu bebas. Kurangi durasi blok lain dulu');
      return;
    }
    seDraf.blok.push(
      sdSah({
        id: uid(),
        nama: 'Blok baru',
        warna: SD_WARNA[seDraf.blok.length % SD_WARNA.length],
        mulai: sdHHMM(mulai),
        durasi: Math.min(60, pjg - (pjg % 15) || 15)
      })
    );
    seBuka = seDraf.blok.length - 1;
    seUrut();
    seKotor = true;
    seRender();
    var r2 = $('#seBlok .se-baris.buka [data-se-f="nama"]');
    if (r2) {
      r2.focus();
      r2.select();
    }
  } else if (a === 'hapus') {
    var nm = seDraf.blok[seBuka].nama,
      idx = seBuka;
    askConfirm({
      title: 'Hapus blok?',
      text: '"' + nm + '" dihapus dari pembagian waktu (berlaku setelah Simpan).',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          seDraf.blok.splice(idx, 1);
          seBuka = -1;
          seKotor = true;
          seRender();
        });
      }
    });
  } else if (a === 'reset') {
    askConfirm({
      title: 'Kembalikan ke bawaan?',
      text: 'Blok waktu kembali ke 3 blok: kerja cari makan, kerja cari modal bisnis, istirahat (masing-masing 8 jam). Kalimat buatan sendiri ikut terhapus.',
      ok: 'Kembalikan',
      tone: 'primary',
      action: function () {
        back(1, function () {
          seDraf.blok = SD_BAWAAN.map(sdSah);
          seBuka = -1;
          seKotor = true;
          seRender();
        });
      }
    });
  } else if (a === 'batal') {
    if (!seKotor) {
      back(1);
      return;
    }
    askConfirm({
      title: 'Buang perubahan?',
      text: 'Perubahan yang belum disimpan akan hilang.',
      ok: 'Buang',
      action: function () {
        back(2);
      }
    });
  } else if (a === 'simpan') {
    var v = seDraf.blok.map(sdSah);
    if (!v.length) {
      toast('Minimal 1 blok');
      return;
    }
    var g = sdCek(v);
    if (g) {
      toast(g);
      return;
    }
    store.set(K_SD_WAKTU, v);
    var info = $('#seInfo').value.trim().slice(0, SD_INFO_MAKS);
    store.set(K_SD_INFO, info);
    store.set(K_SD_TAMPIL, seDraf.tampil);
    seKotor = false;
    sdBukuSidik = '';
    back(1, function () {
      renderSdAnalog();
      renderSdBuku();
      toast('Sumberdaya waktu disimpan');
    });
  }
});
function seUbah(e) {
  if (pageKind !== 'sumberdaya-edit' || !seDraf) return;
  var t = e.target;
  if (t.id === 'seInfo') {
    seKotor = true;
    return;
  }
  if (t.dataset.seTampil) {
    seDraf.tampil[t.dataset.seTampil] = t.checked;
    seKotor = true;
    return;
  }
  var f = t.dataset.seF;
  if (!f || seBuka < 0) return;
  var b = seDraf.blok[seBuka];
  seKotor = true;
  if (f === 'nama') b.nama = t.value.slice(0, SD_NAMA_MAKS);
  else if (f === 'k1' || f === 'k2') b[f] = t.value.slice(0, SD_KAL_MAKS);
  else if (f === 'warna') {
    b.warna = sdWarnaSah(t.value);
    if (e.type === 'change') seRender();
    else sePratinjau();
    return;
  } else if (f === 'jam' || f === 'menit') {
    var r = t.closest('.se-isi'),
      j = Math.max(0, Math.min(24, parseInt(r.querySelector('[data-se-f="jam"]').value, 10) || 0)),
      m = +r.querySelector('[data-se-f="menit"]').value || 0;
    b.durasi = Math.max(15, Math.min(SD_HARI, j * 60 + m));
  } else if (f === 'mulai') {
    if (!/^\d{2}:\d{2}$/.test(t.value)) return;
    b.mulai = t.value;
    if (e.type === 'change') {
      seUrut();
      seRender();
      return;
    }
  }
  sePratinjau();
}
$('#subBody').addEventListener('input', seUbah);
$('#subBody').addEventListener('change', seUbah);
