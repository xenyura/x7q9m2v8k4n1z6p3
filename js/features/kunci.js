/* Stivora — Kunci aplikasi dengan sidik jari (WebAuthn, tanpa server) */
'use strict';

/* =========================================================
   KUNCI SIDIK JARI
   - Memakai sensor sidik jari / kunci layar bawaan HP lewat WebAuthn.
   - Sidik jari tidak pernah dibaca aplikasi; HP hanya menjawab "cocok".
   - Data: localStorage 'stivora.kunci' = { on: true, id: '<id kredensial>' }
   - Terkunci saat aplikasi dibuka, dan saat kembali setelah > 1 menit di latar.
   ========================================================= */
var K_KUNCI = 'stivora.kunci';
var KUNCI_JEDA = 60 * 1000;
var FP_ICON =
  '<svg viewBox="0 0 24 24"><path d="M5.6 7.2A8 8 0 0 1 20 12v.5"/><path d="M3.8 10.6A8 8 0 0 1 4.6 8.7"/><path d="M4 15.6a13 13 0 0 1-.3-2.1"/><path d="M7.4 20a12 12 0 0 1-1.4-6 6 6 0 0 1 12 0v1.3"/><path d="M17.7 18.6c.2-.8.3-1.6.3-2.4"/><path d="M9.6 21a10 10 0 0 1-.7-6.9 3.1 3.1 0 0 1 6.1.4c0 2 .4 3.9 1.1 5.6"/><path d="M12 14c0 2.6.6 5 1.6 7"/></svg>';

function kunciData() {
  var d = store.get(K_KUNCI, null);
  return d && d.on && d.id ? d : null;
}
function kunciAktif() {
  return !!kunciData();
}

/* ---------- Bantu: acak & base64url ---------- */
function acakBytes(n) {
  var a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}
