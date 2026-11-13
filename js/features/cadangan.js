/* Stivora — Halaman Cadangkan & pulihkan (cloud) dan Ekspor & impor (file) */
'use strict';

/* ---------- Cadangkan & pulihkan (cloud) ---------- */
function renderBackupRow() {
  $('#backupSub').textContent = user
    ? (atur().otomatis ? 'Aktif · ' : 'Manual · ') + (user.email || 'akun Google')
    : 'Cadangan otomatis ke cloud';
}
var IC_CAD = {
  otomatis:
    '<svg viewBox="0 0 24 24"><path d="M7 18.5a4.5 4.5 0 0 1-.9-8.9A6 6 0 0 1 17.7 8.4 4.1 4.1 0 0 1 17 18.5"/><path d="M9.5 14.5l2 2 3.5-4"/></svg>',
  antar:
    '<svg viewBox="0 0 24 24"><rect x="2.5" y="4" width="11" height="8" rx="1.5"/><path d="M6 15h4"/><rect x="15.5" y="9" width="6" height="11" rx="1.5"/><path d="M18.5 17.5h.01"/><path d="M8 18.5a5 5 0 0 0 5 2.5M13 7a5 5 0 0 1 4.5-1"/></svg>',
  media:
    '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg>',
  e2e: '<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/></svg>',
  pengingat: '<svg viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/></svg>',
  riwayat: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4.5l3 2"/></svg>',
  ekspor: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  bersih: '<svg viewBox="0 0 24 24"><path d="M14.5 3.5l6 6M12 6l6 6-7.5 7.5H5.5l-2-2a1.5 1.5 0 0 1 0-2.1z"/><path d="M8 9.5l6 6"/></svg>'
};
var ATUR_TEKS = {
  otomatis: { nama: 'Cadangan otomatis', ket: 'Kirim setiap perubahan ke cloud' },
  antar: { nama: 'Sinkronisasi antar perangkat', ket: 'Ambil perubahan dari perangkat lain' },
  media: { nama: 'Sertakan media', ket: 'Foto, video, dan media lain ikut ke cloud' },
  pengingat: { nama: 'Pengingat cadangan', ket: 'Ingatkan jika 2 hari belum dicadangkan' }
};
var ATUR_MATI = {
  otomatis: { title: 'Matikan cadangan otomatis?', text: 'Perubahan tidak dikirim ke cloud sampai kamu menekan "Cadangkan sekarang".' },
  antar: {
    title: 'Matikan sinkronisasi antar perangkat?',
    text: 'Perubahan dari perangkat lain tidak diambil ke perangkat ini. Perangkat ini tetap mengirim cadangannya ke cloud.'
  },
  media: { title: 'Jangan sertakan media?', text: 'Media baru hanya tersimpan di perangkat ini. Yang sudah ada di cloud tetap aman.' },
  pengingat: { title: 'Matikan pengingat cadangan?', text: 'Kamu tidak akan diingatkan walaupun datamu lama tidak dicadangkan.' }
};
function barisSwitch(k, on) {
  var t = ATUR_TEKS[k];
  return (
    '<button type="button" class="row" data-atur="' +
    k +
    '" role="switch" aria-checked="' +
    on +
    '">' +
    '<span class="row-ic">' +
    IC_CAD[k] +
    '</span>' +
    '<span class="row-text"><b>' +
    t.nama +
    '</b><small>' +
    t.ket +
    '</small></span>' +
    '<span class="switch' +
    (on ? ' on' : '') +
    '" aria-hidden="true"><i></i></span></button>'
  );
}
function barisLink(id, ic, nama, ket, nilai) {
  return (
    '<button type="button" class="row" id="' +
    id +
    '">' +
    '<span class="row-ic">' +
    ic +
    '</span>' +
    '<span class="row-text"><b>' +
    nama +
    '</b><small>' +
    ket +
    '</small></span>' +
    '<span class="row-end">' +
    (nilai ? '<span class="lang-val">' + nilai + '</span>' : '') +
    '<svg class="chev-sm" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button>'
  );
}
function e2eLabel() {
  if (!user) return 'Mati';
  if (e2e.info && !e2e.key) return 'Perlu sandi';
  return e2e.info ? 'Aktif' : 'Mati';
}
function terakhirLabel() {
  var t = store.get(K_TERAKHIR, 0);
  return t ? 'Terakhir dicadangkan ' + waktuRiwayat(t) : 'Belum pernah dicadangkan';
}
function buildBackupForm() {
  $('#subTitle').textContent = 'Cadangkan & pulihkan';
  var a = atur(),
    html;
  if (!user) {
    html =
      '<div class="auth-info"><span class="auth-ic">' +
      IC_CAD.otomatis +
      '</span>' +
      '<h3>Cadangan otomatis ke cloud</h3><p>Masuk dengan Google, lalu impian, media, dan data peta tercadangkan otomatis dan bisa dipulihkan di perangkat lain.</p></div>' +
      '<button type="button" class="btn primary" data-login>Masuk dengan Google</button>';
  } else {
    var s = syncLabel();
    html =
      '<div class="sync-card">' +
      '<div class="info-head"><span class="row-ic">' +
      IC_CAD.otomatis +
      '</span>' +
      '<div class="info-title"><b>Cadangan cloud</b>' +
      '<div class="sync-line"><span class="sync-dot ' +
      s.cls +
      '" id="syncDot"></span><span id="syncText">' +
      esc(s.text) +
      '</span></div></div></div>' +
      '<small>' +
      (a.otomatis
        ? 'Cadangan otomatis aktif ke akun <b>' + esc(user.email || '') + '</b>. Setiap perubahan langsung dikirim ke cloud.'
        : 'Cadangan otomatis mati. Tekan "Cadangkan sekarang" untuk mengirim ke akun <b>' + esc(user.email || '') + '</b>.') +
      '</small>' +
      '<small id="mediaText">' +
      esc(a.media ? mediaLabel() : 'Media tidak disertakan ke cloud') +
      '</small>' +
      '<button type="button" class="btn ghost" id="btnSyncNow"' +
      (sync.state === 'syncing' ? ' disabled' : '') +
      '>' +
      ICON.sync +
      'Cadangkan sekarang</button>' +
      '</div>';
  }
  html +=
    '<h3 class="group-title sub-group">Pengaturan cadangan</h3>' +
    '<div class="card list-card">' +
    barisSwitch('otomatis', a.otomatis) +
    barisSwitch('antar', a.antar) +
    barisSwitch('media', a.media) +
    barisLink('btnE2E', IC_CAD.e2e, 'Enkripsi end-to-end', 'Hanya kamu yang bisa membuka cadangan', e2eLabel()) +
    barisSwitch('pengingat', a.pengingat) +
    '</div>' +
    (user ? '' : '<p class="sub-note">Cadangan otomatis, sinkronisasi, media, dan enkripsi berlaku setelah kamu masuk dengan Google.</p>') +
    '<div class="card list-card sub-gap">' +
    barisLink('btnRiwayat', IC_CAD.riwayat, 'Riwayat cadangan', terakhirLabel()) +
    (user ? barisLink('btnBersih', IC_CAD.bersih, 'Bersihkan file cloud', 'Hapus file yatim yang tidak terpakai di R2') : '') +
    (user
      ? '<button type="button" class="row" id="btnRestoreCloud"><span class="row-ic">' +
        RESTORE_ICON +
        '</span><span class="row-text"><b>Pulihkan dari cloud</b><small>Ganti data di perangkat ini dengan cadangan di cloud</small></span></button>'
      : barisLink('btnKeEkspor', IC_CAD.ekspor, 'Ekspor ke file', 'Cadangkan tanpa akun, ke file .json')) +
    '</div>';
  $('#subBody').innerHTML = html;
  return true;
}
function ubahAtur(k, on) {
  setAtur(k, on);
  if (pageKind === 'backup') buildBackupForm();
  renderBackupRow();
  if (on && user && (k === 'otomatis' || k === 'antar' || k === 'media')) syncNow(k === 'antar' || k === 'media');
  toast(ATUR_TEKS[k].nama + (on ? ' dinyalakan' : ' dimatikan'));
}
function backupClick(e) {
  if (e.target.closest('[data-login]')) {
    loginGoogle();
    return;
  }
  var sw = e.target.closest('[data-atur]');
  if (sw) {
    var k = sw.dataset.atur,
      on = atur()[k];
    if (on) {
      askConfirm({
        title: ATUR_MATI[k].title,
        text: ATUR_MATI[k].text,
        ok: 'Matikan',
        action: function () {
          back(1, function () {
            ubahAtur(k, false);
          });
        }
      });
    } else ubahAtur(k, true);
    return;
  }
  if (e.target.closest('#btnE2E')) {
    openLayer('page:e2e');
    return;
  }
  if (e.target.closest('#btnBersih')) {
    if (!mediaConfigured()) {
      toast(fbMsg({ code: 'media_not_configured' }));
      return;
    }
    askConfirm({
      title: 'Bersihkan file cloud?',
      ok: 'Bersihkan',
      tone: 'primary',
      text: 'File di R2 yang tidak lagi tercatat di akunmu (sisa unggahan yang terputus) akan dihapus. Impian, media, dan isi Sampah tidak tersentuh.',
      action: function () {
        back(1, function () {
          toast('Memeriksa file cloud…');
          bersihkanYatim('manual').then(
            function (h) {
              toast(h && h.dihapus ? h.dihapus + ' file yatim dihapus (' + ukuranFile(h.hemat) + ')' : 'Tidak ada file yatim');
              if (pageKind === 'backup') buildBackupForm();
            },
            function (err) {
              toast(fbMsg(err));
            }
          );
        });
      }
    });
    return;
  }
  if (e.target.closest('#btnRiwayat')) {
    openLayer('page:riwayat');
    return;
  }
  if (e.target.closest('#btnKeEkspor')) {
    openLayer('page:transfer');
    return;
  }
  if (e.target.closest('#btnSyncNow')) {
    syncNow(true, 'manual');
    return;
  }
  if (e.target.closest('#btnRestoreCloud')) {
    askConfirm({
      title: 'Pulihkan dari cloud?',
      text: 'Impian, media, dan data peta di perangkat ini akan diganti dengan cadangan di cloud. Perubahan yang belum tercadangkan akan hilang.',
      ok: 'Pulihkan',
      action: function () {
        restoreFromCloud()
          .then(function () {
            back(1, function () {
              toast('Data dipulihkan dari cloud');
            });
          })
          .catch(function (err) {
            back(1, function () {
              toast(err && err.message && !err.code ? err.message : fbMsg(err));
            });
          });
      }
    });
  }
}
function restoreFromCloud() {
  if (!user || !fb) return Promise.reject({ code: 'unauthenticated' });
  var go = function () {
    return clearLocal()
      .then(function () {
        setMap('media', {});
        setMap('marker', {});
        setMap('jalur', {});
        setMap('area', {});
        setMap('data', {});
        return syncNow('paksa', 'pulihkan');
      })
      .then(function () {
        if (sync.state === 'error') throw { message: sync.err };
      });
  };
  return sync.running ? sync.running.then(go) : go();
}

