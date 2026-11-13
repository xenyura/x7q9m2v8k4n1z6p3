/* ============================================================
   Stivora — Impian · tab Progress: peta jalan bertahap (5.28.0)
   Fase demi fase menuju Hari H. Data diisi lewat ikon pensil
   (halaman edit menyusul). Kunci: stivora.impian.progress
   { mulai:'YYYY-MM-DD', hariH:'YYYY-MM-DD',
     fase:[{ id, nama, ket, dari, sampai,
             langkah:[{ id, teks, selesai, tgl }], tglSelesai }] }
   dari/sampai = tahun ke-berapa dihitung dari tanggal mulai.
   ============================================================ */
var K_PG = 'stivora.impian.progress';
var PG_BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var pgBuka = {};

function pgData() {
  var d = store.get(K_PG, null);
  if (!d || typeof d !== 'object') return null;
  var fase = Array.isArray(d.fase)
    ? d.fase.filter(function (f) {
        return f && typeof f === 'object';
      })
    : [];
  fase = fase.map(function (f, i) {
    return {
      id: f.id || 'f' + i,
      nama: String(f.nama || ''),
      ket: String(f.ket || ''),
      dari: Math.max(1, parseInt(f.dari, 10) || 1),
      sampai: Math.max(1, parseInt(f.sampai, 10) || parseInt(f.dari, 10) || 1),
      langkah: (Array.isArray(f.langkah) ? f.langkah : [])
        .filter(function (l) {
          return l && String(l.teks || '').trim();
        })
        .map(function (l, j) {
          return { id: l.id || 'l' + j, teks: String(l.teks), selesai: !!l.selesai, tgl: l.tgl || '' };
        }),
      tglSelesai: f.tglSelesai || ''
    };
  });
  return { mulai: pgTglSah(d.mulai) ? d.mulai : '', hariH: imHariH(), fase: fase }; /* Hari H milik Impian utama (5.30.0) */
}
function pgTglSah(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(pgTgl(s));
}
function pgTgl(s) {
  var p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
}
function pgTambahThn(s, n) {
  var p = s.split('-');
  return new Date(+p[0] + n, +p[1] - 1, +p[2]).getTime();
}
function pgFmt(s) {
  if (!pgTglSah(s)) return '';
  var p = s.split('-');
  return +p[2] + ' ' + PG_BLN[+p[1] - 1] + ' ' + p[0];
}
function pgSelesai(f) {
  return (
    f.langkah.length > 0 &&
    f.langkah.every(function (l) {
      return l.selesai;
    })
  );
}
function pgJml(f) {
  return f.langkah.filter(function (l) {
    return l.selesai;
  }).length;
}

/* Hitung mundur ke Hari H: "6 thn 11 bln lagi" */
function pgMundur(hariH) {
  if (!pgTglSah(hariH)) return '';
  var now = new Date(),
    h = new Date(pgTgl(hariH)),
    t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (h.getTime() === t0.getTime()) return 'Hari ini!';
  if (h < t0) return 'Sudah lewat';
  var bln = (h.getFullYear() - t0.getFullYear()) * 12 + (h.getMonth() - t0.getMonth());
  if (h.getDate() < t0.getDate()) bln--;
  var thn = Math.floor(bln / 12),
    sisaBln = bln % 12;
  if (bln < 1) {
    var hr = Math.round((h - t0) / 864e5);
    return hr + ' hari lagi';
  }
  return (thn ? thn + ' thn ' : '') + (sisaBln ? sisaBln + ' bln ' : '') + 'lagi';
}

/* Posisi fase aktif terhadap jadwal tahunnya */
function pgJadwal(d, f) {
  if (!d.mulai) return null;
  var awal = pgTambahThn(d.mulai, f.dari - 1),
    akhir = pgTambahThn(d.mulai, f.sampai),
    now = Date.now();
  if (now < awal) return { k: 'cepat', t: 'Lebih awal' };
  if (now > akhir) return { k: 'lewat', t: 'Lewat jadwal' };
  var waktu = (now - awal) / Math.max(1, akhir - awal),
    lk = f.langkah.length ? pgJml(f) / f.langkah.length : 0;
  return lk + 0.1 < waktu ? { k: 'telat', t: 'Tertinggal' } : { k: 'pas', t: 'Sesuai jadwal' };
}

var PG_IK = {
  kunci:
    '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2"/></svg>',
  centang: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bendera: '<svg viewBox="0 0 24 24"><path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/></svg>',
  panah: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  lokasi:
    '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>'
};

/* ---------- Kartu "Kenapa aku yakin mampu" (5.31.0) ----------
   'stivora.impian.keyakinan' = { pernyataan, bukti: [], bekal: [], cara: [] } */
var K_KY = 'stivora.impian.keyakinan',
  KY_PERNYATAAN = 5000,
  KY_POIN = 300,
  KY_POIN_MAKS = 30;
