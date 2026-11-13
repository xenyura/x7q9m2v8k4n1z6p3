/* ============================================================
   Stivora — Galery (tampilan baru, 5.38.0)
   Banner 3:1 di atas halaman Galery + lingkaran foto profil di tepi bawah banner (kanan, 5.39.0).
   Keduanya diganti lewat ikon pensil.
   Kunci: 'stivora.galery.banner' = {
     foto:   dataURL (dari galeri HP, dipotong 3:1) | 'https://…' (link) | ''   ← gambar banner
     profil: dataURL (dari galeri HP, dipotong persegi) | 'https://…' | ''      ← foto profil Galery (terpisah dari tab Impian)
     nama:   teks maks. 40 karakter                                             ← tampil besar di kiri banner (5.40.0)
     lahir:  'YYYY-MM-DD', bb: kg, tb: cm                                       ← kartu Usia/Berat/Tinggi di bawah banner (5.42.0)
     kategori: [{ id, nama, warna }] (maks. 6) · badge: [{ id, teks, kat, ikon }] (maks. 30) · bio: teks maks. 500   (5.43.0) }
   Di kiri banner juga tampil jam ("Pukul 09:41 pagi", 12 jam) dan tanggal ("Senin, 25 Oktober 2026") yang berjalan sendiri,
   dan sapaan "Hi, Selamat pagi!" di kiri atas (5.41.0, huruf Comfortaa; nama memakai Archivo Black).
   Ikut sinkron cloud (dokumen data 'galery-banner') dan file cadangan.
   ============================================================ */
'use strict';

var K_GB = 'stivora.galery.banner';
var GB_LEBAR = 1500,
  GB_TINGGI = 500,
  GB_MAKS_DATA = 600000; /* ±600 KB teks agar aman di cloud (batas 1 MB per dokumen) */
var GB_IKON_PENSIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
var GB_IKON_GAMBAR =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/></svg>';

var GB_PROFIL_SISI = 320;
var GB_IKON_ORANG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6"/></svg>';
function gbData() {
  var d = store.get(K_GB, null);
  return d && typeof d === 'object' ? d : {};
}
function gbSah(f) {
  return typeof imFotoSah === 'function' ? imFotoSah(f) : typeof f === 'string' ? f : '';
}
function gbFoto() {
  return gbSah(gbData().foto);
}
function gbProfil() {
  return gbSah(gbData().profil);
}
/* bagian: 'foto' (banner) atau 'profil' */
var GB_NAMA_MAKS = 40,
  GB_NAMA_AWAL = 'Nama kamu';
function gbNama() {
  return String(gbData().nama || '')
    .trim()
    .slice(0, GB_NAMA_MAKS);
}
/* Semua isian disimpan bersama; 'ubah' hanya mengganti bagian yang disebut */
function gbSimpanSemua(ubah) {
  var d = gbData(),
    baru = {
      foto: gbSah(d.foto),
      profil: gbSah(d.profil),
      nama: gbNama(),
      lahir: gbLahir(),
      bb: gbAngka(d.bb, GB_BB),
      tb: gbAngka(d.tb, GB_TB),
      kategori: gbKategori(),
      badge: gbBadge(true),
      bio: gbBio(),
      sematan: Array.isArray(d.sematan) ? d.sematan.slice(0, 500) : []
    };
  Object.keys(ubah).forEach(function (k) {
    baru[k] = ubah[k];
  });
  store.set(K_GB, baru);
}
function gbSimpan(nilai, bagian) {
  var u = {};
  u[bagian || 'foto'] = nilai || '';
  gbSimpanSemua(u);
  renderGaleryBanner();
  if (pageKind === 'galery-banner') gbRenderPratinjau();
}

/* ---------- Usia, berat, tinggi (5.42.0) ----------
   lahir: 'YYYY-MM-DD' (usia dihitung otomatis) · bb: kg (1 desimal) · tb: cm (1 desimal) */
var GB_BB = { min: 1, maks: 500 },
  GB_TB = { min: 30, maks: 300 };
function gbHariIni() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function gbLahir() {
  var l = gbData().lahir;
  return typeof l === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l) && l >= '1900-01-01' && l <= gbHariIni() ? l : '';
}
function gbAngka(v, b) {
  v = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : +v;
  return isFinite(v) && v >= b.min && v <= b.maks ? Math.round(v * 10) / 10 : '';
}
function gbUsia(lahir, kini) {
  if (!lahir) return '';
  var p = lahir.split('-'),
    u = kini.getFullYear() - +p[0];
  if (kini.getMonth() + 1 < +p[1] || (kini.getMonth() + 1 === +p[1] && kini.getDate() < +p[2])) u--;
  return u >= 0 ? u : '';
}
function gbTeksAngka(n) {
  return n === '' ? '–' : String(n).replace('.', ',');
}
function gbStatistikHtml() {
  var d = gbData(),
    usia = gbUsia(gbLahir(), new Date()),
    bb = gbAngka(d.bb, GB_BB),
    tb = gbAngka(d.tb, GB_TB);
  var kartu = function (n, sat, label) {
    return (
      '<div class="gb-stat"><span class="gb-stat-n" translate="no">' +
      gbTeksAngka(n) +
      (n === '' ? '' : '<u>' + sat + '</u>') +
      '</span><i>' +
      label +
      '</i></div>'
    );
  };
  return kartu(usia, 'th', 'Usia') + kartu(bb, 'kg', 'Berat') + kartu(tb, 'cm', 'Tinggi');
}
function renderGbStatistik() {
  var h = gbStatistikHtml();
  ['#gbStatistik', '#gbPratinjauStatistik'].forEach(function (s) {
    var b = $(s);
    if (b && b.innerHTML !== h) b.innerHTML = h;
  });
}

/* Isi kotak banner (dipakai di halaman Galery dan pratinjau halaman edit) */
function gbIsiHtml(foto) {
  return foto ? '<img src="' + esc(foto) + '" alt="" referrerpolicy="no-referrer" decoding="async">' : ''; /* kosong: latar warna tema */
}