/* ---------- Enkripsi end-to-end (halaman) ---------- */
var e2eSibuk = false;
function buildE2EForm() {
  $('#subTitle').textContent = 'Enkripsi end-to-end';
  var html = '<div class="auth-info"><span class="auth-ic">' + IC_CAD.e2e + '</span>';
  if (!user) {
    html +=
      '<h3>Masuk dengan Google dulu</h3><p>Enkripsi melindungi cadangan di cloud, jadi perlu akun Google yang tersambung.</p></div>' +
      (user ? '' : '<button type="button" class="btn primary" data-login>Masuk dengan Google</button>');
  } else if (!e2e.dicek) {
    html += '<h3>Memeriksa…</h3><p>Sedang membaca status enkripsi akunmu.</p></div>';
    if (fb)
      e2eSiapkan(user.uid)
        .catch(function () {})
        .then(function () {
          if (pageKind === 'e2e') buildE2EForm();
        });
  } else if (!e2e.info) {
    html +=
      '<h3>Enkripsi mati</h3><p>Impian, media, dan data peta di cloud dikunci dengan kata sandi yang hanya kamu tahu. Tanpa kata sandi itu, isinya tidak bisa dibaca siapa pun.</p></div>' +
      '<div class="field"><label for="e2eSandi">Kata sandi enkripsi</label><input class="input" type="password" id="e2eSandi" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>' +
      '<div class="field"><label for="e2eSandi2">Ulangi kata sandi</label><input class="input" type="password" id="e2eSandi2" autocomplete="new-password"></div>' +
      '<p class="sheet-note warn">Simpan kata sandi ini baik-baik. Jika lupa, cadangan di cloud tidak bisa dibuka — tidak ada yang bisa memulihkannya.</p>' +
      '<button type="button" class="btn primary" id="btnE2EOn">Aktifkan enkripsi</button>';
  } else if (!e2e.key) {
    html +=
      '<h3>Cadangan terenkripsi</h3><p>Akun ini memakai enkripsi end-to-end. Masukkan kata sandi enkripsi untuk membuka cadangan di perangkat ini.</p></div>' +
      '<div class="field"><label for="e2eSandi">Kata sandi enkripsi</label><input class="input" type="password" id="e2eSandi" autocomplete="current-password"></div>' +
      '<button type="button" class="btn primary" id="btnE2EBuka">Buka cadangan</button>';
  } else {
    html +=
      '<h3>Enkripsi aktif</h3><p>Cadangan di cloud terenkripsi. Perangkat ini sudah memegang kuncinya, jadi semuanya tetap tersinkron seperti biasa.</p></div>' +
      '<div class="field"><label for="e2eSandi">Kata sandi enkripsi (untuk mematikan)</label><input class="input" type="password" id="e2eSandi" autocomplete="current-password"></div>' +
      '<button type="button" class="btn soft-danger" id="btnE2EOff">Matikan enkripsi</button>';
  }
  $('#subBody').innerHTML = html;
  return true;
}
function e2eJalankan(proses, pesanOk) {
  e2eSibuk = true;
  toast('Memproses… jangan tutup aplikasi');
  $$('#subBody .btn').forEach(function (b) {
    b.disabled = true;
  });
  proses
    .then(
      function () {
        toast(pesanOk);
      },
      function (err) {
        toast(err && err.code ? fbMsg(err) : (err && err.message) || 'Gagal');
      }
    )
    .then(function () {
      e2eSibuk = false;
      if (pageKind === 'e2e') buildE2EForm();
      renderBackupRow();
    });
}
function e2eClick(e) {
  if (e.target.closest('[data-login]')) {
    loginGoogle();
    return;
  }
  if (e2eSibuk) return;
  var inp = $('#e2eSandi'),
    sandi = inp ? inp.value : '';
  if (e.target.closest('#btnE2EOn')) {
    if (sandi.length < 8) {
      inp.classList.add('error');
      toast('Kata sandi minimal 8 karakter');
      return;
    }
    if (sandi !== $('#e2eSandi2').value) {
      $('#e2eSandi2').classList.add('error');
      toast('Kata sandi tidak sama');
      return;
    }
    askConfirm({
      title: 'Aktifkan enkripsi end-to-end?',
      tone: 'primary',
      ok: 'Aktifkan',
      text: 'Semua impian, media, dan data peta di cloud akan dikunci dengan kata sandi ini. Perangkat lain perlu kata sandi yang sama. Jika lupa, cadangan di cloud tidak bisa dibuka.',
      action: function () {
        back(1, function () {
          e2eJalankan(aktifkanE2E(sandi), 'Enkripsi end-to-end aktif');
        });
      }
    });
  } else if (e.target.closest('#btnE2EBuka')) {
    if (!sandi) {
      inp.classList.add('error');
      return;
    }
    e2eJalankan(bukaE2E(sandi), 'Cadangan terbuka di perangkat ini');
  } else if (e.target.closest('#btnE2EOff')) {
    if (!sandi) {
      inp.classList.add('error');
      toast('Masukkan kata sandi enkripsi');
      return;
    }
    askConfirm({
      title: 'Matikan enkripsi?',
      ok: 'Matikan',
      text: 'Cadangan di cloud akan disimpan tanpa enkripsi lagi. Data tetap aman di akunmu, tapi tidak lagi dikunci dengan kata sandi.',
      action: function () {
        back(1, function () {
          e2eJalankan(matikanE2E(sandi), 'Enkripsi dimatikan');
        });
      }
    });
  }
}