var KY_PILAR = [
  {
    k: 'bukti',
    judul: 'Bukti',
    isian: 'mis. Pernah bangun Xenyura dari nol',
    ikon: '<svg viewBox="0 0 24 24"><path d="M4 21h16M6 21V10l6-5 6 5v11"/><path d="M10 21v-5h4v5"/></svg>'
  },
  {
    k: 'bekal',
    judul: 'Bekal',
    isian: 'mis. Bisa bikin aplikasi sendiri',
    ikon: '<svg viewBox="0 0 24 24"><path d="M9 6V5a3 3 0 0 1 6 0v1"/><path d="M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M5 12h14M10 12v2h4v-2"/></svg>'
  },
  {
    k: 'cara',
    judul: 'Cara berpikir',
    isian: 'mis. Gagal = data, bukan akhir',
    ikon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>'
  }
];
function kyPoin(a) {
  return (Array.isArray(a) ? a : [])
    .map(function (x) {
      return String(x || '')
        .trim()
        .slice(0, KY_POIN);
    })
    .filter(Boolean)
    .slice(0, KY_POIN_MAKS);
}
function kyData() {
  var d = store.get(K_KY, null);
  d = d && typeof d === 'object' ? d : {};
  var o = { pernyataan: String(d.pernyataan || '').slice(0, KY_PERNYATAAN) };
  KY_PILAR.forEach(function (p) {
    o[p.k] = kyPoin(d[p.k]);
  });
  return o;
}
/* Bukti otomatis dari data nyata: langkah selesai, fase tuntas, impian (hexagon) 100% */
function kyBuktiOtomatis() {
  var d = pgData(),
    lk = 0,
    fs = 0;
  if (d)
    d.fase.forEach(function (f) {
      lk += pgJml(f);
      if (pgSelesai(f)) fs++;
    });
  var im = typeof imCapaian === 'function' ? imCapaian().n : 0;
  return { lk: lk, fs: fs, im: im };
}
function renderKy() {
  var box = $('#kyIsi');
  if (!box) return;
  var k = kyData(),
    ada =
      k.pernyataan.trim() ||
      KY_PILAR.some(function (p) {
        return k[p.k].length;
      });
  if (!ada) {
    box.innerHTML =
      '<div class="ky-kosong"><b>Belum ada alasan keyakinan</b><p>Tulis kenapa kamu yakin mampu lewat ikon pensil: pernyataan, bukti, bekal, dan cara berpikirmu.</p></div>';
    return;
  }
  var b = kyBuktiOtomatis(),
    nol = !b.lk && !b.fs && !b.im;
  box.innerHTML =
    (k.pernyataan.trim() ? '<blockquote class="ky-pernyataan" translate="no">' + esc(k.pernyataan.trim()) + '</blockquote>' : '') +
    '<div class="ky-pilar-daftar">' +
    KY_PILAR.filter(function (p) {
      return k[p.k].length;
    })
      .map(function (p) {
        return (
          '<section class="ky-pilar ky-' +
          p.k +
          '"><h4>' +
          p.ikon +
          '<span>' +
          p.judul +
          '</span></h4><ul>' +
          k[p.k]
            .map(function (t) {
              return '<li translate="no">' + esc(t) + '</li>';
            })
            .join('') +
          '</ul></section>'
        );
      })
      .join('') +
    '</div>' +
    '<p class="ky-bukti"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/></svg>' +
    (nol
      ? '<span>Sejauh ini: belum ada langkah selesai. Bukti pertamamu menunggu.</span>'
      : '<span><span>Sejauh ini:</span> <b>' +
        b.lk +
        ' langkah selesai · ' +
        b.fs +
        ' fase tuntas · ' +
        b.im +
        ' impian tercapai</b></span>') +
    '</p>';
}

function renderPg() {
  renderKy();
  var box = $('#pgIsi');
  if (!box) return;
  var d = pgData();
  if (!d || (!d.fase.length && !d.hariH)) {
    box.innerHTML =
      '<div class="pg-kosong"><span class="pg-kosong-ik">' +
      PG_IK.bendera +
      '</span><b>Belum ada peta jalan</b>' +
      '<p>Ketuk ikon pensil di kartu atas untuk menyusun fase menuju Hari H.</p></div>';
    return;
  }
  var aktif = -1;
  d.fase.some(function (f, i) {
    if (!pgSelesai(f)) {
      aktif = i;
      return true;
    }
    return false;
  });
  var tot = 0,
    sel = 0;
  d.fase.forEach(function (f) {
    tot += f.langkah.length;
    sel += pgJml(f);
  });
  var pct = tot ? Math.round((sel / tot) * 100) : 0;
  var h =
    '<div class="pg-total"><div class="pg-total-atas"><span>Total</span><b>' +
    sel +
    ' dari ' +
    tot +
    ' langkah · ' +
    pct +
    '%</b></div>' +
    '<div class="pg-bar"><i style="width:' +
    pct +
    '%"></i></div></div><ol class="pg-jalur">';
  d.fase.forEach(function (f, i) {
    var st = pgSelesai(f) ? 'selesai' : i === aktif ? 'aktif' : 'kunci',
      n = pgJml(f),
      m = f.langkah.length,
      p = m ? Math.round((n / m) * 100) : 0,
      buka = !!pgBuka[f.id],
      thn = 'Tahun ' + (f.dari === f.sampai ? f.dari : f.dari + '–' + f.sampai),
      sub;
    if (st === 'selesai') sub = f.tglSelesai ? 'Selesai ' + pgFmt(f.tglSelesai) : 'Selesai';
    else if (st === 'kunci') sub = 'terbuka setelah Fase ' + i + ' selesai';
    else sub = f.ket;
    var simpul = st === 'selesai' ? PG_IK.centang : st === 'kunci' ? PG_IK.kunci : PG_IK.lokasi;
    var label =
      st === 'aktif' ? '<span class="pg-label">Kamu di sini</span>' : st === 'selesai' ? '<span class="pg-label ok">Selesai</span>' : '';
    var jd = st === 'aktif' ? pgJadwal(d, f) : null,
      berikut = null;
    if (st === 'aktif')
      f.langkah.some(function (l) {
        if (!l.selesai) {
          berikut = l;
          return true;
        }
        return false;
      });
    h +=
      '<li class="pg-fase ' +
      st +
      '"><span class="pg-simpul">' +
      simpul +
      '</span>' +
      '<div class="pg-kartu' +
      (buka ? ' buka' : '') +
      '" role="button" tabindex="0" aria-expanded="' +
      buka +
      '" data-pg-fase="' +
      esc(f.id) +
      '">' +
      '<div class="pg-k-atas"><h4><span>Fase ' +
      (i + 1) +
      '</span> · <span translate="no">' +
      esc(f.nama || '—') +
      '</span></h4>' +
      label +
      '</div>' +
      '<p class="pg-sub"><span>' +
      thn +
      '</span>' +
      (sub ? ' · <span' + (st === 'aktif' ? ' translate="no"' : '') + '>' + esc(sub) + '</span>' : '') +
      '</p>' +
      '<div class="pg-bar"><i style="width:' +
      p +
      '%"></i></div>' +
      '<div class="pg-k-bawah"><div class="pg-k-info"><span>' +
      n +
      ' dari ' +
      m +
      ' langkah</span>' +
      (jd ? '<span class="pg-chip ' + jd.k + '">' + jd.t + '</span>' : '') +
      '</div>' +
      '<span class="pg-panah" aria-hidden="true">' +
      PG_IK.panah +
      '</span></div>' +
      (berikut ? '<p class="pg-berikut"><span>Berikutnya:</span> <b translate="no">' + esc(berikut.teks) + '</b></p>' : '') +
      (buka
        ? '<ul class="pg-langkah">' +
          (m
            ? f.langkah
                .map(function (l) {
                  return (
                    '<li class="' +
                    (l.selesai ? 'ok' : '') +
                    '"><span class="pg-cek">' +
                    (l.selesai ? PG_IK.centang : '') +
                    '</span>' +
                    '<span class="pg-l-isi"><span class="pg-l-teks" translate="no">' +
                    esc(l.teks) +
                    '</span>' +
                    (l.selesai && l.tgl ? '<small>' + pgFmt(l.tgl) + '</small>' : '') +
                    '</span></li>'
                  );
                })
                .join('')
            : '<li class="pg-l-kosong">Belum ada langkah</li>') +
          '</ul>'
        : '') +
      '</div></li>';
  });
  var mundur = pgMundur(d.hariH);
  h +=
    '<li class="pg-fase hari-h"><span class="pg-simpul">' +
    PG_IK.bendera +
    '</span><div class="pg-h">' +
    '<b><span>Hari H</span>' +
    (d.hariH ? ' · ' + pgFmt(d.hariH) : '') +
    '</b>' +
    (mundur ? '<small>' + mundur + '</small>' : '<small>Tanggal belum diatur</small>') +
    '</div></li></ol>';
  box.innerHTML = h;
}

