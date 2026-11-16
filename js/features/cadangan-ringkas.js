/* ============================================================
   Stivora — Halaman ringkasan cadangan (5.68.0)
   - 'impor-banding' : isi HP ini vs isi file, sebelum impor
   - 'harian'        : daftar cadangan harian (30 hari) + ringkasannya
   - 'harian-detail' : isi satu cadangan vs HP ini, lalu Pulihkan ke tanggal itu
   Layanannya di js/services/cadangan-harian.js
   ============================================================ */
'use strict';

var IC_HARIAN =
  '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/><path d="M9 14.5l2 2 4-4"/></svg>';
var IC_GEMBOK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

/* ---------- Periksa sebelum impor ---------- */
PAGES['impor-banding'] = function () {
  if (!imporSiap) return false;
  var d = imporSiap.data;
  var dariFile = rkHitung({
    marker: d.marker,
    jalur: d.jalur,
    area: d.area,
    impianData: d.impianData,
    media: (d.images || []).map(function (x) {
      return { type: x.type, size: Math.round((String(x.data || '').length * 3) / 4) };
    })
  });
  var sek = rkSekarang();
  if (d.media === false) ['fo', 'vi', 'au', 'do'].forEach(function (k) {
    dariFile[k] = sek[k];
  });
  var tgl = d.exportedAt ? new Date(d.exportedAt) : null;
  $('#subTitle').textContent = 'Periksa sebelum impor';
  $('#subBody').innerHTML =
    '<div class="sync-card"><div class="info-head"><span class="row-ic">' +
    IC_FILE +
    '</span><div class="info-title"><b>File cadangan</b><span class="info-sub">' +
    (tgl && !isNaN(tgl) ? 'Diekspor ' + esc(waktuRiwayat(tgl.getTime())) : 'Tanggal ekspor tidak tercatat') +
    '</span></div></div><small>' +
    esc(imporSiap.teks) +
    (user ? ' Data di cloud akunmu juga ikut diganti.' : '') +
    '</small></div>' +
    '<h3 class="group-title sub-group">Perbandingan isi</h3>' +
    '<div class="card rk-kartu">' +
    rkHtml(sek, dariFile, 'Di HP ini', 'Di file') +
    '</div>' +
    (rkTotal(dariFile) < rkTotal(sek)
      ? '<p class="sheet-note warn">Isi file lebih sedikit dari data di HP ini. Data yang tidak ada di file akan hilang setelah dipulihkan.</p>'
      : '') +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-back>Batal</button><button type="button" class="btn danger" id="btnImporLanjut">Pulihkan</button></div>';
  return true;
};
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'impor-banding' && e.target.closest('#btnImporLanjut') && imporSiap) imporSiap.jalankan();
});

/* ---------- Cadangan harian: daftar ---------- */
var hrList = null, // null = sedang dimuat; [] = kosong
  hrGalat = '',
  hrPilih = null,
  hrSibuk = false;