/* ---------- Nama, jam, tanggal di kiri banner (5.40.0) ---------- */
var GB_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
var GB_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
/* Pagi 05.00–10.59 · Siang 11.00–14.59 · Sore 15.00–17.59 · Malam 18.00–23.59 · Dini hari 00.00–04.59 */
function gbWaktuHari(j) {
  return j < 5 ? 'dini hari' : j < 11 ? 'pagi' : j < 15 ? 'siang' : j < 18 ? 'sore' : 'malam';
}
function gbJam(d) {
  var j = d.getHours(),
    j12 = j % 12 || 12,
    m = d.getMinutes();
  return 'Pukul ' + (j12 < 10 ? '0' : '') + j12 + ':' + (m < 10 ? '0' : '') + m + ' ' + gbWaktuHari(j);
}
/* Sapaan (5.41.0): mengikuti pembagian waktu yang sama; dini hari memakai "malam" */
function gbSapa(d) {
  var w = gbWaktuHari(d.getHours());
  return 'Hi, Selamat ' + (w === 'dini hari' ? 'malam' : w) + '!';
}
function gbTanggal(d) {
  return GB_HARI[d.getDay()] + ', ' + d.getDate() + ' ' + GB_BULAN[d.getMonth()] + ' ' + d.getFullYear();
}
function gbTeksHtml() {
  var n = gbNama(),
    d = new Date();
  return (
    '<b class="gb-nama' +
    (n ? '' : ' contoh') +
    '" translate="no">' +
    esc(n || GB_NAMA_AWAL) +
    '</b>' +
    '<span class="gb-jam" translate="no">' +
    gbJam(d) +
    '</span>' +
    '<span class="gb-tgl" translate="no">' +
    gbTanggal(d) +
    '</span>'
  );
}
/* Nama terlalu panjang: huruf mengecil sampai 60%, sisanya dipotong "…" (CSS) */
function gbPasNama(box) {
  var el = box && box.querySelector('.gb-nama');
  if (!el) return;
  el.style.fontSize = '';
  var r = document.createRange();
  r.selectNodeContents(el);
  var lebarTeks = function () {
    return r.getBoundingClientRect().width;
  }; /* lebar teks sebenarnya (termasuk pecahan piksel) */
  var awal = parseFloat(getComputedStyle(el).fontSize),
    uk = awal;
  while (el.clientWidth && lebarTeks() > el.clientWidth && uk > awal * 0.6) {
    uk -= 1;
    el.style.fontSize = uk + 'px';
  }
}
function renderGbTeks() {
  ['#gbTeks', '#gbPratinjauTeks'].forEach(function (s) {
    var b = $(s);
    if (b) {
      b.innerHTML = gbTeksHtml();
      gbPasNama(b);
    }
  });
  renderGbStatistik();
  var sapa = gbSapa(new Date());
  ['#gbSapa', '#gbPratinjauSapa'].forEach(function (s) {
    var b = $(s);
    if (b && b.textContent !== sapa) b.textContent = sapa;
  });
}
/* Huruf Archivo Black baru siap setelah dimuat → ukur ulang nama */
if (document.fonts && document.fonts.ready)
  document.fonts.ready.then(function () {
    ['#gbTeks', '#gbPratinjauTeks'].forEach(function (s) {
      gbPasNama($(s));
    });
    if (typeof gbRingkasBadge === 'function') {
      gbRingkasBadge();
      gbCekBio();
    }
  });
var gbJamTimer = null;
function gbJadwalJam() {
  /* perbarui tepat saat menit berganti */
  clearTimeout(gbJamTimer);
  var d = new Date();
  gbJamTimer = setTimeout(
    function () {
      renderGbTeks();
      gbJadwalJam();
    },
    (60 - d.getSeconds()) * 1000 - d.getMilliseconds() + 50
  );
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) {
    renderGbTeks();
    gbJadwalJam();
  }
});
window.addEventListener('resize', function () {
  ['#gbTeks', '#gbPratinjauTeks'].forEach(function (s) {
    gbPasNama($(s));
  });
});

function gbProfilHtml(f) {
  return f ? '<img src="' + esc(f) + '" alt="" referrerpolicy="no-referrer" decoding="async">' : GB_IKON_ORANG;
}
function renderGaleryBanner() {
  var box = $('#gbBanner');
  if (!box) return;
  var foto = gbFoto();
  if (!(box.dataset.foto === foto && box.childElementCount)) {
    /* jangan muat ulang gambar yang sama */
    box.dataset.foto = foto;
    box.classList.toggle('ada', !!foto);
    box.innerHTML = gbIsiHtml(foto);
  }
  var pr = $('#gbProfil'),
    pf = gbProfil();
  if (pr && !(pr.dataset.foto === pf && pr.childElementCount)) {
    pr.dataset.foto = pf;
    pr.classList.toggle('ada', !!pf);
    pr.innerHTML = gbProfilHtml(pf);
  }
  renderGbTeks();
  renderGbInfo();
}
$('#gbEdit').addEventListener('click', function () {
  openLayer('page:galery-banner');
});
$('#gbProfil').addEventListener('click', function () {
  openLayer('page:galery-banner');
});