$('#pgEdit').addEventListener('click', function () {
  openLayer('page:progress-edit');
});
$('#pgIsi').addEventListener('click', function (e) {
  var k = e.target.closest('[data-pg-fase]');
  if (!k) return;
  var id = k.getAttribute('data-pg-fase');
  pgBuka[id] = !pgBuka[id];
  renderPg();
  var baru = $('#pgIsi [data-pg-fase="' + id + '"]');
  if (baru) baru.focus({ preventScroll: true });
});
$('#pgIsi').addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-pg-fase]')) {
    e.preventDefault();
    e.target.click();
  }
});
$('#impianTab').addEventListener('click', function (e) {
  if (e.target.closest('[data-it="progress"]')) renderPg();
});
/* 5.30.0: Hari H pindah ke Impian utama — salin Hari H lama dari peta jalan bila impian utama belum punya */
(function () {
  var lama = store.get(K_PG, null);
  if (lama && pgTglSah(lama.hariH) && !imHariH()) {
    var u = imUtama();
    u.hariH = lama.hariH;
    store.set(K_IM_UTAMA, u);
    renderImUtama();
  }
})();
renderPg();

/* ============================================================
   Halaman Edit peta jalan (5.29.0) — bekerja pada draf, tersimpan saat Simpan
   ============================================================ */
var PGE_FASE_MAKS = 100,
  PGE_LANGKAH_MAKS = 100,
  PGE_NAMA = 40,
  PGE_KET = 80,
  PGE_LANGKAH = 160,
  PGE_THN_MAKS = 60;
var PG_WARNA = ['#7c5cff', '#14b8a6', '#f97316', '#ec4899', '#3b82f6', '#eab308', '#22c55e', '#ef4444'];
var pgeDraf = null,
  pgeBuka = -1,
  pgeKotor = false,
  pgeTglBuka = '';
