/* Stivora — Mode tampilan: Terang, Gelap, Sistem */
'use strict';

/* =========================================================
   MODE TAMPILAN (Terang / Gelap / Sistem)
   ========================================================= */
var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function themeMode() {
  var m = store.raw(K_THEME);
  return m === 'light' || m === 'dark' ? m : 'system';
}
function applyTheme() {
  var m = themeMode();
  var dark = m === 'dark' || (m === 'system' && mq && mq.matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  applyTemaColors(dark);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta)
    meta.setAttribute(
      'content',
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || (dark ? '#0e0c17' : '#f6f5fb')
    );
  $$('.theme-opt').forEach(function (b) {
    b.classList.toggle('active', b.dataset.themeMode === m);
  });
  var hint = $('#themeHint');
  if (hint)
    hint.textContent =
      m === 'system'
        ? 'Mengikuti pengaturan perangkat (sekarang ' + (dark ? 'gelap' : 'terang') + ').'
        : 'Mode ' + (m === 'dark' ? 'gelap' : 'terang') + ' aktif.';
  /* Kotak Mode di halaman Pengaturan */
  $('#modeIcon').innerHTML = MODE_ICON[m];
  $('#modeValue').textContent = MODE_NAME[m];
}
var MODE_NAME = { light: 'Terang', dark: 'Gelap', system: 'Sistem' };
var MODE_ICON = {
  light:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/></svg>',
  system: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>'
};
function buildModeForm() {
  $('#subTitle').textContent = 'Mode';
  $('#subBody').innerHTML =
    '<div class="theme-options">' +
    ['light', 'dark', 'system']
      .map(function (k) {
        return (
          '<button type="button" class="theme-opt" data-theme-mode="' +
          k +
          '">' +
          MODE_ICON[k] +
          '<span>' +
          MODE_NAME[k] +
          '</span></button>'
        );
      })
      .join('') +
    '</div><p class="hint" id="themeHint"></p>';
  applyTheme();
  return true;
}
$('#btnMode').addEventListener('click', function () {
  openLayer('page:mode');
});
$('#btnTema').addEventListener('click', function () {
  openLayer('page:tema');
});
if (mq) {
  var onSys = function () {
    if (themeMode() === 'system') applyTheme();
  };
  if (mq.addEventListener) mq.addEventListener('change', onSys);
  else if (mq.addListener) mq.addListener(onSys);
}
