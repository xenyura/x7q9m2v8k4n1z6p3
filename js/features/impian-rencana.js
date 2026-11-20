/* ============================================================
   Stivora — Impian · Progress · Rencana cadangan (5.68.0)
   Banyak buku rencana (5.75.0): tiap buku punya Rencana A, B, C, … sendiri, tampil sebagai jalur kereta.
   - Satu rencana aktif, beberapa cadangan siap, sisanya arsip (dengan pelajaran) atau berhasil.
   - Beralih wajib menulis refleksi: yang terjadi, pelajaran, yang dibawa.
   - Halaman Progress hanya untuk dibaca; semua perubahan lewat ikon pensil (#rcEdit).
   - Pengingat kecil saat tanggal cek rencana aktif tiba.
   Kunci: stivora.impian.rencana = { buku: [{ id, n }], item: [rencana] }  (sinkron per rencana: PECAHAN 'rencana-r-<id>',
          daftar buku ikut di kepala dokumen urutan). Rencana lama tanpa buku otomatis masuk buku pertama "Rencana utama".
   rencana = { id, bk (id buku), huruf, nama, isi, kalau, cek: 'YYYY-MM-DD', bekal, lanjut: id,
               status: 'aktif'|'siap'|'arsip'|'berhasil', dibuat, diubah,
               ref: { terjadi, pelajaran, dibawa, tgl, ke } }
   ============================================================ */
'use strict';

var K_RC = 'stivora.impian.rencana',
  K_RC_INGAT = 'stivora.rencana.diingatkan' /* per HP */,
  K_RC_BUKU = 'stivora.rencana.buku'; /* buku terakhir dilihat, per HP */
var RC_WARNA_BUKU = ['#7c3aed', '#ea580c', '#0d9488', '#db2777', '#2563eb', '#ca8a04', '#16a34a', '#dc2626'];
var RC_BUKU_MAKS = 20,
  RC_BUKU_NAMA = 40,
  RC_MAKS = 300,
  RC_NAMA = 60,
  RC_ISI = 3000,
  RC_FIELD = 600,
  RC_ARSIP_TAMPIL = 3;
var RC_STATUS = { aktif: 'Sedang dijalankan', siap: 'Cadangan siap', arsip: 'Diarsipkan', berhasil: 'Berhasil' };
var RC_IK = {
  buku: '<svg viewBox="0 0 24 24"><path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8.5h6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  cek: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  panah: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  kal: '<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
  lampu: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>'
};
var rcLihat = ''; /* rencana yang sedang dilihat di halaman baca */
var rcArsipSemua = false;