var PGE_IK = {
  tujuan: '<svg viewBox="0 0 24 24"><path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/></svg>',
  mata: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  fase: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M6 8.5v7M11 6h9M11 18h9"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  naik: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  turun: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  hapus: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  yakin: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><path d="M8.8 12l2.2 2.2 4.3-4.4"/></svg>',
  awas: '<svg viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>',
  kal: '<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>'
};
function pgeHariIni() {
  var d = new Date(),
    z = function (n) {
      return (n < 10 ? '0' : '') + n;
    };
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
function pgeRentang() {
  /* lama perjalanan dalam tahun (dibulatkan ke atas); 0 bila Hari H tidak setelah tanggal mulai */
  var d = pgeDraf;
  if (!pgTglSah(d.mulai) || !pgTglSah(d.hariH) || pgTgl(d.hariH) <= pgTgl(d.mulai)) return 0;
  var n = 0;
  while (n < 200 && pgTambahThn(d.mulai, n) < pgTgl(d.hariH)) n++;
  return Math.max(1, n);
}
function pgeWarna(i) {
  return PG_WARNA[i % PG_WARNA.length];
}
function pgePeringatan(i) {
  var f = pgeDraf.fase[i],
    n = pgeRentang(),
    w = [];
  if (n && f.sampai > n) w.push('Melewati Hari H (tahun ke-' + n + ')');
  pgeDraf.fase.forEach(function (g, j) {
    if (j !== i && f.dari <= g.sampai && g.dari <= f.sampai) w.push('Tahun bertabrakan dengan Fase ' + (j + 1));
  });
  if (
    !f.langkah.some(function (l) {
      return String(l.teks).trim();
    })
  )
    w.push('Belum ada langkah');
  return w;
}

PAGES['progress-edit'] = function () {
  var d = pgData(),
    kini = pgeHariIni();
  pgeDraf = d ? JSON.parse(JSON.stringify(d)) : { mulai: '', hariH: '', fase: [] };
  if (!pgTglSah(pgeDraf.mulai)) pgeDraf.mulai = kini;
  pgeDraf.hariH = imHariH(); /* hanya dibaca: diubah lewat Edit impian → Impian utama */
  pgeDraf.ky = kyData();
  pgeBuka = -1;
  pgeKotor = false;
  pgeTglBuka = '';
  $('#subTitle').textContent = 'Edit progress';
  $('#subBody').innerHTML =
    '<div class="se pge">' +
    '<section class="ie-bagian se-kartu ky-ed"><h3 class="se-judul">' +
    PGE_IK.yakin +
    'Kenapa aku yakin mampu</h3>' +
    '<div class="field"><label for="kyPernyataan">Pernyataan keyakinan</label><textarea class="input ky-ta" id="kyPernyataan" rows="2" maxlength="' +
    KY_PERNYATAAN +
    '" placeholder="mis. Aku pasti sampai, karena aku tidak berhenti sampai aku sampai."></textarea></div>' +
    KY_PILAR.map(function (p) {
      return (
        '<div class="field ky-ed-pilar ky-' +
        p.k +
        '"><label>' +
        p.ikon +
        p.judul +
        '</label><div class="ky-ed-daftar" data-ky-daftar="' +
        p.k +
        '"></div>' +
        '<button type="button" class="ie-poin-tambah" data-ky-tambah="' +
        p.k +
        '">' +
        PGE_IK.plus +
        'Tambah poin</button></div>'
      );
    }).join('') +
    '<small class="ie-bantu">Pilar yang kosong tidak ditampilkan. Baris "Sejauh ini" terisi otomatis dari langkah, fase, dan impian yang sudah selesai.</small>' +
    '</section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    PGE_IK.tujuan +
    'Tujuan</h3>' +
    '<div class="field"><label>Tanggal mulai</label>' +
    pgeTglHtml('mulai') +
    '<small class="ie-bantu">Patokan "Tahun 1" untuk tiap fase.</small></div>' +
    '<div class="field"><label>Hari H</label><div class="pge-h-kunci">' +
    PG_IK.kunci +
    '<b>' +
    (pgeDraf.hariH ? pgFmt(pgeDraf.hariH) : 'Belum diatur') +
    '</b><small>Ubah di Impian utama</small></div></div>' +
    '<p class="se-total" id="pgeRentang"></p></section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    PGE_IK.mata +
    'Pratinjau</h3><div id="pgePita"></div></section>' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    PGE_IK.fase +
    'Fase</h3><div class="se-blok" id="pgeFase"></div>' +
    '<div class="se-blok-aksi"><button type="button" class="ie-poin-tambah" data-pge="tambah-fase">' +
    PGE_IK.plus +
    'Tambah fase</button>' +
    '<button type="button" class="se-reset pge-reset" data-pge="hapus-semua">Hapus semua peta jalan</button></div></section>' +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-pge="batal">Batal</button><button type="button" class="btn primary" data-pge="simpan">Simpan</button></div>' +
    '</div>';
  pgeRender();
  kyEdIsi();
  return true;
};
function kyEdBaris(k, j, teks) {
  var p = KY_PILAR.filter(function (x) {
    return x.k === k;
  })[0];
  return (
    '<div class="ky-ed-baris"><b class="ie-poin-no">' +
    (j + 1) +
    '.</b><div class="ie-poin-isi"><textarea class="input ky-ta" rows="1" data-ky-poin="' +
    k +
    ':' +
    j +
    '" maxlength="' +
    KY_POIN +
    '" placeholder="' +
    esc(p.isian) +
    '">' +
    esc(teks) +
    '</textarea></div>' +
    '<button type="button" class="ie-poin-hapus" data-ky-hapus="' +
    k +
    ':' +
    j +
    '" aria-label="Hapus poin">' +
    PGE_IK.x +
    '</button></div>'
  );
}
function kyEdDaftar(k) {
  var b = $('#subBody [data-ky-daftar="' + k + '"]');
  if (!b) return;
  b.innerHTML = pgeDraf.ky[k]
    .map(function (t, j) {
      return kyEdBaris(k, j, t);
    })
    .join('');
  $$('#subBody [data-ky-daftar="' + k + '"] textarea').forEach(ieTinggi);
}
function kyEdIsi() {
  var t = $('#kyPernyataan');
  if (!t) return;
  t.value = pgeDraf.ky.pernyataan;
  ieTinggi(t);
  KY_PILAR.forEach(function (p) {
    kyEdDaftar(p.k);
  });
}

/* Pemilih tanggal: Tanggal · Bulan · Tahun (ketik atau −/+) — sama seperti Tambah peristiwa */
function pgeAmbilTgl(key) {
  if (key === 'mulai' || key === 'hariH') return pgeDraf[key];
  var p = key.split(':'),
    l = pgeDraf.fase[+p[1]] && pgeDraf.fase[+p[1]].langkah[+p[2]];
  return l && pgTglSah(l.tgl) ? l.tgl : pgeHariIni();
}
function pgeSetTgl(key, v) {
  if (key === 'mulai' || key === 'hariH') {
    pgeDraf[key] = v;
    return;
  }
  var p = key.split(':'),
    l = pgeDraf.fase[+p[1]] && pgeDraf.fase[+p[1]].langkah[+p[2]];
  if (l) l.tgl = v;
}
function pgeTglHtml(key) {
  var v = pgeAmbilTgl(key),
    y = +v.slice(0, 4),
    m = +v.slice(5, 7) - 1,
    dd = +v.slice(8, 10),
    maks = new Date(y, m + 1, 0).getDate(),
    opsi = '';
  for (var i = 1; i <= maks; i++) opsi += '<option value="' + i + '"' + (i === dd ? ' selected' : '') + '>' + i + '</option>';
  return (
    '<div class="pe-waktu pge-tgl" data-pge-tgl="' +
    key +
    '">' +
    '<div class="pe-w"><small>Tanggal</small><select class="input" data-pge-p="d" aria-label="Tanggal">' +
    opsi +
    '</select></div>' +
    '<div class="pe-w"><small>Bulan</small><select class="input" data-pge-p="m" aria-label="Bulan">' +
    KAL_BULAN.map(function (n, i) {
      return '<option value="' + i + '"' + (i === m ? ' selected' : '') + '>' + n + '</option>';
    }).join('') +
    '</select></div>' +
    '<div class="pe-w"><small>Tahun</small><div class="pe-thn-step">' +
    '<button type="button" class="pe-step" data-pge-thn="-1" aria-label="Tahun sebelumnya">' +
    PGE_IK.minus +
    '</button>' +
    '<input class="input" data-pge-p="y" type="text" inputmode="numeric" maxlength="4" aria-label="Tahun" value="' +
    y +
    '">' +
    '<button type="button" class="pe-step" data-pge-thn="1" aria-label="Tahun berikutnya">' +
    PGE_IK.plus +
    '</button>' +
    '</div></div></div>'
  );
}
function pgeBacaTgl(box) {
  /* ambil nilai dari pemilih; perbarui daftar tanggal bila jumlah hari berubah */
  var y = parseInt(box.querySelector('[data-pge-p="y"]').value, 10);
  if (!(y >= THN_MIN && y <= THN_MAKS)) return '';
  var m = +box.querySelector('[data-pge-p="m"]').value,
    sel = box.querySelector('[data-pge-p="d"]'),
    maks = new Date(y, m + 1, 0).getDate(),
    d = Math.min(+sel.value || 1, maks);
  if (sel.options.length !== maks) {
    var h = '';
    for (var i = 1; i <= maks; i++) h += '<option value="' + i + '">' + i + '</option>';
    sel.innerHTML = h;
  }
  sel.value = d;
  var z = function (n) {
    return (n < 10 ? '0' : '') + n;
  };
  return y + '-' + z(m + 1) + '-' + z(d);
}
function pgeTglBerubah(box) {
  var v = pgeBacaTgl(box);
  if (!v) return;
  var key = box.dataset.pgeTgl;
  pgeSetTgl(key, v);
  pgeKotor = true;
  if (key === 'mulai' || key === 'hariH') {
    pgeInfo();
    pgeRingkas();
  } else {
    var c = box.closest('.pge-l-isi');
    c = c && c.querySelector('.pge-chip-teks');
    if (c) c.textContent = pgFmt(v);
  }
}

function pgeInfo() {
  var n = pgeRentang(),
    t = $('#pgeRentang');
  if (!t) return;
  t.textContent = n
    ? 'Rentang ' + n + ' tahun · ' + pgMundur(pgeDraf.hariH)
    : pgeDraf.hariH
      ? 'Tanggal mulai harus sebelum Hari H'
      : 'Hari H belum diatur. Atur lewat pensil di samping profil tab Impian.';
  t.classList.toggle('galat', !n && !!pgeDraf.hariH);
  var box = $('#pgePita'),
    f = pgeDraf.fase,
    skala = Math.max(
      n || 1,
      f.reduce(function (a, x) {
        return Math.max(a, x.sampai);
      }, 1)
    );
  box.innerHTML =
    '<div class="pge-pita' +
    (f.length > 20 ? ' pge-pita-rapat' : '') +
    '" style="--n:' +
    skala +
    '"><div class="pge-pita-dalam">' +
    (f.length
      ? f
          .map(function (x, i) {
            return (
              '<div class="pge-jalur"><i style="left:' +
              ((x.dari - 1) / skala) * 100 +
              '%;width:' +
              ((x.sampai - x.dari + 1) / skala) * 100 +
              '%;background:' +
              pgeWarna(i) +
              '"></i></div>'
            );
          })
          .join('')
      : '<p class="pge-pita-kosong">Belum ada fase</p>') +
    (n ? '<span class="pge-garis-h" style="left:' + (n / skala) * 100 + '%"></span>' : '') +
    '</div></div>' +
    '<div class="pge-skala"><span>Thn 1</span>' +
    (skala > 2 ? '<span>Thn ' + Math.ceil((skala + 1) / 2) + '</span>' : '') +
    '<span>Thn ' +
    skala +
    '</span></div>' +
    (n ? '<p class="pge-pita-ket"><i aria-hidden="true"></i>Garis kuning = Hari H</p>' : '');
}
function pgeRingkas() {
  /* perbarui baris ringkas tiap fase tanpa membangun ulang isian */
  $$('#pgeFase .pge-fase').forEach(function (r, i) {
    var f = pgeDraf.fase[i];
    if (!f) return;
    var isi = f.langkah.filter(function (l) {
      return String(l.teks).trim();
    });
    r.querySelector('.pge-r-nama').textContent = 'Fase ' + (i + 1) + ' · ' + (f.nama.trim() || 'Tanpa nama');
    r.querySelector('.pge-r-jml').textContent =
      isi.filter(function (l) {
        return l.selesai;
      }).length +
      '/' +
      isi.length;
    var w = pgePeringatan(i);
    r.querySelector('.pge-awas').innerHTML = w
      .map(function (x) {
        return '<span>' + PGE_IK.awas + '<b>' + esc(x) + '</b></span>';
      })
      .join('');
    r.querySelector('.pge-awas').hidden = !w.length;
    var lb = r.querySelector('.pge-l-judul');
    if (lb)
      lb.textContent =
        'Langkah · ' +
        isi.filter(function (l) {
          return l.selesai;
        }).length +
        ' dari ' +
        isi.length +
        ' selesai';
  });
}
function pgeRender() {
  var box = $('#pgeFase');
  if (!box) return;
  box.innerHTML =
    pgeDraf.fase
      .map(function (f, i) {
        var buka = i === pgeBuka;
        return (
          '<article class="se-baris pge-fase' +
          (buka ? ' buka' : '') +
          '" style="--w:' +
          pgeWarna(i) +
          '">' +
          '<button type="button" class="se-ringkas pge-ringkas" data-pge-buka="' +
          i +
          '" aria-expanded="' +
          buka +
          '"><i class="se-titik"></i>' +
          '<span class="se-ringkas-nama pge-r-nama" translate="no"></span><small class="se-ringkas-waktu pge-r-jml"></small><span class="se-panah">' +
          SE_IKON.bawah +
          '</span></button>' +
          '<div class="pge-awas" hidden></div>' +
          (buka
            ? '<div class="se-isi">' +
              '<div class="field"><label>Nama fase</label><input class="input" data-pge-f="nama" maxlength="' +
              PGE_NAMA +
              '" placeholder="mis. Developer aplikasi" value="' +
              esc(f.nama) +
              '"></div>' +
              '<div class="field"><label>Keterangan singkat</label><input class="input" data-pge-f="ket" maxlength="' +
              PGE_KET +
              '" placeholder="mis. bikin dan rilis di Play Store" value="' +
              esc(f.ket) +
              '"></div>' +
              '<div class="field"><label>Tahun ke-</label><div class="pge-thn">' +
              '<span class="pge-thn-grup"><small>Dari</small><button type="button" class="pe-step" data-pge-th="dari-1" aria-label="Kurangi tahun awal">' +
              PGE_IK.minus +
              '</button><b>' +
              f.dari +
              '</b><button type="button" class="pe-step" data-pge-th="dari1" aria-label="Tambah tahun awal">' +
              PGE_IK.plus +
              '</button></span>' +
              '<span class="pge-thn-grup"><small>Sampai</small><button type="button" class="pe-step" data-pge-th="sampai-1" aria-label="Kurangi tahun akhir">' +
              PGE_IK.minus +
              '</button><b>' +
              f.sampai +
              '</b><button type="button" class="pe-step" data-pge-th="sampai1" aria-label="Tambah tahun akhir">' +
              PGE_IK.plus +
              '</button></span>' +
              '</div></div>' +
              '<div class="field"><label class="pge-l-judul"></label><div class="pge-langkah">' +
              f.langkah
                .map(function (l, j) {
                  var k = 'L:' + i + ':' + j,
                    tb = pgeTglBuka === k;
                  return (
                    '<div class="pge-l' +
                    (l.selesai ? ' ok' : '') +
                    '">' +
                    '<button type="button" class="pge-cek" data-pge-cek="' +
                    j +
                    '" aria-pressed="' +
                    l.selesai +
                    '" aria-label="Tandai selesai">' +
                    (l.selesai ? PG_IK.centang : '') +
                    '</button>' +
                    '<div class="pge-l-isi"><textarea class="input" rows="1" data-pge-l="' +
                    j +
                    '" maxlength="' +
                    PGE_LANGKAH +
                    '" placeholder="Tulis langkah…">' +
                    esc(l.teks) +
                    '</textarea>' +
                    '<div class="pge-l-bawah">' +
                    (l.selesai
                      ? '<button type="button" class="pge-chip" data-pge-chip="' +
                        j +
                        '" aria-expanded="' +
                        tb +
                        '">' +
                        PGE_IK.kal +
                        '<span class="pge-chip-teks">' +
                        pgFmt(l.tgl) +
                        '</span><span class="pge-chip-ubah">· ' +
                        (tb ? 'tutup' : 'ubah') +
                        '</span></button>'
                      : '<span></span>') +
                    '<span class="pge-l-aksi"><button type="button" data-pge-lg="naik:' +
                    j +
                    '" aria-label="Naikkan langkah">' +
                    PGE_IK.naik +
                    '</button><button type="button" data-pge-lg="turun:' +
                    j +
                    '" aria-label="Turunkan langkah">' +
                    PGE_IK.turun +
                    '</button><button type="button" class="pge-l-x" data-pge-lg="hapus:' +
                    j +
                    '" aria-label="Hapus langkah">' +
                    PGE_IK.x +
                    '</button></span></div>' +
                    (tb
                      ? '<div class="pge-tgl-panel">' +
                        pgeTglHtml(k) +
                        '<button type="button" class="pe-kini" data-pge-kini="' +
                        j +
                        '">Hari ini</button></div>'
                      : '') +
                    '</div></div>'
                  );
                })
                .join('') +
              '</div>' +
              '<button type="button" class="ie-poin-tambah" data-pge="tambah-langkah">' +
              PGE_IK.plus +
              'Tambah langkah</button></div>' +
              '<div class="pge-fase-aksi"><span><button type="button" data-pge="naik">' +
              PGE_IK.naik +
              'Naik</button><button type="button" data-pge="turun">' +
              PGE_IK.turun +
              'Turun</button></span>' +
              '<button type="button" class="se-hapus" data-pge="hapus-fase">' +
              PGE_IK.hapus +
              'Hapus fase</button></div>' +
              '</div>'
            : '') +
          '</article>'
        );
      })
      .join('') || '<p class="pe-kosong">Belum ada fase. Ketuk "Tambah fase".</p>';
  $$('#pgeFase textarea[data-pge-l]').forEach(ieTinggi);
  pgeRingkas();
  pgeInfo();
}
function pgeFokusLangkah(j) {
  var t = $$('#pgeFase .pge-fase.buka textarea[data-pge-l]')[j];
  if (t) t.focus();
}

$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'progress-edit' || !pgeDraf) return;
  var t = e.target,
    f = pgeDraf.fase[pgeBuka],
    el;
  if ((el = t.closest('[data-ky-tambah]'))) {
    var kk2 = el.dataset.kyTambah,
      L2 = pgeDraf.ky[kk2];
    if (L2.length >= KY_POIN_MAKS) {
      toast('Maksimal ' + KY_POIN_MAKS + ' poin');
      return;
    }
    L2.push('');
    pgeKotor = true;
    kyEdDaftar(kk2);
    var ts = $$('#subBody [data-ky-daftar="' + kk2 + '"] textarea');
    if (ts.length) ts[ts.length - 1].focus();
    return;
  }
  if ((el = t.closest('[data-ky-hapus]'))) {
    var ph = el.dataset.kyHapus.split(':'),
      kh = ph[0],
      jh = +ph[1],
      th = String(pgeDraf.ky[kh][jh] || '').trim(),
      rh = th.length > 60 ? th.slice(0, 60) + '…' : th;
    askConfirm({
      title: 'Hapus poin?',
      text: (rh ? '"' + rh + '"' : 'Poin kosong ini') + ' dihapus (berlaku setelah Simpan).',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          if (!pgeDraf) return;
          pgeDraf.ky[kh].splice(jh, 1);
          pgeKotor = true;
          kyEdDaftar(kh);
        });
      }
    });
    return;
  }
  if ((el = t.closest('[data-pge-thn]'))) {
    var box = el.closest('[data-pge-tgl]'),
      yi = box.querySelector('[data-pge-p="y"]'),
      y = (parseInt(yi.value, 10) || new Date().getFullYear()) + +el.dataset.pgeThn;
    yi.value = Math.max(THN_MIN, Math.min(THN_MAKS, y));
    pgeTglBerubah(box);
    return;
  }
  if ((el = t.closest('[data-pge-buka]'))) {
    var i = +el.dataset.pgeBuka;
    pgeBuka = pgeBuka === i ? -1 : i;
    pgeTglBuka = '';
    pgeRender();
    var r = $('#pgeFase .pge-fase.buka');
    if (r) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }
  if ((el = t.closest('[data-pge-th]')) && f) {
    var a = el.dataset.pgeTh,
      k = a.indexOf('dari') === 0 ? 'dari' : 'sampai',
      d = k === 'dari' ? +a.slice(4) : +a.slice(6);
    f[k] = Math.max(1, Math.min(PGE_THN_MAKS, f[k] + d));
    if (f.sampai < f.dari) {
      if (k === 'dari') f.sampai = f.dari;
      else f.dari = f.sampai;
    }
    pgeKotor = true;
    pgeRender();
    return;
  }
  if ((el = t.closest('[data-pge-cek]')) && f) {
    var l = f.langkah[+el.dataset.pgeCek];
    l.selesai = !l.selesai;
    if (l.selesai && !pgTglSah(l.tgl)) l.tgl = pgeHariIni();
    if (!l.selesai && pgeTglBuka === 'L:' + pgeBuka + ':' + el.dataset.pgeCek) pgeTglBuka = '';
    pgeKotor = true;
    pgeRender();
    return;
  }
  if ((el = t.closest('[data-pge-chip]'))) {
    var kk = 'L:' + pgeBuka + ':' + el.dataset.pgeChip;
    pgeTglBuka = pgeTglBuka === kk ? '' : kk;
    pgeRender();
    return;
  }
  if ((el = t.closest('[data-pge-kini]')) && f) {
    f.langkah[+el.dataset.pgeKini].tgl = pgeHariIni();
    pgeKotor = true;
    pgeRender();
    return;
  }
  if ((el = t.closest('[data-pge-lg]')) && f) {
    var p = el.dataset.pgeLg.split(':'),
      j = +p[1],
      L = f.langkah;
    if (p[0] === 'hapus') {
      var fi = pgeBuka,
        teks = String(L[j].teks).trim(),
        ringkas = teks.length > 60 ? teks.slice(0, 60) + '…' : teks;
      askConfirm({
        title: 'Hapus langkah?',
        text: (ringkas ? '"' + ringkas + '"' : 'Langkah kosong ini') + ' dihapus dari Fase ' + (fi + 1) + ' (berlaku setelah Simpan).',
        ok: 'Hapus',
        action: function () {
          back(1, function () {
            var F = pgeDraf && pgeDraf.fase[fi];
            if (F) F.langkah.splice(j, 1);
            pgeTglBuka = '';
            pgeKotor = true;
            pgeRender();
          });
        }
      });
      return;
    } else {
      var j2 = p[0] === 'naik' ? j - 1 : j + 1;
      if (j2 < 0 || j2 >= L.length) return;
      var tmp = L[j];
      L[j] = L[j2];
      L[j2] = tmp;
      pgeTglBuka = '';
    }
    pgeKotor = true;
    pgeRender();
    return;
  }
  if (!(el = t.closest('[data-pge]'))) return;
  var aksi = el.dataset.pge;
  if (aksi === 'tambah-fase') {
    if (pgeDraf.fase.length >= PGE_FASE_MAKS) {
      toast('Maksimal ' + PGE_FASE_MAKS + ' fase');
      return;
    }
    var akhir = pgeDraf.fase.reduce(function (a, x) {
        return Math.max(a, x.sampai);
      }, 0),
      mulai = Math.min(PGE_THN_MAKS, akhir + 1);
    pgeDraf.fase.push({ id: uid(), nama: '', ket: '', dari: mulai, sampai: mulai, langkah: [], tglSelesai: '' });
    pgeBuka = pgeDraf.fase.length - 1;
    pgeTglBuka = '';
    pgeKotor = true;
    pgeRender();
    var nm = $('#pgeFase .pge-fase.buka [data-pge-f="nama"]');
    if (nm) {
      nm.scrollIntoView({ block: 'center' });
      nm.focus();
    }
  } else if (aksi === 'tambah-langkah' && f) {
    if (f.langkah.length >= PGE_LANGKAH_MAKS) {
      toast('Maksimal ' + PGE_LANGKAH_MAKS + ' langkah per fase');
      return;
    }
    f.langkah.push({ id: uid(), teks: '', selesai: false, tgl: '' });
    pgeTglBuka = '';
    pgeKotor = true;
    pgeRender();
    pgeFokusLangkah(f.langkah.length - 1);
  } else if ((aksi === 'naik' || aksi === 'turun') && f) {
    var b2 = aksi === 'naik' ? pgeBuka - 1 : pgeBuka + 1;
    if (b2 < 0 || b2 >= pgeDraf.fase.length) return;
    var F = pgeDraf.fase,
      tf = F[pgeBuka];
    F[pgeBuka] = F[b2];
    F[b2] = tf;
    pgeBuka = b2;
    pgeTglBuka = '';
    pgeKotor = true;
    pgeRender();
    var rb = $('#pgeFase .pge-fase.buka');
    if (rb) rb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } else if (aksi === 'hapus-fase' && f) {
    var idx = pgeBuka,
      nama = f.nama.trim() || 'Fase ' + (idx + 1);
    askConfirm({
      title: 'Hapus fase?',
      text: '"' + nama + '" beserta langkah-langkahnya dihapus (berlaku setelah Simpan).',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          pgeDraf.fase.splice(idx, 1);
          pgeBuka = -1;
          pgeTglBuka = '';
          pgeKotor = true;
          pgeRender();
        });
      }
    });
  } else if (aksi === 'hapus-semua') {
    if (!pgeDraf.fase.length) {
      toast('Belum ada fase');
      return;
    }
    askConfirm({
      title: 'Hapus semua peta jalan?',
      text: 'Semua fase dan langkahnya dihapus. Setelah Simpan, tab Progress kembali kosong.',
      ok: 'Hapus semua',
      action: function () {
        back(1, function () {
          pgeDraf.fase = [];
          pgeBuka = -1;
          pgeTglBuka = '';
          pgeKotor = true;
          pgeRender();
        });
      }
    });
  } else if (aksi === 'batal') {
    if (!pgeKotor) {
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
  } else if (aksi === 'simpan') pgeSimpan();
});
function pgeSimpan() {
  if (pgeDraf.hariH && !pgeRentang()) {
    toast('Tanggal mulai harus sebelum Hari H');
    var t = $('#pgeRentang');
    if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  var kini = pgeHariIni();
  var fase = pgeDraf.fase.map(function (f) {
    var L = f.langkah
      .map(function (l) {
        return {
          id: l.id || uid(),
          teks: String(l.teks).trim().slice(0, PGE_LANGKAH),
          selesai: !!l.selesai,
          tgl: l.selesai ? (pgTglSah(l.tgl) ? l.tgl : kini) : ''
        };
      })
      .filter(function (l) {
        return l.teks;
      });
    var beres =
      L.length &&
      L.every(function (l) {
        return l.selesai;
      });
    return {
      id: f.id || uid(),
      nama: f.nama.trim().slice(0, PGE_NAMA),
      ket: f.ket.trim().slice(0, PGE_KET),
      dari: f.dari,
      sampai: f.sampai,
      langkah: L,
      tglSelesai: beres
        ? L.reduce(function (a, l) {
            return l.tgl > a ? l.tgl : a;
          }, '')
        : ''
    };
  });
  store.set(K_PG, fase.length ? { mulai: pgeDraf.mulai, fase: fase } : null);
  var ky = {
    pernyataan: String(pgeDraf.ky.pernyataan || '')
      .trim()
      .slice(0, KY_PERNYATAAN)
  };
  KY_PILAR.forEach(function (p) {
    ky[p.k] = kyPoin(pgeDraf.ky[p.k]);
  });
  store.set(K_KY, ky);
  pgeKotor = false;
  pgBuka = {};
  back(1, function () {
    renderPg();
    toast('Progress disimpan');
  });
}
function pgeUbah(e) {
  if (pageKind !== 'progress-edit' || !pgeDraf) return;
  var t = e.target,
    box = t.closest('[data-pge-tgl]');
  if (t.id === 'kyPernyataan') {
    pgeDraf.ky.pernyataan = t.value;
    ieTinggi(t);
    pgeKotor = true;
    return;
  }
  if (t.dataset.kyPoin) {
    var pk = t.dataset.kyPoin.split(':');
    pgeDraf.ky[pk[0]][+pk[1]] = t.value;
    ieTinggi(t);
    pgeKotor = true;
    return;
  }
  if (box) {
    if (t.dataset.pgeP === 'y') {
      t.value = t.value.replace(/\D/g, '').slice(0, 4);
      if (t.value.length < 4) return;
    }
    pgeTglBerubah(box);
    return;
  }
  var f = pgeDraf.fase[pgeBuka];
  if (!f) return;
  if (t.dataset.pgeF) {
    f[t.dataset.pgeF] = t.value;
    pgeKotor = true;
    pgeRingkas();
    return;
  }
  if (t.dataset.pgeL !== undefined) {
    f.langkah[+t.dataset.pgeL].teks = t.value;
    ieTinggi(t);
    pgeKotor = true;
    pgeRingkas();
  }
}
$('#subBody').addEventListener('input', pgeUbah);
$('#subBody').addEventListener('change', pgeUbah);
