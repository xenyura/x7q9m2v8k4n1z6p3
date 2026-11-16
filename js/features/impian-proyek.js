/* ============================================================
   Stivora — Impian · Progress · Proyek software (5.68.0)
   Panduan membuat software dari ide sampai dirawat. Berdiri sendiri (tidak terhubung hexagon).
   Halaman Progress hanya untuk dibaca; semua perubahan lewat ikon pensil (#pryEdit).
   Kunci: stivora.impian.proyek = { item: [proyek] }  (sinkron per proyek: PECAHAN 'proyek-p-<id>')
   proyek = { id, nama, ket, dibuat, diubah,
              versi: [{ id, nama }], v: id versi aktif,
              cek: { '<tahap>.<langkah>' | '<versi>/<tahap>.<langkah>': { s: 'YYYY-MM-DD', c: catatan, w: 1|0, x: 1 } },
              ext: [{ id, tahap, teks, kenapa, w }] }
   s = tanggal selesai, c = catatan, w = wajib (menimpa bawaan), x = disembunyikan.
   Tahap Bangun, Uji, Rilis diulang per versi.
   ============================================================ */
'use strict';

var K_PRY = 'stivora.impian.proyek';
var PRY_MAKS = 30,
  PRY_NAMA = 50,
  PRY_KET = 160,
  PRY_LANGKAH = 120,
  PRY_KENAPA = 400,
  PRY_CATATAN = 300,
  PRY_VERSI = 20,
  PRY_VERSI_MAKS = 50,
  PRY_EXT_MAKS = 60;
