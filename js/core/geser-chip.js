/* ============================================================
   GESER CHIP — menjaga posisi geser deretan chip/tab horizontal.
   Banyak halaman menggambar ulang deretan chip (innerHTML) saat
   chip diketuk, sehingga posisi geser kembali ke paling kiri.
   Penjaga global ini mengingat posisi sebelum ketukan, lalu
   memulihkannya setelah halaman digambar ulang, dan memastikan
   chip yang dipilih tetap terlihat. Tidak perlu dipasang per halaman.
   ============================================================ */
(function () {
  var AKTIF_RE = /(^|[\s-])(aktif|active|on|dipilih|terpilih|sel|selected)($|\s)/;

  function bisaGeser(el) {
    if (!el || el.nodeType !== 1 || el.scrollWidth <= el.clientWidth + 1) return false;
    var ox = getComputedStyle(el).overflowX;
    return ox === 'auto' || ox === 'scroll';
  }

  function cariDeret(el) {
    for (var n = el, i = 0; n && n !== document.body && i < 6; n = n.parentElement, i++) {
      if (bisaGeser(n)) return n;
    }
    return null;
  }

  function kunci(el) {
    if (el.id) return '#' + el.id;
    var k = Array.prototype.filter.call(el.classList, function (c) { return /^[A-Za-z_-][\w-]*$/.test(c); });
    return k.length ? '.' + k.join('.') : null;
  }

  function anakLangsung(deret, el) {
    while (el && el.parentElement !== deret) el = el.parentElement;
    return el;
  }

  function chipAktif(deret) {
    var anak = deret.children;
    for (var i = 0; i < anak.length; i++) {
      var a = anak[i];
      if (a.getAttribute('aria-pressed') === 'true' || a.getAttribute('aria-selected') === 'true' ||
          a.getAttribute('aria-checked') === 'true' || AKTIF_RE.test(a.className)) return a;
    }
    return null;
  }

  function tampakkan(deret, chip) {
    if (!chip) return;
    var rd = deret.getBoundingClientRect(), rc = chip.getBoundingClientRect();
    var kiri = rc.left - rd.left - deret.clientLeft + deret.scrollLeft;
    var kanan = kiri + rc.width, jeda = 12;
    if (kiri < deret.scrollLeft + jeda) deret.scrollLeft = Math.max(0, kiri - jeda);
    else if (kanan > deret.scrollLeft + deret.clientWidth - jeda) deret.scrollLeft = kanan - deret.clientWidth + jeda;
  }

  function pulihkan(c) {
    var deret = c.el;
    if (!deret.isConnected) {
      var semua = document.querySelectorAll(c.kunci);
      deret = semua.length === c.jumlah ? semua[c.urut] : null;
      if (!deret && semua.length === 1) deret = semua[0];
    }
    if (!deret || !deret.isConnected || deret === c.selesai) return;
    c.selesai = deret;
    if (deret.scrollWidth <= deret.clientWidth + 1) return;
    var lama = deret.style.scrollBehavior;
    deret.style.scrollBehavior = 'auto';
    if (Math.abs(deret.scrollLeft - c.posisi) > 1) deret.scrollLeft = c.posisi;
    tampakkan(deret, chipAktif(deret) || deret.children[c.anak]);
    deret.style.scrollBehavior = lama;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var deret = cariDeret(t);
    if (!deret) return;
    var k = kunci(deret);
    if (!k) return;
    var semua;
    try { semua = document.querySelectorAll(k); } catch (err) { return; }
    var anak = anakLangsung(deret, t);
    var c = {
      el: deret, kunci: k, jumlah: semua.length,
      urut: Array.prototype.indexOf.call(semua, deret),
      anak: anak ? Array.prototype.indexOf.call(deret.children, anak) : -1,
      posisi: deret.scrollLeft
    };
    /* Gambar ulang bisa sinkron (di handler klik) atau sedikit tertunda. */
    setTimeout(function () { pulihkan(c); }, 0);
    requestAnimationFrame(function () { requestAnimationFrame(function () { pulihkan(c); }); });
    setTimeout(function () { pulihkan(c); }, 180);
  }, true);
})();
