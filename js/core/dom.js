/* Stivora — Util DOM, konstanta inti, dan ikon */
'use strict';

/* ---------- Util ---------- */
var $ = function (s, r) {
  return (r || document).querySelector(s);
};
var $$ = function (s, r) {
  return Array.prototype.slice.call((r || document).querySelectorAll(s));
};
var uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};
var esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

var ROOT = 'impian';
var TABS = ['galery', 'impian', 'pengaturan'];
var K_THEME = 'stivora.theme';

var ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.5 6.6L12 16.8 6.3 20.3l1.5-6.6L2.7 9.3l6.7-.6z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  image:
    '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
  cloudOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M8.5 7.3A6 6 0 0 1 18 12a4 4 0 0 1 2.2 6.6M17 18H7a5 5 0 0 1-1.6-9.7"/></svg>'
};

/* Tandai halaman sejak awal — sebelum data siap dari IndexedDB dan skrip fitur dimuat — supaya
   header atas (logo Stivora) yang disembunyikan di Galery & Impian tidak muncul sekilas (5.39.1). */
(function () {
  try {
    var st = history.state,
      tab = st && TABS.indexOf(st.tab) >= 0 ? st.tab : ROOT;
    document.body.dataset.halaman = tab;
    var h = document.getElementById('page-' + tab),
      t = document.getElementById('pageTitle');
    if (h && t) t.textContent = h.dataset.title;
  } catch (e) {}
})();
