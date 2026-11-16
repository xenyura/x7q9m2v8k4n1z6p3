/* Stivora — Mesin media: penampil (foto, video, audio, dokumen), jenis file, perkecil foto.
   Dipakai marker & tempat di peta. (5.37.0: tampilan Galery lama dihapus; mesinnya dipertahankan) */
'use strict';

/* Segarkan tampilan yang menampilkan media setelah data berubah */
function refreshAll() {
  if (opened.img) buildViewer(opened.img.slice(4)); /* hanya membangun ulang bila file baru tersedia */
  if (typeof renderGaleryTab === 'function') renderGaleryTab(); /* tab Foto Galery (5.45.0) */
}

/* =========================================================
   PENAMPIL MEDIA (lapisan img:<id>) — 5.51.0
   Geser kiri/kanan ganti item, cubit/ketuk dua kali untuk zoom, tarik ke bawah untuk
   menutup, ketuk sekali = mode bersih, info lengkap (ⓘ). Info ditaruh di ruang kosong
   bawah bila cukup, selain itu melayang di atas media. Video memakai kontrol sendiri.
   ========================================================= */
var viewerId = null;
var PN = { daftar: [], z: 1, tx: 0, ty: 0, vid: null, pratV: null, kecepatan: 1, sembunyiT: null, geserBilah: false };
var PN_KEC = [0.5, 1, 1.25, 1.5, 2];
var PN_IK = {
  play: '<svg class="pn-isi" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause:
    '<svg class="pn-isi" viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  mundur:
    '<svg viewBox="0 0 24 24"><path d="M11 7H7V3M7.5 7A8 8 0 1 1 4.6 14"/><text x="12.3" y="15.6" font-size="7.5" fill="currentColor" stroke="none" text-anchor="middle" font-weight="700">10</text></svg>',
  maju: '<svg viewBox="0 0 24 24"><path d="M13 7h4V3M16.5 7A8 8 0 1 0 19.4 14"/><text x="11.7" y="15.6" font-size="7.5" fill="currentColor" stroke="none" text-anchor="middle" font-weight="700">10</text></svg>',
  sebelum: '<svg viewBox="0 0 24 24"><path d="M18 6v12L9 12zM6 6v12"/></svg>',
  sesudah: '<svg viewBox="0 0 24 24"><path d="M6 6v12l9-6zM18 6v12"/></svg>',
  suara: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  bisu: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5"/></svg>',
  ulang: '<svg viewBox="0 0 24 24"><path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/></svg>',
  pip: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor"/></svg>',
  putar:
    '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 3.5a9 9 0 0 1 8 0M8 20.5a9 9 0 0 0 8 0"/></svg>',
  penuh: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
};

/* Daftar untuk geser: diisi pembuka penampil (Galery, marker, tempat) sebelum openLayer('img:…') */
var pnDaftarBerikut = null;
function pnSetDaftar(ids) {
  pnDaftarBerikut = Array.isArray(ids) ? ids.slice() : null;
}
function pnFmt(s) {
  if (!isFinite(s)) s = 0;
  s = Math.max(0, Math.floor(s));
  var h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    d = s % 60;
  return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + d).slice(-2);
}
function pnEl(id) {
  return document.getElementById(id);
}
function pnIndeks() {
  return PN.daftar.indexOf(viewerId);
}

function buildViewer(id, paksa) {
  var im = findImg(id);
  if (!im) return false;
  if (pnDaftarBerikut && pnDaftarBerikut.indexOf(id) >= 0) PN.daftar = pnDaftarBerikut;
  else if (PN.daftar.indexOf(id) < 0) PN.daftar = [id];
  pnDaftarBerikut = null;
  PN.daftar = PN.daftar.filter(function (x) {
    return x === id || findImg(x);
  });
  /* Sudah tampil dengan file yang sama: cukup segarkan tombol/info (video tidak diulang) */
  var u = pnEl('pnUtama');
  if (!paksa && viewerId === id && u && u.dataset.siap === (im.blob ? '1' : '0')) {
    pnRenderAtas();
    pnRenderLembar();
    return true;
  }
  viewerId = id;
  pnTampil();
  return true;
}
function pnGanti(id) {
  /* Ganti item tanpa menambah riwayat: lapisan 'img:<id>' teratas diganti */
  var L = layerOf('img');
  if (!L) return;
  cur.layers[L.index] = 'img:' + id;
  opened.img = 'img:' + id;
  try {
    history.replaceState(cur, '');
  } catch (e) {}
  viewerId = id;
  pnTampil();
}
function pnKe(arah) {
  var i = pnIndeks() + arah;
  if (i >= 0 && i < PN.daftar.length) pnGanti(PN.daftar[i]);
}