/* ---------- Halaman edit banner ---------- */
PAGES['galery-banner'] = function () {
  $('#subTitle').textContent = 'Banner & profil Galery';
  $('#subBody').innerHTML =
    '<section class="ie-bagian"><h3 class="ie-judul">Pratinjau</h3>' +
    '<div class="gb-bingkai gb-pratinjau-bingkai"><div class="gb-banner gb-pratinjau" id="gbPratinjau"></div>' +
    '<span class="gb-sapa" id="gbPratinjauSapa"></span>' +
    '<div class="gb-teks" id="gbPratinjauTeks"></div>' +
    '<div class="gb-statistik" id="gbPratinjauStatistik"></div>' +
    '<div class="gb-profil gb-profil-pratinjau" id="gbPratinjauProfil"></div></div>' +
    '<small class="ie-bantu">Banner 3:1, dipotong di bagian tengah. Foto profil dipotong persegi.</small>' +
    '</section>' +
    '<section class="ie-bagian"><h3 class="ie-judul"><label for="gbNama">Nama</label></h3>' +
    '<input class="input" id="gbNama" maxlength="' +
    GB_NAMA_MAKS +
    '" placeholder="' +
    GB_NAMA_AWAL +
    '" autocomplete="off" value="' +
    esc(gbNama()) +
    '">' +
    '<small class="ie-bantu">Tampil besar di kiri banner, di atas jam dan tanggal. Kosongkan untuk "' +
    GB_NAMA_AWAL +
    '".</small>' +
    '</section>' +
    '<section class="ie-bagian"><h3 class="ie-judul">Usia, berat & tinggi</h3>' +
    '<div class="field"><label for="gbLahir">Tanggal lahir</label>' +
    '<input class="input" id="gbLahir" type="date" min="1900-01-01" max="' +
    gbHariIni() +
    '" value="' +
    gbLahir() +
    '"></div>' +
    '<div class="gb-ukur">' +
    '<div class="field"><label for="gbBb">Berat badan</label><div class="gb-satuan"><input class="input" id="gbBb" type="text" inputmode="decimal" maxlength="5" placeholder="60" value="' +
    gbTeksAngka(gbAngka(gbData().bb, GB_BB)).replace('–', '') +
    '"><span>kg</span></div></div>' +
    '<div class="field"><label for="gbTb">Tinggi badan</label><div class="gb-satuan"><input class="input" id="gbTb" type="text" inputmode="decimal" maxlength="5" placeholder="170" value="' +
    gbTeksAngka(gbAngka(gbData().tb, GB_TB)).replace('–', '') +
    '"><span>cm</span></div></div>' +
    '</div>' +
    '<small class="ie-bantu">Usia dihitung otomatis dari tanggal lahir. Kosongkan isian untuk menyembunyikan angkanya (tampil "–").</small>' +
    '</section>' +
    '<section class="ie-bagian" id="gbBagianBadge"><h3 class="ie-judul">Badge</h3>' +
    '<div id="gbBadgeEdit">' +
    gbBadgeEditHtml() +
    '</div>' +
    '<button type="button" class="ie-poin-tambah" data-gbb="tambah" id="gbBadgeTambah"' +
    (gbBadge(true).length >= GB_BADGE_MAKS ? ' disabled' : '') +
    '><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Tambah badge</button>' +
    '<small class="ie-bantu">Maks. ' +
    GB_BADGE_MAKS +
    ' badge, masing-masing ' +
    GB_BADGE_PJG +
    ' karakter. Ketuk kotak di kiri untuk memilih ikon atau emoji (' +
    Object.keys(GB_IKON).length +
    ' ikon dalam ' +
    GB_IKON_GRUP.length +
    ' bidang).</small>' +
    '</section>' +
    '<section class="ie-bagian" id="gbBagianKat"><h3 class="ie-judul">Kategori badge</h3>' +
    '<div id="gbKatEdit">' +
    gbKatEditHtml() +
    '</div>' +
    '<button type="button" class="ie-poin-tambah" data-gbk="tambah" id="gbKatTambah"' +
    (gbKategori().length >= GB_KAT_MAKS ? ' disabled' : '') +
    '><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Tambah kategori</button>' +
    '<small class="ie-bantu">Maks. ' +
    GB_KAT_MAKS +
    ' kategori. Warna badge mengikuti kategorinya.</small>' +
    '</section>' +
    '<section class="ie-bagian" id="gbBagianBio"><h3 class="ie-judul"><label for="gbBioEdit">Bio</label></h3>' +
    '<textarea class="input" id="gbBioEdit" rows="4" maxlength="' +
    GB_BIO_MAKS +
    '" placeholder="Tulis bio singkat tentang dirimu">' +
    esc(gbBio()) +
    '</textarea>' +
    '<small class="ie-bantu">Tampil 3 baris dulu, sisanya lewat "Selengkapnya". Link https bisa diketuk.</small>' +
    '</section>' +
    gbBagianHtml('foto', 'Banner', 'Hapus banner') +
    gbBagianHtml('profil', 'Foto profil', 'Hapus foto profil');
  gbRenderPratinjau();
  return true;
};
function gbBagianHtml(b, judul, teksHapus) {
  return (
    '<section class="ie-bagian"><h3 class="ie-judul">' +
    judul +
    '</h3>' +
    '<div class="gb-aksi">' +
    '<button type="button" class="btn primary ie-btn" data-gb="galeri" data-gb-b="' +
    b +
    '">' +
    GB_IKON_GAMBAR +
    'Dari galeri</button>' +
    '<button type="button" class="btn ghost ie-btn" data-gb="link" data-gb-b="' +
    b +
    '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>Dari link</button>' +
    '</div>' +
    '<div class="ie-link" id="gbLink-' +
    b +
    '" hidden><input class="input" id="gbLinkIsi-' +
    b +
    '" data-gb-b="' +
    b +
    '" type="url" inputmode="url" maxlength="2000" placeholder="https://…/gambar.jpg" autocomplete="off">' +
    '<button type="button" class="btn primary" data-gb="link-pakai" data-gb-b="' +
    b +
    '">Pakai</button></div>' +
    '<button type="button" class="ie-hapus-foto gb-hapus" data-gb="hapus" data-gb-b="' +
    b +
    '" id="gbHapus-' +
    b +
    '">' +
    teksHapus +
    '</button>' +
    '<input type="file" id="gbFile-' +
    b +
    '" data-gb-b="' +
    b +
    '" accept="image/*" hidden>' +
    '</section>'
  );
}
function gbRenderPratinjau() {
  var p = $('#gbPratinjau');
  if (!p) return;
  var foto = gbFoto(),
    pf = gbProfil();
  p.classList.toggle('ada', !!foto);
  p.innerHTML = gbIsiHtml(foto);
  renderGbTeks();
  var pr = $('#gbPratinjauProfil');
  pr.classList.toggle('ada', !!pf);
  pr.innerHTML = gbProfilHtml(pf);
  $('#gbHapus-foto').hidden = !foto;
  $('#gbHapus-profil').hidden = !pf;
}