/* [id, teks, kenapa & caranya, wajib] */
var PRY_TAHAP = [
  {
    id: 'ide',
    nama: 'Ide',
    warna: '#eab308',
    langkah: [
      ['masalah', 'Tulis masalah yang mau diselesaikan', 'Aplikasi yang lahir dari masalah nyata lebih mudah dipakai dan dipertahankan. Caranya: satu kalimat "Orang ___ kesulitan ___ karena ___".', 1],
      ['pengguna', 'Tentukan siapa penggunanya', 'Fitur jadi fokus kalau tahu untuk siapa. Caranya: tulis 1–2 tipe pengguna utama beserta kebutuhannya.', 1],
      ['pembanding', 'Cek aplikasi serupa', 'Supaya tahu yang sudah ada dan apa bedanya punyamu. Caranya: catat 3 aplikasi serupa, kelebihan dan kekurangannya.', 0],
      ['inti', 'Pilih satu fitur inti', 'Versi pertama cukup satu hal yang dikerjakan sangat baik. Caranya: pilih fitur yang kalau dihapus aplikasinya tidak ada gunanya.', 1]
    ]
  },
  {
    id: 'rencana',
    nama: 'Rencana',
    warna: '#3b82f6',
    langkah: [
      ['mvp', 'Daftar fitur versi pertama', 'Membatasi lingkup agar cepat rilis. Caranya: pisahkan "harus ada" dan "nanti saja".', 1],
      ['teknologi', 'Pilih teknologi & tempat hosting', 'Pilihan ini sulit diganti belakangan. Caranya: pilih yang sudah kamu kuasai dan gratis atau murah di awal.', 1],
      ['data', 'Rancang data yang disimpan', 'Struktur data yang rapi mencegah pindah-pindah data nanti. Caranya: tulis daftar data, isinya, dan siapa yang boleh membacanya.', 1],
      ['jadwal', 'Buat target waktu kasar', 'Tanpa batas waktu, proyek mudah melar. Caranya: beri perkiraan per tahap, lalu tambah cadangan 30%.', 0]
    ]
  },
  {
    id: 'desain',
    nama: 'Desain',
    warna: '#ec4899',
    langkah: [
      ['alur', 'Gambar alur pengguna', 'Memastikan langkah pengguna masuk akal sebelum dikode. Caranya: sketsa urutan layar dari membuka aplikasi sampai tujuan tercapai.', 1],
      ['sketsa', 'Sketsa layar utama', 'Mengubah gambar jauh lebih murah daripada mengubah kode. Caranya: gambar kasar di kertas atau alat desain.', 1],
      ['gaya', 'Tentukan warna, huruf, dan ikon', 'Tampilan yang konsisten terlihat profesional. Caranya: pilih 1 warna utama, 1–2 jenis huruf, dan satu gaya ikon.', 0],
      ['hp', 'Cek di layar HP kecil & mode gelap', 'Kebanyakan pengguna memakai HP. Caranya: periksa tampilan di lebar 320–390 px, terang dan gelap.', 1]
    ]
  },
  {
    id: 'bangun',
    nama: 'Bangun',
    warna: '#7c5cff',
    perVersi: true,
    langkah: [
      ['fitur', 'Kerjakan fitur sesuai daftar versi ini', 'Fokus ke daftar mencegah fitur tambahan di tengah jalan. Caranya: kerjakan satu per satu, centang yang selesai.', 1],
      ['git', 'Simpan kode di Git/GitHub', 'Bisa kembali ke versi sebelumnya kalau ada yang rusak. Caranya: simpan (commit) setiap fitur selesai dengan pesan yang jelas.', 1],
      ['rahasia', 'Jauhkan kunci & sandi dari kode publik', 'Kunci yang bocor bisa disalahgunakan orang. Caranya: simpan di pengaturan server (secret), bukan di file aplikasi.', 1],
      ['galat', 'Tangani error dengan pesan yang jelas', 'Pengguna tidak bingung saat ada masalah. Caranya: tampilkan apa yang terjadi dan apa yang bisa dilakukan.', 0]
    ]
  },
  {
    id: 'uji',
    nama: 'Uji',
    warna: '#14b8a6',
    perVersi: true,
    langkah: [
      ['alur', 'Coba semua alur utama sendiri', 'Menemukan masalah sebelum pengguna menemukannya. Caranya: ikuti alur dari awal sampai akhir seperti pengguna baru.', 1],
      ['perangkat', 'Uji di beberapa HP & browser', 'Tampilan bisa berbeda di tiap perangkat. Caranya: minimal Chrome Android dan satu browser lain.', 1],
      ['pinggir', 'Uji data kosong, banyak, dan aneh', 'Bug sering muncul di kasus pinggir. Caranya: coba tanpa data, data sangat banyak, teks sangat panjang, dan tanpa internet.', 1],
      ['orang', 'Minta 1–3 orang mencoba', 'Orang lain melihat yang kamu lewatkan. Caranya: perhatikan di mana mereka bingung tanpa kamu bantu.', 0]
    ]
  },
  {
    id: 'rilis',
    nama: 'Rilis',
    warna: '#f97316',
    perVersi: true,
    langkah: [
      ['catatan', 'Tulis catatan perubahan', 'Pengguna dan kamu sendiri tahu apa yang berubah. Caranya: daftar singkat yang baru, yang diperbaiki, dan yang dihapus.', 1],
      ['cadangan', 'Cadangkan sebelum rilis', 'Bisa kembali kalau rilis bermasalah. Caranya: simpan salinan versi lama dan data penting.', 1],
      ['terbit', 'Terbitkan ke tempat hosting', 'Versi baru sampai ke pengguna. Caranya: unggah atau deploy, lalu tunggu sampai selesai.', 1],
      ['cek', 'Buka versi yang sudah terbit', 'Hasil terbit kadang berbeda dari uji lokal. Caranya: buka di HP, pastikan nomor versi dan fitur baru tampil.', 1]
    ]
  },
  {
    id: 'rawat',
    nama: 'Rawat',
    warna: '#22c55e',
    langkah: [
      ['masukan', 'Kumpulkan masukan & laporan error', 'Arah perbaikan berikutnya datang dari pengguna. Caranya: sediakan cara melapor dan catat semuanya.', 1],
      ['kuota', 'Pantau biaya & kuota layanan', 'Layanan gratis punya batas. Caranya: cek dasbor hosting dan database tiap bulan.', 1],
      ['perbarui', 'Perbarui pustaka & keamanan', 'Pustaka lama bisa punya celah. Caranya: periksa pembaruan berkala dan uji ulang setelahnya.', 0],
      ['berikut', 'Rencanakan versi berikutnya', 'Menjaga proyek tetap hidup. Caranya: pilih masukan terpenting, jadikan daftar fitur versi baru.', 0]
    ]
  },
  {
    id: 'lupa',
    nama: 'Yang sering terlupa',
    warna: '#ef4444',
    langkah: [
      ['privasi', 'Kebijakan privasi', 'Wajib kalau menyimpan data orang lain atau rilis di toko aplikasi. Caranya: jelaskan data apa yang disimpan, untuk apa, dan cara menghapusnya.', 1],
      ['cadanganData', 'Cadangan data pengguna', 'Data hilang berarti kepercayaan hilang. Caranya: pastikan ada cadangan otomatis dan pernah dicoba dipulihkan.', 1],
      ['akses', 'Batasi siapa yang boleh mengakses', 'Mencegah orang asing memakai layanan dan kuotamu. Caranya: aturan keamanan database dan daftar akun yang diizinkan.', 1],
      ['pasang', 'Catatan cara memasang ulang', 'Kamu sendiri akan lupa langkahnya. Caranya: tulis langkah memasang server, kunci yang dibutuhkan, dan urutannya.', 1],
      ['domain', 'Tanggal perpanjangan domain & akun', 'Situs bisa mati kalau lupa bayar. Caranya: catat tanggal jatuh tempo dan pasang pengingat.', 0],
      ['ikon', 'Ikon, nama, & gambar pratinjau', 'Kesan pertama di layar HP dan saat dibagikan. Caranya: siapkan ikon aplikasi, judul, dan gambar pratinjau.', 0]
    ]
  }
];
var PRY_IK = {
  cek: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  tanya: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8"/><path d="M12 17.2h.01"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  mata: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  mataTutup: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 6.6A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/></svg>',
  kode: '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>'
};
var pryBuka = {}; /* tampilan baca: proyek / tahap yang dibuka */