function rcTeks(v, n) {
  return String(v == null ? '' : v).slice(0, n);
}
function rcTglSah(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function rcHuruf(i) {
  var s = '';
  i = Math.max(0, i);
  do {
    s = String.fromCharCode(65 + (i % 26)) + s;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return s;
}
function rcRapikan(r, i) {
  if (!r || typeof r !== 'object') return null;
  var ref = r.ref && typeof r.ref === 'object' ? r.ref : null;
  return {
    id: String(r.id || 'r' + i),
    bk: r.bk ? String(r.bk).slice(0, 40) : '',
    huruf: rcTeks(r.huruf, 3) || rcHuruf(i),
    nama: rcTeks(r.nama, RC_NAMA),
    isi: rcTeks(r.isi, RC_ISI),
    kalau: rcTeks(r.kalau, RC_FIELD),
    cek: rcTglSah(r.cek) ? r.cek : '',
    bekal: rcTeks(r.bekal, RC_FIELD),
    lanjut: r.lanjut ? String(r.lanjut) : '',
    status: RC_STATUS[r.status] ? r.status : 'siap',
    dibuat: +r.dibuat || Date.now(),
    diubah: +r.diubah || +r.dibuat || Date.now(),
    ref: ref
      ? {
          terjadi: rcTeks(ref.terjadi, RC_FIELD),
          pelajaran: rcTeks(ref.pelajaran, RC_FIELD),
          dibawa: rcTeks(ref.dibawa, RC_FIELD),
          tgl: rcTglSah(ref.tgl) ? ref.tgl : '',
          ke: ref.ke ? String(ref.ke) : ''
        }
      : null
  };
}
function rcSemua() {
  var d = store.get(K_RC, null) || {},
    id = {};
  var buku = (Array.isArray(d.buku) ? d.buku : [])
    .filter(function (b) {
      if (!b || !b.id || id[b.id]) return false;
      id[b.id] = 1;
      return true;
    })
    .map(function (b) {
      return { id: String(b.id).slice(0, 40), n: rcTeks(b.n, RC_BUKU_NAMA) || 'Buku tanpa nama' };
    })
    .slice(0, RC_BUKU_MAKS);
  var item = (Array.isArray(d.item) ? d.item : []).map(rcRapikan).filter(Boolean).slice(0, RC_MAKS);
  if (item.length && !buku.length) buku = [{ id: 'utama', n: 'Rencana utama' }];
  var ids = buku.map(function (b) {
    return b.id;
  });
  /* Rencana tanpa buku → buku pertama; hanya satu yang aktif per buku */
  var ada = {};
  item.forEach(function (r) {
    if (ids.indexOf(r.bk) < 0) r.bk = ids[0];
    if (r.status === 'aktif') {
      if (ada[r.bk]) r.status = 'siap';
      ada[r.bk] = 1;
    }
  });
  return { buku: buku, item: item };
}
function rcData() {
  return rcSemua().item;
}
function rcDiBuku(item, bk) {
  return item.filter(function (r) {
    return r.bk === bk;
  });
}
function rcBukuLihat(buku) {
  var b = '';
  try {
    b = localStorage.getItem(K_RC_BUKU) || '';
  } catch (e) {}
  return buku.some(function (x) {
    return x.id === b;
  })
    ? b
    : buku.length
      ? buku[0].id
      : '';
}
function rcSetBuku(id) {
  try {
    localStorage.setItem(K_RC_BUKU, id);
  } catch (e) {}
}
/* Status tanggal cek rencana aktif sebuah buku: null | { n, tiba } */
function rcCekBuku(item) {
  var a = rcAktif(item);
  if (!a || !a.cek) return null;
  var n = rcSisa(a.cek);
  return n === null ? null : { n: n, tiba: n <= 0, r: a };
}
function rcCari(item, id) {
  return item.filter(function (r) {
    return r.id === id;
  })[0];
}
function rcAktif(item) {
  return item.filter(function (r) {
    return r.status === 'aktif';
  })[0];
}
function rcJudul(r) {
  return 'Rencana ' + r.huruf;
}
/* Sisa hari ke tanggal cek */
function rcSisa(cek) {
  if (!rcTglSah(cek)) return null;
  var n = Math.round((pgTgl(cek) - new Date(new Date().toDateString()).getTime()) / 86400000);
  return n;
}
function rcSisaTeks(n) {
  if (n === null) return '';
  if (n > 1) return n + ' hari lagi';
  if (n === 1) return 'besok';
  if (n === 0) return 'hari ini — waktunya dicek';
  return 'lewat ' + -n + ' hari — waktunya dicek';
}
/* Urutan lingkaran: arsip/berhasil (lama → baru), aktif, lalu cadangan siap */
function rcUrut(item) {
  var lalu = item
      .filter(function (r) {
        return r.status === 'arsip' || r.status === 'berhasil';
      })
      .sort(function (a, b) {
        return ((a.ref && a.ref.tgl) || '') < ((b.ref && b.ref.tgl) || '') ? -1 : 1;
      }),
    aktif = item.filter(function (r) {
      return r.status === 'aktif';
    }),
    siap = item.filter(function (r) {
      return r.status === 'siap';
    });
  return { lalu: lalu, aktif: aktif, siap: siap };
}

/* ---------- Tampilan baca (tab Progress): jalur kereta per buku (5.75.0) ---------- */
function rcStasiun(r, kecil) {
  return (
    '<button type="button" class="rc-st ' +
    r.status +
    (r.id === rcLihat && kecil ? ' lihat' : '') +
    '" data-rc-lihat="' +
    esc(r.id) +
    '" data-rc-bk="' +
    esc(r.bk) +
    '" aria-label="' +
    esc(rcJudul(r) + ' · ' + RC_STATUS[r.status]) +
    '">' +
    (r.status === 'berhasil' ? RC_IK.cek : esc(r.huruf)) +
    '</button>'
  );
}
function rcJalurHtml(b, item, dipilih, i) {
  var u = rcUrut(item),
    lalu = u.lalu,
    lipat = 0;
  if (lalu.length > RC_ARSIP_TAMPIL) {
    lipat = lalu.length - RC_ARSIP_TAMPIL;
    lalu = lalu.slice(lipat);
  }
  var st = lalu.concat(u.aktif, u.siap),
    rel = '';
  st.forEach(function (r, i) {
    if (i) {
      var nanti = r.status === 'siap';
      rel += '<i class="rc-rel' + (nanti ? ' nanti' : '') + '" aria-hidden="true"></i>';
    }
    rel += rcStasiun(r, dipilih);
  });
  var c = rcCekBuku(item),
    ket = !item.length
      ? 'kosong'
      : c
        ? c.n > 1
          ? c.n + ' hari'
          : c.n === 1
            ? 'besok'
            : c.n === 0
              ? 'cek hari ini'
              : 'lewat ' + -c.n + ' hr'
        : '';
  return (
    '<div class="rc-jalur' +
    (dipilih ? ' on' : '') +
    '" style="--bw:' +
    RC_WARNA_BUKU[(i || 0) % RC_WARNA_BUKU.length] +
    '" data-rc-buku="' +
    esc(b.id) +
    '" role="button" tabindex="0" aria-pressed="' +
    dipilih +
    '"><b>' +
    esc(b.n) +
    '</b><span class="rc-rel-wadah">' +
    (lipat ? '<span class="rc-st lipat" aria-label="' + lipat + ' rencana lama">+' + lipat + '</span><i class="rc-rel" aria-hidden="true"></i>' : '') +
    (st.length ? rel : '<span class="rc-rel-kosong">Belum ada rencana</span>') +
    '</span><small' +
    (c && c.tiba ? ' class="tiba"' : '') +
    '>' +
    esc(ket) +
    '</small></div>'
  );
}
function renderRc() {
  var box = $('#rcIsi');
  if (!box) return;
  var S = rcSemua();
  if (!S.buku.length) {
    box.innerHTML =
      '<div class="ky-kosong"><b>Belum ada rencana</b><p>Tulis Rencana A lewat ikon pensil, lalu siapkan Rencana B sebagai cadangan. Bisa dibuat beberapa buku, satu buku untuk satu tujuan.</p></div>';
    if (typeof renderPgtUbin === 'function') renderPgtUbin();
    return;
  }
  var bk = rcBukuLihat(S.buku),
    item = rcDiBuku(S.item, bk),
    bAktif = S.buku.filter(function (b) {
      return b.id === bk;
    })[0];
  var h =
    '<div class="rc-jalur-daftar">' +
    S.buku
      .map(function (b, i) {
        return rcJalurHtml(b, rcDiBuku(S.item, b.id), b.id === bk, i);
      })
      .join('') +
    '</div>';
  if (!item.length) {
    h += '<p class="rc-kosong-isi rc-buku-kosong">Buku "' + esc(bAktif.n) + '" belum berisi rencana. Tulis lewat ikon pensil.</p>';
    box.innerHTML = h;
    if (typeof renderPgtUbin === 'function') renderPgtUbin();
    return;
  }
  var u = rcUrut(item),
    akt = u.aktif[0];
  if (!rcCari(item, rcLihat)) rcLihat = akt ? akt.id : u.siap.length ? u.siap[0].id : u.lalu[u.lalu.length - 1].id;
  var r = rcCari(item, rcLihat);
  h += '<p class="rc-buku-judul">' + RC_IK.buku + esc(bAktif.n) + '</p>' + rcLembarHtml(r, item);
  var pel = u.lalu.filter(function (x) {
    return x.ref && (x.ref.pelajaran || x.ref.terjadi);
  });
  if (pel.length)
    h +=
      '<div class="rc-arsip"><h4>' +
      RC_IK.lampu +
      'Pelajaran & keberhasilan</h4><ul>' +
      pel
        .slice()
        .reverse()
        .map(function (x) {
          return (
            '<li class="' +
            x.status +
            '"><button type="button" data-rc-lihat="' +
            esc(x.id) +
            '" data-rc-bk="' +
            esc(x.bk) +
            '"><b>' +
            esc(rcJudul(x)) +
            (x.status === 'berhasil' ? ' · berhasil' : '') +
            '</b>' +
            (x.ref.tgl ? '<small>' + esc(pgFmt(x.ref.tgl)) + '</small>' : '') +
            '<span>' +
            esc(x.ref.pelajaran || x.ref.terjadi) +
            '</span></button></li>'
          );
        })
        .join('') +
      '</ul></div>';
  box.innerHTML = h;
  if (typeof renderPgtUbin === 'function') renderPgtUbin();
}
function rcBaris(label, isi, ekstra) {
  if (!isi) return '';
  return '<div class="rc-f"><span>' + label + '</span><p>' + esc(isi) + '</p>' + (ekstra || '') + '</div>';
}
function rcLembarHtml(r, item) {
  var n = rcSisa(r.cek),
    lanjut = r.lanjut ? rcCari(item, r.lanjut) : null,
    ke = r.ref && r.ref.ke ? rcCari(item, r.ref.ke) : null;
  var kosong = !r.isi && !r.kalau && !r.cek && !r.bekal && !lanjut && !r.ref;
  return (
    '<article class="rc-lembar ' +
    r.status +
    '">' +
    '<p class="rc-status">' +
    esc(RC_STATUS[r.status]) +
    (r.ref && r.ref.tgl ? ' · ' + esc(pgFmt(r.ref.tgl)) : '') +
    '</p>' +
    '<h4 class="rc-judul">' +
    esc(rcJudul(r)) +
    '</h4>' +
    (r.nama ? '<p class="rc-nama">' + esc(r.nama) + '</p>' : '') +
    (r.isi ? '<div class="rc-isi">' + esc(r.isi) + '</div>' : '') +
    rcBaris('Beralih kalau', r.kalau) +
    (r.cek
      ? '<div class="rc-f rc-cek' +
        (n !== null && n <= 0 && r.status === 'aktif' ? ' tiba' : '') +
        '"><span>Dicek tanggal</span><p>' +
        esc(pgFmt(r.cek)) +
        (r.status === 'aktif' || r.status === 'siap' ? ' <em>' + esc(rcSisaTeks(n)) + '</em>' : '') +
        '</p></div>'
      : '') +
    rcBaris('Bekal dari rencana sebelumnya', r.bekal) +
    (lanjut && r.status !== 'arsip' && r.status !== 'berhasil'
      ? '<div class="rc-f"><span>Kalau beralih lanjut ke</span><p class="rc-ke">' +
        RC_IK.panah +
        esc(rcJudul(lanjut) + (lanjut.nama ? ' · ' + lanjut.nama : '')) +
        '</p></div>'
      : '') +
    (r.ref
      ? '<div class="rc-ref"><h5>Refleksi</h5>' +
        rcBaris('Yang terjadi', r.ref.terjadi) +
        rcBaris('Pelajaran', r.ref.pelajaran) +
        rcBaris('Yang dibawa', r.ref.dibawa) +
        (ke ? '<p class="rc-ke">' + RC_IK.panah + 'Beralih ke ' + esc(rcJudul(ke)) + '</p>' : '') +
        '</div>'
      : '') +
    (kosong ? '<p class="rc-kosong-isi">Belum ada catatan. Tulis lewat ikon pensil.</p>' : '') +
    '</article>'
  );
}
$('#rcIsi').addEventListener('click', function (e) {
  var b = e.target.closest('[data-rc-lihat]');
  if (b) {
    rcSetBuku(b.getAttribute('data-rc-bk'));
    rcLihat = b.getAttribute('data-rc-lihat');
    renderRc();
    var l = $('#rcIsi .rc-lembar');
    if (l && b.closest('.rc-arsip')) l.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }
  var j = e.target.closest('[data-rc-buku]');
  if (j) {
    if (j.getAttribute('data-rc-buku') !== rcBukuLihat(rcSemua().buku)) rcLihat = '';
    rcSetBuku(j.getAttribute('data-rc-buku'));
    renderRc();
  }
});
$('#rcIsi').addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-rc-buku]')) {
    e.preventDefault();
    e.target.click();
  }
});
$('#rcEdit').addEventListener('click', function () {
  openLayer('page:rencana-edit');
});