/* Gambar dari galeri HP → dipotong di tengah (banner 3:1 maks 1500×500, profil persegi maks 320), JPEG */
function gbDariBerkas(file, bagian) {
  if (!file || !/^image\//.test(file.type)) {
    toast('Pilih file gambar');
    return;
  }
  var profil = bagian === 'profil',
    rasio = profil ? 1 : 3,
    maks = profil ? GB_PROFIL_SISI : GB_LEBAR;
  var url = URL.createObjectURL(file),
    img = new Image();
  img.onload = function () {
    var W = img.naturalWidth,
      H = img.naturalHeight,
      sw = W,
      sh = W / rasio;
    if (sh > H) {
      sh = H;
      sw = H * rasio;
    } /* potong sesuai rasio di tengah */
    var lebar = Math.min(maks, Math.round(sw)),
      tinggi = Math.round(lebar / rasio);
    var c = document.createElement('canvas');
    c.width = lebar;
    c.height = tinggi;
    var g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, lebar, tinggi);
    g.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, lebar, tinggi);
    URL.revokeObjectURL(url);
    var data = '',
      q = 0.85;
    try {
      do {
        data = c.toDataURL('image/jpeg', q);
        q -= 0.1;
      } while (data.length > GB_MAKS_DATA && q > 0.35);
    } catch (e) {
      toast('Gambar tidak bisa dibaca');
      return;
    }
    if (data.length > GB_MAKS_DATA) {
      toast('Gambar terlalu besar');
      return;
    }
    gbSimpan(data, bagian);
    toast(profil ? 'Foto profil diganti' : 'Banner diganti');
  };
  img.onerror = function () {
    URL.revokeObjectURL(url);
    toast('Gambar tidak bisa dibaca');
  };
  img.src = url;
}
function gbDariLink(u, bagian) {
  u = String(u || '').trim();
  if (!/^https:\/\/[^\s"'<>]+$/.test(u)) {
    toast('Link harus diawali https://');
    $('#gbLinkIsi-' + bagian).focus();
    return;
  }
  var img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.onload = function () {
    gbSimpan(u, bagian);
    var l = $('#gbLink-' + bagian);
    if (l) l.hidden = true;
    toast(bagian === 'profil' ? 'Foto profil diganti' : 'Banner diganti');
  };
  img.onerror = function () {
    toast('Gambar dari link ini tidak bisa dimuat');
  };
  img.src = u;
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-banner') return;
  var t = e.target.closest('[data-gb]');
  if (!t) return;
  var a = t.dataset.gb,
    b = t.dataset.gbB === 'profil' ? 'profil' : 'foto';
  if (a === 'galeri') $('#gbFile-' + b).click();
  else if (a === 'link') {
    var l = $('#gbLink-' + b);
    l.hidden = !l.hidden;
    if (!l.hidden) {
      var f = b === 'profil' ? gbProfil() : gbFoto();
      $('#gbLinkIsi-' + b).value = /^https:/.test(f) ? f : '';
      $('#gbLinkIsi-' + b).focus();
    }
  } else if (a === 'link-pakai') gbDariLink($('#gbLinkIsi-' + b).value, b);
  else if (a === 'hapus') {
    var p = b === 'profil';
    askConfirm({
      title: p ? 'Hapus foto profil?' : 'Hapus banner?',
      text: p ? 'Foto profil Galery kembali ke ikon orang.' : 'Banner Galery kembali kosong.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          gbSimpan('', b);
          toast(p ? 'Foto profil dihapus' : 'Banner dihapus');
        });
      }
    });
  }
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'galery-banner' || !/^gbFile-/.test(e.target.id)) return;
  var f = e.target.files && e.target.files[0],
    b = e.target.dataset.gbB;
  e.target.value = '';
  if (f) gbDariBerkas(f, b);
});
/* Tanggal lahir, berat, tinggi: tersimpan saat diubah; isian tidak sah ditolak dengan pesan */
function gbSimpanUkur(el) {
  var v = el.value.trim();
  if (el.id === 'gbLahir') {
    if (v && !(v >= '1900-01-01' && v <= gbHariIni())) {
      toast('Tanggal lahir tidak sah');
      el.value = gbLahir();
      return;
    }
    gbSimpanSemua({ lahir: v });
  } else {
    var b = el.id === 'gbBb' ? GB_BB : GB_TB,
      k = el.id === 'gbBb' ? 'bb' : 'tb',
      n = v ? gbAngka(v, b) : '';
    if (v && n === '') {
      toast((k === 'bb' ? 'Berat ' : 'Tinggi ') + b.min + '–' + b.maks + (k === 'bb' ? ' kg' : ' cm'));
      el.value = gbTeksAngka(gbAngka(gbData()[k], b)).replace('–', '');
      return;
    }
    var u = {};
    u[k] = n;
    gbSimpanSemua(u);
    el.value = gbTeksAngka(n).replace('–', '');
  }
  renderGbStatistik();
}
$('#subBody').addEventListener('change', function (e) {
  if (pageKind === 'galery-banner' && /^gb(Lahir|Bb|Tb)$/.test(e.target.id)) gbSimpanUkur(e.target);
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'galery-banner' || !/^gb(Bb|Tb)$/.test(e.target.id)) return;
  var v = e.target.value.replace(/[^0-9.,]/g, '');
  if (v !== e.target.value) e.target.value = v; /* hanya angka & koma */
});

/* ---------- Badge & bio (5.43.0) ---------- */
var GB_BADGE_MAKS = 30,
  GB_BADGE_PJG = 24,
  GB_BIO_MAKS = 500,
  GB_KAT_MAKS = 6,
  GB_KAT_PJG = 16;