function pryTeks(v, n) {
  return String(v == null ? '' : v).slice(0, n);
}
function pryRapikan(p, i) {
  if (!p || typeof p !== 'object') return null;
  var versi = (Array.isArray(p.versi) ? p.versi : [])
    .filter(function (v) {
      return v && v.id;
    })
    .map(function (v) {
      return { id: String(v.id), nama: pryTeks(v.nama, PRY_VERSI) || '1.0' };
    })
    .slice(0, PRY_VERSI_MAKS);
  if (!versi.length) versi = [{ id: 'v1', nama: '1.0' }];
  var cek = {};
  if (p.cek && typeof p.cek === 'object')
    Object.keys(p.cek).forEach(function (k) {
      var c = p.cek[k];
      if (!c || typeof c !== 'object' || k.length > 120) return;
      var o = {};
      if (/^\d{4}-\d{2}-\d{2}$/.test(c.s || '')) o.s = c.s;
      if (c.c) o.c = pryTeks(c.c, PRY_CATATAN);
      if (c.w === 0 || c.w === 1) o.w = c.w;
      if (c.x) o.x = 1;
      if (Object.keys(o).length) cek[k] = o;
    });
  var ext = (Array.isArray(p.ext) ? p.ext : [])
    .filter(function (x) {
      return x && x.id && String(x.teks || '').trim() && PRY_TAHAP.some(function (t) {
        return t.id === x.tahap;
      });
    })
    .map(function (x) {
      return { id: String(x.id), tahap: x.tahap, teks: pryTeks(x.teks, PRY_LANGKAH), kenapa: pryTeks(x.kenapa, PRY_KENAPA), w: x.w ? 1 : 0 };
    })
    .slice(0, PRY_EXT_MAKS);
  var v = versi.some(function (x) {
    return x.id === p.v;
  })
    ? p.v
    : versi[versi.length - 1].id;
  return {
    id: String(p.id || 'p' + i),
    nama: pryTeks(p.nama, PRY_NAMA) || 'Proyek',
    ket: pryTeks(p.ket, PRY_KET),
    dibuat: +p.dibuat || Date.now(),
    diubah: +p.diubah || +p.dibuat || Date.now(),
    versi: versi,
    v: v,
    cek: cek,
    ext: ext
  };
}
function pryData() {
  var d = store.get(K_PRY, null);
  var item = d && Array.isArray(d.item) ? d.item : [];
  return item.map(pryRapikan).filter(Boolean).slice(0, PRY_MAKS);
}
function prySimpanData(item) {
  store.set(K_PRY, item.length ? { item: item } : null);
}
/* Kunci centang: tahap per versi diberi awalan versi */
function pryKunci(p, t, lid) {
  return (t.perVersi ? p.v + '/' : '') + t.id + '.' + lid;
}
/* Daftar langkah satu tahap (bawaan + tambahan), dengan status efektif */
function pryLangkah(p, t, semua) {
  var o = [];
  t.langkah.forEach(function (l) {
    o.push({ id: l[0], teks: l[1], kenapa: l[2], wBawaan: l[3], ext: false });
  });
  p.ext.forEach(function (x) {
    if (x.tahap === t.id) o.push({ id: 'x' + x.id, xid: x.id, teks: x.teks, kenapa: x.kenapa, wBawaan: x.w, ext: true });
  });
  return o
    .map(function (l) {
      var k = pryKunci(p, t, l.id),
        c = p.cek[k] || {};
      l.k = k;
      l.selesai = c.s || '';
      l.catatan = c.c || '';
      l.wajib = c.w === 0 || c.w === 1 ? c.w : l.wBawaan;
      l.sembunyi = !!c.x;
      return l;
    })
    .filter(function (l) {
      return semua || !l.sembunyi;
    });
}
function pryHitung(p) {
  var total = 0,
    beres = 0,
    tahapKini = null;
  var perTahap = PRY_TAHAP.map(function (t) {
    var L = pryLangkah(p, t),
      w = L.filter(function (l) {
        return l.wajib;
      }),
      wb = w.filter(function (l) {
        return l.selesai;
      }).length;
    total += w.length;
    beres += wb;
    if (!tahapKini && t.id !== 'lupa' && wb < w.length) tahapKini = t;
    return {
      t: t,
      L: L,
      n: L.length,
      s: L.filter(function (l) {
        return l.selesai;
      }).length,
      wn: w.length,
      ws: wb
    };
  });
  return { persen: total ? Math.round((beres * 100) / total) : 0, tahapKini: tahapKini, perTahap: perTahap };
}
function pryNamaVersi(p) {
  var v = p.versi.filter(function (x) {
    return x.id === p.v;
  })[0];
  return v ? v.nama : '';
}

