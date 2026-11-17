/* Stivora — Router: halaman & lapisan = entri riwayat (gestur kembali sistem) */
'use strict';

/* =========================================================
   ROUTER — setiap halaman/lapisan = satu entri riwayat.
   Gestur kembali sistem → popstate → tampilan ikut kembali.
   ========================================================= */
var cur = { tab: ROOT, layers: [] };
var afterPop = null;
var scrollPos = {};

function setState(st, replace) {
  var prevTab = cur.tab;
  scrollPos[prevTab] = window.scrollY;
  cur = st;
  try {
    if (replace) history.replaceState(st, '');
    else history.pushState(st, '');
  } catch (e) {
    /* riwayat tidak tersedia: tetap render */
  }
  render(prevTab);
}

function back(n, then) {
  afterPop = then || null;
  history.go(-(n || 1));
}

function openLayer(name) {
  setState({ tab: cur.tab, fromRoot: cur.fromRoot, layers: cur.layers.concat([name]) });
}

function switchTab(tab) {
  if (cur.layers.length) {
    /* Di tablet/laptop menu tetap terlihat: tutup halaman/panel dulu, lalu pindah menu.
       Dialog dan penampil media tetap harus ditutup sendiri. */
    var onlyPages = cur.layers.every(function (n) {
      return n.split(':')[0] === 'page';
    });
    if (!onlyPages) return;
    back(cur.layers.length, function () {
      if (tab !== cur.tab) switchTab(tab);
    });
    return;
  }
  if (tab === cur.tab) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (tab === ROOT) {
    if (cur.fromRoot) {
      back(1);
      return;
    }
    setState({ tab: ROOT, layers: [] }, true);
  } else if (cur.tab === ROOT) {
    setState({ tab: tab, fromRoot: true, layers: [] });
  } else {
    setState({ tab: tab, fromRoot: cur.fromRoot, layers: [] }, true);
  }
}

window.addEventListener('popstate', function (e) {
  var prevTab = cur.tab;
  scrollPos[prevTab] = window.scrollY;
  cur = sanitize(e.state);
  render(prevTab);
  if (afterPop) {
    var f = afterPop;
    afterPop = null;
    f();
  }
});

function sanitize(st) {
  if (!st || TABS.indexOf(st.tab) < 0) return { tab: ROOT, layers: [] };
  return { tab: st.tab, fromRoot: !!st.fromRoot, layers: Array.isArray(st.layers) ? st.layers.slice() : [] };
}

/* Lapisan yang sedang terbuka: tipe -> nama */
var opened = { img: null, page: null, confirm: null };

function layerOf(type) {
  for (var i = cur.layers.length - 1; i >= 0; i--) {
    if (cur.layers[i].split(':')[0] === type) return { name: cur.layers[i], index: i };
  }
  return null;
}

function render(prevTab) {
  /* Tab */
  TABS.forEach(function (t) {
    $('#page-' + t).classList.toggle('active', t === cur.tab);
  });
  $$('.nav-item').forEach(function (b) {
    var on = b.dataset.tab === cur.tab;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
    if (on && prevTab !== undefined && prevTab !== cur.tab) {
      b.classList.remove('pop');
      void b.offsetWidth;
      b.classList.add('pop');
    }
  });
  $('#pageTitle').textContent = $('#page-' + cur.tab).dataset.title;
  document.body.dataset.halaman = cur.tab;
  if (cur.tab === 'impian' && typeof bukaPeta === 'function') bukaPeta();
  if (prevTab !== undefined && prevTab !== cur.tab) {
    window.scrollTo(0, scrollPos[cur.tab] || 0);
  }

  /* Lapisan */
  ['img', 'page', 'confirm'].forEach(function (type) {
    var L = layerOf(type);
    var el = $('#layer-' + type);
    if (L) {
      var ok = true;
      if (opened[type] !== L.name) ok = buildLayer(type, L.name);
      if (ok === false) {
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
        opened[type] = null;
        return;
      }
      opened[type] = L.name;
      el.style.zIndex = 40 + L.index * 5 + (type === 'confirm' ? 2 : 0);
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
    } else if (opened[type]) {
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
      opened[type] = null;
    }
  });
  document.body.style.overflow = cur.layers.length ? 'hidden' : '';
  document.body.classList.toggle('layer-open', cur.layers.length > 0);
  if (typeof petaCekBeku === 'function') petaCekBeku();
  if (typeof jalankanRenderTunda === 'function') jalankanRenderTunda();
}

function buildLayer(type, name) {
  var parts = name.split(':');
  if (type === 'img') return buildViewer(name.slice(4)); /* 'img:<id>', id media folder berisi ':' */
  if (type === 'confirm') return buildConfirm();
  if (type === 'page') return buildPage(parts[1]);
}

/* Tombol [data-back] menutup lapisan teratas lewat riwayat */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-back]');
  if (b && cur.layers.length) {
    e.preventDefault();
    back(1);
  }
});