var GB_WARNA = {
  ungu: '#7c5cff',
  hijau: '#14b8a6',
  oranye: '#f97316',
  merah: '#ef4444',
  biru: '#3b82f6',
  kuning: '#eab308',
  pink: '#ec4899',
  abu: '#64748b'
};
var GB_WARNA_NAMA = {
  ungu: 'Ungu',
  hijau: 'Hijau',
  oranye: 'Oranye',
  merah: 'Merah',
  biru: 'Biru',
  kuning: 'Kuning',
  pink: 'Pink',
  abu: 'Abu-abu'
};
var GB_KAT_AWAL = [
  { id: 'skill', nama: 'Skill', warna: 'ungu' },
  { id: 'hobi', nama: 'Hobi', warna: 'hijau' },
  { id: 'lain', nama: 'Lainnya', warna: 'oranye' }
];
/* Ikon garis per bidang (js/data/ikon-badge.js) digabung jadi satu peta; emoji disimpan sebagai 'e:<emoji>' (5.44.0) */
var GB_IKON = {},
  GB_IKON_BIDANG = {};
(typeof GB_IKON_GRUP !== 'undefined' ? GB_IKON_GRUP : []).forEach(function (g) {
  Object.keys(g.ikon).forEach(function (k) {
    GB_IKON[k] = g.ikon[k];
    GB_IKON_BIDANG[k] = g.id;
  });
});
function gbIkonSah(k) {
  k = String(k || '');
  return GB_IKON[k] ? k : /^e:.{1,16}$/.test(k) ? k : '';
}
function gbSvg(k) {
  if (/^e:/.test(k || '')) return '<span class="gb-emoji" aria-hidden="true">' + esc(k.slice(2)) + '</span>';
  return GB_IKON[k] ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + GB_IKON[k] + '</svg>' : '';
}
function gbKategori() {
  var k = gbData().kategori;
  if (!Array.isArray(k) || !k.length)
    return GB_KAT_AWAL.map(function (x) {
      return { id: x.id, nama: x.nama, warna: x.warna };
    });
  var lihat = {};
  return k
    .filter(function (x) {
      if (!x || !x.id || lihat[x.id]) return false;
      lihat[x.id] = 1;
      return true;
    })
    .slice(0, GB_KAT_MAKS)
    .map(function (x) {
      return { id: String(x.id), nama: String(x.nama || '').slice(0, GB_KAT_PJG), warna: GB_WARNA[x.warna] ? x.warna : 'ungu' };
    });
}
/* semua = true: termasuk badge yang teksnya masih kosong (untuk halaman edit) */
function gbBadge(semua) {
  var b = gbData().badge;
  return (Array.isArray(b) ? b : [])
    .filter(function (x) {
      return x && x.id && (semua || String(x.teks || '').trim());
    })
    .slice(0, GB_BADGE_MAKS)
    .map(function (x) {
      return { id: String(x.id), teks: String(x.teks || '').slice(0, GB_BADGE_PJG), kat: String(x.kat || ''), ikon: gbIkonSah(x.ikon) };
    });
}
function gbBio() {
  return String(gbData().bio || '').slice(0, GB_BIO_MAKS);
}
/* Link https di bio bisa diketuk */
function gbTautkan(t) {
  return esc(t).replace(/https:\/\/[^\s<]+/g, function (u) {
    return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>';
  });
}
var gbBadgeBuka = false,
  gbBioBuka = false;
function renderGbInfo() {
  var box = $('#gbInfo');
  if (!box) return;
  var b = gbBadge(),
    kats = gbKategori(),
    kat = {};
  kats.forEach(function (k) {
    kat[k.id] = k;
  });
  var katDari = function (x) {
    return kat[x.kat] || kats[0];
  };
  /* Belum diisi → tidak ditampilkan apa-apa (5.43.1) */
  var h = '';
  if (b.length)
    h +=
      '<div class="gb-badge-baris" id="gbBadgeBaris">' +
      b
        .map(function (x) {
          var k = katDari(x);
          return (
            '<span class="gb-badge" style="--w:' +
            GB_WARNA[k.warna] +
            '">' +
            gbSvg(x.ikon) +
            '<span translate="no">' +
            esc(x.teks) +
            '</span></span>'
          );
        })
        .join('') +
      '<button type="button" class="gb-badge gb-badge-lagi" id="gbBadgeLagi" hidden></button></div>';
  var dipakai = kats.filter(function (k) {
    return b.some(function (x) {
      return katDari(x).id === k.id;
    });
  });
  if (dipakai.length)
    h +=
      '<div class="gb-legenda">' +
      dipakai
        .map(function (k) {
          return '<span style="--w:' + GB_WARNA[k.warna] + '" translate="no">' + esc(k.nama || 'Tanpa nama') + '</span>';
        })
        .join('') +
      '</div>';
  var bio = gbBio();
  if (bio.trim())
    h +=
      '<div class="gb-bio' +
      (gbBioBuka ? ' buka' : '') +
      '"><p class="gb-bio-isi" id="gbBioIsi" translate="no">' +
      gbTautkan(bio) +
      '</p><button type="button" class="gb-bio-lagi" id="gbBioLagi" hidden></button></div>';
  box.innerHTML = h;
  box.hidden = !h;
  gbRingkasBadge();
  gbCekBio();
}
/* Badge lebih dari 2 baris → sisanya diringkas jadi "+N" (ketuk untuk melihat semua) */
function gbRingkasBadge() {
  var baris = $('#gbBadgeBaris'),
    lagi = $('#gbBadgeLagi');
  if (!baris || !lagi || !baris.offsetParent) return;
  var chips = [].slice.call(baris.querySelectorAll('.gb-badge:not(.gb-badge-lagi)'));
  chips.forEach(function (c) {
    c.hidden = false;
  });
  lagi.hidden = true;
  var tops = [];
  chips.forEach(function (c) {
    if (tops.indexOf(c.offsetTop) < 0) tops.push(c.offsetTop);
  });
  if (tops.length <= 2) {
    if (gbBadgeBuka) gbBadgeBuka = false;
    return;
  }
  lagi.hidden = false;
  if (gbBadgeBuka) {
    lagi.textContent = 'Ringkas';
    return;
  }
  var baris2 = tops.sort(function (a, b) {
      return a - b;
    })[1],
    tampil = chips.filter(function (c) {
      return c.offsetTop <= baris2;
    }).length;
  for (;;) {
    chips.forEach(function (c, i) {
      c.hidden = i >= tampil;
    });
    lagi.textContent = '+' + (chips.length - tampil);
    if (lagi.offsetTop <= baris2 || tampil <= 1) break;
    tampil--;
  }
}
/* Bio lebih dari 3 baris → "Selengkapnya" */
function gbCekBio() {
  var isi = $('#gbBioIsi'),
    t = $('#gbBioLagi');
  if (!isi || !t || !isi.offsetParent) return;
  var bx = isi.parentNode;
  bx.classList.remove('buka'); /* ukur dalam keadaan ringkas */
  var panjang = isi.scrollHeight > isi.clientHeight + 1;
  if (!panjang) gbBioBuka = false;
  bx.classList.toggle('buka', gbBioBuka);
  t.hidden = !panjang;
  t.textContent = gbBioBuka ? 'Ringkas' : 'Selengkapnya';
}
$('#gbInfo').addEventListener('click', function (e) {
  if (e.target.closest('a')) return;
  if (e.target.closest('#gbBadgeLagi')) {
    gbBadgeBuka = !gbBadgeBuka;
    gbRingkasBadge();
    return;
  }
  if (e.target.closest('#gbBioLagi')) {
    gbBioBuka = !gbBioBuka;
    gbCekBio();
  }
});
window.addEventListener('resize', function () {
  gbRingkasBadge();
  gbCekBio();
});
/* Saat halaman Galery dibuka lagi (ukuran baru bisa diukur) */
document.addEventListener('click', function (e) {
  if (e.target.closest('[data-tab="galery"]'))
    setTimeout(function () {
      gbRingkasBadge();
      gbCekBio();
    }, 30);
});