function pnSlot(slot, im, utama) {
  slot.innerHTML = '';
  if (!im) return null;
  var j = jenisMedia(im);
  if (!im.blob) {
    requestBlob(im);
    slot.innerHTML =
      '<span class="viewer-wait">' + (user || im.dariFolder ? '<i class="spin"></i>Memuat…' : 'Masuk untuk memuat file ini') + '</span>';
    return null;
  }
  var url = imgUrl(im);
  if (j === 'video') {
    var v = document.createElement('video');
    v.src = utama ? url : url + '#t=0.1';
    v.playsInline = true;
    v.preload = utama ? 'auto' : 'metadata';
    v.muted = !utama || !!PN.bisu;
    slot.appendChild(v);
    return v;
  }
  if (j === 'foto') {
    var img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    slot.appendChild(img);
    return img;
  }
  slot.innerHTML =
    '<div class="viewer-file">' +
    IKON_JENIS[j] +
    '<b>' +
    esc(im.name || JENIS_NAMA[j]) +
    '</b><small>' +
    JENIS_NAMA[j] +
    ' · ' +
    esc(ekstensi(im)) +
    ' · ' +
    ukuranFile(im.blob.size) +
    '</small>' +
    (j === 'audio'
      ? '<audio src="' + url + '" controls preload="metadata"></audio>'
      : '<div class="viewer-file-actions"><a class="btn primary" href="' +
        url +
        '" target="_blank" rel="noopener">Buka</a><a class="btn ghost" href="' +
        url +
        '" download="' +
        esc(im.name || 'dokumen') +
        '">Unduh</a></div>') +
    '</div>';
  return null;
}
function pnTampil() {
  pnHentikan();
  var trak = pnEl('pnTrak'),
    i = pnIndeks(),
    im = findImg(viewerId);
  PN.z = 1;
  PN.tx = 0;
  PN.ty = 0;
  trak.innerHTML = '';
  trak.style.transform = '';
  $('#layer-img').classList.remove('pn-info');
  [-1, 0, 1].forEach(function (d) {
    var s = document.createElement('div');
    s.className = 'pn-slot';
    s.style.transform = 'translateX(' + d * 100 + '%)';
    var x = d === 0 ? im : findImg(PN.daftar[i + d]);
    var el = pnSlot(s, x, d === 0);
    if (d === 0) {
      s.id = 'pnUtama';
      s.dataset.siap = im.blob ? '1' : '0';
      if (el && el.tagName === 'VIDEO') PN.vid = el;
      if (el)
        el.addEventListener(el.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', function () {
          pnAturLetak();
          pnRenderLembar();
        });
    }
    trak.appendChild(s);
  });
  pnRenderAtas();
  pnRenderBawah();
  pnRenderLembar();
  pnTerapZoom();
  if (PN.vid) pnSiapkanVideo();
  requestAnimationFrame(pnAturLetak);
}
function pnHentikan() {
  if (PN.vid) {
    try {
      PN.vid.pause();
    } catch (e) {}
  }
  PN.vid = null;
  PN.pratV = null;
  clearTimeout(PN.sembunyiT);
  if (document.pictureInPictureElement) {
    try {
      document.exitPictureInPicture();
    } catch (e) {}
  }
}
function pnRenderAtas() {
  var im = findImg(viewerId);
  if (!im) return;
  var i = pnIndeks(),
    pos = pnEl('pnPos');
  pos.textContent = i + 1 + ' / ' + PN.daftar.length;
  pos.hidden = PN.daftar.length < 2;
  var pinBtn = $('#btnPinImg'),
    bisa = !im.markerId && typeof gtDisematkan === 'function';
  pinBtn.hidden = !bisa;
  if (bisa) {
    var on = gtDisematkan(im.id);
    pinBtn.classList.toggle('on', on);
    pinBtn.setAttribute('aria-label', on ? 'Lepas sematan' : 'Sematkan');
  }
  $('#btnDeleteImg').hidden = !!im.dariFolder; /* media dari folder di HP: hanya-lihat */
}
function pnJudul(im) {
  return im.dariFolder ? im.name : im.caption || im.name || 'Tanpa keterangan';
}
function pnAsal(im) {
  if (im.dariFolder) {
    var m = typeof gfMetaCari === 'function' ? gfMetaCari(im.folderId) : null,
      p = im.path.split('/');
    p.pop();
    return 'Folder ' + (m ? m.nama : '') + (p.length ? ' / ' + p.join(' / ') : '');
  }
  if (im.markerId && typeof petaMarker !== 'undefined') {
    var mk = petaMarker.filter(function (x) {
      return x.id === im.markerId;
    })[0];
    if (mk) return 'Marker ' + mk.nama;
  }
  return '';
}
function pnTgl(t, jam) {
  var d = new Date(t || 0),
    s = d.toLocaleDateString(
      'id-ID',
      jam ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }
    );
  return jam ? s + ' · ' + ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2) : s;
}
function pnRenderBawah() {
  var im = findImg(viewerId),
    h = '',
    j = jenisMedia(im),
    asal = pnAsal(im);
  if (PN.vid) {
    h +=
      '<div class="pn-vk"><div class="pn-bilah" id="pnBilah"><div class="pn-jalur"><div class="pn-muat" id="pnMuat"></div><div class="pn-isi-bilah" id="pnIsiBilah"></div><div class="pn-bulat" id="pnBulat"></div></div>' +
      '<div class="pn-prat" id="pnPrat"><canvas id="pnPratC" width="192" height="108"></canvas><span id="pnPratT">0:00</span></div></div>' +
      '<div class="pn-waktu"><span id="pnNow">0:00</span><span id="pnSisa">−0:00</span></div>' +
      '<div class="pn-baris"><button type="button" class="pn-ib" data-pn="sebelum" aria-label="Sebelumnya"' +
      (pnIndeks() > 0 ? '' : ' disabled') +
      '>' +
      PN_IK.sebelum +
      '</button>' +
      '<button type="button" class="pn-ib" data-pn="mundur" aria-label="Mundur 10 detik">' +
      PN_IK.mundur +
      '</button>' +
      '<button type="button" class="pn-besar" data-pn="putar" id="pnPlay" aria-label="Putar">' +
      PN_IK.play +
      '</button>' +
      '<button type="button" class="pn-ib" data-pn="maju" aria-label="Maju 10 detik">' +
      PN_IK.maju +
      '</button>' +
      '<button type="button" class="pn-ib" data-pn="sesudah" aria-label="Berikutnya"' +
      (pnIndeks() < PN.daftar.length - 1 ? '' : ' disabled') +
      '>' +
      PN_IK.sesudah +
      '</button></div>' +
      '<div class="pn-atur"><button type="button" class="pn-chip" data-pn="kecepatan" id="pnSpeed">' +
      String(PN.kecepatan).replace('.', ',') +
      '×</button><span class="pn-atur-kanan">' +
      '<button type="button" class="pn-ib" data-pn="suara" id="pnMute" aria-label="Suara">' +
      (PN.bisu ? PN_IK.bisu : PN_IK.suara) +
      '</button>' +
      '<button type="button" class="pn-ib' +
      (PN.ulang ? ' on' : '') +
      '" data-pn="ulang" aria-label="Ulang">' +
      PN_IK.ulang +
      '</button>' +
      '<button type="button" class="pn-ib" data-pn="pip" aria-label="Jendela mengambang">' +
      PN_IK.pip +
      '</button>' +
      '<button type="button" class="pn-ib" data-pn="miring" aria-label="Putar layar">' +
      PN_IK.putar +
      '</button>' +
      '<button type="button" class="pn-ib" data-pn="penuh" aria-label="Layar penuh">' +
      PN_IK.penuh +
      '</button></span></div></div>';
  }
  h +=
    '<div class="pn-nama" translate="no">' +
    esc(pnJudul(im)) +
    '</div>' +
    '<div class="pn-meta">' +
    (im.caption && im.name && !im.dariFolder ? esc(im.name) + ' · ' : '') +
    (asal ? esc(asal) + ' · ' : '') +
    pnTgl(im.createdAt) +
    '</div>';
  if (PN.daftar.length > 1) {
    var i = pnIndeks(),
      a = Math.max(0, i - 30),
      b = Math.min(PN.daftar.length, i + 31);
    h +=
      '<div class="pn-strip" id="pnStrip">' +
      PN.daftar
        .slice(a, b)
        .map(function (id, k) {
          var x = findImg(id),
            jx = x ? jenisMedia(x) : '',
            isi = '';
          if (x && x.blob && jx === 'foto') isi = '<img src="' + imgUrl(x) + '" alt="" loading="lazy" draggable="false">';
          else if (x && x.blob && jx === 'video')
            isi = '<video src="' + imgUrl(x) + '#t=0.1" muted playsinline preload="metadata"></video><i></i>';
          else if (x && IKON_JENIS[jx]) isi = IKON_JENIS[jx];
          return (
            '<button type="button" data-pn-ke="' +
            (a + k) +
            '"' +
            (a + k === i ? ' class="on"' : '') +
            ' aria-label="Item ' +
            (a + k + 1) +
            '">' +
            isi +
            '</button>'
          );
        })
        .join('') +
      '</div>';
  }
  var bw = pnEl('pnBawah');
  bw.innerHTML = h;
  var st = pnEl('pnStrip'),
    on = st && st.querySelector('.on');
  if (on) st.scrollLeft = on.offsetLeft - st.clientWidth / 2 + on.offsetWidth / 2;
}
function pnRenderLembar() {
  var im = findImg(viewerId);
  if (!im) return;
  var j = jenisMedia(im),
    m = pnEl('pnUtama') && pnEl('pnUtama').firstChild,
    ukuran = '';
  if (m && m.naturalWidth) ukuran = m.naturalWidth + ' × ' + m.naturalHeight + ' piksel';
  else if (m && m.videoWidth) ukuran = m.videoWidth + ' × ' + m.videoHeight + ' piksel';
  var asal = pnAsal(im),
    baris = [
      ['Jenis', JENIS_NAMA[j] + ' · ' + esc(ekstensi(im))],
      im.caption && !im.dariFolder ? ['Keterangan', esc(im.caption)] : null,
      im.name ? ['Nama file', esc(im.name)] : null,
      asal ? [im.dariFolder ? 'Folder' : 'Asal', esc(asal.replace(/^(Folder|Marker) /, ''))] : null,
      [im.dariFolder ? 'Tanggal file' : 'Ditambahkan', pnTgl(im.createdAt, true)],
      ukuran || im.blob ? ['Ukuran', [ukuran, im.blob ? ukuranFile(im.blob.size) : ''].filter(Boolean).join(' · ')] : null,
      PN.vid && isFinite(PN.vid.duration) ? ['Durasi', pnFmt(PN.vid.duration)] : null,
      !im.markerId && typeof gtDisematkan === 'function' ? ['Disematkan', gtDisematkan(im.id) ? 'Ya' : 'Tidak'] : null
    ].filter(Boolean);
  pnEl('pnLembar').innerHTML =
    '<button type="button" class="pn-pegang" data-pn="tutupInfo" aria-label="Tutup info"></button><h3 translate="no">' +
    esc(pnJudul(im)) +
    '</h3><dl>' +
    baris
      .map(function (b) {
        return '<dt>' + b[0] + '</dt><dd>' + b[1] + '</dd>';
      })
      .join('') +
    '</dl>';
}
/* Info di ruang kosong bawah bila cukup; selain itu melayang di atas media */
function pnAturLetak() {
  var L = $('#layer-img'),
    bw = pnEl('pnBawah'),
    m = pnEl('pnUtama') && pnEl('pnUtama').firstChild;
  if (!bw || !L.classList.contains('open')) return;
  var W = innerWidth,
    H = innerHeight,
    w = 0,
    h = 0;
  if (m && m.naturalWidth) {
    w = m.naturalWidth;
    h = m.naturalHeight;
  } else if (m && m.videoWidth) {
    w = m.videoWidth;
    h = m.videoHeight;
  }
  var ruang = w ? (H - h * Math.min(W / w, H / h)) / 2 : 0;
  var samping = matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  bw.classList.toggle('pn-luar', !samping && w > 0 && ruang >= bw.offsetHeight - 18);
}
addEventListener('resize', function () {
  if (opened.img) pnAturLetak();
});