/* Pengingat kecil: tanggal cek rencana aktif sudah tiba (sekali sehari per HP) */
function rcIngat() {
  var S = rcSemua(),
    kena = null;
  S.buku.some(function (b) {
    var c = rcCekBuku(rcDiBuku(S.item, b.id));
    if (c && c.tiba) kena = { b: b, r: c.r };
    return !!kena;
  });
  if (!kena) return;
  var a = kena.r,
    kunci = pgeHariIni() + ':' + a.id;
  try {
    if (localStorage.getItem(K_RC_INGAT) === kunci) return;
    localStorage.setItem(K_RC_INGAT, kunci);
  } catch (e) {
    return;
  }
  toast('Waktunya mengecek ' + rcJudul(a) + (S.buku.length > 1 ? ' di "' + kena.b.n + '"' : a.nama ? ': ' + a.nama : '') + ' (Impian › Progress)');
}
setTimeout(rcIngat, 7000);

/* ============================================================
   Halaman Edit rencana — semua perubahan di draf, tersimpan saat Simpan
   ============================================================ */
var rceDraf = null,
  rceBuku = null /* draf daftar buku */,
  rceBk = '' /* buku yang sedang diedit */,
  rcePilih = '',
  rceKotor = false,
  rceBeralih = null; /* { jenis: 'beralih'|'berhasil', ke, terjadi, pelajaran, dibawa } */