function keB64(buf) {
  var s = '',
    b = new Uint8Array(buf);
  for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function dariB64(str) {
  var s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  var b = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

/* ---------- Dukungan perangkat ---------- */
var kunciDukung = null; // null = belum dicek, true/false
function cekDukungan() {
  if (
    !window.isSecureContext ||
    !window.PublicKeyCredential ||
    !navigator.credentials ||
    !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  ) {
    kunciDukung = false;
    return Promise.resolve(false);
  }
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    .then(function (ok) {
      kunciDukung = !!ok;
      return kunciDukung;
    })
    .catch(function () {
      kunciDukung = false;
      return false;
    });
}

/* ---------- Daftarkan & verifikasi ---------- */
function daftarSidikJari() {
  return navigator.credentials
    .create({
      publicKey: {
        challenge: acakBytes(32),
        rp: { name: 'Stivora' },
        user: { id: acakBytes(16), name: 'Stivora', displayName: 'Kunci Stivora' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        attestation: 'none',
        timeout: 60000
      }
    })
    .then(function (cred) {
      if (!cred) throw new Error('batal');
      return keB64(cred.rawId);
    });
}
function verifikasiSidikJari() {
  var d = kunciData();
  if (!d) return Promise.resolve(true);
  return navigator.credentials
    .get({
      publicKey: {
        challenge: acakBytes(32),
        allowCredentials: [{ type: 'public-key', id: dariB64(d.id) }],
        userVerification: 'required',
        timeout: 60000
      }
    })
    .then(function (cred) {
      if (!cred || keB64(cred.rawId) !== d.id) throw new Error('tidak cocok');
      /* Bit UV (0x04) di authenticatorData: pengguna benar-benar terverifikasi */
      var flags = new Uint8Array(cred.response.authenticatorData)[32];
      if (!(flags & 4)) throw new Error('tidak terverifikasi');
      return true;
    });
}
function pesanGagal(err) {
  var n = err && err.name;
  if (n === 'NotAllowedError' || n === 'AbortError') return 'Dibatalkan atau sidik jari tidak dikenali';
  if (n === 'InvalidStateError') return 'Sidik jari sudah terdaftar, coba lagi';
  if (n === 'SecurityError') return 'Fitur ini perlu dibuka lewat https';
  return 'Gagal memakai sidik jari';
}

/* ---------- Layar kunci ---------- */
var terkunci = false,
  sedangVerif = false;
function setInert(on) {
  Array.prototype.forEach.call(document.body.children, function (el) {
    if (el.id !== 'lockScreen' && el.tagName !== 'SCRIPT') el.inert = on;
  });
}
function kunciLayar() {
  terkunci = true;
  document.documentElement.classList.add('kunci-aktif');
  lockLupa(false);
  $('#lockMsg').textContent = 'Gunakan sidik jari untuk membuka';
  setInert(true);
}
function bukaLayar() {
  terkunci = false;
  document.documentElement.classList.remove('kunci-aktif');
  setInert(false);
}
function cobaBuka() {
  if (sedangVerif) return;
  sedangVerif = true;
  $('#lockMsg').textContent = 'Sentuh sensor sidik jari…';
  verifikasiSidikJari()
    .then(function () {
      sedangVerif = false;
      bukaLayar();
    })
    .catch(function (err) {
      sedangVerif = false;
      $('#lockMsg').textContent = pesanGagal(err) + '. Ketuk tombol untuk mencoba lagi.';
    });
}
function lockLupa(tampil) {
  $('#lockMain').hidden = tampil;
  $('#lockReset').hidden = !tampil;
}
/* Jalan keluar bila sidik jari tidak bisa dipakai lagi: hapus data perangkat ini.
   Data di cloud tetap aman dan kembali setelah masuk Google. */
function resetDariKunci() {
  idb
    .clear()
    .catch(function () {})
    .then(function () {
      return store.kosongkan(['stivora.theme', 'stivora.tema', 'stivora.lang']);
    })
    .then(function () {
      location.reload();
    });
}
$('#lockBtn').addEventListener('click', cobaBuka);
$('#lockForgot').addEventListener('click', function () {
  lockLupa(true);
});
$('#lockResetNo').addEventListener('click', function () {
  lockLupa(false);
});
$('#lockResetYes').addEventListener('click', resetDariKunci);

/* Kunci lagi bila aplikasi ditinggal di latar lebih dari 1 menit */
var waktuSembunyi = 0;
document.addEventListener('visibilitychange', function () {
  if (!kunciAktif()) return;
  if (document.hidden) {
    if (!sedangVerif) waktuSembunyi = Date.now();
    return;
  }
  if (waktuSembunyi && !terkunci && Date.now() - waktuSembunyi > KUNCI_JEDA) {
    kunciLayar();
    cobaBuka();
  }
  waktuSembunyi = 0;
});

/* ---------- Halaman Pengaturan › Kunci aplikasi ---------- */
function renderKunciRow() {
  $('#kunciValue').textContent = kunciAktif() ? 'Sidik jari' : 'Mati';
}
function buildKunciForm() {
  var on = kunciAktif();
  var opsi = [
    {
      k: 'mati',
      nama: 'Mati',
      ket: 'Aplikasi langsung terbuka',
      ic: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>'
    },
    {
      k: 'sidik',
      nama: 'Sidik jari',
      ket: kunciDukung === false ? 'Tidak didukung di perangkat atau browser ini' : 'Pakai sidik jari yang terdaftar di HP',
      ic: FP_ICON
    }
  ];
  $('#subTitle').textContent = 'Kunci aplikasi';
  $('#subBody').innerHTML =
    '<div class="choice-list">' +
    opsi
      .map(function (o) {
        var aktif = (o.k === 'sidik') === on;
        var mati = o.k === 'sidik' && kunciDukung === false && !on;
        return (
          '<button type="button" class="choice' +
          (aktif ? ' active' : '') +
          '" data-kunci="' +
          o.k +
          '"' +
          (mati ? ' aria-disabled="true"' : '') +
          '>' +
          '<span class="choice-ic">' +
          o.ic +
          '</span>' +
          '<span class="choice-text"><b>' +
          o.nama +
          '</b><small>' +
          o.ket +
          '</small></span>' +
          (aktif ? '<span class="choice-check">' + CHECK_ICON + '</span>' : '') +
          '</button>'
        );
      })
      .join('') +
    '</div>' +
    '<p class="hint kunci-hint">Aplikasi terkunci saat dibuka dan saat kembali setelah lebih dari 1 menit. ' +
    'Memakai sidik jari yang sudah terdaftar di HP-mu; aplikasi tidak menyimpan sidik jari. Jika sidik jari gagal, HP bisa menawarkan PIN atau pola.</p>';
  if (kunciDukung === null)
    cekDukungan().then(function () {
      if (pageKind === 'kunci') buildKunciForm();
    });
  return true;
}
var kunciSibuk = false;
function kunciClick(e) {
  var b = e.target.closest('[data-kunci]');
  if (!b || kunciSibuk) return;
  var mau = b.dataset.kunci === 'sidik';
  if (mau === kunciAktif()) return;
  if (mau && kunciDukung === false) {
    toast('Sidik jari tidak didukung di perangkat atau browser ini');
    return;
  }
  askConfirm(
    mau
      ? {
          title: 'Aktifkan kunci sidik jari?',
          text: 'Stivora akan meminta sidik jari yang sudah terdaftar di HP-mu setiap kali dibuka, dan saat kembali setelah lebih dari 1 menit.',
          ok: 'Aktifkan',
          tone: 'primary',
          action: function () {
            ubahKunci(true);
            back(1);
          }
        }
      : {
          title: 'Matikan kunci sidik jari?',
          text: 'Stivora akan langsung terbuka tanpa sidik jari. Verifikasi sidik jarimu sekali untuk mematikannya.',
          ok: 'Matikan',
          action: function () {
            ubahKunci(false);
            back(1);
          }
        }
  );
}
/* Dipanggil langsung dari ketukan tombol dialog, agar browser mengizinkan sensor sidik jari */
function ubahKunci(mau) {
  kunciSibuk = true;
  var proses = mau
    ? daftarSidikJari().then(function (id) {
        store.set(K_KUNCI, { on: true, id: id });
        toast('Kunci sidik jari aktif');
      })
    : verifikasiSidikJari().then(function () {
        localStorage.removeItem(K_KUNCI);
        toast('Kunci sidik jari dimatikan');
      });
  proses
    .catch(function (err) {
      toast(pesanGagal(err));
    })
    .then(function () {
      kunciSibuk = false;
      renderKunciRow();
      if (pageKind === 'kunci') buildKunciForm();
    });
}
PAGES.kunci = buildKunciForm;
$('#btnKunci').addEventListener('click', function () {
  openLayer('page:kunci');
});

/* ---------- Mulai ---------- */
renderKunciRow();
if (kunciAktif()) {
  kunciLayar();
  cobaBuka();
}
