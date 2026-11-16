/* ============================================================
   Stivora — Galery · alat bersama koleksi Lainnya (5.65.0)
   Dipakai Tempat, Channel, Tokoh, dan Koleksi Link supaya cara kerjanya sama dan cukup diperbaiki di satu tempat.
   ============================================================ */
'use strict';

/* Simpan daftar item ke kunci yang disinkron per item ({ v, ...kepala, item: [...] }).
   Item yang isinya tidak berubah ditulis persis seperti aslinya, supaya sinkron hanya mengirim yang benar-benar berubah.
   sah    = fungsi pembersih item modul itu (dipakai untuk membandingkan isi)
   kepala = field lain di luar 'item' yang ikut diganti (mis. { kol: [...] }); yang kosong dibiarkan seperti semula */
function glSimpanPecahan(kunci, sah, items, kepala) {
  var d = store.get(kunci, null),
    o = { v: 1 },
    mentah = {};
  if (!d || typeof d !== 'object') d = {};
  Object.keys(d).forEach(function (k) {
    if (k !== 'item' && k !== 'v') o[k] = d[k];
  });
  (Array.isArray(d.item) ? d.item : []).forEach(function (r) {
    if (r && typeof r.id === 'string') mentah[r.id] = r;
  });
  o.item = items.map(function (x) {
    var r = mentah[x.id],
      n = r ? sah(r) : null;
    return n && JSON.stringify(n) === JSON.stringify(x) ? r : x;
  });
  Object.keys(kepala || {}).forEach(function (k) {
    if (kepala[k]) o[k] = kepala[k];
  });
  store.set(kunci, o);
}

/* Foto profil sendiri: dipotong persegi di tengah lalu diperkecil jadi JPEG 160×160 (±10 KB),
   supaya ikut sinkron & cadangan tanpa membebani. lalu(dataUrl) dipanggil bila berhasil. */
function glFotoKecil(file, maksChar, lalu) {
  if (!/^image\//.test(file.type)) {
    toast('Pilih file gambar');
    return;
  }
  createImageBitmap(file)
    .then(function (bmp) {
      var s = 160,
        c = document.createElement('canvas'),
        k = Math.min(bmp.width, bmp.height);
      c.width = s;
      c.height = s;
      c.getContext('2d').drawImage(bmp, (bmp.width - k) / 2, (bmp.height - k) / 2, k, k, 0, 0, s, s);
      var q = 0.85,
        url = c.toDataURL('image/jpeg', q);
      while (url.length > maksChar && q > 0.4) {
        q -= 0.15;
        url = c.toDataURL('image/jpeg', q);
      }
      if (url.length > maksChar) {
        toast('Foto terlalu besar');
        return;
      }
      lalu(url);
    })
    .catch(function () {
      toast('Gambar tidak bisa dibuka');
    });
}

/* Pemutar video YouTube di dalam aplikasi (lapisan di atas halaman).
   Tombol Kembali / gestur geser menutupnya; saatTutup() dipanggil sesudah ditutup (mis. untuk menggambar ulang halaman). */
var glPutarRiwayat = false,
  glPutarSaatTutup = null;
var GL_IK_TUTUP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function glPutarVideo(v, judul, saatTutup) {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(v || '')) return;
  /* Hentikan Playlist Lagu yang sedang main supaya suaranya tidak bertumpuk */
  if (typeof lgYT !== 'undefined' && lgYT && typeof lgQ !== 'undefined' && lgQ && lgQ.main) {
    try {
      lgYT.pauseVideo();
      lgQ.main = false;
      lgRender();
    } catch (e) {}
  }
  glPutarTutup();
  glPutarSaatTutup = saatTutup || null;
  var w = document.createElement('div');
  w.className = 'fm-trailer ch-putar';
  w.id = 'glPutar';
  w.innerHTML =
    '<div class="fm-trailer-isi"><div class="fm-trailer-vid">' +
    '<iframe src="https://www.youtube.com/embed/' +
    v +
    '?autoplay=1&playsinline=1&rel=0" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' +
    '<div class="fm-trailer-bwh"><b>' +
    esc(judul || '') +
    '</b><span class="ch-putar-tb">' +
    '<button type="button" data-glp="yt">YouTube</button><button type="button" data-glp="tutup">' +
    GL_IK_TUTUP +
    'Tutup</button></span></div></div>';
  w.addEventListener('click', function (e) {
    var b = e.target.closest('[data-glp]');
    if (b && b.dataset.glp === 'yt') {
      window.open('https://www.youtube.com/watch?v=' + v, '_blank', 'noopener');
      return;
    }
    if (e.target === w || b) glPutarTutupRiwayat();
  });
  document.body.appendChild(w);
  try {
    history.pushState(history.state, '');
    glPutarRiwayat = true;
  } catch (e) {
    glPutarRiwayat = false;
  }
}
function glPutarTutup() {
  var w = $('#glPutar');
  if (!w) return;
  w.remove();
  var f = glPutarSaatTutup;
  glPutarSaatTutup = null;
  if (f) f();
}
function glPutarTutupRiwayat() {
  if (glPutarRiwayat) {
    glPutarRiwayat = false;
    history.back();
  } else glPutarTutup();
}
window.addEventListener('popstate', function () {
  glPutarRiwayat = false;
  glPutarTutup();
});