/* ---------- Riwayat cadangan (halaman) ---------- */
var RIWAYAT_NAMA = {
  otomatis: 'Cadangan otomatis',
  manual: 'Cadangkan sekarang',
  pulihkan: 'Pulihkan dari cloud',
  ekspor: 'Ekspor ke file',
  impor: 'Impor dari file',
  'enkripsi-on': 'Enkripsi diaktifkan',
  'enkripsi-off': 'Enkripsi dimatikan',
  bersih: 'Pembersihan file cloud'
};
function waktuRiwayat(t) {
  var d = new Date(t),
    now = new Date();
  var jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  var hari = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (hari === 0) return 'hari ini ' + jam;
  if (hari === 1) return 'kemarin ' + jam;
  return (
    d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' }) +
    ' ' +
    jam
  );
}
function buildRiwayatForm() {
  $('#subTitle').textContent = 'Riwayat cadangan';
  var r = riwayat();
  $('#subBody').innerHTML =
    (r.length
      ? '<div class="card list-card riwayat">' +
        r
          .map(function (x) {
            var detail =
              x.jenis === 'bersih'
                ? x.pesan || ''
                : x.ok
                  ? x.impian + ' impian · ' + x.media + ' media' + (x.kali > 1 ? ' · ' + x.kali + ' kali' : '')
                  : x.pesan || 'Gagal';
            return (
              '<div class="row riwayat-item"><span class="sync-dot ' +
              (x.ok ? 'ok' : 'err') +
              '"></span>' +
              '<span class="row-text"><b>' +
              (RIWAYAT_NAMA[x.jenis] || 'Cadangan') +
              '</b><small>' +
              esc(detail) +
              '</small></span>' +
              '<span class="riwayat-waktu">' +
              waktuRiwayat(x.t) +
              '</span></div>'
            );
          })
          .join('') +
        '</div>'
      : '<div class="auth-info"><span class="auth-ic">' +
        IC_CAD.riwayat +
        '</span><h3>Belum ada riwayat</h3><p>Setiap cadangan ke cloud, pemulihan, ekspor, dan impor akan tercatat di sini.</p></div>') +
    '<p class="sub-note">Riwayat tersimpan di perangkat ini. Cadangan otomatis dalam satu jam digabung menjadi satu baris.</p>';
  return true;
}