function rceItem() {
  return rcDiBuku(rceDraf, rceBk);
}
function rceRencana() {
  return rcCari(rceItem(), rcePilih);
}
function rceHurufBaru() {
  var pakai = {};
  rceItem().forEach(function (r) {
    pakai[r.huruf] = 1;
  });
  for (var i = 0; i < 702; i++) if (!pakai[rcHuruf(i)]) return rcHuruf(i);
  return '?';
}
PAGES['rencana-edit'] = function () {
  var S = rcSemua();
  rceDraf = JSON.parse(JSON.stringify(S.item));
  rceBuku = JSON.parse(JSON.stringify(S.buku));
  if (!rceBuku.length) rceBuku = [{ id: uid(), n: 'Rencana utama' }];
  rceBk = rcBukuLihat(rceBuku);
  rcePilihAwal();
  rceKotor = false;
  rceBeralih = null;
  $('#subTitle').textContent = 'Edit rencana';
  rceRender();
  return true;
};
function rcePilihAwal() {
  var it = rceItem();
  if (!rcCari(it, rcePilih)) {
    var a = rcAktif(it);
    rcePilih = a ? a.id : it.length ? it[0].id : '';
  }
}
function rceBukuIni() {
  return rceBuku.filter(function (b) {
    return b.id === rceBk;
  })[0];
}
function rceBukuHtml() {
  var b = rceBukuIni();
  return (
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    RC_IK.buku +
    'Buku</h3><div class="rce-buku-c">' +
    rceBuku
      .map(function (x) {
        return (
          '<button type="button" data-rce="buku" data-id="' +
          esc(x.id) +
          '"' +
          (x.id === rceBk ? ' class="on"' : '') +
          '>' +
          esc(x.n || 'Buku tanpa nama') +
          ' <small>' +
          rcDiBuku(rceDraf, x.id).length +
          '</small></button>'
        );
      })
      .join('') +
    (rceBuku.length < RC_BUKU_MAKS ? '<button type="button" class="baru" data-rce="buku-baru">' + RC_IK.plus + 'Buku baru</button>' : '') +
    '</div>' +
    (b
      ? '<div class="field"><label for="rce-buku-nama">Nama buku</label><input class="input" id="rce-buku-nama" maxlength="' +
        RC_BUKU_NAMA +
        '" value="' +
        esc(b.n) +
        '" placeholder="mis. Bisnis SaaS, Karier" autocomplete="off"></div>' +
        '<button type="button" class="se-reset pge-reset" data-rce="buku-hapus">Hapus buku "' +
        esc(b.n || 'Buku tanpa nama') +
        '"</button>'
      : '<p class="ie-bantu">Belum ada buku. Ketuk "Buku baru".</p>') +
    '</section>'
  );
}
function rceTa(id, label, nilai, maks, ph, baris) {
  return (
    '<div class="field"><label for="' +
    id +
    '">' +
    label +
    '</label><textarea class="input" id="' +
    id +
    '" rows="' +
    (baris || 2) +
    '" maxlength="' +
    maks +
    '" placeholder="' +
    esc(ph || '') +
    '" data-rce-f="' +
    id.replace('rce-', '') +
    '">' +
    esc(nilai || '') +
    '</textarea></div>'
  );
}
function rceRender() {
  var r = rceRencana(),
    it = rceItem(),
    u = rcUrut(it),
    urut = u.lalu.concat(u.aktif, u.siap);
  var h = '<div class="se rce">' + rceBukuHtml();
  if (!rceBukuIni()) {
    $('#subBody').innerHTML =
      h +
      '<div class="se-bawah"><button type="button" class="btn ghost" data-rce="batal">Batal</button><button type="button" class="btn primary" data-rce="simpan">Simpan</button></div></div>';
    return;
  }
  h +=
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    RC_IK.panah +
    'Rencana di buku ini</h3><div class="rce-deret">' +
    urut
      .map(function (x) {
        return (
          '<button type="button" class="rc-bulat kecil ' +
          x.status +
          (x.id === rcePilih ? ' lihat' : '') +
          '" data-rce="pilih" data-id="' +
          esc(x.id) +
          '" aria-label="' +
          esc(rcJudul(x)) +
          '">' +
          esc(x.huruf) +
          '</button>'
        );
      })
      .join('') +
    (rceDraf.length < RC_MAKS ? '<button type="button" class="rc-bulat kecil tambah" data-rce="baru" aria-label="Rencana baru">' + RC_IK.plus + '</button>' : '') +
    '</div>' +
    (r ? '<p class="rce-status">' + esc(rcJudul(r)) + ' · ' + esc(RC_STATUS[r.status]) + '</p>' : '<p class="ie-bantu">Belum ada rencana. Ketuk + untuk menulis Rencana A.</p>') +
    '</section>';
  if (r) {
    var pilihanLanjut = it.filter(function (x) {
      return x.id !== r.id && x.status === 'siap';
    });
    h +=
      '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
      esc(rcJudul(r)) +
      '</h3>' +
      '<div class="field"><label for="rce-nama">Nama rencana</label><input class="input" id="rce-nama" maxlength="' +
      RC_NAMA +
      '" value="' +
      esc(r.nama) +
      '" placeholder="mis. Kuliah sambil kerja paruh waktu" data-rce-f="nama"></div>' +
      rceTa('rce-isi', 'Catatan', r.isi, RC_ISI, 'Tulis bebas: rencananya seperti apa, kenapa, apa yang dibutuhkan…', 5) +
      rceTa('rce-kalau', 'Beralih kalau', r.kalau, RC_FIELD, 'mis. Sampai Juni belum diterima di mana pun') +
      '<div class="field"><label for="rce-cek">Dicek tanggal</label><input class="input" type="date" id="rce-cek" value="' +
      esc(r.cek) +
      '" data-rce-f="cek"><small class="ie-bantu">Hari itu Stivora mengingatkan untuk menilai rencana ini.</small></div>' +
      rceTa('rce-bekal', 'Bekal dari rencana sebelumnya', r.bekal, RC_FIELD, 'Yang sudah kamu punya dari rencana sebelumnya') +
      (r.status === 'aktif' || r.status === 'siap'
        ? '<div class="field"><label for="rce-lanjut">Kalau beralih lanjut ke</label><select class="input" id="rce-lanjut" data-rce-f="lanjut"><option value="">Belum ditentukan</option>' +
          pilihanLanjut
            .map(function (x) {
              return '<option value="' + esc(x.id) + '"' + (x.id === r.lanjut ? ' selected' : '') + '>' + esc(rcJudul(x) + (x.nama ? ' · ' + x.nama : '')) + '</option>';
            })
            .join('') +
          '</select></div>'
        : '') +
      (r.ref
        ? '<h4 class="rce-sub">Refleksi</h4>' +
          rceTa('rce-ref-terjadi', 'Yang terjadi', r.ref.terjadi, RC_FIELD, '') +
          rceTa('rce-ref-pelajaran', 'Pelajaran', r.ref.pelajaran, RC_FIELD, '') +
          rceTa('rce-ref-dibawa', 'Yang dibawa', r.ref.dibawa, RC_FIELD, '')
        : '') +
      '</section>';
    h += rceAksiHtml(r);
  }
  h +=
    '<div class="se-bawah"><button type="button" class="btn ghost" data-rce="batal">Batal</button><button type="button" class="btn primary" data-rce="simpan">Simpan</button></div></div>';
  $('#subBody').innerHTML = h;
  $$('#subBody .rce textarea').forEach(ieTinggi);
}
function rceAksiHtml(r) {
  var b = rceBeralih,
    h = '<section class="ie-bagian se-kartu rce-aksi">';
  if (b && r.status === 'aktif') {
    var siap = rceItem().filter(function (x) {
      return x.status === 'siap';
    });
    h +=
      '<h3 class="se-judul">' +
      (b.jenis === 'berhasil' ? RC_IK.cek + 'Tandai berhasil' : RC_IK.panah + 'Beralih rencana') +
      '</h3>' +
      '<p class="ie-bantu">' +
      (b.jenis === 'berhasil'
        ? 'Catat yang terjadi dan pelajarannya sebelum rencana ini masuk arsip keberhasilan.'
        : 'Sebelum beralih, tulis refleksinya. Ini wajib, supaya pelajaran dari ' + esc(rcJudul(r)) + ' tidak hilang.') +
      '</p>' +
      (b.jenis === 'beralih'
        ? '<div class="field"><label for="rceKe">Beralih ke</label><select class="input" id="rceKe" data-rce-b="ke">' +
          siap
            .map(function (x) {
              return '<option value="' + esc(x.id) + '"' + (x.id === b.ke ? ' selected' : '') + '>' + esc(rcJudul(x) + (x.nama ? ' · ' + x.nama : '')) + '</option>';
            })
            .join('') +
          '<option value="baru"' +
          (b.ke === 'baru' ? ' selected' : '') +
          '>Rencana baru (' +
          esc('Rencana ' + rceHurufBaru()) +
          ')</option></select></div>'
        : '') +
      '<div class="field"><label for="rceB-terjadi">Yang terjadi <em class="wajib">wajib</em></label><textarea class="input" id="rceB-terjadi" rows="2" maxlength="' +
      RC_FIELD +
      '" data-rce-b="terjadi">' +
      esc(b.terjadi) +
      '</textarea></div>' +
      '<div class="field"><label for="rceB-pelajaran">Pelajaran <em class="wajib">wajib</em></label><textarea class="input" id="rceB-pelajaran" rows="2" maxlength="' +
      RC_FIELD +
      '" data-rce-b="pelajaran">' +
      esc(b.pelajaran) +
      '</textarea></div>' +
      '<div class="field"><label for="rceB-dibawa">Yang dibawa' +
      (b.jenis === 'beralih' ? ' <em class="wajib">wajib</em>' : '') +
      '</label><textarea class="input" id="rceB-dibawa" rows="2" maxlength="' +
      RC_FIELD +
      '" data-rce-b="dibawa" placeholder="Bekal yang dipakai di rencana berikutnya">' +
      esc(b.dibawa) +
      '</textarea></div>' +
      '<div class="rce-tombol"><button type="button" class="btn ghost" data-rce="beralih-batal">Batal</button><button type="button" class="btn primary" data-rce="beralih-ok">' +
      (b.jenis === 'berhasil' ? 'Tandai berhasil' : 'Beralih') +
      '</button></div>';
  } else {
    h += '<div class="rce-tombol-daftar">';
    if (r.status === 'aktif') {
      h +=
        '<button type="button" class="row" data-rce="beralih"><span class="row-ic">' +
        RC_IK.panah +
        '</span><span class="row-text"><b>Beralih ke rencana lain</b><small>Wajib menulis refleksi dulu</small></span></button>' +
        '<button type="button" class="row" data-rce="berhasil"><span class="row-ic">' +
        RC_IK.cek +
        '</span><span class="row-text"><b>Tandai berhasil</b><small>Rencana ini tercapai</small></span></button>';
    } else if (r.status === 'siap' && !rcAktif(rceItem())) {
      h +=
        '<button type="button" class="row" data-rce="aktifkan"><span class="row-ic">' +
        RC_IK.panah +
        '</span><span class="row-text"><b>Jalankan rencana ini</b><small>Belum ada rencana yang sedang dijalankan</small></span></button>';
    }
    h += '</div><button type="button" class="se-reset pge-reset" data-rce="hapus">Hapus ' + esc(rcJudul(r)) + '</button>';
  }
  return h + '</section>';
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'rencana-edit' || !rceDraf) return;
  var b = e.target.closest('[data-rce]');
  if (!b) return;
  var aksi = b.getAttribute('data-rce'),
    r = rceRencana();
  if (aksi === 'buku' || aksi === 'buku-baru') {
    if (rceBeralih) {
      toast('Selesaikan atau batalkan peralihan dulu');
      return;
    }
    if (aksi === 'buku-baru') {
      var nb = { id: uid(), n: 'Buku baru' };
      rceBuku.push(nb);
      rceBk = nb.id;
      rceKotor = true;
    } else rceBk = b.dataset.id;
    rcePilih = '';
    rcePilihAwal();
    rceRender();
    if (aksi === 'buku-baru') {
      var bn = $('#rce-buku-nama');
      if (bn) {
        bn.focus();
        bn.select();
      }
    }
    return;
  }
  if (aksi === 'buku-hapus') {
    var bb = rceBukuIni();
    if (!bb) return;
    if (rceBeralih) {
      toast('Selesaikan atau batalkan peralihan dulu');
      return;
    }
    var jml = rcDiBuku(rceDraf, bb.id).length;
    askConfirm({
      title: 'Hapus buku "' + (bb.n || 'Buku tanpa nama') + '"?',
      text: (jml ? 'Buku ini dan ' + jml + ' rencana di dalamnya (termasuk refleksinya)' : 'Buku kosong ini') + ' dihapus setelah Simpan.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          rceDraf = rceDraf.filter(function (x) {
            return x.bk !== bb.id;
          });
          rceBuku = rceBuku.filter(function (x) {
            return x.id !== bb.id;
          });
          rceBk = rceBuku.length ? rceBuku[0].id : '';
          rcePilih = '';
          rcePilihAwal();
          rceKotor = true;
          rceRender();
        });
      }
    });
    return;
  }
  if (aksi === 'pilih') {
    if (rceBeralih) {
      toast('Selesaikan atau batalkan peralihan dulu');
      return;
    }
    rcePilih = b.dataset.id;
    rceRender();
  } else if (aksi === 'baru') {
    if (rceBeralih) {
      toast('Selesaikan atau batalkan peralihan dulu');
      return;
    }
    var n = rcRapikan({ id: uid(), bk: rceBk, huruf: rceHurufBaru(), status: rcAktif(rceItem()) ? 'siap' : 'aktif', dibuat: Date.now() }, rceDraf.length);
    rceDraf.push(n);
    rcePilih = n.id;
    rceKotor = true;
    rceRender();
    var nm = $('#rce-nama');
    if (nm) nm.focus();
  } else if ((aksi === 'beralih' || aksi === 'berhasil') && r) {
    var siap = rceItem().filter(function (x) {
      return x.status === 'siap';
    });
    rceBeralih = { jenis: aksi, ke: r.lanjut || (siap[0] ? siap[0].id : 'baru'), terjadi: '', pelajaran: '', dibawa: '' };
    rceRender();
    var s = $('#subBody .rce-aksi');
    if (s) s.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else if (aksi === 'beralih-batal') {
    rceBeralih = null;
    rceRender();
  } else if (aksi === 'beralih-ok' && r && rceBeralih) {
    rceBeralihJalankan(r);
  } else if (aksi === 'aktifkan' && r) {
    r.status = 'aktif';
    rceKotor = true;
    rceRender();
  } else if (aksi === 'hapus' && r) {
    askConfirm({
      title: 'Hapus ' + rcJudul(r) + '?',
      text: 'Catatan' + (r.ref ? ' dan refleksi' : '') + ' rencana ini dihapus setelah Simpan.' + (r.status === 'aktif' ? ' Belum ada rencana lain yang otomatis menggantikannya.' : ''),
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          rceDraf = rceDraf.filter(function (x) {
            return x.id !== r.id;
          });
          rceDraf.forEach(function (x) {
            if (x.lanjut === r.id) x.lanjut = '';
          });
          rcePilih = '';
          rcePilihAwal();
          rceKotor = true;
          rceRender();
        });
      }
    });
  } else if (aksi === 'batal') {
    if (!rceKotor && !rceBeralih) {
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
  } else if (aksi === 'simpan') {
    if (rceBeralih) {
      toast('Selesaikan atau batalkan peralihan dulu');
      return;
    }
    rceSimpan();
  }
});
function rceBeralihJalankan(r) {
  var b = rceBeralih,
    perlu = b.jenis === 'beralih' ? ['terjadi', 'pelajaran', 'dibawa'] : ['terjadi', 'pelajaran'];
  for (var i = 0; i < perlu.length; i++) {
    if (!String(b[perlu[i]]).trim()) {
      var el = $('#rceB-' + perlu[i]);
      if (el) {
        el.classList.add('error');
        el.focus();
      }
      toast('Refleksi wajib diisi');
      return;
    }
  }
  var hari = pgeHariIni(),
    ke = null;
  if (b.jenis === 'beralih') {
    if (b.ke === 'baru' || !rcCari(rceItem(), b.ke)) {
      ke = rcRapikan({ id: uid(), bk: rceBk, huruf: rceHurufBaru(), status: 'siap', dibuat: Date.now() }, rceDraf.length);
      rceDraf.push(ke);
    } else ke = rcCari(rceItem(), b.ke);
    ke.status = 'aktif';
    if (!String(ke.bekal).trim()) ke.bekal = String(b.dibawa).trim().slice(0, RC_FIELD);
  }
  r.status = b.jenis === 'berhasil' ? 'berhasil' : 'arsip';
  r.ref = {
    terjadi: String(b.terjadi).trim().slice(0, RC_FIELD),
    pelajaran: String(b.pelajaran).trim().slice(0, RC_FIELD),
    dibawa: String(b.dibawa).trim().slice(0, RC_FIELD),
    tgl: hari,
    ke: ke ? ke.id : ''
  };
  r.lanjut = '';
  rceBeralih = null;
  rceKotor = true;
  rcePilih = ke ? ke.id : r.id;
  rceRender();
  toast(ke ? 'Sekarang menjalankan ' + rcJudul(ke) + ' — tekan Simpan' : rcJudul(r) + ' ditandai berhasil — tekan Simpan');
}
function rceUbah(e) {
  if (pageKind !== 'rencana-edit' || !rceDraf) return;
  var t = e.target;
  if (t.dataset.rceB && rceBeralih) {
    rceBeralih[t.dataset.rceB] = t.value;
    t.classList.remove('error');
    if (t.tagName === 'TEXTAREA') ieTinggi(t);
    return;
  }
  if (t.id === 'rce-buku-nama') {
    var bb = rceBukuIni();
    if (bb) {
      bb.n = t.value.slice(0, RC_BUKU_NAMA);
      rceKotor = true;
      var c = $('#subBody .rce-buku-c .on');
      if (c && c.firstChild) c.firstChild.nodeValue = (bb.n || 'Buku tanpa nama') + ' ';
    }
    return;
  }
  var f = t.dataset.rceF,
    r = rceRencana();
  if (!f || !r) return;
  if (f.indexOf('ref-') === 0) {
    if (!r.ref) r.ref = { terjadi: '', pelajaran: '', dibawa: '', tgl: '', ke: '' };
    r.ref[f.slice(4)] = t.value;
  } else r[f] = t.value;
  if (t.tagName === 'TEXTAREA') ieTinggi(t);
  rceKotor = true;
}
$('#subBody').addEventListener('input', rceUbah);
$('#subBody').addEventListener('change', rceUbah);
function rceSimpan() {
  var lama = {};
  rcData().forEach(function (r) {
    lama[r.id] = JSON.stringify(r);
  });
  var item = rceDraf
    .map(function (r, i) {
      ['nama', 'isi', 'kalau', 'bekal'].forEach(function (k) {
        r[k] = String(r[k] || '').trim();
      });
      var x = rcRapikan(r, i);
      if (lama[x.id] !== undefined && lama[x.id] !== JSON.stringify(x)) x.diubah = Date.now();
      return x;
    })
    .filter(Boolean);
  var buku = rceBuku.map(function (b) {
    return { id: b.id, n: String(b.n || '').trim().slice(0, RC_BUKU_NAMA) || 'Buku tanpa nama' };
  });
  store.set(K_RC, item.length || buku.length ? { buku: buku, item: item } : null);
  rceKotor = false;
  if (rceBk) rcSetBuku(rceBk);
  var a = rcAktif(rcDiBuku(item, rceBk));
  rcLihat = a ? a.id : rcePilih;
  back(1, function () {
    renderRc();
    toast('Rencana disimpan');
  });
}

