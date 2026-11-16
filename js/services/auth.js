/* Stivora — Layanan akun: Firebase Auth (login Google) */
'use strict';

/* =========================================================
   AKUN & SINKRON — Firebase (login Google + Firestore)
   Media (foto/video) → Cloudflare Worker → R2
   Aplikasi tetap menyimpan semuanya di perangkat (bisa offline);
   saat login, data disinkronkan ke cloud milik akun itu saja.
   ========================================================= */
var imagesLoadedResolve;
var imagesReady = new Promise(function (r) {
  imagesLoadedResolve = r;
});
var K_OWNER = 'stivora.owner';
var fb = null; // { auth, db, A: modul auth, F: modul firestore }
var fbP = null; // Promise pemuatan SDK
var user = null;
var sync = { state: 'idle', at: 0, err: '', running: null, again: null, lastPull: 0, timer: null };
var loadingBlob = {};

function fbConfigured() {
  return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
}
function mediaConfigured() {
  return !!MEDIA_WORKER_URL;
}
function workerUrl(id) {
  return MEDIA_WORKER_URL.replace(/\/+$/, '') + '/media/' + encodeURIComponent(id);
}

function loadFirebase() {
  if (!fbConfigured()) return Promise.reject({ code: 'not_configured' });
  if (!fbP) {
    fbP = Promise.all([
      import(FIREBASE_SDK + 'firebase-app.js'),
      import(FIREBASE_SDK + 'firebase-auth.js'),
      import(FIREBASE_SDK + 'firebase-firestore.js')
    ])
      .then(function (m) {
        var app = m[0].initializeApp(FIREBASE_CONFIG);
        var A = m[1],
          F = m[2];
        var auth = A.getAuth(app);
        try {
          auth.languageCode = 'id';
        } catch (e) {}
        fb = { auth: auth, db: F.getFirestore(app), A: A, F: F };
        A.onAuthStateChanged(auth, onUser);
        A.getRedirectResult(auth).catch(function (e) {
          var msg = fbMsg(e);
          if (msg) toast(msg);
        });
        return fb;
      })
      .catch(function (e) {
        fbP = null;
        throw e && e.code ? e : { code: 'load_failed' };
      });
  }
  return fbP;
}

function fbMsg(e) {
  var code = (e && e.code) || '';
  var map = {
    'not_configured': 'Login belum diatur: isi FIREBASE_CONFIG di js/config.js',
    'load_failed': 'Layanan login tidak bisa dimuat. Periksa koneksi internet.',
    'auth/popup-closed-by-user': '',
    'auth/cancelled-popup-request': '',
    'auth/user-cancelled': '',
    'auth/unauthorized-domain': 'Domain ini belum diizinkan. Tambahkan di Firebase › Authentication › Settings › Authorized domains.',
    'auth/operation-not-allowed': 'Login Google belum diaktifkan di Firebase (Authentication › Sign-in method).',
    'auth/network-request-failed': 'Tidak ada koneksi internet.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
    'auth/invalid-api-key': 'apiKey di FIREBASE_CONFIG salah.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'apiKey di FIREBASE_CONFIG salah.',
    'auth/user-disabled': 'Akun ini dinonaktifkan.',
    'permission-denied': 'Akses database ditolak. Periksa Firestore Rules.',
    'unavailable': 'Database tidak bisa dihubungi. Periksa internet.',
    'unauthenticated': 'Sesi login berakhir. Silakan masuk lagi.',
    'media_not_configured': 'Penyimpanan media belum diatur (MEDIA_WORKER_URL).',
    'e2e-sandi': 'Cadangan terenkripsi: masukkan kata sandi enkripsi di Cadangkan & pulihkan'
  };
  if (code in map) return map[code];
  if (e && e.worker) return 'Penyimpanan media: ' + e.message;
  if (/Failed to fetch|NetworkError|Load failed/i.test(String(e && e.message))) return 'Tidak ada koneksi internet.';
  return 'Terjadi kesalahan' + (code ? ' (' + code + ')' : e && e.message ? ' (' + e.message + ')' : '') + '.';
}

/* ---------- Login / keluar ---------- */
function loginGoogle() {
  if (!fbConfigured()) {
    toast(fbMsg({ code: 'not_configured' }));
    return;
  }
  var go = function () {
    var p = new fb.A.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return fb.A.signInWithPopup(fb.auth, p).catch(function (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
        return fb.A.signInWithRedirect(fb.auth, p);
      }
      throw e;
    });
  };
  (fb ? go() : loadFirebase().then(go))
    .then(function (res) {
      if (res && res.user) toast('Selamat datang, ' + (res.user.displayName || res.user.email || '') + '!');
    })
    .catch(function (e) {
      var m = fbMsg(e);
      if (m) toast(m);
    });
}

