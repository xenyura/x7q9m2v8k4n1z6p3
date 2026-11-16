/* ============================================================
   Stivora — Impian · Progress · Rencana cadangan (5.68.0)
   Satu buku rencana: Rencana A, B, C, … berupa catatan (bukan langkah-langkah).
   - Satu rencana aktif, beberapa cadangan siap, sisanya arsip (dengan pelajaran) atau berhasil.
   - Beralih wajib menulis refleksi: yang terjadi, pelajaran, yang dibawa.
   - Halaman Progress hanya untuk dibaca; semua perubahan lewat ikon pensil (#rcEdit).
   - Pengingat kecil saat tanggal cek rencana aktif tiba.
   Kunci: stivora.impian.rencana = { item: [rencana] }  (sinkron per rencana: PECAHAN 'rencana-r-<id>')
   rencana = { id, huruf, nama, isi, kalau, cek: 'YYYY-MM-DD', bekal, lanjut: id,
               status: 'aktif'|'siap'|'arsip'|'berhasil', dibuat, diubah,
               ref: { terjadi, pelajaran, dibawa, tgl, ke } }
   ============================================================ */
'use strict';

var K_RC = 'stivora.impian.rencana',
  K_RC_INGAT = 'stivora.rencana.diingatkan'; /* per HP */
var RC_MAKS = 60,
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
function rcData() {
  var d = store.get(K_RC, null);
  var item = (d && Array.isArray(d.item) ? d.item : []).map(rcRapikan).filter(Boolean).slice(0, RC_MAKS);
  /* Hanya satu yang aktif */
  var ada = false;
  item.forEach(function (r) {
    if (r.status === 'aktif') {
      if (ada) r.status = 'siap';
      ada = true;
    }
  });
  return item;
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

/* ---------- Tampilan baca (tab Progress) ---------- */
function renderRc() {
  var box = $('#rcIsi');
  if (!box) return;
  var item = rcData();
  if (!item.length) {
    box.innerHTML =
      '<div class="ky-kosong"><b>Belum ada rencana</b><p>Tulis Rencana A lewat ikon pensil, lalu siapkan Rencana B sebagai cadangan. Cukup catatan, tidak perlu langkah-langkah.</p></div>';
    return;
  }
  var u = rcUrut(item),
    akt = u.aktif[0];
  if (!rcCari(item, rcLihat)) rcLihat = akt ? akt.id : u.siap.length ? u.siap[0].id : u.lalu[u.lalu.length - 1].id;
  var lalu = u.lalu,
    lipat = 0;
  if (!rcArsipSemua && lalu.length > RC_ARSIP_TAMPIL) {
    lipat = lalu.length - RC_ARSIP_TAMPIL;
    lalu = lalu.slice(lipat);
  }
  var bulat = function (r) {
    return (
      '<button type="button" class="rc-bulat ' +
      r.status +
      (r.id === rcLihat ? ' lihat' : '') +
      '" data-rc-lihat="' +
      esc(r.id) +
      '" aria-label="' +
      esc(rcJudul(r) + ' · ' + RC_STATUS[r.status]) +
      '" aria-pressed="' +
      (r.id === rcLihat) +
      '">' +
      esc(r.huruf) +
      (r.status === 'berhasil' ? '<i>' + RC_IK.cek + '</i>' : '') +
      '</button>'
    );
  };
  var h =
    '<div class="rc-deret" role="group" aria-label="Rencana">' +
    (lipat ? '<button type="button" class="rc-bulat lipat" data-rc-semua aria-label="Tampilkan ' + lipat + ' rencana lama">+' + lipat + '</button>' : '') +
    lalu.map(bulat).join('') +
    (lalu.length && (u.aktif.length || u.siap.length) ? '<span class="rc-garis" aria-hidden="true"></span>' : '') +
    u.aktif.map(bulat).join('') +
    u.siap.map(bulat).join('') +
    '</div>';
  var r = rcCari(item, rcLihat);
  h += rcLembarHtml(r, item);
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
  if (e.target.closest('[data-rc-semua]')) {
    rcArsipSemua = true;
    renderRc();
    return;
  }
  var b = e.target.closest('[data-rc-lihat]');
  if (!b) return;
  rcLihat = b.getAttribute('data-rc-lihat');
  renderRc();
  var l = $('#rcIsi .rc-lembar');
  if (l && b.closest('.rc-arsip')) l.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});