/* Perantara API lewat Worker (5.66.0): key YouTube/Google Books & TMDB disimpan sebagai Secret di Worker,
   jadi tidak ada di aplikasi. Butuh MEDIA_WORKER_URL terisi dan sudah masuk dengan Google.
   layanan: 'youtube' | 'books' | 'tmdb'; jalur: mis. 'videos', 'volumes/<id>', 'search/multi' */
function glWorkerAda() {
  return typeof MEDIA_WORKER_URL === 'string' && /^https:\/\//.test(MEDIA_WORKER_URL);
}
function glApiSiap() {
  return glWorkerAda() && typeof user !== 'undefined' && !!user && typeof user.getIdToken === 'function';
}
/* Alasan singkat bila belum siap (untuk ditampilkan ke pemakai); '' bila siap */
function glApiAlasan() {
  if (!glWorkerAda()) return 'Worker belum dipasang (MEDIA_WORKER_URL di config.js masih kosong)';
  if (!glApiSiap()) return 'Masuk dengan Google dulu (Pengaturan › Akun)';
  return '';
}
function glApi(layanan, jalur, q) {
  if (!glApiSiap()) return Promise.reject(new Error('tanpa-key'));
  var s = Object.keys(q || {})
    .map(function (n) {
      return n + '=' + encodeURIComponent(q[n]);
    })
    .join('&');
  return user.getIdToken().then(function (t) {
    return fetch(MEDIA_WORKER_URL.replace(/\/+$/, '') + '/api/' + layanan + '/' + jalur + (s ? '?' + s : ''), {
      headers: { Authorization: 'Bearer ' + t }
    }).then(function (r) {
      return r
        .json()
        .catch(function () {
          return {};
        })
        .then(function (j) {
          if (!r.ok) {
            var pesan = typeof j.error === 'string' ? j.error : (j.error && j.error.message) || j.status_message || 'HTTP ' + r.status;
            if (r.status === 401 && layanan === 'tmdb' && !j.error) pesan = 'TMDB_API_KEY di Worker tidak valid.';
            if (!/[.!?]$/.test(pesan)) pesan += '.';
            var e = new Error(pesan);
            e.status = r.status;
            throw e;
          }
          return j;
        });
    });
  });
}

/* ---------- Kelola topik/bidang tambahan (5.67.0) ----------
   Menghapus topik tambahan dari DAFTAR PILIHAN saja (pilihan B): item yang sudah memakainya tetap menyimpannya.
   Hapus memakai konfirmasi di dalam jendela (baris berubah jadi "Hapus …? Batal / Hapus").
   o = { judul, nama: 'topik'|'bidang', daftar: fn() → [teks], hapus: fn(teks), lalu: fn() } */
function glGabungTopik(dasar, lain) {
  var o = dasar.slice();
  (lain || []).forEach(function (t) {
    if (typeof t === 'string' && t && o.indexOf(t) < 0) o.push(t);
  });
  return o;
}
function glKelolaTopik(o) {
  var tanya = '';
  function isi() {
    var d = o.daftar();
    if (!d.length) return '<p class="glkt-kosong">Belum ada ' + esc(o.nama) + ' tambahan. ' + esc(o.nama.charAt(0).toUpperCase() + o.nama.slice(1)) + ' bawaan tidak bisa dihapus.</p>';
    return (
      '<ul class="glkt-daftar">' +
      d
        .map(function (t) {
          if (t === tanya)
            return (
              '<li class="glkt-tanya"><span>Hapus “' +
              esc(t) +
              '” dari daftar? Item yang sudah memakainya tetap menyimpannya.</span><div class="bk-dlg-dua"><button type="button" class="btn ghost" data-glkt-batal>Batal</button><button type="button" class="btn danger" data-glkt-ya="' +
              esc(t) +
              '">Hapus</button></div></li>'
            );
          return (
            '<li><span>' +
            esc(t) +
            '</span><button type="button" class="glkt-hapus" data-glkt-hapus="' +
            esc(t) +
            '" aria-label="Hapus ' +
            esc(t) +
            '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }
  var w = tpLapisBuka(
    '<h4>' +
      esc(o.judul) +
      '</h4><p class="glkt-ket">Hanya ' +
      esc(o.nama) +
      ' tambahan yang bisa dihapus.</p><div id="glktIsi">' +
      isi() +
      '</div><div class="bk-dlg-dua"><button type="button" class="btn primary" data-tpl="batal">Selesai</button></div>',
    function (e) {
      var el;
      if ((el = e.target.closest('[data-glkt-hapus]'))) tanya = el.dataset.glktHapus;
      else if (e.target.closest('[data-glkt-batal]')) tanya = '';
      else if ((el = e.target.closest('[data-glkt-ya]'))) {
        o.hapus(el.dataset.glktYa);
        toast('“' + el.dataset.glktYa + '” dihapus dari daftar');
        tanya = '';
      } else return;
      var box = w.querySelector('#glktIsi');
      if (box) box.innerHTML = isi();
    }
  );
  /* Saat jendela ditutup (Selesai / kembali), tampilan di belakangnya digambar ulang */
  var obs = new MutationObserver(function () {
    if (!document.body.contains(w)) {
      obs.disconnect();
      if (o.lalu) o.lalu();
    }
  });
  obs.observe(document.body, { childList: true });
}