/* ---------- Zoom ---------- */
function pnMedia() {
  var u = pnEl('pnUtama'),
    m = u && u.firstChild;
  return m && (m.tagName === 'IMG' || m.tagName === 'VIDEO') ? m : null;
}
function pnBatas() {
  var m = pnMedia(),
    trak = pnEl('pnTrak');
  if (!m) return;
  var w = m.clientWidth * PN.z,
    h = m.clientHeight * PN.z,
    W = trak.clientWidth,
    H = trak.clientHeight,
    ox = m.offsetLeft,
    oy = m.offsetTop;
  if (w <= W) PN.tx = (W - w) / 2 - ox;
  else PN.tx = Math.min(-ox, Math.max(W - w - ox, PN.tx));
  if (h <= H) PN.ty = (H - h) / 2 - oy;
  else PN.ty = Math.min(-oy, Math.max(H - h - oy, PN.ty));
}
var pnZoomT;
function pnTerapZoom(anim) {
  var m = pnMedia();
  if (!m) return;
  if (PN.z <= 1.001) {
    PN.z = 1;
    PN.tx = 0;
    PN.ty = 0;
  } else pnBatas();
  m.style.transition = anim ? 'transform .22s ease' : 'none';
  m.style.transform = PN.z === 1 ? '' : 'translate(' + PN.tx + 'px,' + PN.ty + 'px) scale(' + PN.z + ')';
  var l = pnEl('pnZoom');
  l.textContent = (Math.round(PN.z * 10) / 10).toString().replace('.', ',') + '×';
  l.classList.toggle('tampil', PN.z > 1);
  clearTimeout(pnZoomT);
  pnZoomT = setTimeout(function () {
    l.classList.remove('tampil');
  }, 900);
  if (PN.z > 1) $('#layer-img').classList.add('pn-bersih');
}
function pnZoomKe(nz, cx, cy, anim) {
  var m = pnMedia();
  if (!m || (m.tagName === 'VIDEO' && nz > 1 && false)) return;
  var r = m.getBoundingClientRect(),
    rt = pnEl('pnTrak').getBoundingClientRect();
  var px = (cx - r.left) / PN.z,
    py = (cy - r.top) / PN.z;
  nz = Math.max(1, Math.min(5, nz));
  PN.tx = cx - rt.left - m.offsetLeft - px * nz;
  PN.ty = cy - rt.top - m.offsetTop - py * nz;
  PN.z = nz;
  pnTerapZoom(anim);
}