/* ---------- Pengingat cadangan ---------- */
var K_MULAI = 'stivora.cadangan.mulai',
  K_INGAT = 'stivora.cadangan.diingatkan';
var INGAT_HARI = 2;
if (!store.get(K_MULAI, 0)) store.set(K_MULAI, Date.now());
function cekPengingat() {
  if (!atur().pengingat) return;
  if (typeof terkunci !== 'undefined' && terkunci) {
    setTimeout(cekPengingat, 3000);
    return;
  }
  if (!adaDataLokal()) return;
  var now = Date.now(),
    terakhir = store.get(K_TERAKHIR, 0);
  if (now - Math.max(terakhir, store.get(K_MULAI, now)) < INGAT_HARI * 86400000) return;
  if (now - store.get(K_INGAT, 0) < 86400000) return;
  if (cur.layers.length) {
    setTimeout(cekPengingat, 5000);
    return;
  }
  store.set(K_INGAT, now);
  var hari = terakhir ? Math.floor((now - terakhir) / 86400000) : 0;
  askConfirm({
    title: 'Waktunya mencadangkan',
    text:
      (terakhir ? 'Datamu terakhir dicadangkan ' + hari + ' hari lalu.' : 'Datamu belum pernah dicadangkan.') +
      (user
        ? ' Cadangkan sekarang ke akun ' + (user.email || 'Google') + '?'
        : ' Masuk dengan Google atau ekspor ke file agar impianmu tidak hilang.'),
    ok: user ? 'Cadangkan' : 'Lihat cara',
    tone: 'primary',
    action: function () {
      if (user) {
        back(1);
        syncNow(true, 'manual');
        toast('Mencadangkan…');
      } else
        back(1, function () {
          openLayer('page:backup');
        });
    }
  });
}
setTimeout(cekPengingat, 4000);