/* ---- Edit badge, kategori, bio ---- */
function gbBadgeEditHtml() {
  var b = gbBadge(true),
    kats = gbKategori();
  if (!b.length) return '<p class="pe-kosong">Belum ada badge.</p>';
  return b
    .map(function (x, i) {
      var opsi = kats
        .map(function (k) {
          return (
            '<option value="' +
            esc(k.id) +
            '"' +
            (k.id === x.kat ||
            (!kats.some(function (q) {
              return q.id === x.kat;
            }) &&
              k === kats[0])
              ? ' selected'
              : '') +
            '>' +
            esc(k.nama || 'Tanpa nama') +
            '</option>'
          );
        })
        .join('');
      return (
        '<div class="gbb-baris" data-gbb-i="' +
        i +
        '">' +
        '<button type="button" class="gbb-ikon" data-gbb="ikon" aria-label="Pilih ikon">' +
        (x.ikon ? gbSvg(x.ikon) : '<span>+</span>') +
        '</button>' +
        '<input class="input gbb-teks" data-gbb-teks data-tanpa-hitung maxlength="' +
        GB_BADGE_PJG +
        '" placeholder="mis. Web developer" value="' +
        esc(x.teks) +
        '">' +
        '<button type="button" class="ie-poin-hapus" data-gbb="hapus" aria-label="Hapus badge"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<select class="input gbb-kat" data-gbb-kat aria-label="Kategori">' +
        opsi +
        '</select>' +
        '<div class="gbb-urut"><button type="button" data-gbb="naik" aria-label="Naikkan"' +
        (i ? '' : ' disabled') +
        '><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button>' +
        '<button type="button" data-gbb="turun" aria-label="Turunkan"' +
        (i < b.length - 1 ? '' : ' disabled') +
        '><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>' +
        '<div class="gbb-ikon-pilih" hidden></div>' +
        '</div>'
      );
    })
    .join('');
}
/* Pemilih ikon/emoji (dibuat saat dibuka): jenis Ikon/Emoji, bidang, kotak cari, emoji bebas */
var gbPilih = { jenis: 'ikon', bidang: 'semua', cari: '' };
function gbLabel(k) {
  return k.replace(/_/g, ' ');
}
function gbPilihGridHtml(sekarang) {
  var cari = gbPilih.cari.trim().toLowerCase(),
    h = '';
  GB_IKON_GRUP.forEach(function (g) {
    if (gbPilih.bidang !== 'semua' && gbPilih.bidang !== g.id) return;
    var cocokGrup = cari && g.nama.toLowerCase().indexOf(cari) >= 0;
    if (gbPilih.jenis === 'ikon') {
      Object.keys(g.ikon).forEach(function (k) {
        if (cari && !cocokGrup && gbLabel(k).indexOf(cari) < 0) return;
        h +=
          '<button type="button" data-gbb-ikon="' +
          k +
          '" title="' +
          gbLabel(k) +
          '" aria-label="' +
          gbLabel(k) +
          '"' +
          (k === sekarang ? ' class="on"' : '') +
          '>' +
          gbSvg(k) +
          '</button>';
      });
    } else {
      if (cari && !cocokGrup) return;
      g.emoji
        .split(' ')
        .filter(Boolean)
        .forEach(function (em) {
          var k = 'e:' + em;
          h +=
            '<button type="button" class="gbp-em' +
            (k === sekarang ? ' on' : '') +
            '" data-gbb-ikon="' +
            esc(k) +
            '" aria-label="' +
            esc(em) +
            '">' +
            esc(em) +
            '</button>';
        });
    }
  });
  return h || '<p class="pe-kosong">Tidak ada yang cocok.</p>';
}
function gbPilihHtml(sekarang) {
  return (
    '<div class="gbp-atas"><div class="gbp-jenis" role="tablist">' +
    '<button type="button" data-gbp-jenis="ikon"' +
    (gbPilih.jenis === 'ikon' ? ' class="on"' : '') +
    '>Ikon</button>' +
    '<button type="button" data-gbp-jenis="emoji"' +
    (gbPilih.jenis === 'emoji' ? ' class="on"' : '') +
    '>Emoji</button></div>' +
    '<input class="input gbp-cari" type="search" placeholder="Cari…" value="' +
    esc(gbPilih.cari) +
    '" aria-label="Cari ikon"></div>' +
    '<div class="gbp-bidang"><button type="button" data-gbp-bidang="semua"' +
    (gbPilih.bidang === 'semua' ? ' class="on"' : '') +
    '>Semua</button>' +
    GB_IKON_GRUP.map(function (g) {
      return (
        '<button type="button" data-gbp-bidang="' + g.id + '"' + (gbPilih.bidang === g.id ? ' class="on"' : '') + '>' + g.nama + '</button>'
      );
    }).join('') +
    '</div>' +
    '<div class="gbp-grid">' +
    gbPilihGridHtml(sekarang) +
    '</div>' +
    (gbPilih.jenis === 'emoji'
      ? '<div class="gbp-bebas"><input class="input" data-gbp-bebas maxlength="8" placeholder="Emoji lain…" aria-label="Emoji lain" autocomplete="off"><button type="button" class="btn primary" data-gbp="pakai">Pakai</button></div>'
      : '') +
    '<button type="button" data-gbb-ikon="" class="gbb-tanpa">Tanpa ikon</button>'
  );
}
function gbBukaPilih(row) {
  $$('#gbBadgeEdit .gbb-ikon-pilih').forEach(function (x) {
    if (!row.contains(x)) {
      x.hidden = true;
      x.innerHTML = '';
    }
  });
  var p = row.querySelector('.gbb-ikon-pilih'),
    i = +row.dataset.gbbI,
    b = gbBadge(true)[i];
  if (!p.hidden) {
    p.hidden = true;
    p.innerHTML = '';
    return;
  }
  if (b.ikon) {
    gbPilih.jenis = /^e:/.test(b.ikon) ? 'emoji' : 'ikon';
  }
  p.innerHTML = gbPilihHtml(b.ikon);
  p.hidden = false;
}
function gbSegarkanPilih(p) {
  var row = p.closest('[data-gbb-i]'),
    b = gbBadge(true)[+row.dataset.gbbI];
  var fokus = document.activeElement && document.activeElement.classList.contains('gbp-cari');
  p.innerHTML = gbPilihHtml(b.ikon);
  if (fokus) {
    var c = p.querySelector('.gbp-cari');
    c.focus();
    c.setSelectionRange(c.value.length, c.value.length);
  }
}
function gbKatEditHtml() {
  var kats = gbKategori();
  return kats
    .map(function (k, i) {
      return (
        '<div class="gbk-baris" data-gbk-i="' +
        i +
        '">' +
        '<span class="gbk-titik" style="--w:' +
        GB_WARNA[k.warna] +
        '"></span>' +
        '<input class="input" data-gbk-nama data-tanpa-hitung maxlength="' +
        GB_KAT_PJG +
        '" placeholder="Nama kategori" value="' +
        esc(k.nama) +
        '">' +
        '<select class="input gbk-warna" data-gbk-warna aria-label="Warna">' +
        Object.keys(GB_WARNA)
          .map(function (w) {
            return '<option value="' + w + '"' + (w === k.warna ? ' selected' : '') + '>' + GB_WARNA_NAMA[w] + '</option>';
          })
          .join('') +
        '</select>' +
        '<button type="button" class="ie-poin-hapus" data-gbk="hapus" aria-label="Hapus kategori"' +
        (kats.length > 1 ? '' : ' disabled') +
        '><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '</div>'
      );
    })
    .join('');
}
function gbRenderEditBadge() {
  var e = $('#gbBadgeEdit');
  if (e) e.innerHTML = gbBadgeEditHtml();
  var t = $('#gbBadgeTambah');
  if (t) t.disabled = gbBadge(true).length >= GB_BADGE_MAKS;
}
function gbRenderEditKat() {
  var e = $('#gbKatEdit');
  if (e) e.innerHTML = gbKatEditHtml();
  var t = $('#gbKatTambah');
  if (t) t.disabled = gbKategori().length >= GB_KAT_MAKS;
  gbRenderEditBadge();
}
function gbSimpanBadge(list) {
  gbSimpanSemua({ badge: list });
  renderGbInfo();
}
function gbSimpanKat(list) {
  gbSimpanSemua({ kategori: list });
  renderGbInfo();
}
$('#subBody').addEventListener('click', function (e) {
  if (pageKind !== 'galery-banner') return;
  var pj = e.target.closest('[data-gbp-jenis], [data-gbp-bidang]');
  if (pj) {
    if (pj.dataset.gbpJenis) gbPilih.jenis = pj.dataset.gbpJenis;
    else gbPilih.bidang = pj.dataset.gbpBidang;
    gbSegarkanPilih(pj.closest('.gbb-ikon-pilih'));
    return;
  }
  if (e.target.closest('[data-gbp="pakai"]')) {
    var pr = e.target.closest('[data-gbb-i]'),
      inp = pr.querySelector('[data-gbp-bebas]');
    var em =
      typeof imEmoji1 === 'function'
        ? imEmoji1(inp.value)
        : String(inp.value || '')
            .trim()
            .slice(0, 8);
    if (!em) {
      toast('Ketik atau tempel satu emoji');
      inp.focus();
      return;
    }
    var lb = gbBadge(true);
    lb[+pr.dataset.gbbI].ikon = 'e:' + em;
    gbSimpanBadge(lb);
    gbRenderEditBadge();
    return;
  }
  var t = e.target.closest('[data-gbb], [data-gbb-ikon], [data-gbk]');
  if (!t) return;
  var list = gbBadge(true),
    row = t.closest('[data-gbb-i]'),
    i = row ? +row.dataset.gbbI : -1;
  if (t.dataset.gbb === 'tambah') {
    if (list.length >= GB_BADGE_MAKS) {
      toast('Maksimal ' + GB_BADGE_MAKS + ' badge');
      return;
    }
    list.push({ id: uid(), teks: '', kat: gbKategori()[0].id, ikon: '' });
    gbSimpanBadge(list);
    gbRenderEditBadge();
    var rows = $$('#gbBadgeEdit .gbb-teks');
    if (rows.length) rows[rows.length - 1].focus();
  } else if (t.dataset.gbb === 'ikon') {
    gbBukaPilih(row);
  } else if (t.dataset.gbbIkon !== undefined) {
    list[i].ikon = t.dataset.gbbIkon;
    gbSimpanBadge(list);
    gbRenderEditBadge();
  } else if (t.dataset.gbb === 'naik' || t.dataset.gbb === 'turun') {
    var j = t.dataset.gbb === 'naik' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    var x = list[i];
    list[i] = list[j];
    list[j] = x;
    gbSimpanBadge(list);
    gbRenderEditBadge();
  } else if (t.dataset.gbb === 'hapus') {
    var nm = list[i].teks.trim();
    askConfirm({
      title: 'Hapus badge?',
      text: nm ? '"' + nm + '" dihapus dari Galery.' : 'Badge kosong ini dihapus.',
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          var l = gbBadge(true);
          l.splice(i, 1);
          gbSimpanBadge(l);
          gbRenderEditBadge();
          toast('Badge dihapus');
        });
      }
    });
  } else if (t.dataset.gbk === 'tambah') {
    var k = gbKategori();
    if (k.length >= GB_KAT_MAKS) {
      toast('Maksimal ' + GB_KAT_MAKS + ' kategori');
      return;
    }
    var pakai = k.map(function (x) {
        return x.warna;
      }),
      w =
        Object.keys(GB_WARNA).filter(function (x) {
          return pakai.indexOf(x) < 0;
        })[0] || 'ungu';
    k.push({ id: uid(), nama: '', warna: w });
    gbSimpanKat(k);
    gbRenderEditKat();
    var n = $$('#gbKatEdit [data-gbk-nama]');
    if (n.length) n[n.length - 1].focus();
  } else if (t.dataset.gbk === 'hapus') {
    var ks = gbKategori(),
      ki = +t.closest('[data-gbk-i]').dataset.gbkI;
    if (ks.length < 2) return;
    var tujuan = ki === 0 ? ks[1] : ks[0],
      jml = gbBadge(true).filter(function (b) {
        return b.kat === ks[ki].id;
      }).length;
    askConfirm({
      title: 'Hapus kategori?',
      text:
        '"' +
        (ks[ki].nama || 'Tanpa nama') +
        '" dihapus.' +
        (jml ? ' ' + jml + ' badge di dalamnya pindah ke "' + (tujuan.nama || 'Tanpa nama') + '".' : ''),
      ok: 'Hapus',
      action: function () {
        back(1, function () {
          var k2 = gbKategori(),
            hapusId = k2[ki].id,
            keId = (ki === 0 ? k2[1] : k2[0]).id;
          k2.splice(ki, 1);
          gbSimpanSemua({
            kategori: k2,
            badge: gbBadge(true).map(function (b) {
              if (b.kat === hapusId) b.kat = keId;
              return b;
            })
          });
          renderGbInfo();
          gbRenderEditKat();
          toast('Kategori dihapus');
        });
      }
    });
  }
});
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'galery-banner') return;
  if (e.target.dataset.gbbTeks !== undefined) {
    var l = gbBadge(true),
      i = +e.target.closest('[data-gbb-i]').dataset.gbbI;
    l[i].teks = e.target.value.slice(0, GB_BADGE_PJG);
    gbSimpanBadge(l);
  } else if (e.target.dataset.gbkNama !== undefined) {
    var k = gbKategori(),
      ki = +e.target.closest('[data-gbk-i]').dataset.gbkI;
    k[ki].nama = e.target.value.slice(0, GB_KAT_PJG);
    gbSimpanKat(k);
    $$('#gbBadgeEdit [data-gbb-kat] option[value="' + k[ki].id + '"]').forEach(function (o) {
      o.textContent = k[ki].nama || 'Tanpa nama';
    });
  } else if (e.target.classList.contains('gbp-cari')) {
    gbPilih.cari = e.target.value;
    var g = e.target.closest('.gbb-ikon-pilih').querySelector('.gbp-grid'),
      row = e.target.closest('[data-gbb-i]');
    g.innerHTML = gbPilihGridHtml(gbBadge(true)[+row.dataset.gbbI].ikon);
  } else if (e.target.id === 'gbBioEdit') {
    gbSimpanSemua({ bio: e.target.value.slice(0, GB_BIO_MAKS) });
    renderGbInfo();
  }
});
$('#subBody').addEventListener('change', function (e) {
  if (pageKind !== 'galery-banner') return;
  if (e.target.dataset.gbbKat !== undefined) {
    var l = gbBadge(true),
      i = +e.target.closest('[data-gbb-i]').dataset.gbbI;
    l[i].kat = e.target.value;
    gbSimpanBadge(l);
  } else if (e.target.dataset.gbkWarna !== undefined) {
    var k = gbKategori(),
      ki = +e.target.closest('[data-gbk-i]').dataset.gbkI;
    k[ki].warna = e.target.value;
    gbSimpanKat(k);
    e.target.closest('.gbk-baris').querySelector('.gbk-titik').style.setProperty('--w', GB_WARNA[k[ki].warna]);
  }
});

/* Nama langsung tersimpan sambil mengetik (sinkron cloud tetap dijadwalkan dengan jeda) */
function gbSimpanNama(v) {
  v = String(v || '')
    .trim()
    .slice(0, GB_NAMA_MAKS);
  if (v === gbNama()) return;
  var d = gbData();
  gbSimpanSemua({ nama: v });
  renderGbTeks();
}
$('#subBody').addEventListener('input', function (e) {
  if (pageKind !== 'galery-banner' || e.target.id !== 'gbNama') return;
  gbSimpanNama(e.target.value);
});
$('#subBody').addEventListener('keydown', function (e) {
  if (pageKind === 'galery-banner' && /^gbLinkIsi-/.test(e.target.id) && e.key === 'Enter') {
    e.preventDefault();
    gbDariLink(e.target.value, e.target.dataset.gbB);
  }
});

renderGaleryBanner();
gbJadwalJam();