/* ---------- Tampilan baca (tab Progress) ---------- */
function renderPry() {
  var box = $('#pryIsi');
  if (!box) return;
  var item = pryData();
  if (!item.length) {
    box.innerHTML =
      '<div class="ky-kosong"><b>Belum ada proyek</b><p>Tambah proyek lewat ikon pensil. Tiap proyek dipandu dari Ide sampai Rawat, dengan penjelasan kenapa dan caranya di setiap langkah.</p></div>';
    return;
  }
  box.innerHTML = item
    .map(function (p) {
      var h = pryHitung(p),
        buka = !!pryBuka[p.id];
      return (
        '<article class="pry-kartu' +
        (buka ? ' buka' : '') +
        '">' +
        '<button type="button" class="pry-kepala" data-pry-buka="' +
        esc(p.id) +
        '" aria-expanded="' +
        buka +
        '"><span class="pry-ikon">' +
        PRY_IK.kode +
        '</span><span class="pry-teks"><b>' +
        esc(p.nama) +
        '</b><small>' +
        (h.persen === 100 ? 'Semua langkah wajib selesai' : h.tahapKini ? 'Sekarang: ' + esc(h.tahapKini.nama) : 'Belum dimulai') +
        ' · versi ' +
        esc(pryNamaVersi(p)) +
        '</small></span><span class="pry-persen">' +
        h.persen +
        '%</span></button>' +
        '<div class="pry-bar" aria-hidden="true">' +
        h.perTahap
          .filter(function (x) {
            return x.t.id !== 'lupa';
          })
          .map(function (x) {
            return (
              '<i style="--w:' +
              (x.wn ? Math.round((x.ws * 100) / x.wn) : 0) +
              '%;--c:' +
              x.t.warna +
              '"></i>'
            );
          })
          .join('') +
        '</div>' +
        (buka ? pryDetailHtml(p, h) : '') +
        '</article>'
      );
    })
    .join('');
}
function pryDetailHtml(p, h) {
  return (
    '<div class="pry-detail">' +
    (p.ket ? '<p class="pry-ket">' + esc(p.ket) + '</p>' : '') +
    h.perTahap
      .map(function (x) {
        var kunci = p.id + ':' + x.t.id,
          buka = !!pryBuka[kunci];
        return (
          '<section class="pry-tahap' +
          (x.t.id === 'lupa' ? ' lupa' : '') +
          '" style="--c:' +
          x.t.warna +
          '">' +
          '<button type="button" class="pry-tahap-kepala" data-pry-buka="' +
          esc(kunci) +
          '" aria-expanded="' +
          buka +
          '"><i></i><b>' +
          esc(x.t.nama) +
          (x.t.perVersi ? ' <em>v' + esc(pryNamaVersi(p)) + '</em>' : '') +
          '</b><span>' +
          x.s +
          '/' +
          x.n +
          '</span>' +
          PRY_IK.chev +
          '</button>' +
          (buka
            ? '<ul class="pry-daftar">' +
              (x.L.length
                ? x.L.map(function (l) {
                    var kk = 'k:' + p.id + ':' + l.k;
                    return (
                      '<li class="' +
                      (l.selesai ? 'beres' : '') +
                      '"><span class="pry-cek">' +
                      (l.selesai ? PRY_IK.cek : '') +
                      '</span><div class="pry-l"><p>' +
                      esc(l.teks) +
                      (l.wajib ? '' : ' <em class="pry-opsi">opsional</em>') +
                      (l.kenapa
                        ? '<button type="button" class="pry-tanya" data-pry-buka="' + esc(kk) + '" aria-label="Kenapa dan caranya">' + PRY_IK.tanya + '</button>'
                        : '') +
                      '</p>' +
                      (pryBuka[kk] && l.kenapa ? '<div class="pry-kenapa">' + esc(l.kenapa) + '</div>' : '') +
                      (l.catatan ? '<div class="pry-catatan">' + esc(l.catatan) + '</div>' : '') +
                      (l.selesai ? '<small>Selesai ' + esc(pgFmt(l.selesai)) + '</small>' : '') +
                      '</div></li>'
                    );
                  }).join('')
                : '<li class="pry-kosong">Semua langkah tahap ini disembunyikan.</li>') +
              '</ul>'
            : '') +
          '</section>'
        );
      })
      .join('') +
    '</div>'
  );
}
$('#pryIsi').addEventListener('click', function (e) {
  var b = e.target.closest('[data-pry-buka]');
  if (!b) return;
  var k = b.getAttribute('data-pry-buka');
  pryBuka[k] = !pryBuka[k];
  renderPry();
});
$('#pryEdit').addEventListener('click', function () {
  openLayer('page:proyek-edit');
});
renderPry();

