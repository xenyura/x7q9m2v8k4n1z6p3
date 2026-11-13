/* Stivora — Halaman Impian: 5 tab ikon di bawah peta
   Peristiwa · Impian · Sumberdaya · Progress · Keuangan. Isi tiap tab masih kerangka (kosong).
   Saat aplikasi dibuka selalu tab pertama (Peristiwa). Isi tab menyambung di bawah tab, ikut tergulir bersama peta. */
'use strict';

var impianTab = 'peristiwa';
function pilihImpianTab(k) {
  var tombol = $('#impianTab [data-it="' + k + '"]');
  if (!tombol) return;
  impianTab = k;
  $$('#impianTab [data-it]').forEach(function (b) {
    var on = b.dataset.it === k;
    b.classList.toggle('aktif', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
  });
  $$('#impianIsi .it-panel').forEach(function (p) {
    p.hidden = p.id !== 'itIsi-' + k;
  });
  if (k === 'peristiwa' && typeof peIndeksAwal !== 'undefined' && peIndeksAwal)
    renderIndeks(); /* kotak indeks baru bisa diukur saat tampil */
  /* Kalau sedang menggulir jauh ke bawah: mulai isi tab baru tepat di bawah barisan tab */
  var bar = $('#impianTab'),
    isi = $('#impianIsi');
  var atasIsi = isi.getBoundingClientRect().top + window.scrollY - bar.offsetHeight;
  if (window.scrollY > atasIsi) window.scrollTo(0, atasIsi);
}
$('#impianTab').addEventListener('click', function (e) {
  var b = e.target.closest('[data-it]');
  if (b) pilihImpianTab(b.dataset.it);
});
/* Panah kiri/kanan berpindah tab (keyboard, remote TV) */
$('#impianTab').addEventListener('keydown', function (e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  var semua = $$('#impianTab [data-it]'),
    i = semua.findIndex(function (b) {
      return b.dataset.it === impianTab;
    });
  var j = (i + (e.key === 'ArrowRight' ? 1 : -1) + semua.length) % semua.length;
  pilihImpianTab(semua[j].dataset.it);
  semua[j].focus();
  e.preventDefault();
});
pilihImpianTab('peristiwa');

/* ---------- Tab Peristiwa: kalender tampilan tahun ---------- */
var KAL_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
var KAL_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
var kalHariIni = '';
var K_PERISTIWA = 'stivora.peristiwa';
var pePilih = null; // bulan yang dipilih dari indeks: { y, m }
var peCari = ''; // isi kolom cari indeks
/* Peristiwa per tahun → { bulan: { tanggal: [peristiwa] } } (hanya yang cocok dengan pencarian bila ada) */
function peUrai(p) {
  var t = /^(\d{4})-(\d{2})-(\d{2})/.exec((p && p.waktu) || '');
  return t ? { y: +t[1], m: +t[2] - 1, d: +t[3] } : null;
}
/* Pencarian mencakup seluruh informasi catatan: tanggal (4, 04, 4/11, 4-11-2025, 2025-11-04, 4 nov, 4 november),
   bulan (11, nov, november), tahun (2025, awalan "202"), hari (selasa), jam (16, 16.19, 16:19) dan isi catatan.
   Beberapa kata = semua kata harus cocok (mis. "nov 2025 kuliah"). */
var PE_HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
function peTeksCari(p) {
  var t = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec((p && p.waktu) || ''),
    ket = String((p && p.keterangan) || '').toLowerCase();
  if (!t) return { teks: ket, angka: [], th: '' };
  var y = t[1],
    mm = t[2],
    dd = t[3],
    m = +mm,
    d = +dd,
    bl = KAL_BULAN[m - 1].toLowerCase(),
    b3 = KAL_BULAN3[m - 1].toLowerCase(),
    hari = PE_HARI[new Date(+y, m - 1, d).getDay()];
  var f = [
    d + '/' + m + '/' + y,
    dd + '/' + mm + '/' + y,
    d + '-' + m + '-' + y,
    dd + '-' + mm + '-' + y,
    d + '.' + m + '.' + y,
    dd + '.' + mm + '.' + y,
    y + '-' + mm + '-' + dd,
    y + '/' + mm + '/' + dd,
    d + ' ' + bl + ' ' + y,
    d + ' ' + b3 + ' ' + y,
    dd + ' ' + bl + ' ' + y,
    dd + ' ' + b3 + ' ' + y,
    hari + ' ' + d + ' ' + bl + ' ' + y,
    hari + ', ' + d + ' ' + bl + ' ' + y,
    bl + ' ' + y,
    b3 + ' ' + y,
    m + '/' + y,
    mm + '/' + y,
    m + '-' + y,
    mm + '-' + y
  ];
  var angka = [d, m, +y];
  if (t[4]) {
    f.push(
      t[4] + '.' + t[5],
      t[4] + ':' + t[5],
      +t[4] + '.' + t[5],
      +t[4] + ':' + t[5],
      'jam ' + t[4] + '.' + t[5],
      'pukul ' + t[4] + '.' + t[5]
    );
    angka.push(+t[4], +t[5]);
  }
  return { teks: f.join(' | ') + ' | ' + ket, angka: angka, th: y, ket: ket };
}
function peCocok(p) {
  var q = peCari.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return true;
  var c = peTeksCari(p);
  if (!/^\d+$/.test(q) && c.teks.indexOf(q) >= 0) return true;
  return q.split(' ').every(function (k) {
    if (/^\d{1,4}$/.test(k)) return c.angka.indexOf(+k) >= 0 || (k.length >= 2 && c.th.indexOf(k) === 0) || (c.ket || '').indexOf(k) >= 0;
    return c.teks.indexOf(k) >= 0;
  });
}
function pePeta(th) {
  var hasil = {};
  peDaftar().forEach(function (p) {
    var u = peUrai(p);
    if (!u || u.y !== th || !peCocok(p)) return;
    ((hasil[u.m] = hasil[u.m] || {})[u.d] = hasil[u.m][u.d] || []).push(p);
  });
  return hasil;
}
/* Ganti hari (aplikasi dibuka melewati tengah malam) → perbarui saat kembali ke aplikasi / tiap menit */
function cekGantiHari() {
  var k = new Date();
  if (k.getFullYear() + '-' + k.getMonth() + '-' + k.getDate() !== kalHariIni) renderTahunan();
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) cekGantiHari();
});
setInterval(cekGantiHari, 60000);

