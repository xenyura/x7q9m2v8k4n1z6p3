/* Stivora — Konfigurasi: Firebase, Worker media, batas ukuran */
'use strict';

/* =========================================================
   KONFIGURASI FIREBASE & PENYIMPANAN MEDIA
   1) FIREBASE_CONFIG: salin dari Firebase Console › Project settings ›
      General › Your apps › Web app › "firebaseConfig".
      (Nilai ini memang publik; keamanan dijaga oleh Firestore Rules.)
   2) MEDIA_WORKER_URL: alamat Cloudflare Worker penghubung R2,
      contoh 'https://stivora-media.namamu.workers.dev'
   Kunci R2 (Access Key / Secret Key) TIDAK PERNAH ditaruh di sini.
   Biarkan kosong = aplikasi tetap jalan, hanya login & cloud yang nonaktif.
   ========================================================= */
var FIREBASE_CONFIG = {
   apiKey: "AIzaSyA70BBHrkoFPC7ayOaHc2EhKb2TaX_wEfw",
   authDomain: "stivora-dreams.firebaseapp.com",
   projectId: "stivora-dreams",
   storageBucket: "stivora-dreams.firebasestorage.app",
   messagingSenderId: "47560984437",
   appId: "1:47560984437:web:cb183af6bad7c3f226753c"
};
var MEDIA_WORKER_URL = 'https://stivora-media.xenyura.workers.dev';
var FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/12.9.0/';
var MAX_VIDEO_MB = 100;   // batas ukuran video, audio, dan dokumen (MB)

/* Peta 3D (opsional): token Cesium ion untuk satelit Bing + relief gunung 3D.
   Kosong = memakai satelit gratis Sentinel-2 (EOX). Cara mendapatkan: lihat README › Peta.
   Isi "Allowed URLs" token dengan alamat GitHub Pages-mu agar tidak dipakai situs lain. */
var CESIUM_ION_TOKEN = '';

/* Key YouTube (juga untuk Google Books) & TMDB TIDAK ditaruh di sini lagi (5.66.0):
   simpan sebagai Secret di Cloudflare Worker (YOUTUBE_API_KEY, TMDB_API_KEY) — lihat README › Key API di Worker. */

/* Jenis file yang boleh disimpan (harus sama dengan ALLOWED_TYPES di Worker) */
var MEDIA_DITERIMA = 'image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
