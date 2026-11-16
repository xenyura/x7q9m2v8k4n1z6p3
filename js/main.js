/* Stivora — Titik masuk: menjalankan aplikasi (dimuat paling akhir) */
'use strict';

/* =========================================================
   NAVIGASI BAWAH & MULAI
   ========================================================= */
$('#bottomNav').addEventListener('click', function (e) {
  var b = e.target.closest('.nav-item');
  if (!b) return;
  if (b.dataset.tab !== cur.tab) {
    try {
      navigator.vibrate && navigator.vibrate(8);
    } catch (err) {}
  }
  switchTab(b.dataset.tab);
});
$('#bottomNav').addEventListener('animationend', function (e) {
  var b = e.target.closest('.nav-item');
  if (b) b.classList.remove('pop');
});

function start() {
  applyTheme();
  var st = sanitize(history.state);
  /* Setelah dimuat ulang, buang lapisan yang tidak bisa dipulihkan */
  st.layers = st.layers.filter(function (n) {
    var p = n.split(':');
    if (p[0] === 'confirm') return false;
    if (p[0] === 'page') return ['mode', 'bahasa', 'backup', 'transfer', 'tema'].indexOf(p[1]) >= 0;
    return p[0] === 'img';
  });
  cur = st;
  try {
    history.replaceState(st, '');
  } catch (e) {}
  renderLang();
  initAuth();
  render();

  idb
    .all()
    .then(function (list) {
      list = list || [];
      images = list
        .filter(function (r) {
          return !r.trashedAt;
        })
        .sort(function (a, b) {
          return b.createdAt - a.createdAt;
        });
      /* Fitur Sampah dihapus (5.67.0): sisa isi Sampah lama di perangkat dibersihkan permanen */
      list.forEach(function (r) {
        if (r.trashedAt) idb.del(r.id).catch(function () {});
      });
      if (!idb.ok) toast('Penyimpanan gambar tidak tersedia di browser ini');
      // buang lapisan gambar yang sudah tidak ada
      var clean = cur.layers.filter(function (n) {
        return n.split(':')[0] !== 'img' || findImg(n.slice(4));
      }); /* id media folder bisa berisi ':' */
      if (clean.length !== cur.layers.length) {
        cur.layers = clean;
        try {
          history.replaceState(cur, '');
        } catch (e) {}
      }
      opened.img = null;
      refreshAll();
      render();
      imagesLoadedResolve();
    })
    .catch(function () {
      imagesLoadedResolve();
    });
}

start();
/* Link dari menu Bagikan Android (share_target) */
if (typeof lkCekBagikan === 'function') lkCekBagikan();