/* Satu kartu kaca (glassmorphism): ‹ tahun › di atas (ketuk tahun = pilih tahun), pensil di pojok kanan atas, lalu 12 bulan.
   Disiapkan untuk kalender peristiwa. */
var THN_MIN = 1900,
  THN_MAKS = 2100;
var thnLihat = new Date().getFullYear(); // tahun yang sedang dilihat
var thnPilih = null; // null = tampil 12 bulan; angka = awal blok 12 tahun di pemilih tahun
var IKON_KIRI = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
var IKON_KANAN = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
var IKON_PENSIL = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
function htmlBulanTahun(th, kini) {
  var thNow = kini.getFullYear(),
    blNow = kini.getMonth(),
    tgNow = kini.getDate(),
    peta = pePeta(th);
  return KAL_BULAN.map(function (nama, bl) {
    var awal = new Date(th, bl, 1).getDay(),
      jumlah = new Date(th, bl + 1, 0).getDate(),
      sel = '';
    var blIni = th === thNow && bl === blNow,
      ada = peta[bl] || null,
      dipilih = pePilih && pePilih.y === th && pePilih.m === bl;
    for (var i = 0; i < awal; i++) sel += '<span></span>';
    for (var d = 1; d <= jumlah; d++) {
      var kls = [],
        hariIni = blIni && d === tgNow;
      if ((awal + d - 1) % 7 === 0) kls.push('minggu');
      if (hariIni) kls.push('hari-ini');
      if (ada && ada[d]) kls.push('ada'); /* tanggal kejadian peristiwa */
      sel += '<span' + (kls.length ? ' class="' + kls.join(' ') + '"' : '') + (hariIni ? ' aria-current="date"' : '') + '>' + d + '</span>';
    }
    var lewat = th < thNow || (th === thNow && bl < blNow);
    return (
      '<div class="thn-bulan' +
      (blIni ? ' sekarang' : lewat ? ' lewat' : '') +
      (dipilih ? ' dipilih' : '') +
      '" id="thnBl-' +
      bl +
      '" aria-label="' +
      nama +
      ' ' +
      th +
      '">' +
      '<b class="thn-nama' +
      (ada ? ' ada' : '') +
      '">' +
      nama +
      '</b>' +
      '<div class="thn-kepala" aria-hidden="true">' +
      KAL_HARI.map(function (h, i) {
        return '<span' + (i === 0 ? ' class="minggu"' : '') + '>' + h.charAt(0) + '</span>';
      }).join('') +
      '</div>' +
      '<div class="thn-isi">' +
      sel +
      '</div></div>'
    );
  }).join('');
}
function htmlPilihTahun(awal, kini) {
  var thNow = kini.getFullYear(),
    isi = '';
  for (var y = awal; y < awal + 12; y++) {
    if (y < THN_MIN || y > THN_MAKS) {
      isi += '<span></span>';
      continue;
    }
    isi +=
      '<button type="button" class="thn-opsi' +
      (y === thnLihat ? ' aktif' : '') +
      (y === thNow ? ' kini' : '') +
      '" data-thn-ke="' +
      y +
      '">' +
      y +
      '</button>';
  }
  return (
    '<div class="thn-pilih" role="listbox" aria-label="Pilih tahun">' +
    '<div class="thn-pilih-atas"><button type="button" class="thn-panah" data-thn="blok-kiri" aria-label="12 tahun sebelumnya"' +
    (awal <= THN_MIN ? ' disabled' : '') +
    '>' +
    IKON_KIRI +
    '</button>' +
    '<span>' +
    awal +
    ' – ' +
    (awal + 11) +
    '</span>' +
    '<button type="button" class="thn-panah" data-thn="blok-kanan" aria-label="12 tahun berikutnya"' +
    (awal + 11 >= THN_MAKS ? ' disabled' : '') +
    '>' +
    IKON_KANAN +
    '</button></div>' +
    '<div class="thn-pilih-isi">' +
    isi +
    '</div></div>'
  );
}
function renderTahunan() {
  var box = $('#kalTahunan');
  if (!box) return;
  var kini = new Date(),
    th = thnLihat;
  kalHariIni = kini.getFullYear() + '-' + kini.getMonth() + '-' + kini.getDate();
  box.innerHTML =
    '<div class="thn-kaca">' +
    '<button type="button" class="thn-pensil" data-thn="tambah" aria-label="Tambah peristiwa" title="Tambah peristiwa">' +
    IKON_PENSIL +
    '</button>' +
    '<div class="thn-judul">' +
    '<button type="button" class="thn-panah" data-thn="kiri" aria-label="Tahun sebelumnya"' +
    (th <= THN_MIN ? ' disabled' : '') +
    '>' +
    IKON_KIRI +
    '</button>' +
    '<button type="button" class="thn-kini-btn" data-thn="pilih" aria-haspopup="listbox" aria-expanded="' +
    (thnPilih != null) +
    '" aria-label="Tahun ' +
    th +
    ', ketuk untuk memilih tahun">' +
    '<b class="thn-kini" data-tahun="' +
    th +
    '">' +
    th +
    '</b></button>' +
    '<button type="button" class="thn-panah" data-thn="kanan" aria-label="Tahun berikutnya"' +
    (th >= THN_MAKS ? ' disabled' : '') +
    '>' +
    IKON_KANAN +
    '</button>' +
    '</div>' +
    (thnPilih != null ? htmlPilihTahun(thnPilih, kini) : htmlBulanTahun(th, kini)) +
    '</div>';
}
function lihatTahun(y) {
  thnLihat = Math.max(THN_MIN, Math.min(THN_MAKS, y));
  thnPilih = null;
  if (pePilih && pePilih.y !== thnLihat) pePilih = null;
  renderTahunan();
  renderIndeks();
  renderCatatan();
}
$('#kalTahunan').addEventListener('click', function (e) {
  var b = e.target.closest('[data-thn-ke]');
  if (b) {
    lihatTahun(+b.dataset.thnKe);
    return;
  }
  b = e.target.closest('[data-thn]');
  if (!b || b.disabled) return;
  var a = b.dataset.thn;
  if (a === 'kiri') lihatTahun(thnLihat - 1);
  else if (a === 'kanan') lihatTahun(thnLihat + 1);
  else if (a === 'pilih') {
    thnPilih = thnPilih == null ? thnLihat - 4 : null;
    renderTahunan();
  } else if (a === 'blok-kiri') {
    thnPilih -= 12;
    renderTahunan();
  } else if (a === 'blok-kanan') {
    thnPilih += 12;
    renderTahunan();
  } else if (a === 'tambah') openLayer('page:peristiwa-baru');
});
renderTahunan();