/* ============================================================
   Tab Progress: 3 ubin ringkasan yang sekaligus jadi tab (5.75.0)
   "Kenapa aku yakin mampu" tetap selalu tampil di atas.
   Ubin: Peta jalan · Proyek · Rencana — ketuk = hanya bagian itu yang tampil. Pilihan diingat per HP.
   ============================================================ */
var K_PGT = 'stivora.progress.bagian',
  PGT_WARNA = RC_WARNA_BUKU;
var PGT_IK = {
  jalan: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/></svg>',
  proyek: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/></svg>',
  rencana: RC_IK.buku
};
function pgtPilihan() {
  var v = '';
  try {
    v = localStorage.getItem(K_PGT) || '';
  } catch (e) {}
  return v === 'proyek' || v === 'rencana' ? v : 'jalan';
}
function pgtRingkas() {
  /* Peta jalan */
  var j = { v: 'Belum ada', k: 'Susun lewat pensil', p: -1 };
  var d = typeof pgData === 'function' ? pgData() : null;
  if (d && d.fase.length) {
    var tot = 0,
      sel = 0,
      ak = -1;
    d.fase.forEach(function (f, i) {
      tot += f.langkah.length;
      sel += pgJml(f);
      if (ak < 0 && !pgSelesai(f)) ak = i;
    });
    var pct = tot ? Math.round((sel / tot) * 100) : 0;
    j =
      ak < 0
        ? { v: 'Selesai', k: d.fase.length + ' fase tercapai', p: 100 }
        : { v: 'Fase ' + (ak + 1) + '/' + d.fase.length, k: d.fase[ak].nama || pct + '% tercapai', p: pct };
  }
  /* Proyek */
  var py = { v: 'Belum ada', k: 'Tambah lewat pensil', L: [] };
  var P = typeof pryData === 'function' ? pryData() : [];
  if (P.length)
    py = {
      v: P.length + ' proyek',
      k: '',
      L: P.slice(0, 2).map(function (p) {
        var h = pryHitung(p);
        return (p.nama || 'Proyek') + ' · ' + (h.tahapKini ? h.tahapKini.nama : 'Rawat');
      })
    };
  /* Rencana */
  var S = rcSemua(),
    tiba = 0;
  S.buku.forEach(function (b) {
    var c = rcCekBuku(rcDiBuku(S.item, b.id));
    if (c && c.tiba) tiba++;
  });
  var rc = S.buku.length
    ? { v: S.buku.length + ' buku', k: tiba ? tiba + ' perlu dicek' : 'Semua aman', tiba: tiba, n: S.buku.length }
    : { v: 'Belum ada', k: 'Tulis lewat pensil', tiba: 0, n: 0 };
  return { jalan: j, proyek: py, rencana: rc };
}
function renderPgtUbin() {
  var box = $('#pgtUbin');
  if (!box) return;
  var pil = pgtPilihan(),
    R = pgtRingkas();
  var ubin = function (k, nama, isi) {
    return (
      '<button type="button" class="pgt' +
      (k === pil ? ' on' : '') +
      '" data-pgt-pilih="' +
      k +
      '" role="tab" aria-selected="' +
      (k === pil) +
      '"><span class="pgt-t">' +
      PGT_IK[k] +
      nama +
      '</span>' +
      isi +
      '</button>'
    );
  };
  box.innerHTML =
    ubin(
      'jalan',
      'Peta jalan',
      '<b>' +
        esc(R.jalan.v) +
        '</b>' +
        (R.jalan.p >= 0 ? '<span class="pgt-bar"><i style="width:' + R.jalan.p + '%"></i></span>' : '') +
        '<small>' +
        esc(R.jalan.k) +
        '</small>'
    ) +
    ubin(
      'proyek',
      'Proyek',
      '<b>' +
        esc(R.proyek.v) +
        '</b>' +
        (R.proyek.L.length
          ? R.proyek.L.map(function (t) {
              return '<small>' + esc(t) + '</small>';
            }).join('')
          : '<small>' + esc(R.proyek.k) + '</small>')
    ) +
    ubin(
      'rencana',
      'Rencana',
      (R.rencana.tiba ? '<i class="pgt-titik" aria-label="Ada rencana yang perlu dicek"></i>' : '') +
        '<b>' +
        esc(R.rencana.v) +
        '</b>' +
        (R.rencana.n
          ? '<span class="pgt-buku">' +
            rcSemua()
              .buku.slice(0, 6)
              .map(function (b, i) {
                return '<i style="background:' + PGT_WARNA[i % PGT_WARNA.length] + '"></i>';
              })
              .join('') +
            '</span>'
          : '') +
        '<small' +
        (R.rencana.tiba ? ' class="tiba"' : '') +
        '>' +
        esc(R.rencana.k) +
        '</small>'
    );
  $$('#itIsi-progress [data-pgt]').forEach(function (w) {
    w.hidden = w.getAttribute('data-pgt') !== pil;
  });
}
$('#pgtUbin').addEventListener('click', function (e) {
  var b = e.target.closest('[data-pgt-pilih]');
  if (!b) return;
  try {
    localStorage.setItem(K_PGT, b.getAttribute('data-pgt-pilih'));
  } catch (x) {}
  renderPgtUbin();
});
/* Ringkasan ubin ikut diperbarui setiap Peta jalan / Proyek digambar ulang (Rencana memanggilnya sendiri) */
(function () {
  ['renderPg', 'renderPry'].forEach(function (n) {
    var asli = window[n];
    if (typeof asli !== 'function') return;
    window[n] = function () {
      var hasil = asli.apply(this, arguments);
      renderPgtUbin();
      return hasil;
    };
  });
})();
renderRc();