/* ============================================================
   Halaman Edit proyek — semua perubahan di draf, tersimpan saat Simpan
   ============================================================ */
var pryeDraf = null,
  pryePilih = '',
  pryeTahap = 'ide',
  pryeKotor = false;
function pryeProyek() {
  return pryeDraf.filter(function (p) {
    return p.id === pryePilih;
  })[0];
}
PAGES['proyek-edit'] = function () {
  pryeDraf = JSON.parse(JSON.stringify(pryData()));
  if (!pryeDraf.some(function (p) {
      return p.id === pryePilih;
    }))
    pryePilih = pryeDraf.length ? pryeDraf[0].id : '';
  pryeKotor = false;
  $('#subTitle').textContent = 'Edit proyek software';
  pryeRender();
  return true;
};
function pryeRender() {
  var p = pryeProyek();
  var h =
    '<div class="se prye">' +
    '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
    PRY_IK.kode +
    'Proyek</h3><div class="prye-chip">' +
    pryeDraf
      .map(function (x) {
        return (
          '<button type="button" class="chip' +
          (x.id === pryePilih ? ' aktif' : '') +
          '" data-prye="pilih" data-id="' +
          esc(x.id) +
          '">' +
          esc(x.nama || 'Tanpa nama') +
          '</button>'
        );
      })
      .join('') +
    (pryeDraf.length < PRY_MAKS ? '<button type="button" class="chip tambah" data-prye="baru">' + PRY_IK.plus + 'Proyek baru</button>' : '') +
    '</div>' +
    (p
      ? '<div class="field"><label for="pryeNama">Nama proyek</label><input class="input" id="pryeNama" maxlength="' +
        PRY_NAMA +
        '" value="' +
        esc(p.nama) +
        '" data-prye-f="nama"></div>' +
        '<div class="field"><label for="pryeKet">Keterangan singkat</label><textarea class="input" id="pryeKet" rows="2" maxlength="' +
        PRY_KET +
        '" data-prye-f="ket" placeholder="mis. Aplikasi pencatat keuangan untuk warung">' +
        esc(p.ket) +
        '</textarea></div>' +
        '<div class="field"><label>Versi yang sedang dikerjakan</label><div class="prye-chip">' +
        p.versi
          .map(function (v) {
            return (
              '<button type="button" class="chip' +
              (v.id === p.v ? ' aktif' : '') +
              '" data-prye="versi" data-id="' +
              esc(v.id) +
              '">v' +
              esc(v.nama) +
              '</button>'
            );
          })
          .join('') +
        '</div><div class="prye-versi-baru"><input class="input" id="pryeVersiNama" maxlength="' +
        PRY_VERSI +
        '" placeholder="Nomor versi baru, mis. 1.1"><button type="button" class="ie-poin-tambah" data-prye="versi-baru">' +
        PRY_IK.plus +
        'Versi baru</button></div><small class="ie-bantu">Versi baru memulai tahap Bangun, Uji, dan Rilis dari awal. Centang versi lama tetap tersimpan.</small></div>'
      : '<p class="ie-bantu">Belum ada proyek. Ketuk "Proyek baru".</p>') +
    '</section>';
  if (p) {
    h +=
      '<section class="ie-bagian se-kartu"><h3 class="se-judul">' +
      PRY_IK.cek +
      'Langkah</h3><div class="prye-tahap-tab">' +
      PRY_TAHAP.map(function (t) {
        var L = pryLangkah(p, t);
        return (
          '<button type="button" class="chip' +
          (t.id === pryeTahap ? ' aktif' : '') +
          '" data-prye="tahap" data-id="' +
          t.id +
          '" style="--c:' +
          t.warna +
          '"><i></i>' +
          esc(t.nama) +
          ' <small>' +
          L.filter(function (l) {
            return l.selesai;
          }).length +
          '/' +
          L.length +
          '</small></button>'
        );
      }).join('') +
      '</div>' +
      pryeTahapHtml(p) +
      '</section>' +
      '<div class="se-blok-aksi"><button type="button" class="se-reset pge-reset" data-prye="hapus-proyek">Hapus proyek ini</button></div>';
  }
  h +=
    '<div class="se-bawah"><button type="button" class="btn ghost" data-prye="batal">Batal</button><button type="button" class="btn primary" data-prye="simpan">Simpan</button></div></div>';
  $('#subBody').innerHTML = h;
  $$('#subBody .prye textarea').forEach(ieTinggi);
}
function pryeTahapHtml(p) {
  var t = PRY_TAHAP.filter(function (x) {
    return x.id === pryeTahap;
  })[0];
  var L = pryLangkah(p, t, true);
  return (
    '<p class="prye-tahap-ket">' +
    (t.perVersi ? 'Untuk versi <b>' + esc(pryNamaVersi(p)) + '</b>. ' : '') +
    'Centang yang sudah selesai. Ketuk ? untuk melihat kenapa dan caranya.</p>' +
    '<ul class="prye-daftar">' +
    L.map(function (l) {
      return (
        '<li class="' +
        (l.sembunyi ? 'sembunyi' : '') +
        (l.selesai ? ' beres' : '') +
        '" data-k="' +
        esc(l.k) +
        '">' +
        '<div class="prye-baris"><label class="prye-cek"><input type="checkbox" data-prye-cek' +
        (l.selesai ? ' checked' : '') +
        (l.sembunyi ? ' disabled' : '') +
        '><span>' +
        PRY_IK.cek +
        '</span></label>' +
        (l.ext
          ? '<input class="input prye-teks" maxlength="' + PRY_LANGKAH + '" value="' + esc(l.teks) + '" data-prye-ext="teks" data-xid="' + esc(l.xid) + '">'
          : '<p class="prye-teks">' + esc(l.teks) + '</p>') +
        (l.kenapa || l.ext ? '<button type="button" class="pry-tanya" data-prye="kenapa" aria-label="Kenapa dan caranya">' + PRY_IK.tanya + '</button>' : '') +
        '</div>' +
        '<div class="prye-kenapa" hidden>' +
        (l.ext
          ? '<textarea class="input" rows="2" maxlength="' +
            PRY_KENAPA +
            '" placeholder="Kenapa dan caranya (boleh kosong)" data-prye-ext="kenapa" data-xid="' +
            esc(l.xid) +
            '">' +
            esc(l.kenapa) +
            '</textarea>'
          : esc(l.kenapa)) +
        '</div>' +
        '<textarea class="input prye-catatan" rows="1" maxlength="' +
        PRY_CATATAN +
        '" placeholder="Catatan (boleh kosong)" data-prye-catatan>' +
        esc(l.catatan) +
        '</textarea>' +
        '<div class="prye-aksi"><button type="button" class="prye-pil' +
        (l.wajib ? ' wajib' : '') +
        '" data-prye="wajib">' +
        (l.wajib ? 'Wajib' : 'Opsional') +
        '</button><button type="button" class="prye-pil" data-prye="sembunyi">' +
        (l.sembunyi ? PRY_IK.mata + 'Tampilkan' : PRY_IK.mataTutup + 'Sembunyikan') +
        '</button>' +
        (l.ext ? '<button type="button" class="prye-pil hapus" data-prye="hapus-langkah" data-xid="' + esc(l.xid) + '">' + PRY_IK.x + 'Hapus</button>' : '') +
        (l.selesai ? '<small>Selesai ' + esc(pgFmt(l.selesai)) + '</small>' : '') +
        '</div></li>'
      );
    }).join('') +
    '</ul>' +
    (p.ext.length < PRY_EXT_MAKS ? '<button type="button" class="ie-poin-tambah" data-prye="tambah-langkah">' + PRY_IK.plus + 'Tambah langkah sendiri</button>' : '')
  );
}
function pryeCek(p, k) {
  if (!p.cek[k]) p.cek[k] = {};
  return p.cek[k];
}
function pryeRapikanCek(p, k) {
  var c = p.cek[k];
  if (c && !c.s && !c.c && c.w == null && !c.x) delete p.cek[k];
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'proyek-edit' || !pryeDraf) return;
  var b = e.target.closest('[data-prye]');
  if (!b) return;
  var aksi = b.getAttribute('data-prye'),
    p = pryeProyek(),
    li = b.closest('li[data-k]'),
    k = li ? li.getAttribute('data-k') : '';
  if (aksi === 'pilih') {
    pryePilih = b.dataset.id;
    pryeRender();
  } else if (aksi === 'baru') {
    var n = { id: uid(), nama: 'Proyek ' + (pryeDraf.length + 1), ket: '', dibuat: Date.now(), diubah: Date.now(), versi: [{ id: 'v1', nama: '1.0' }], v: 'v1', cek: {}, ext: [] };
    pryeDraf.push(n);
    pryePilih = n.id;
    pryeTahap = 'ide';
    pryeKotor = true;
    pryeRender();
    var nm = $('#pryeNama');
    if (nm) {
      nm.focus();
      nm.select();
    }
  } else if (aksi === 'versi' && p) {
    p.v = b.dataset.id;
    pryeKotor = true;
    pryeRender();
  } else if (aksi === 'versi-baru' && p) {
    var inp = $('#pryeVersiNama'),
      nama = String(inp.value || '')
        .trim()
        .replace(/^v/i, '')
        .slice(0, PRY_VERSI);
    if (!nama) {
      inp.classList.add('error');
      toast('Tulis nomor versi dulu');
      return;
    }
    if (p.versi.some(function (v) {
        return v.nama === nama;
      })) {
      inp.classList.add('error');
      toast('Versi ' + nama + ' sudah ada');
      return;
    }
    if (p.versi.length >= PRY_VERSI_MAKS) {
      toast('Maksimal ' + PRY_VERSI_MAKS + ' versi');
      return;
    }
    var vb = { id: 'v' + uid(), nama: nama };
    p.versi.push(vb);
    p.v = vb.id;
    pryeKotor = true;
    pryeRender();
    toast('Versi ' + nama + ' dimulai');
  } else if (aksi === 'tahap') {
    pryeTahap = b.dataset.id;
    pryeRender();
  } else if (aksi === 'kenapa' && li) {
    var kn = li.querySelector('.prye-kenapa');
    kn.hidden = !kn.hidden;
    var ta = kn.querySelector('textarea');
    if (ta) ieTinggi(ta);
  } else if (aksi === 'wajib' && p && li) {
    var langkah = pryeLangkahDariKunci(p, k);
    var c = pryeCek(p, k);
    c.w = langkah && langkah.wajib ? 0 : 1;
    if (langkah && c.w === langkah.wBawaan) delete c.w;
    pryeRapikanCek(p, k);
    pryeKotor = true;
    pryeRender();
  } else if (aksi === 'sembunyi' && p && li) {
    var c2 = pryeCek(p, k);
    if (c2.x) delete c2.x;
    else c2.x = 1;
    pryeRapikanCek(p, k);
    pryeKotor = true;
    pryeRender();
  } else if (aksi === 'tambah-langkah' && p) {
    var x = { id: uid(), tahap: pryeTahap, teks: '', kenapa: '', w: 1 };
    p.ext.push(x);
    pryeKotor = true;
    pryeRender();
    var t = $('#subBody [data-prye-ext="teks"][data-xid="' + x.id + '"]');
    if (t) t.focus();
  } else if (aksi === 'hapus-langkah' && p) {
    var xid = b.dataset.xid,
      xx = p.ext.filter(function (z) {
        return z.id === xid;
      })[0];
    askConfirm({
      title: 'Hapus langkah?',
      text: '"' + ((xx && xx.teks) || 'Langkah baru') + '" beserta centang dan catatannya dihapus setelah Simpan.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          p.ext = p.ext.filter(function (z) {
            return z.id !== xid;
          });
          Object.keys(p.cek).forEach(function (ck) {
            if (ck.slice(-(xid.length + 2)) === '.x' + xid) delete p.cek[ck];
          });
          pryeKotor = true;
          pryeRender();
        });
      }
    });
  } else if (aksi === 'hapus-proyek' && p) {
    askConfirm({
      title: 'Hapus proyek?',
      text: '"' + p.nama + '" beserta semua centang, catatan, dan versinya dihapus setelah Simpan.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          pryeDraf = pryeDraf.filter(function (z) {
            return z.id !== p.id;
          });
          pryePilih = pryeDraf.length ? pryeDraf[0].id : '';
          pryeKotor = true;
          pryeRender();
        });
      }
    });
  } else if (aksi === 'batal') {
    if (!pryeKotor) {
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
  } else if (aksi === 'simpan') pryeSimpan();
});
function pryeLangkahDariKunci(p, k) {
  for (var i = 0; i < PRY_TAHAP.length; i++) {
    var L = pryLangkah(p, PRY_TAHAP[i], true);
    for (var j = 0; j < L.length; j++) if (L[j].k === k) return L[j];
  }
  return null;
}
function pryeUbah(e) {
  if (pageKind !== 'proyek-edit' || !pryeDraf) return;
  var t = e.target,
    p = pryeProyek();
  if (!p) return;
  if (t.dataset.pryeF) {
    p[t.dataset.pryeF] = t.value;
    if (t.tagName === 'TEXTAREA') ieTinggi(t);
    pryeKotor = true;
    if (t.dataset.pryeF === 'nama' && e.type === 'change') pryeRender();
    return;
  }
  if (t.id === 'pryeVersiNama') {
    t.classList.remove('error');
    return;
  }
  var li = t.closest('li[data-k]');
  if (!li) return;
  var k = li.getAttribute('data-k');
  if (t.hasAttribute('data-prye-cek')) {
    if (e.type !== 'change') return;
    var c = pryeCek(p, k);
    if (t.checked) c.s = pgeHariIni();
    else delete c.s;
    pryeRapikanCek(p, k);
    pryeKotor = true;
    li.classList.toggle('beres', t.checked);
    return;
  }
  if (t.hasAttribute('data-prye-catatan')) {
    var c3 = pryeCek(p, k);
    c3.c = t.value;
    if (!t.value) delete c3.c;
    pryeRapikanCek(p, k);
    ieTinggi(t);
    pryeKotor = true;
    return;
  }
  if (t.dataset.pryeExt) {
    var x = p.ext.filter(function (z) {
      return z.id === t.dataset.xid;
    })[0];
    if (x) x[t.dataset.pryeExt] = t.value;
    if (t.tagName === 'TEXTAREA') ieTinggi(t);
    pryeKotor = true;
  }
}
$('#subBody').addEventListener('input', pryeUbah);
$('#subBody').addEventListener('change', pryeUbah);
function pryeSimpan() {
  var kosong = pryeDraf.filter(function (p) {
    return !String(p.nama).trim();
  })[0];
  if (kosong) {
    pryePilih = kosong.id;
    pryeRender();
    toast('Nama proyek belum diisi');
    var n = $('#pryeNama');
    if (n) n.focus();
    return;
  }
  var lama = {};
  pryData().forEach(function (p) {
    lama[p.id] = JSON.stringify(p);
  });
  var item = pryeDraf.map(function (p, i) {
    p.ext = p.ext.filter(function (x) {
      return String(x.teks).trim();
    });
    var r = pryRapikan(p, i);
    r.nama = String(r.nama).trim();
    if (lama[r.id] !== undefined && lama[r.id] !== JSON.stringify(r)) r.diubah = Date.now();
    return r;
  });
  prySimpanData(item);
  pryeKotor = false;
  back(1, function () {
    renderPry();
    toast('Proyek disimpan');
  });
}
