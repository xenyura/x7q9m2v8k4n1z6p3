/* Stivora — penghitung karakter otomatis (5.27.1)
   Setiap kolom teks / textarea yang punya batas (maxlength) diberi keterangan "jumlah/batas", mis. 0/5000.
   Dikecualikan: kolom cari, link (url), angka/tahun, kolom emoji, dan kolom yang sudah punya penghitung sendiri (data-hitung-sendiri). */
'use strict';
(function () {
  var PILIH = 'input[maxlength], textarea[maxlength]';
  function layak(el) {
    if (el.dataset.hitungSendiri !== undefined || el.dataset.tanpaHitung !== undefined) return false;
    if (el.tagName === 'INPUT' && !/^(text|)$/.test((el.getAttribute('type') || '').toLowerCase()))
      return false; /* search, url, number, time, dll. */
    if (/numeric|decimal|search/.test(el.getAttribute('inputmode') || '')) return false;
    if (el.closest('.ie-emoji-baris, .mk-emoji-isi, .pe-thn-step')) return false;
    return (+el.getAttribute('maxlength') || 0) >= 10;
  }
  function tulis(el) {
    var h = el._hitung;
    if (!h) return;
    var n = el.value.length,
      m = +el.getAttribute('maxlength');
    h.textContent = n + '/' + m;
    h.classList.toggle('penuh', n >= m);
  }
  function pasang(root) {
    (root.querySelectorAll ? root.querySelectorAll(PILIH) : []).forEach(function (el) {
      if (el._hitung && el._hitung.isConnected) {
        tulis(el);
        return;
      }
      if (!layak(el)) return;
      var h = document.createElement('small');
      h.className = 'hitung-kar';
      h.setAttribute('aria-hidden', 'true');
      el._hitung = h;
      /* Kolom di dalam baris flex (mis. kolom + tombol) → penghitung diletakkan di bawah barisnya */
      var p = el.parentElement,
        cs = p && getComputedStyle(p);
      var baris = cs && ((/flex/.test(cs.display) && !/column/.test(cs.flexDirection)) || /grid/.test(cs.display));
      (baris ? p : el).insertAdjacentElement('afterend', h);
      tulis(el);
    });
  }
  /* Nilai yang diisi lewat kode (bukan ketikan) juga ikut terbaca */
  var antre = false;
  new MutationObserver(function () {
    if (antre) return;
    antre = true;
    requestAnimationFrame(function () {
      antre = false;
      pasang(document.body);
    });
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener(
    'input',
    function (e) {
      if (e.target._hitung) tulis(e.target);
    },
    true
  );
  document.addEventListener(
    'change',
    function (e) {
      if (e.target._hitung) tulis(e.target);
    },
    true
  );
  window.segarkanHitung = function () {
    document.querySelectorAll(PILIH).forEach(function (el) {
      if (el._hitung) tulis(el);
    });
  };
  pasang(document.body);
})();