function logout() {
  var finish = function () {
    return fb.A.signOut(fb.auth)
      .catch(function () {})
      .then(function () {
        user = null;
        renderAccount();
        back(1, function () {
          toast('Kamu sudah keluar');
        });
      });
  };
  /* Kirim perubahan terakhir dulu (maks 8 detik), lalu keluar */
  var t = new Promise(function (r) {
    setTimeout(r, 8000);
  });
  Promise.race([syncNow(false).catch(function () {}), t]).then(finish);
}

function onUser(u) {
  var prev = user;
  user = u || null;
  renderAccount();
  refreshAccountSheet();
  if (!user) {
    sync.state = 'idle';
    e2e.info = null;
    e2e.key = null;
    e2e.dicek = false;
    if (typeof petaAkunBerubah === 'function') petaAkunBerubah(); /* 5.71.0: peta kembali ke sumber gratis */
    return;
  }
  if (prev && prev.uid === user.uid) return;
  var akun = user;
  /* 5.67.0: cek dulu apakah akun ini boleh memakai Stivora (daftar email di Firestore Rules),
     SEBELUM data perangkat disentuh — akun asing tidak boleh membuat data lokal terhapus. */
  cekIzinAkun(akun).then(function (boleh) {
    if (user !== akun) return;
    if (!boleh) {
      tolakAkun(akun);
      return;
    }
    lanjutMasuk();
  });
}
function cekIzinAkun(u) {
  var F = fb.F;
  return F.getDoc(F.doc(fb.db, 'users', u.uid)).then(
    function () {
      return true;
    },
    function (e) {
      return !(e && e.code === 'permission-denied'); /* gangguan jaringan bukan penolakan */
    }
  );
}
function tolakAkun(u) {
  var email = (u && u.email) || '';
  fb.A.signOut(fb.auth)
    .catch(function () {})
    .then(function () {
      user = null;
      sync.state = 'idle';
      renderAccount();
      refreshAccountSheet();
      askConfirm({
        title: 'Akun tidak diizinkan',
        text: 'Akun ini tidak diizinkan memakai Stivora' + (email ? ' (' + email + ')' : '') + '. Kamu otomatis dikeluarkan; data di HP ini tidak diubah.',
        ok: 'Mengerti',
        tone: 'primary'
      });
    });
}
function lanjutMasuk() {
  kirimAntreanGalat();
  if (typeof petaAkunBerubah === 'function') petaAkunBerubah(); /* 5.71.0: peta Google lewat Worker setelah login */
  /* Data di perangkat ini milik akun lain? Ganti dengan data akun yang baru masuk */
  var owner = store.raw(K_OWNER);
  var p = Promise.resolve();
  if (owner && owner !== user.uid && adaDataLokal()) {
    p = clearLocal().then(function () {
      toast('Menampilkan data akun ' + (user.email || ''));
    });
  }
  p.then(function () {
    store.raw(K_OWNER, user.uid);
    saveProfile();
    return syncNow(true);
  }).catch(function () {});
}

function clearLocal() {
  return idb
    .clear()
    .catch(function () {})
    .then(function () {
      Object.keys(urls).forEach(dropUrl);
      images = [];
      if (typeof gfBersihkanLokal === 'function') gfBersihkanLokal();
      if (typeof petaMarker !== 'undefined') {
        petaMarker = [];
        store.set(K_MARKER, petaMarker);
        gambarMarker();
        renderMarkerDaftar();
      }
      if (typeof petaJalur !== 'undefined') {
        petaJalur = [];
        store.set(K_JALUR, petaJalur);
        renderJalurDaftar();
      }
      if (typeof petaArea !== 'undefined') {
        petaArea = [];
        store.set(K_AREA, petaArea);
        gambarArea();
        renderAreaDaftar();
      }
      if (typeof dataImpianKosongkan === 'function') dataImpianKosongkan();
      refreshAll();
    });
}

function saveProfile() {
  if (!user || !fb) return;
  var F = fb.F;
  F.setDoc(F.doc(fb.db, 'users', user.uid), {
    name: String(user.displayName || '').slice(0, 100),
    email: String(user.email || '').slice(0, 200),
    photo: String(user.photoURL || '').slice(0, 1000),
    updatedAt: Date.now()
  }).catch(function () {});
}
