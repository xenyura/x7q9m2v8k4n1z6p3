/* Stivora — Layar besar, keyboard, D-pad & remote TV */
'use strict';

/* =========================================================
   LAYAR BESAR, KEYBOARD & REMOTE TV
   - TV: dideteksi dari user agent (atau ?tv=1 untuk mencoba);
     tampilan diperbesar agar terbaca dari jauh + tepi aman 5%.
   - Tombol panah (keyboard / D-pad remote) memindahkan fokus
     ke tombol terdekat sesuai arah.
   - Esc / Back remote menutup lapisan teratas atau kembali.
   ========================================================= */
var TV_RE =
  /SMART-?TV|SmartTV|Tizen|Web0S|webOS|NetCast|BRAVIA|GoogleTV|Google TV|Android TV|AFT[A-Z]|CrKey|HbbTV|VIDAA|Roku|TitanOS|PhilipsTV|Viera/i;
var isTV = TV_RE.test(navigator.userAgent || '') || /[?&]tv=1\b/.test(location.search);
function applyTvZoom() {
  if (!isTV) return;
  /* Tata letak TV dirancang selebar ~1280px lalu diperbesar sesuai layar */
  var z = Math.max(1, Math.min(2.2, window.innerWidth / 1280));
  document.documentElement.style.zoom = z.toFixed(3);
}
if (isTV) {
  document.documentElement.classList.add('tv');
  applyTvZoom();
  window.addEventListener('resize', applyTvZoom);
}

var FOCUSABLE =
  'button:not([disabled]), a[href], input:not([type=hidden]), select, textarea, video[controls], [tabindex]:not([tabindex="-1"])';
function navScope() {
  if (cur.layers.length) {
    var top = cur.layers[cur.layers.length - 1].split(':')[0];
    return $('#layer-' + top);
  }
  return document;
}
function focusables(scope) {
  return $$(FOCUSABLE, scope).filter(function (el) {
    if (el.hidden || el.closest('[hidden]')) return false;
    if (scope === document && el.closest('.layer')) return false;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  });
}
function moveFocus(dir) {
  var scope = navScope();
  var list = focusables(scope);
  if (!list.length) return false;
  var curEl = document.activeElement;
  if (!curEl || curEl === document.body || list.indexOf(curEl) < 0) {
    /* Masuk halaman/panel: mulai dari pilihan yang aktif di isi halaman, bukan tombol kembali */
    var body = scope === document ? null : $('.screen-body', scope) || $('.sheet', scope);
    var inBody = body
      ? list.filter(function (el) {
          return body.contains(el);
        })
      : [];
    var start =
      (scope === document ? $('.nav-item.active') : null) ||
      inBody.filter(function (el) {
        return el.classList.contains('active');
      })[0] ||
      inBody[0] ||
      list[0];
    start.focus({ preventScroll: false });
    return true;
  }
  var a = curEl.getBoundingClientRect();
  var best = null,
    bestScore = Infinity;
  /* Jarak dihitung antartepi: "main" = jarak searah tombol, "side" = celah
     ke samping (0 jika sejajar). Elemen yang sejajar diprioritaskan. */
  list.forEach(function (el) {
    if (el === curEl) return;
    var r = el.getBoundingClientRect();
    var main, side;
    if (dir === 'left' || dir === 'right') {
      if (dir === 'left') {
        if (r.right > a.left + 1) return;
        main = a.left - r.right;
      } else {
        if (r.left < a.right - 1) return;
        main = r.left - a.right;
      }
      side = Math.max(0, r.top - a.bottom, a.top - r.bottom);
    } else {
      if (dir === 'up') {
        if (r.bottom > a.top + 1) return;
        main = a.top - r.bottom;
      } else {
        if (r.top < a.bottom - 1) return;
        main = r.top - a.bottom;
      }
      side = Math.max(0, r.left - a.right, a.left - r.right);
    }
    var score = Math.max(0, main) + side * 3;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  });
  if (!best) return false;
  best.focus({ preventScroll: true });
  best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  return true;
}

var DIRS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Left: 'left',
  Right: 'right',
  Up: 'up',
  Down: 'down'
};
document.addEventListener('keydown', function (e) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  var t = e.target;
  var typing =
    t &&
    (t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable ||
      (t.tagName === 'INPUT' && !/^(button|checkbox|radio|file|submit|reset|range|color)$/i.test(t.type)));
  var isBack =
    e.key === 'Escape' ||
    e.key === 'GoBack' ||
    e.key === 'BrowserBack' ||
    e.keyCode === 10009 ||
    e.keyCode === 461 ||
    (e.key === 'Backspace' && !typing);
  if (isBack) {
    if (cur.layers.length) {
      e.preventDefault();
      back(1);
      return;
    }
    if (cur.tab !== ROOT && cur.fromRoot) {
      e.preventDefault();
      back(1);
      return;
    }
    if (e.key === 'Backspace') e.preventDefault();
    return;
  }
  var dir = DIRS[e.key];
  if (!dir) return;
  if (typing && (dir === 'left' || dir === 'right')) return; /* geser kursor teks */
  if (t && t.tagName === 'VIDEO') return; /* kontrol video */
  if (t && t.tagName === 'SELECT') return;
  if (moveFocus(dir)) e.preventDefault();
});