function hrMuat() {
  hrList = null;
  hrGalat = '';
  return hrDaftar().then(
    function (l) {
      hrList = l;
    },
    function (e) {
      hrList = [];
      hrGalat = fbMsg(e);
    }
  );
}
PAGES.harian = function () {
  $('#subTitle').textContent = 'Cadangan harian';
  var html =
    '<div class="sync-card"><div class="info-head"><span class="row-ic">' +
    IC_HARIAN +
    '</span><div class="info-title"><b>Otomatis tiap hari</b><span class="info-sub">Disimpan ' +
    HR_SIMPAN_HARI +
    ' hari, lalu terhapus sendiri</span></div></div>' +
    '<small>Dibuat sekali sehari saat Stivora pertama dibuka. Isinya semua data kecuali foto & video Galery dari folder HP.' +
    (typeof e2eAktif === 'function' && e2eAktif() ? ' Terenkripsi dengan kata sandi enkripsimu.' : '') +
    '</small>';
  if (!user) html += '<small>Masuk dengan Google dulu.</small></div>';
  else if (!mediaConfigured()) html += '<small>' + esc(fbMsg({ code: 'media_not_configured' })) + '</small></div>';
  else if (e2e.info && !e2e.key) html += '<small>Enkripsi aktif tapi belum dibuka di HP ini. Buka di Enkripsi end-to-end dulu.</small></div>';
  else
    html +=
      '<button type="button" class="btn ghost" id="btnHrBuat"' +
      (hrJalan ? ' disabled' : '') +
      '>' +
      IC_HARIAN +
      'Cadangkan hari ini sekarang</button></div>';
  if (user && mediaConfigured()) {
    if (hrList === null) {
      html += '<p class="sub-note">Memuat daftar cadangan…</p>';
      hrMuat().then(function () {
        if (pageKind === 'harian') PAGES.harian();
      });
    } else if (hrGalat) {
      html += '<p class="sheet-note warn">' + esc(hrGalat) + '</p><button type="button" class="btn ghost" id="btnHrUlang">Coba lagi</button>';
    } else if (!hrList.length) {
      html += '<div class="auth-info"><h3>Belum ada cadangan harian</h3><p>Cadangan pertama dibuat otomatis saat sinkron berikutnya, atau tekan tombol di atas.</p></div>';
    } else {
      html +=
        '<h3 class="group-title sub-group">' +
        hrList.length +
        ' cadangan</h3><div class="card list-card">' +
        hrList
          .map(function (x, i) {
            return (
              '<button type="button" class="row hr-baris" data-hr="' +
              i +
              '"><span class="row-ic">' +
              (x.enc ? IC_GEMBOK : IC_HARIAN) +
              '</span><span class="row-text"><b>' +
              esc(hrTglTeks(x.tgl)) +
              '</b><small>' +
              esc(ukuranTeks(x.size || 0) + ' · ' + (x.r ? rkTeks(x.r, 3) : x.enc ? 'Terenkripsi' : 'Ringkasan tidak tersedia')) +
              '</small></span><span class="row-end"><svg class="chev-sm" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button>'
            );
          })
          .join('') +
        '</div>';
    }
  }
  html +=
    '<p class="sub-note">Pulihkan mengembalikan semua data — di HP ini dan di cloud — seperti pada tanggal itu, termasuk media yang sudah dihapus (file yang dihapus ditahan ' +
    HR_SIMPAN_HARI +
    ' hari di cloud).</p>';
  $('#subBody').innerHTML = html;
  return true;
};
$('#subBody').addEventListener('click', function (e) {
  if (pageKind === 'harian') {
    if (e.target.closest('#btnHrUlang')) {
      hrList = null;
      PAGES.harian();
      return;
    }
    if (e.target.closest('#btnHrBuat')) {
      var b = e.target.closest('#btnHrBuat');
      b.disabled = true;
      toast('Membuat cadangan hari ini…');
      cadanganHarianBuat(true).then(
        function () {
          toast('Cadangan hari ini tersimpan');
          hrList = null;
          if (pageKind === 'harian') PAGES.harian();
        },
        function (err) {
          toast(err && err.message ? err.message : fbMsg(err));
          if (pageKind === 'harian') PAGES.harian();
        }
      );
      return;
    }
    var r = e.target.closest('[data-hr]');
    if (r && hrList) {
      hrPilih = hrList[+r.dataset.hr];
      openLayer('page:harian-detail');
    }
    return;
  }
  if (pageKind === 'harian-detail' && e.target.closest('#btnHrPulihkan') && hrPilih && !hrSibuk) {
    var x = hrPilih;
    askConfirm({
      title: 'Pulihkan ke ' + hrTglTeks(x.tgl).replace(/^(Hari ini|Kemarin) · /, '') + '?',
      text:
        'Semua data di HP ini dan di cloud dikembalikan seperti pada tanggal itu. Perubahan setelahnya hilang, termasuk media yang ditambahkan setelah tanggal itu. Foto & video dari folder HP tidak tersentuh.',
      ok: 'Pulihkan',
      action: function () {
        back(1, function () {
          hrSibuk = true;
          toast('Memulihkan… jangan tutup aplikasi');
          var btn = $('#btnHrPulihkan');
          if (btn) btn.disabled = true;
          hrAmbil(x.tgl)
            .then(hrPulihkan)
            .then(
              function (h) {
                hrSibuk = false;
                hrList = null;
                back(1, function () {
                  toast('Data dipulihkan ke ' + x.tgl + (h && h.hilang && h.hilang.length ? ' · ' + h.hilang.length + ' file media sudah tidak ada di cloud' : ''));
                });
              },
              function (err) {
                hrSibuk = false;
                if (btn) btn.disabled = false;
                catatRiwayat('pulihkan-harian', false, (err && err.message) || fbMsg(err));
                toast(err && err.message && !err.code ? err.message : fbMsg(err));
              }
            );
        });
      }
    });
  }
});

/* ---------- Cadangan harian: detail satu tanggal ---------- */
PAGES['harian-detail'] = function () {
  if (!hrPilih) return false;
  var x = hrPilih,
    sek = rkSekarang();
  $('#subTitle').textContent = 'Cadangan ' + x.tgl;
  $('#subBody').innerHTML =
    '<div class="sync-card"><div class="info-head"><span class="row-ic">' +
    (x.enc ? IC_GEMBOK : IC_HARIAN) +
    '</span><div class="info-title"><b>' +
    esc(hrTglTeks(x.tgl)) +
    '</b><span class="info-sub">' +
    esc(ukuranTeks(x.size || 0) + (x.enc ? ' · terenkripsi' : '') + (x.r && x.r.mb ? ' · media ' + ukuranTeks(x.r.mb) + ' di cloud' : '')) +
    '</span></div></div></div>' +
    '<h3 class="group-title sub-group">Isi cadangan</h3>' +
    '<div class="card rk-kartu">' +
    (x.r
      ? rkHtml(sek, x.r, 'Di HP ini', 'Cadangan')
      : '<p class="rk-kosong">' + (x.enc ? 'Ringkasan terenkripsi. Buka enkripsi end-to-end di HP ini untuk melihatnya.' : 'Ringkasan tidak tersedia.') + '</p>') +
    '</div>' +
    (x.r && rkTotal(x.r) < rkTotal(sek)
      ? '<p class="sheet-note warn">Cadangan ini berisi lebih sedikit data dari HP ini. Data yang tidak ada di cadangan akan hilang setelah dipulihkan.</p>'
      : '') +
    '<div class="se-bawah"><button type="button" class="btn ghost" data-back>Kembali</button><button type="button" class="btn danger" id="btnHrPulihkan">Pulihkan</button></div>';
  return true;
};