/* ---------- Indeks tahun × bulan (titik hijau = ada catatan) + area catatan peristiwa ---------- */
var KAL_BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var peIndeksAwal = true;
/* Indeks & catatan tampil di 2 tempat: tab Peristiwa (#peBaris/#peCatatan) dan halaman Tambah peristiwa (#pbBaris/#pbCatatan) */
function renderIndeks() {
  var box = $('#peBaris'),
    box2 = $('#pbBaris');
  if (!box && !box2) return;
  var kini = new Date(),
    thNow = kini.getFullYear(),
    blNow = kini.getMonth();
  var tahun = {},
    cari = peCari.trim(),
    jumlah = 0;
  peDaftar().forEach(function (p) {
    var u = peUrai(p);
    if (u && peCocok(p)) {
      jumlah++;
      (tahun[u.y] = tahun[u.y] || {})[u.m] = true;
    }
  });
  /* Keterangan jumlah catatan (di kedua kotak indeks): total, atau jumlah hasil pencarian saat mencari */
  var ket = cari ? jumlah + ' catatan ditemukan' : jumlah ? jumlah + ' catatan' : 'Belum ada catatan';
  $$('.pe-legenda').forEach(function (l) {
    if (l.textContent !== ket) l.textContent = ket;
  });
  if (!cari) tahun[thNow] = tahun[thNow] || {};
  var daftar = Object.keys(tahun)
    .map(Number)
    .sort(function (a, b) {
      return a - b;
    });
  var html = daftar.length
    ? daftar
        .map(function (y) {
          return (
            '<div class="pe-thn' +
            (y === thnLihat ? ' dilihat' : '') +
            '"><b class="' +
            (y === thNow ? 'kini' : '') +
            '">' +
            y +
            '</b>' +
            KAL_BULAN3.map(function (n, m) {
              var ada = tahun[y][m],
                kls =
                  'pe-bln' +
                  (ada ? ' ada' : '') +
                  (y === thNow && m === blNow ? ' kini' : '') +
                  (pePilih && pePilih.y === y && pePilih.m === m ? ' dipilih' : '');
              return ada
                ? '<button type="button" class="' +
                    kls +
                    '" data-pe-bulan="' +
                    y +
                    '-' +
                    m +
                    '" aria-label="' +
                    KAL_BULAN[m] +
                    ' ' +
                    y +
                    ', ada catatan">' +
                    n +
                    '</button>'
                : '<span class="' + kls + '">' + n + '</span>';
            }).join('') +
            '</div>'
          );
        })
        .join('')
    : '<p class="pe-kosong">Tidak ada yang cocok dengan "' + esc(cari) + '"</p>';
  if (box2) box2.innerHTML = html;
  if (!box) return;
  box.innerHTML = html;
  if (peIndeksAwal && box.clientHeight) {
    peIndeksAwal = false;
    requestAnimationFrame(function () {
      box.scrollTop = box.scrollHeight;
    });
  } /* awal: tahun terbaru terlihat */
}
var PE_IKON_PIN = '<svg viewBox="0 0 24 24"><path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6z"/><path d="M12 15v5"/></svg>';
function renderCatatan() {
  var box = $('#peCatatan'),
    box2 = $('#pbCatatan');
  if (!box && !box2) return;
  var urut = function (a, b) {
    return String(a.waktu).localeCompare(String(b.waktu));
  };
  /* Catatan yang di-pin: selalu paling atas (apa pun tahun/bulan/pencarian), urut paling lama → paling baru; tidak tampil dua kali */
  var dipin = peDaftar()
    .filter(function (p) {
      return p.pin;
    })
    .sort(urut);
  var judul,
    daftar = peDaftar().filter(function (p) {
      return !p.pin && peCocok(p);
    });
  if (pePilih) {
    judul = KAL_BULAN[pePilih.m] + ' ' + pePilih.y;
    daftar = daftar.filter(function (p) {
      var u = peUrai(p);
      return u && u.y === pePilih.y && u.m === pePilih.m;
    });
  } else if (peCari.trim()) judul = 'Hasil pencarian';
  else {
    judul = 'Tahun ' + thnLihat;
    daftar = daftar.filter(function (p) {
      var u = peUrai(p);
      return u && u.y === thnLihat;
    });
  }
  daftar.sort(urut);
  function item(p, edit) {
    /* edit = true → ikon pin & edit (hanya di halaman Tambah peristiwa) */
    var t = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(p.waktu || '') || [];
    return (
      '<article class="pe-item' +
      (edit ? ' bisa-edit' : p.pin ? ' bertanda' : '') +
      (p.pin ? ' dipin' : '') +
      (edit && p.id === peEditId ? ' diedit' : '') +
      '"><div class="pe-tgl"><b>' +
      +t[3] +
      ' ' +
      KAL_BULAN3[+t[2] - 1] +
      '</b><small>' +
      t[1] +
      (t[4] ? ' · ' + t[4] + '.' + t[5] : '') +
      '</small></div>' +
      '<p translate="no">' +
      esc(p.keterangan) +
      '</p>' +
      (edit
        ? '<div class="pe-tombol"><button type="button" class="pe-pin' +
          (p.pin ? ' aktif' : '') +
          '" data-pe-pin="' +
          esc(p.id) +
          '" aria-pressed="' +
          !!p.pin +
          '" aria-label="' +
          (p.pin ? 'Lepas pin' : 'Pin catatan') +
          '">' +
          PE_IKON_PIN +
          '</button>' +
          '<button type="button" class="pe-edit" data-pe-edit="' +
          esc(p.id) +
          '" aria-label="Edit peristiwa"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg></button></div>'
        : p.pin
          ? '<span class="pe-pin-tanda" title="Di-pin" aria-label="Di-pin">' + PE_IKON_PIN + '</span>'
          : '') +
      '</article>'
    );
  }
  function buat(edit) {
    return (
      '<div class="pe-cat-atas"><b>Catatan peristiwa</b><span>' +
      esc(judul) +
      '</span></div>' +
      (dipin.length
        ? '<div class="pe-grup-pin">' +
          dipin
            .map(function (p) {
              return item(p, edit);
            })
            .join('') +
          '</div>'
        : '') +
      (daftar.length
        ? daftar
            .map(function (p) {
              return item(p, edit);
            })
            .join('')
        : '<p class="pe-kosong">Belum ada catatan peristiwa' +
          (dipin.length ? ' lain' : '') +
          ' di ' +
          esc(pePilih ? judul : peCari.trim() ? 'pencarian ini' : 'tahun ' + thnLihat) +
          '.</p>')
    );
  }
  if (box) box.innerHTML = buat(false);
  if (box2) box2.innerHTML = buat(true);
}
function peSegarkan() {
  renderTahunan();
  renderIndeks();
  renderCatatan();
}
function peKlikBulan(e) {
  var b = e.target.closest('[data-pe-bulan]');
  if (!b) return;
  var t = b.dataset.peBulan.split('-'),
    y = +t[0],
    m = +t[1];
  if (pePilih && pePilih.y === y && pePilih.m === m) {
    pePilih = null;
    peSegarkan();
    return;
  } /* ketuk lagi bulan yang sama = batal pilih */
  pePilih = { y: y, m: m };
  lihatTahun(pePilih.y); /* kalender pindah ke tahun itu; bulan & tanggal kejadian ditandai; catatan bulan itu tampil */
}
$('#peBaris').addEventListener('click', peKlikBulan);
function peCariUbah(v) {
  peCari = v;
  pePilih = null;
  [$('#peCari'), $('#pbCari')].forEach(function (i) {
    if (i && i.value !== v) i.value = v;
  }); /* kedua kolom cari selalu sama */
  renderIndeks();
  renderCatatan();
  renderTahunan();
}
$('#peCari').addEventListener('input', function (e) {
  peCariUbah(e.target.value);
});
renderIndeks();
renderCatatan();
if (document.readyState === 'complete')
  setTimeout(function () {
    if (peIndeksAwal) renderIndeks();
  }, 0);