$('#rcEdit').addEventListener('click', function () {
  openLayer('page:rencana-edit');
});
renderRc();

/* Pengingat kecil: tanggal cek rencana aktif sudah tiba (sekali sehari per HP) */
function rcIngat() {
  var a = rcAktif(rcData());
  if (!a || !a.cek) return;
  var n = rcSisa(a.cek);
  if (n === null || n > 0) return;
  var kunci = pgeHariIni() + ':' + a.id;
  try {
    if (localStorage.getItem(K_RC_INGAT) === kunci) return;
    localStorage.setItem(K_RC_INGAT, kunci);
  } catch (e) {
    return;
  }
  toast('Waktunya mengecek ' + rcJudul(a) + (a.nama ? ': ' + a.nama : '') + ' (Impian › Progress)');
}
setTimeout(rcIngat, 7000);

/* ============================================================
   Halaman Edit rencana — semua perubahan di draf, tersimpan saat Simpan
   ============================================================ */
var rceDraf = null,
  rcePilih = '',
  rceKotor = false,
  rceBeralih = null; /* { jenis: 'beralih'|'berhasil', ke, terjadi, pelajaran, dibawa } */
function rceRencana() {
  return rcCari(rceDraf, rcePilih);
}
function rceHurufBaru() {
  var pakai = {};
  rceDraf.forEach(function (r) {
    pakai[r.huruf] = 1;
  });
  for (var i = 0; i < 702; i++) if (!pakai[rcHuruf(i)]) return rcHuruf(i);
  return '?';
}
PAGES['rencana-edit'] = function () {
  rceDraf = JSON.parse(JSON.stringify(rcData()));
  if (!rcCari(rceDraf, rcePilih)) {
    var a = rcAktif(rceDraf);
    rcePilih = a ? a.id : rceDraf.length ? rceDraf[0].id : '';
  }
  rceKotor = false;
  rceBeralih = null;
  $('#subTitle').textContent = 'Edit rencana';
  rceRender();
  return true;
};
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
    u = rcUrut(rceDraf),
    urut = u.lalu.concat(u.aktif, u.siap);
  var h =
    '<div class="se rce">' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    RC_IK.buku +
    'Buku rencana</h3><div class="rce-deret">' +
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
    var pilihanLanjut = rceDraf.filter(function (x) {
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
    var siap = rceDraf.filter(function (x) {
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
    } else if (r.status === 'siap' && !rcAktif(rceDraf)) {
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
    var n = rcRapikan({ id: uid(), huruf: rceHurufBaru(), status: rcAktif(rceDraf) ? 'siap' : 'aktif', dibuat: Date.now() }, rceDraf.length);
    rceDraf.push(n);
    rcePilih = n.id;
    rceKotor = true;
    rceRender();
    var nm = $('#rce-nama');
    if (nm) nm.focus();
  } else if ((aksi === 'beralih' || aksi === 'berhasil') && r) {
    var siap = rceDraf.filter(function (x) {
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
          var a = rcAktif(rceDraf);
          rcePilih = a ? a.id : rceDraf.length ? rceDraf[0].id : '';
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
    if (b.ke === 'baru' || !rcCari(rceDraf, b.ke)) {
      ke = rcRapikan({ id: uid(), huruf: rceHurufBaru(), status: 'siap', dibuat: Date.now() }, rceDraf.length);
      rceDraf.push(ke);
    } else ke = rcCari(rceDraf, b.ke);
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
  store.set(K_RC, item.length ? { item: item } : null);
  rceKotor = false;
  var a = rcAktif(item);
  rcLihat = a ? a.id : rcePilih;
  back(1, function () {
    renderRc();
    toast('Rencana disimpan');
  });
}