/* ---------- Ekspor & impor (file) ---------- */
function ukuranTeks(b) {
  if (b < 1024) return Math.round(b) + ' byte';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
  return (b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',') + ' MB';
}
var K_EKSPOR = 'stivora.ekspor';
var IC_FILE =
  '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 10.5v6.5M9.3 14.3L12 17l2.7-2.7"/></svg>';
var eksporEnc = false; // enkripsi file: dipilih tiap kali (tidak disimpan)
function eksporMedia() {
  var o = store.get(K_EKSPOR, {}) || {};
  return o.media !== false;
}
function buildTransferForm() {
  $('#subTitle').textContent = 'Ekspor & impor';
  var pakaiMedia = eksporMedia();
  var ada = images.filter(function (i) {
    return i.blob;
  });
  var hitung = { foto: 0, video: 0, audio: 0, dokumen: 0 };
  ada.forEach(function (i) {
    hitung[jenisMedia(i)]++;
  });
  var rincian =
    ['foto', 'video', 'audio', 'dokumen']
      .filter(function (k) {
        return hitung[k];
      })
      .map(function (k) {
        return hitung[k] + ' ' + k;
      })
      .join(' · ') || 'belum ada media';
  var video = hitung.video;
  var diCloud = images.length - ada.length;
  var bytes =
    (pakaiMedia
      ? (ada.reduce(function (n, i) {
          return n + (i.blob.size || 0);
        }, 0) *
          4) /
        3
      : 0) +
    JSON.stringify(petaMarker).length +
    JSON.stringify(petaJalur).length +
    JSON.stringify(petaArea).length +
    JSON.stringify(dataImpianEkspor()).length +
    250;
  if (eksporEnc) bytes = (bytes * 4) / 3 + 512;
  var li = function (t) {
    return '<li>' + t + '</li>';
  };
  var sw = function (id, ic, nama, ket, on) {
    return (
      '<button type="button" class="row" id="' +
      id +
      '" role="switch" aria-checked="' +
      on +
      '">' +
      '<span class="row-ic">' +
      ic +
      '</span><span class="row-text"><b>' +
      nama +
      '</b><small>' +
      ket +
      '</small></span>' +
      '<span class="switch' +
      (on ? ' on' : '') +
      '" aria-hidden="true"><i></i></span></button>'
    );
  };
  var html = '';
  if (imporTertunda) {
    html +=
      '<div class="sync-card impor-sandi">' +
      '<div class="sync-line">' +
      IC_CAD.e2e +
      'File cadangan terenkripsi</div>' +
      '<small>Masukkan kata sandi yang dipakai saat file ini diekspor.</small>' +
      '<input class="input" type="password" id="imporSandi" autocomplete="current-password" placeholder="Kata sandi file">' +
      '<div class="lock-actions"><button type="button" class="btn ghost" id="btnImporBatal">Batal</button>' +
      '<button type="button" class="btn primary" id="btnImporBuka">Buka file</button></div></div>';
  }
  html +=
    '<div class="sync-card">' +
    '<div class="info-head"><span class="row-ic">' +
    IC_FILE +
    '</span>' +
    '<div class="info-title"><b>File cadangan</b><span class="info-sub">Isi file ekspor dari perangkat ini</span></div></div>' +
    '<small>' +
    (pakaiMedia ? rincian : 'Tanpa media') +
    '</small>' +
    '<small>' +
    petaMarker.length +
    ' marker · ' +
    petaJalur.length +
    ' perjalanan · ' +
    petaArea.length +
    ' area</small>' +
    '<small>Data tab Impian (profil, impian, peta jalan, sumberdaya, peristiwa, keuangan) dan Galery (banner, Pola Pikir, koleksi Lainnya)</small>' +
    '<small>Perkiraan ukuran file: <b>' +
    ukuranTeks(bytes) +
    '</b>' +
    (pakaiMedia && video ? ' — video membuat file jauh lebih besar' : '') +
    '</small>' +
    '</div>' +
    '<div class="card list-card">' +
    sw('swEksporMedia', IC_CAD.media, 'Sertakan media', 'Foto, video, dan media lain ikut di file', pakaiMedia) +
    sw('swEksporEnc', IC_CAD.e2e, 'Enkripsi file', 'Kunci file dengan kata sandi', eksporEnc) +
    '</div>' +
    (eksporEnc
      ? '<div class="enc-fields">' +
        '<div class="field"><label for="eksporSandi">Kata sandi file</label><input class="input" type="password" id="eksporSandi" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>' +
        '<div class="field"><label for="eksporSandi2">Ulangi kata sandi</label><input class="input" type="password" id="eksporSandi2" autocomplete="new-password"></div>' +
        '<p class="sheet-note warn">Jika kata sandi ini lupa, file tidak bisa dibuka siapa pun.</p>' +
        '</div>'
      : '') +
    '<div class="acc-actions sub-gap">' +
    '<button type="button" class="row" id="btnExport"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>' +
    '<span class="row-text"><b>Ekspor ke file</b><small>' +
    (eksporEnc ? 'Unduh file cadangan .json terenkripsi' : 'Unduh file cadangan .json') +
    '</small></span></button>' +
    '<button type="button" class="row" id="btnImport"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></svg>' +
    '<span class="row-text"><b>Impor dari file</b><small>Ganti data di perangkat ini dengan isi file</small></span></button>' +
    '</div>' +
    (pakaiMedia && diCloud
      ? '<p class="sheet-note warn">' +
        diCloud +
        ' media hanya ada di cloud dan belum diunduh ke perangkat ini, jadi tidak ikut diekspor. Buka Galery dulu agar semuanya terunduh.</p>'
      : '') +
    '<button type="button" class="detail-btn" id="btnDetailEkspor" aria-expanded="false" aria-controls="detailEkspor">' +
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8"/><path d="M12 17.2h.01"/></svg>' +
    '<span>Lihat detail</span></button>' +
    '<div class="detail-isi" id="detailEkspor" hidden>' +
    '<h3 class="group-title sub-group">Yang ikut di file</h3>' +
    '<ul class="fakta">' +
    li('Semua impian beserta langkah, alasan, dan target') +
    li('Data peta: marker, perjalanan, dan area beserta catatannya') +
    li(
      'Data tab Impian: profil & pita, impian utama & Hari H, hexagon impian, peta jalan, keyakinan, sumberdaya waktu, catatan peristiwa, dan keuangan'
    ) +
    li('Data Galery: banner & profil, Pola Pikir, dan koleksi Lainnya (lagu, film, buku, tempat, channel, tokoh, link)') +
    li('Media yang tersimpan di perangkat ini, jika "Sertakan media" nyala') +
    li('Mode tampilan (terang, gelap, atau sistem)') +
    '</ul>' +
    '<h3 class="group-title sub-group">Yang tidak ikut</h3>' +
    '<ul class="fakta">' +
    li('Isi Sampah') +
    li('Media yang hanya ada di cloud') +
    li('Foto & video Galery dari folder HP (tetap aman di HP-mu)') +
    li('Tema, bahasa, kunci sidik jari, pengaturan cadangan, dan riwayat') +
    '</ul>' +
    '<h3 class="group-title sub-group">Perlu diketahui</h3>' +
    '<ul class="fakta">' +
    li('Tanpa "Enkripsi file", isi file bisa dibaca siapa pun yang memegangnya — walaupun enkripsi end-to-end cloud aktif.') +
    li('Dengan "Enkripsi file", file dikunci memakai AES-256 dan kata sandimu. Kata sandi tidak disimpan di mana pun.') +
    li(
      'Impor file dengan media mengganti semua impian, media, data peta, data tab Impian, dan data Galery di perangkat ini dan mengosongkan Sampah' +
        (user ? ', lalu ikut mengganti data di cloud akunmu.' : '.')
    ) +
    li('Impor file tanpa media mengganti impian, data peta, data tab Impian, dan data Galery; media di perangkat ini tidak diubah.') +
    li('Video berukuran besar bisa membuat ekspor lambat atau gagal di HP dengan memori kecil.') +
    '</ul></div>';
  $('#subBody').innerHTML = html;
  return true;
}
function transferClick(e) {
  var d = e.target.closest('#btnDetailEkspor');
  if (d) {
    var buka = d.getAttribute('aria-expanded') !== 'true';
    d.setAttribute('aria-expanded', buka);
    d.querySelector('span').textContent = buka ? 'Sembunyikan detail' : 'Lihat detail';
    $('#detailEkspor').hidden = !buka;
    return;
  }
  if (e.target.closest('#swEksporMedia')) {
    if (eksporMedia()) {
      askConfirm({
        title: 'Ekspor tanpa media?',
        ok: 'Tanpa media',
        text: 'File hanya berisi impian dan data peta. Media tidak ikut, jadi tidak bisa dipulihkan dari file ini.',
        action: function () {
          back(1, function () {
            store.set(K_EKSPOR, { media: false });
            buildTransferForm();
          });
        }
      });
    } else {
      store.set(K_EKSPOR, { media: true });
      buildTransferForm();
    }
    return;
  }
  if (e.target.closest('#swEksporEnc')) {
    eksporEnc = !eksporEnc;
    buildTransferForm();
    if (eksporEnc) $('#eksporSandi').focus();
    return;
  }
  if (e.target.closest('#btnImporBatal')) {
    imporTertunda = null;
    buildTransferForm();
    return;
  }
  if (e.target.closest('#btnImporBuka')) {
    var ip = $('#imporSandi'),
      bungkus = imporTertunda;
    if (!ip.value) {
      ip.classList.add('error');
      return;
    }
    toast('Membuka file…');
    bukaFileTerenkripsi(bungkus, ip.value).then(
      function (data) {
        imporTertunda = null;
        buildTransferForm();
        lanjutImpor(data);
      },
      function (err) {
        ip.classList.add('error');
        toast(err.message);
      }
    );
    return;
  }
  if (e.target.closest('#btnExport')) {
    var opsi = { media: eksporMedia(), sandi: '' };
    if (eksporEnc) {
      var s1 = $('#eksporSandi'),
        s2 = $('#eksporSandi2');
      if (s1.value.length < 8) {
        s1.classList.add('error');
        toast('Kata sandi minimal 8 karakter');
        return;
      }
      if (s1.value !== s2.value) {
        s2.classList.add('error');
        toast('Kata sandi tidak sama');
        return;
      }
      opsi.sandi = s1.value;
      askConfirm({
        title: 'Ekspor file terenkripsi?',
        ok: 'Ekspor',
        tone: 'primary',
        text: 'File hanya bisa dibuka dengan kata sandi ini. Jika lupa, isinya tidak bisa dipulihkan.',
        action: function () {
          back(1, function () {
            doExport(opsi);
          });
        }
      });
      return;
    }
    doExport(opsi);
    return;
  }
  if (e.target.closest('#btnImport')) {
    $('#importInput').click();
  }
}