else
  window.addEventListener('load', function () {
    if (peIndeksAwal) renderIndeks();
  });

/* ---------- Halaman Tambah peristiwa ----------
   Tombol "Tambahkan peristiwa" → di bawahnya muncul isian waktu & keterangan (maks. 2000 karakter) → Simpan.
   Data: store (IndexedDB) 'stivora.peristiwa' = [{ id, waktu: 'YYYY-MM-DDTHH:MM', keterangan, dibuat, diubah }] */
var PE_MAKS = 2000;
function peDaftar() {
  var d = store.get(K_PERISTIWA, []);
  return Array.isArray(d) ? d : [];
}
function peSekarang() {
  var k = new Date(),
    dua = function (n) {
      return (n < 10 ? '0' : '') + n;
    };
  return k.getFullYear() + '-' + dua(k.getMonth() + 1) + '-' + dua(k.getDate()) + 'T' + dua(k.getHours()) + ':' + dua(k.getMinutes());
}
PAGES['peristiwa-baru'] = function () {
  $('#subTitle').textContent = 'Tambah peristiwa';
  $('#subBody').innerHTML =
    '<button type="button" class="btn primary pe-tambah" data-pe="buka"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Tambahkan peristiwa</button>' +
    '<div class="pe-form" id="peForm" hidden>' +
    '<p class="pe-form-judul" id="peFormJudul" hidden>Edit peristiwa</p>' +
    '<div class="field"><label>Waktu</label>' +
    '<div class="pe-waktu">' +
    '<div class="pe-w"><small>Tanggal</small><select class="input" id="peTgl" aria-label="Tanggal"></select></div>' +
    '<div class="pe-w"><small>Bulan</small><select class="input" id="peBln" aria-label="Bulan">' +
    KAL_BULAN.map(function (n, i) {
      return '<option value="' + i + '">' + n + '</option>';
    }).join('') +
    '</select></div>' +
    '<div class="pe-w"><small>Tahun</small><div class="pe-thn-step">' +
    '<button type="button" class="pe-step" data-pe="thn-" aria-label="Tahun sebelumnya"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>' +
    '<input class="input" id="peThn" type="text" inputmode="numeric" maxlength="4" aria-label="Tahun">' +
    '<button type="button" class="pe-step" data-pe="thn+" aria-label="Tahun berikutnya"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
    '</div></div>' +
    '<div class="pe-w"><small>Jam</small><input class="input" id="peJam" type="time" aria-label="Jam"></div>' +
    '<button type="button" class="pe-kini" data-pe="kini">Sekarang</button>' +
    '</div></div>' +
    '<div class="field"><label for="peKet">Keterangan</label>' +
    '<textarea class="input" id="peKet" data-hitung-sendiri maxlength="' +
    PE_MAKS +
    '" rows="6" placeholder="Tulis apa yang terjadi…"></textarea>' +
    '<small class="pe-hitung" id="peHitung">0/' +
    PE_MAKS +
    '</small></div>' +
    '<div class="pe-aksi"><button type="button" class="btn ghost" data-pe="batal">Batal</button><button type="button" class="btn primary" data-pe="simpan" id="peSimpan">Simpan</button></div>' +
    '<button type="button" class="pe-hapus" data-pe="hapus" id="peHapus" hidden><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>Hapus peristiwa</button>' +
    '</div>' +
    '<div class="pe-indeks" id="pbIndeks"><div class="pe-indeks-atas"><span class="pe-legenda" aria-live="polite"></span>' +
    '<input class="pe-cari" id="pbCari" type="search" maxlength="60" autocomplete="off" placeholder="Cari tahun / isi catatan" aria-label="Cari tahun atau isi catatan"></div>' +
    '<div class="pe-baris" id="pbBaris"></div></div>' +
    '<div class="pe-catatan" id="pbCatatan"></div>';
  peEditId = null;
  $('#pbCari').value = peCari;
  renderIndeks();
  renderCatatan();
  requestAnimationFrame(function () {
    var b = $('#pbBaris');
    if (b) b.scrollTop = b.scrollHeight;
  }); /* awal: tahun terbaru terlihat */
  return true;
};
/* Isian yang sama dipakai untuk tambah & edit. peEditId = id catatan yang sedang diedit (null = tambah baru) */
var peEditId = null;
function peBuka(buka, p) {
  var f = $('#peForm'),
    t = $('#subBody [data-pe="buka"]');
  if (!f) return;
  peEditId = buka && p ? p.id : null;
  f.hidden = !buka;
  t.hidden = buka;
  $('#peFormJudul').hidden = $('#peHapus').hidden = !peEditId;
  $('#peSimpan').textContent = peEditId ? 'Simpan perubahan' : 'Simpan';
  if (buka) {
    peIsiWaktu(p ? String(p.waktu) + (String(p.waktu).length < 16 ? 'T00:00' : '') : peSekarang());
    $('#peKet').value = p ? p.keterangan || '' : '';
    peHitung();
    if (p) {
      $('#subBody').scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else $('#peKet').focus();
  }
  renderCatatan(); /* tanda catatan yang sedang diedit */
}
/* Setelah ubah/hapus: kalau bulan yang dipilih tidak punya catatan lagi, pilihan dilepas */
function peRapikanPilih() {
  if (
    pePilih &&
    !peDaftar().some(function (p) {
      var u = peUrai(p);
      return u && u.y === pePilih.y && u.m === pePilih.m;
    })
  )
    pePilih = null;
}
/* Waktu dipilih per bagian: tanggal, bulan, tahun (ketik langsung atau −/+), jam — tanpa menggulir jauh untuk mencari tahun */
function peIsiTgl(pilih) {
  var t = $('#peTgl'),
    y = +$('#peThn').value || new Date().getFullYear(),
    m = +$('#peBln').value,
    maks = new Date(y, m + 1, 0).getDate(),
    h = '';
  pilih = Math.min(pilih || +t.value || 1, maks);
  for (var i = 1; i <= maks; i++) h += '<option value="' + i + '"' + (i === pilih ? ' selected' : '') + '>' + i + '</option>';
  t.innerHTML = h;
}
function peIsiWaktu(w) {
  $('#peThn').value = w.slice(0, 4);
  $('#peBln').value = +w.slice(5, 7) - 1;
  $('#peJam').value = w.slice(11, 16);
  peIsiTgl(+w.slice(8, 10));
}
function peThnSah() {
  var y = parseInt($('#peThn').value, 10);
  return y >= THN_MIN && y <= THN_MAKS ? y : 0;
}
function peAmbilWaktu() {
  var y = peThnSah(),
    dua = function (n) {
      return (n < 10 ? '0' : '') + n;
    },
    jam = $('#peJam').value || '00:00';
  return y ? y + '-' + dua(+$('#peBln').value + 1) + '-' + dua(+$('#peTgl').value) + 'T' + jam : '';
}
function peHitung() {
  var k = $('#peKet'),
    h = $('#peHitung');
  if (k && h) {
    h.textContent = k.value.length + '/' + PE_MAKS;
    h.classList.toggle('penuh', k.value.length >= PE_MAKS);
  }
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'peristiwa-baru') return;
  var b = e.target.closest('[data-pe]');
  if (!b) return;
  var a = b.dataset.pe;
  if (a === 'thn-' || a === 'thn+') {
    var y = (peThnSah() || new Date().getFullYear()) + (a === 'thn+' ? 1 : -1);
    $('#peThn').value = Math.max(THN_MIN, Math.min(THN_MAKS, y));
    peIsiTgl();
    return;
  }
  if (a === 'kini') {
    peIsiWaktu(peSekarang());
    return;
  }
  if (a === 'buka') peBuka(true);
  else if (a === 'batal') peBuka(false);
  else if (a === 'simpan') {
    var waktu = peAmbilWaktu(),
      ket = $('#peKet').value.trim().slice(0, PE_MAKS);
    if (!waktu) {
      toast('Tahun harus ' + THN_MIN + '–' + THN_MAKS);
      $('#peThn').focus();
      return;
    }
    if (!ket) {
      toast('Isi keterangan peristiwa');
      $('#peKet').focus();
      return;
    }
    var d = peDaftar(),
      kini = Date.now(),
      lama =
        peEditId &&
        d.filter(function (x) {
          return x.id === peEditId;
        })[0];
    if (lama) {
      lama.waktu = waktu;
      lama.keterangan = ket;
      lama.diubah = kini;
    } else d.push({ id: uid(), waktu: waktu, keterangan: ket, dibuat: kini, diubah: kini });
    store.set(K_PERISTIWA, d);
    peRapikanPilih();
    peBuka(false);
    peSegarkan();
    toast(lama ? 'Perubahan disimpan' : 'Peristiwa disimpan');
  } else if (a === 'hapus' && peEditId) {
    var id = peEditId;
    askConfirm({
      title: 'Hapus peristiwa?',
      text: 'Catatan ini akan dihapus permanen dari kalender, indeks, dan catatan peristiwa.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          store.set(
            K_PERISTIWA,
            peDaftar().filter(function (x) {
              return x.id !== id;
            })
          );
          peRapikanPilih();
          peBuka(false);
          peSegarkan();
          toast('Peristiwa dihapus');
        });
      }
    });
  }
});
/* Pin: ketuk = pin langsung; lepas pin lewat konfirmasi */
function peSetPin(id, pin) {
  var d = peDaftar(),
    p = d.filter(function (x) {
      return x.id === id;
    })[0];
  if (!p) return;
  if (pin) p.pin = true;
  else delete p.pin;
  p.diubah = Date.now();
  store.set(K_PERISTIWA, d);
  renderCatatan();
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'peristiwa-baru') return;
  var pb = e.target.closest('[data-pe-pin]');
  if (pb) {
    var id = pb.dataset.pePin,
      p0 = peDaftar().filter(function (x) {
        return x.id === id;
      })[0];
    if (!p0) return;
    if (!p0.pin) {
      peSetPin(id, true);
      toast('Catatan di-pin');
      return;
    }
    askConfirm({
      title: 'Lepas pin?',
      text: 'Catatan ini tidak lagi selalu tampil di paling atas.',
      ok: 'Lepas pin',
      tone: 'primary',
      action: function () {
        back(1, function () {
          peSetPin(id, false);
          toast('Pin dilepas');
        });
      }
    });
    return;
  }
  var b = e.target.closest('[data-pe-edit]');
  if (!b) return;
  var p = peDaftar().filter(function (x) {
    return x.id === b.dataset.peEdit;
  })[0];
  if (p) peBuka(true, p);
});
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'peristiwa-baru' && e.target.closest('#pbBaris')) peKlikBulan(e);
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'peristiwa-baru') return;
  if (e.target.id === 'pbCari') {
    peCariUbah(e.target.value);
    return;
  }
  if (e.target.id === 'peKet') peHitung();
  else if (e.target.id === 'peThn') {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (peThnSah()) peIsiTgl();
  }
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind === 'peristiwa-baru' && e.target.id === 'peBln') peIsiTgl();
});