/* ---------- Gerakan jari ---------- */
var pnP = {},
  pnMulai = null,
  pnArah = '',
  pnPinch = null,
  pnKetukT = null,
  pnKetukAkhir = 0,
  pnTahanT = null,
  pnDitahan = false;
function pnJml() {
  return Object.keys(pnP).length;
}
function pnTrakEv(ev, fn) {
  document.getElementById('pnTrak').addEventListener(ev, fn);
}
pnTrakEv('pointerdown', function (e) {
  if (e.target.closest('audio, .viewer-file a, .viewer-file button')) return;
  try {
    pnEl('pnTrak').setPointerCapture(e.pointerId);
  } catch (x) {}
  pnP[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (pnJml() === 2) {
    var a = Object.keys(pnP).map(function (k) {
      return pnP[k];
    });
    clearTimeout(pnTahanT);
    pnPinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, z: PN.z };
    pnArah = 'pinch';
    return;
  }
  pnMulai = { x: e.clientX, y: e.clientY, t: performance.now(), tx: PN.tx, ty: PN.ty };
  pnArah = '';
  pnDitahan = false;
  if (PN.vid)
    pnTahanT = setTimeout(function () {
      if (pnArah || !PN.vid) return;
      pnDitahan = true;
      PN.vid.playbackRate = 2;
      pnEl('pnLencana').textContent = '2× · tahan';
      pnEl('pnLencana').classList.add('tampil');
      if (PN.vid.paused) PN.vid.play().catch(function () {});
    }, 500);
});
pnTrakEv('pointermove', function (e) {
  if (!pnP[e.pointerId]) return;
  pnP[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (pnArah === 'pinch' && pnJml() === 2) {
    var a = Object.keys(pnP).map(function (k) {
        return pnP[k];
      }),
      d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
    pnZoomKe((pnPinch.z * d) / pnPinch.d, (a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2);
    return;
  }
  if (!pnMulai || pnDitahan) return;
  var dx = e.clientX - pnMulai.x,
    dy = e.clientY - pnMulai.y,
    trak = pnEl('pnTrak');
  if (!pnArah && Math.hypot(dx, dy) > 8) {
    clearTimeout(pnTahanT);
    pnArah = PN.z > 1 ? 'geser' : Math.abs(dx) > Math.abs(dy) ? 'h' : dy > 0 ? 'v' : 'x';
  }
  if (pnArah === 'geser') {
    PN.tx = pnMulai.tx + dx;
    PN.ty = pnMulai.ty + dy;
    pnTerapZoom();
  } else if (pnArah === 'h') {
    var i = pnIndeks(),
      rem = (i === 0 && dx > 0) || (i === PN.daftar.length - 1 && dx < 0) ? 0.3 : 1;
    trak.style.transition = 'none';
    trak.style.transform = 'translateX(' + dx * rem + 'px)';
  } else if (pnArah === 'v') {
    trak.style.transition = 'none';
    trak.style.transform = 'translateY(' + dy + 'px) scale(' + Math.max(0.8, 1 - dy / 1500) + ')';
    $('#layer-img').style.background = 'rgba(0,0,0,' + Math.max(0.3, 1 - dy / 500) + ')';
  }
});
function pnLepas(e) {
  if (!pnP[e.pointerId]) return;
  delete pnP[e.pointerId];
  clearTimeout(pnTahanT);
  if (pnArah === 'pinch') {
    if (!pnJml()) {
      pnArah = '';
      pnPinch = null;
      if (PN.z < 1.05) {
        PN.z = 1;
        pnTerapZoom(true);
      }
    }
    return;
  }
  if (pnDitahan) {
    pnDitahan = false;
    if (PN.vid) PN.vid.playbackRate = PN.kecepatan;
    pnEl('pnLencana').classList.remove('tampil');
    return;
  }
  if (!pnMulai) return;
  var dx = e.clientX - pnMulai.x,
    dy = e.clientY - pnMulai.y,
    dt = performance.now() - pnMulai.t,
    trak = pnEl('pnTrak'),
    W = trak.clientWidth;
  if (pnArah === 'h') {
    var ke = dx < -W * 0.22 || (dx < -40 && dt < 250) ? 1 : dx > W * 0.22 || (dx > 40 && dt < 250) ? -1 : 0,
      i = pnIndeks();
    if (i + ke < 0 || i + ke >= PN.daftar.length) ke = 0;
    trak.style.transition = 'transform .25s ease';
    trak.style.transform = 'translateX(' + -ke * W + 'px)';
    setTimeout(function () {
      trak.style.transition = 'none';
      trak.style.transform = '';
      if (ke) pnKe(ke);
    }, 250);
  } else if (pnArah === 'v') {
    trak.style.transition = 'transform .2s ease';
    trak.style.transform = '';
    $('#layer-img').style.background = '';
    if (dy > 120) back(1);
  } else if (!pnArah && dt < 300) pnKetuk(e.clientX, e.clientY);
  pnMulai = null;
  pnArah = '';
}
pnTrakEv('pointerup', pnLepas);
pnTrakEv('pointercancel', pnLepas);
function pnKetuk(x, y) {
  var kini = performance.now(),
    L = $('#layer-img');
  if (kini - pnKetukAkhir < 300) {
    clearTimeout(pnKetukT);
    pnKetukAkhir = 0;
    if (PN.vid) {
      var W = innerWidth;
      if (x < W * 0.38) pnLoncat(-10, 'kiri');
      else if (x > W * 0.62) pnLoncat(10, 'kanan');
      else pnPutarJeda(x, y);
    } else if (pnMedia()) pnZoomKe(PN.z > 1 ? 1 : 2.5, x, y, true);
    return;
  }
  pnKetukAkhir = kini;
  pnKetukT = setTimeout(function () {
    if (PN.z > 1) return;
    L.classList.toggle('pn-bersih');
    if (!L.classList.contains('pn-bersih')) pnJadwalSembunyi();
  }, 300);
}

/* ---------- Video ---------- */
function pnSiapkanVideo() {
  var v = PN.vid,
    u = pnEl('pnUtama'),
    im = findImg(viewerId);
  var t = document.createElement('div');
  t.className = 'pn-tengah';
  t.id = 'pnTengah';
  t.innerHTML = PN_IK.play;
  u.appendChild(t);
  ['kiri', 'kanan'].forEach(function (s) {
    var g = document.createElement('div');
    g.className = 'pn-gel ' + s;
    g.id = 'pnGel-' + s;
    g.innerHTML = s === 'kiri' ? PN_IK.mundur + '−10 dtk' : PN_IK.maju + '+10 dtk';
    u.appendChild(g);
  });
  v.playbackRate = PN.kecepatan;
  v.muted = !!PN.bisu;
  v.loop = !!PN.ulang;
  v.addEventListener('loadedmetadata', function () {
    if (!isFinite(v.duration)) {
      v.currentTime = 1e9;
      v.addEventListener('timeupdate', function f() {
        v.removeEventListener('timeupdate', f);
        v.currentTime = 0;
        pnWaktu();
      });
    }
    pnWaktu();
  });
  ['timeupdate', 'progress', 'durationchange'].forEach(function (ev) {
    v.addEventListener(ev, pnWaktu);
  });
  v.addEventListener('play', pnIkonPutar);
  v.addEventListener('pause', pnIkonPutar);
  v.addEventListener('ended', function () {
    pnIkonPutar();
    $('#layer-img').classList.remove('pn-bersih');
  });
  var pv = document.createElement('video');
  pv.src = imgUrl(im);
  pv.muted = true;
  pv.preload = 'auto';
  PN.pratV = pv;
  pv.addEventListener('seeked', function () {
    var c = pnEl('pnPratC');
    if (!c || !pv.videoWidth) return;
    c.width = 192;
    c.height = Math.round((192 * pv.videoHeight) / pv.videoWidth);
    c.style.width = (pv.videoHeight > pv.videoWidth ? 64 : 104) + 'px';
    c.getContext('2d').drawImage(pv, 0, 0, c.width, c.height);
  });
  pnIkonPutar();
}
function pnDur() {
  var v = PN.vid;
  return v && isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
}
function pnWaktu() {
  var v = PN.vid;
  if (!v || PN.geserBilah) return;
  var d = pnDur(),
    t = Math.min(v.currentTime, d || v.currentTime),
    p = d ? (t / d) * 100 : 0,
    isi = pnEl('pnIsiBilah');
  if (!isi) return;
  isi.style.width = p + '%';
  pnEl('pnBulat').style.left = p + '%';
  try {
    if (v.buffered.length && d) pnEl('pnMuat').style.width = Math.min(100, (v.buffered.end(v.buffered.length - 1) / d) * 100) + '%';
  } catch (e) {}
  pnEl('pnNow').textContent = pnFmt(t);
  pnEl('pnSisa').textContent = '−' + pnFmt(d - t);
}
function pnIkonPutar() {
  var v = PN.vid;
  if (!v) return;
  var main = !v.paused && !v.ended,
    b = pnEl('pnPlay'),
    t = pnEl('pnTengah');
  if (b) {
    b.innerHTML = main ? PN_IK.pause : PN_IK.play;
    b.setAttribute('aria-label', main ? 'Jeda' : 'Putar');
  }
  if (t) {
    t.innerHTML = main ? PN_IK.pause : PN_IK.play;
    t.classList.toggle('sembunyi', main);
  }
  if (main) pnJadwalSembunyi();
  else {
    clearTimeout(PN.sembunyiT);
    $('#layer-img').classList.remove('pn-bersih');
  }
}
function pnPutarJeda(x, y) {
  var v = PN.vid;
  if (!v) return;
  if (v.paused || v.ended) v.play().catch(function () {});
  else v.pause();
  if (x !== undefined) {
    var r = document.createElement('div');
    r.className = 'pn-ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    $('#layer-img').appendChild(r);
    setTimeout(function () {
      r.remove();
    }, 500);
  }
}
function pnLoncat(s, sisi) {
  var v = PN.vid;
  if (!v) return;
  v.currentTime = Math.max(0, Math.min(pnDur() || v.currentTime + s, v.currentTime + s));
  var g = pnEl('pnGel-' + sisi);
  if (g) {
    g.classList.remove('tampil');
    void g.offsetWidth;
    g.classList.add('tampil');
  }
  pnWaktu();
}
function pnJadwalSembunyi() {
  clearTimeout(PN.sembunyiT);
  if (PN.vid && !PN.vid.paused)
    PN.sembunyiT = setTimeout(function () {
      var L = $('#layer-img');
      if (PN.vid && !PN.vid.paused && !PN.geserBilah && !L.classList.contains('pn-info')) L.classList.add('pn-bersih');
    }, 3000);
}
var pnPesanT;
function pnPesan(t) {
  var l = pnEl('pnLencana');
  l.textContent = t;
  l.classList.add('tampil');
  clearTimeout(pnPesanT);
  pnPesanT = setTimeout(function () {
    l.classList.remove('tampil');
  }, 1400);
}

document.getElementById('pnBawah').addEventListener('click', function (e) {
  var k = e.target.closest('[data-pn-ke]');
  if (k) {
    var id = PN.daftar[+k.dataset.pnKe];
    if (id && id !== viewerId) pnGanti(id);
    return;
  }
  var b = e.target.closest('[data-pn]');
  if (!b) return;
  var a = b.dataset.pn,
    v = PN.vid;
  pnJadwalSembunyi();
  if (a === 'sebelum') pnKe(-1);
  else if (a === 'sesudah') pnKe(1);
  if (!v) return;
  if (a === 'putar') pnPutarJeda();
  else if (a === 'mundur') pnLoncat(-10, 'kiri');
  else if (a === 'maju') pnLoncat(10, 'kanan');
  else if (a === 'kecepatan') {
    PN.kecepatan = PN_KEC[(PN_KEC.indexOf(PN.kecepatan) + 1) % PN_KEC.length];
    v.playbackRate = PN.kecepatan;
    b.textContent = String(PN.kecepatan).replace('.', ',') + '×';
  } else if (a === 'suara') {
    PN.bisu = v.muted = !v.muted;
    b.innerHTML = v.muted ? PN_IK.bisu : PN_IK.suara;
  } else if (a === 'ulang') {
    PN.ulang = v.loop = !v.loop;
    b.classList.toggle('on', v.loop);
    pnPesan(v.loop ? 'Ulang otomatis nyala' : 'Ulang otomatis mati');
  } else if (a === 'pip') {
    if (document.pictureInPictureEnabled && v.requestPictureInPicture)
      v.requestPictureInPicture().catch(function () {
        pnPesan('Jendela mengambang tidak tersedia');
      });
    else pnPesan('Jendela mengambang tidak didukung');
  } else if (a === 'penuh' || a === 'miring') {
    var L = $('#layer-img');
    if (!document.fullscreenElement && L.requestFullscreen)
      L.requestFullscreen()
        .then(function () {
          if (a === 'miring' && screen.orientation && screen.orientation.lock)
            screen.orientation.lock(v.videoWidth >= v.videoHeight ? 'landscape' : 'portrait').catch(function () {
              pnPesan('Putar layar tidak didukung di perangkat ini');
            });
        })
        .catch(function () {
          pnPesan('Layar penuh tidak tersedia');
        });
    else if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
  }
});
/* Bilah waktu: geser dengan pratinjau */
document.getElementById('pnBawah').addEventListener('pointerdown', function (e) {
  var b = e.target.closest('#pnBilah');
  if (!b || !PN.vid) return;
  PN.geserBilah = true;
  b.classList.add('geser');
  try {
    b.setPointerCapture(e.pointerId);
  } catch (x) {}
  pnGeserKe(e);
  clearTimeout(PN.sembunyiT);
});
document.getElementById('pnBawah').addEventListener('pointermove', function (e) {
  if (PN.geserBilah) pnGeserKe(e);
});
function pnAkhirGeser() {
  if (!PN.geserBilah) return;
  PN.geserBilah = false;
  var b = pnEl('pnBilah');
  if (b) {
    b.classList.remove('geser');
    if (PN.vid && isFinite(b._t)) PN.vid.currentTime = b._t;
  }
  pnWaktu();
  pnJadwalSembunyi();
}
document.getElementById('pnBawah').addEventListener('pointerup', pnAkhirGeser);
document.getElementById('pnBawah').addEventListener('pointercancel', pnAkhirGeser);
function pnGeserKe(e) {
  var b = pnEl('pnBilah'),
    r = b.getBoundingClientRect(),
    p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
    d = pnDur(),
    t = p * d;
  b._t = t;
  pnEl('pnIsiBilah').style.width = p * 100 + '%';
  pnEl('pnBulat').style.left = p * 100 + '%';
  pnEl('pnPrat').style.left = Math.max(40, Math.min(r.width - 40, p * r.width)) + 'px';
  pnEl('pnPratT').textContent = pnFmt(t);
  pnEl('pnNow').textContent = pnFmt(t);
  pnEl('pnSisa').textContent = '−' + pnFmt(d - t);
  if (PN.pratV && isFinite(t)) {
    try {
      PN.pratV.currentTime = t;
    } catch (x) {}
  }
}

/* ---------- Tombol atas & info ---------- */
$('#pnInfoBtn').addEventListener('click', function () {
  var L = $('#layer-img');
  L.classList.toggle('pn-info');
  L.classList.remove('pn-bersih');
  PN.z = 1;
  pnTerapZoom();
  clearTimeout(PN.sembunyiT);
  pnRenderLembar();
});
document.getElementById('pnLembar').addEventListener('click', function (e) {
  if (e.target.closest('[data-pn="tutupInfo"]')) $('#layer-img').classList.remove('pn-info');
});
addEventListener('keydown', function (e) {
  if (!opened.img || layerOf('confirm')) return;
  if (e.key === 'ArrowRight') pnKe(1);
  else if (e.key === 'ArrowLeft') pnKe(-1);
  else if (e.key === ' ' && PN.vid && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) {
    e.preventDefault();
    pnPutarJeda();
  }
});
/* Penampil ditutup → hentikan video, kembalikan keadaan */
var pnTerbuka = false;
new MutationObserver(function () {
  var L = $('#layer-img'),
    buka = L.classList.contains('open');
  if (buka === pnTerbuka) return;
  pnTerbuka = buka;
  if (!buka) {
    pnHentikan();
    L.style.background = '';
    if (L.classList.contains('pn-bersih') || L.classList.contains('pn-info')) L.classList.remove('pn-bersih', 'pn-info');
    if (document.fullscreenElement === L) document.exitFullscreen().catch(function () {});
  }
}).observe($('#layer-img'), { attributes: true, attributeFilter: ['class'] });

$('#btnPinImg').addEventListener('click', function () {
  if (!viewerId || typeof gtSematanToggle !== 'function') return;
  gtSematanToggle(viewerId);
  pnRenderAtas();
  pnRenderLembar();
});
/* Hapus media permanen (5.67.0, menggantikan Sampah): dari daftar, dari HP (IndexedDB), lalu sinkron
   menghapus salinan di cloud (R2 + catatan Firestore). tanpaSegar = pemanggil yang menggambar ulang sendiri. */
function hapusMediaPermanen(daftar, tanpaSegar) {
  var ids = {};
  (daftar || []).forEach(function (r) {
    if (!r || !r.id || r.dariFolder) return;
    ids[r.id] = 1;
    dropUrl(r.id);
    idb.del(r.id).catch(function () {});
  });
  var n = Object.keys(ids).length;
  if (!n) return 0;
  images = images.filter(function (x) {
    return !ids[x.id];
  });
  if (typeof schedulePush === 'function') schedulePush();
  if (!tanpaSegar) refreshAll();
  return n;
}
$('#btnDeleteImg').addEventListener('click', function () {
  var im = findImg(viewerId);
  if (!im || im.dariFolder) return;
  askConfirm({
    title: 'Hapus ' + JENIS_NAMA[jenisMedia(im)].toLowerCase() + '?',
    text: 'File ini akan dihapus dari HP dan cloud. Di cloud masih ditahan 30 hari, jadi bisa kembali lewat Cadangan harian.',
    ok: 'Hapus',
    action: function () {
      var id = im.id;
      pnHentikan();
      hapusMediaPermanen([im], true);
      PN.daftar = PN.daftar.filter(function (x) {
        return x !== id;
      });
      pnEl('pnTrak').innerHTML = '';
      back(2, function () {
        refreshAll();
        toast('File dihapus');
      });
    }
  });
});

/* Jenis file (MIME). Beberapa HP tidak mengisi file.type untuk dokumen, jadi ditebak dari ekstensi. */
var TIPE_EKSTENSI = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  amr: 'audio/amr'
};
var TIPE_DITERIMA =
  /^(image\/(jpeg|png|webp|gif|heic|heif|avif)|video\/(mp4|webm|quicktime|3gpp|x-matroska)|audio\/(mpeg|mp3|mp4|aac|x-m4a|m4a|ogg|opus|wav|x-wav|wave|webm|flac|x-flac|amr|3gpp)|application\/pdf|text\/plain|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint))$/;
function tipeFile(file) {
  var t = (file.type || '').toLowerCase();
  if (!t || t === 'application/octet-stream') {
    var m = /\.([a-z0-9]+)$/i.exec(file.name || '');
    t = (m && TIPE_EKSTENSI[m[1].toLowerCase()]) || '';
  }
  return TIPE_DITERIMA.test(t) ? t : '';
}

/* Perkecil gambar agar hemat ruang (maks 1600px) */
function compress(file) {
  return new Promise(function (res) {
    var u = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      try {
        var max = 1600,
          w = img.naturalWidth,
          h = img.naturalHeight;
        var s = Math.min(1, max / Math.max(w, h));
        if (s === 1 && file.size < 600 * 1024) {
          URL.revokeObjectURL(u);
          return res(file);
        }
        var c = document.createElement('canvas');
        c.width = Math.round(w * s);
        c.height = Math.round(h * s);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(
          function (b) {
            URL.revokeObjectURL(u);
            res(b || file);
          },
          'image/jpeg',
          0.85
        );
      } catch (e) {
        URL.revokeObjectURL(u);
        res(file);
      }
    };
    img.onerror = function () {
      URL.revokeObjectURL(u);
      res(file);
    };
    img.src = u;
  });
}
