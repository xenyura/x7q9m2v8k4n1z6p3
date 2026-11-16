/* ============================================================
   Stivora — Ikon & emoji untuk badge Galery (5.44.0)
   Ikon garis 24×24 (stroke, ikut warna kategori badge), dikelompokkan per bidang.
   Kunci ikon lama (5.43.0) tetap ada: kode, chip, kuas, kamera, tulis, kerja, grafik, buku,
   bahasa, musik, game, olahraga, hati, bintang, dunia, kopi.
   ============================================================ */
'use strict';

var GB_IKON_GRUP = [
  { id: 'umum', nama: 'Umum', emoji: '⭐ 🔥 ✅ 👑 📍 ⏰ 📅 🚩 ⚡ 🔑 💡 🎯 💯 🏅 ✨', ikon: {
    bintang: '<path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z"/>',
    centang: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    api: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.3 1.6 1.1 2.6 2.3 3.1C11 8.6 11 5.6 12 3z"/>',
    mahkota: '<path d="M3.5 8l4 4 4.5-6.5 4.5 6.5 4-4-2 11H5.5z"/>',
    lokasi: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
    jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    kalender: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    bendera: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    petir: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
    kunci: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2"/>'
  } },
  { id: 'teknologi', nama: 'Teknologi', emoji: '💻 📱 🖥️ ⌨️ 🖱️ 🤖 🛰️ 🔌 💾 🧠 🌐 📡', ikon: {
    kode: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    hp: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    server: '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 5v3M9.5 13h.01M14.5 13h.01M9.5 16h5M3 12v3M21 12v3"/><circle cx="12" cy="3.5" r="1"/>',
    awan: '<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.5 18z"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9l3 3-3 3M12.5 15h4.5"/>'
  } },
  { id: 'desain', nama: 'Desain & Seni', emoji: '🎨 🖌️ ✏️ 📷 🎬 🎭 🖼️ ✂️ 🧵 📐 🪡 🎞️', ikon: {
    kuas: '<path d="M14 4l6 6-7.5 7.5-6-6z"/><path d="M6.5 11.5L4 20l8.5-2.5"/>',
    palet: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1.2-1.7-1.2-3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    tulis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    kamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    lukisan: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="M21 15.5l-5-5-9 9.5"/>',
    tata_letak: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9h17M9.5 9v11.5"/>',
    bentuk: '<circle cx="8" cy="8" r="4.5"/><path d="M14 13.5h6.5V20H14z"/><path d="M15.5 3.5l4.5 7.5h-9z"/>',
    kilau: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    huruf: '<path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/>'
  } },
  { id: 'bisnis', nama: 'Bisnis & Keuangan', emoji: '💼 💰 💵 💳 📈 📊 🏪 🤝 🧾 🏦 🪙 📦', ikon: {
    kerja: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5h6v2M3 12.5h18"/>',
    grafik: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    uang: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
    dompet: '<path d="M4 7.5V18a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-1.5zM4 7.5A2 2 0 0 1 6 5.5h11V9"/><path d="M16.5 14.5h.01"/>',
    toko: '<path d="M4 9.5V20h16V9.5M3 9.5l2-5.5h14l2 5.5c0 1.4-1.3 2.5-3 2.5s-3-1.1-3-2.5c0 1.4-1.3 2.5-3 2.5s-3-1.1-3-2.5c0 1.4-1.3 2.5-3 2.5S3 10.9 3 9.5z"/><path d="M10 20v-5h4v5"/>',
    tren_naik: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    koin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    presentasi: '<rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M12 15v3M8 21l4-3 4 3M7 11l3-3 2.5 2.5L16 7"/>',
    persen: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'
  } },
  { id: 'pendidikan', nama: 'Pendidikan & Sains', emoji: '📚 🎓 📝 🔬 🧪 🧮 🏫 🔭 🧬 📖 🗂️ ✍️', ikon: {
    buku: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    toga: '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11M21.5 9v5"/>',
    pensil: '<path d="M15 4.5l4.5 4.5L8.5 20H4v-4.5z"/><path d="M12.5 7l4.5 4.5"/>',
    ide: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    sekolah: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M12 10.5h.01"/>',
    kalkulator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7h7M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
    sertifikat: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 8h10M7 11.5h6"/><circle cx="16" cy="16" r="2.5"/><path d="M14.8 18.2l-.8 3 2-1 2 1-.8-3"/>',
    atom: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-60 12 12)"/>',
    tabung: '<path d="M9 3h6M10 3v6.5L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9.5V3M7.5 14.5h9"/>'
  } },
  { id: 'bahasa', nama: 'Bahasa & Komunikasi', emoji: '🗣️ 💬 🎙️ ✉️ 📢 📞 📻 🌏 🔤 📰 🗨️ 🤟', ikon: {
    bahasa: '<path d="M4 5h9M8.5 3v2M6 5c1 4 3.5 7 7 8.5M11 5c-1 4-3.5 7-7 8.5"/><path d="M13 21l4-9 4 9M14.5 18h5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    mikrofon: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    surat: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    megafon: '<path d="M3.5 10v4h3l9 4.5V5.5l-9 4.5z"/><path d="M6.5 14l1.5 5h2.5l-1-4.5M19 9.5a3.5 3.5 0 0 1 0 5"/>',
    telepon: '<path d="M5 3.5h4l1.5 4.5-2.5 1.5a11 11 0 0 0 5.5 5.5l1.5-2.5 4.5 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
    radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l9-4.5"/><circle cx="15.5" cy="14" r="2.5"/><path d="M6.5 12.5h4M6.5 15.5h4"/>',
    kutipan: '<path d="M9.5 7H6a1.5 1.5 0 0 0-1.5 1.5V12H9v1.5A3.5 3.5 0 0 1 5.5 17M19.5 7H16a1.5 1.5 0 0 0-1.5 1.5V12H19v1.5a3.5 3.5 0 0 1-3.5 3.5"/>'
  } },
  { id: 'olahraga', nama: 'Olahraga', emoji: '⚽ 🏀 🏸 🏊 🚴 🏃 🥊 🏋️ 🧗 🏆 ⛰️ 🥋', ikon: {
    olahraga: '<path d="M6 8v8M18 8v8M3.5 10v4M20.5 10v4M6 12h12"/>',
    bola: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 3-1.5 4.5h-5L8 10.5z"/><path d="M12 3v4.5M16 10.5l4.5-1.5M14.5 15l2.5 4M9.5 15L7 19M8 10.5L3.5 9"/>',
    lari: '<circle cx="14" cy="4.5" r="1.8"/><path d="M6 20l3.5-5 3 2V11l-3 1.5-2 3M12.5 11l3 3h3.5M9.5 9.5l3-1.5 2.5 3"/>',
    sepeda: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l2.5 7H6M13.5 6h2.5"/>',
    renang: '<path d="M2.5 17c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5M2.5 21c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5"/><circle cx="16" cy="6" r="1.8"/><path d="M5 13l5-4 3 2.5-3 2"/>',
    trofi: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3 3 0 0 0 8 10.5M16 6h3.5v1.5a3 3 0 0 1-3.5 3M12 13v4M8.5 20.5h7M9.5 20.5l.5-3.5h4l.5 3.5"/>',
    stopwatch: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2.5M10 2.5h4M12 2.5V6M18.5 6.5l1.5-1.5"/>',
    gunung: '<path d="M2.5 20L9 8l3.5 6 2.5-4 6.5 10z"/><path d="M7.5 11l1.5 1.5 1.5-1.5"/>',
    raket: '<ellipse cx="9" cy="9" rx="5.5" ry="5.5"/><path d="M13 13l7 7M5.5 9h7M9 5.5v7"/>'
  } },
  { id: 'musik', nama: 'Musik', emoji: '🎵 🎸 🎹 🥁 🎤 🎧 🎻 🎺 🎷 📀 🎼 🪕', ikon: {
    musik: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    nada: '<path d="M10 18V4l7 3"/><circle cx="7.5" cy="18" r="2.5"/>',
    gitar: '<path d="M14.5 9.5L20 4M18 3l3 3"/><path d="M11 8.5a3.5 3.5 0 0 0-5 .5L4.5 11a4 4 0 0 0 0 5.5l3 3a4 4 0 0 0 5.5 0L15 18a3.5 3.5 0 0 0 .5-5"/><circle cx="10" cy="14" r="1.5"/>',
    piano: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7.5 20v-6M12 20v-6M16.5 20v-6M6 4v10h3V4M10.5 4v10h3V4M15 4v10h3V4"/>',
    drum: '<ellipse cx="12" cy="9" rx="8.5" ry="3"/><path d="M3.5 9v7c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3V9M7 11.5v7M17 11.5v7M12 12v7M5 2.5l5 5M19 2.5l-5 5"/>',
    headphone: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    speaker: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><circle cx="12" cy="14.5" r="3.5"/><path d="M12 7h.01"/>',
    piringan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5"/>'
  } },
  { id: 'game', nama: 'Game & Hiburan', emoji: '🎮 🕹️ 🎲 🧩 ♟️ 🎟️ 🍿 📺 🎳 🃏 🎯 🎡', ikon: {
    game: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="17.5" cy="13.5" r=".9"/>',
    joystick: '<rect x="4" y="13" width="16" height="7" rx="2"/><path d="M12 13V8"/><circle cx="12" cy="5.5" r="2.5"/><path d="M8 16.5h.01M16 16.5h3"/>',
    dadu: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"/>',
    puzzle: '<path d="M4 7.5h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4.5H4v-4.5a2 2 0 1 0 0-4z"/>',
    catur: '<path d="M7 20.5h10M8 18h8l-1-6h-6zM9.5 12l-1-4.5h7l-1 4.5M10 7.5V5h4v2.5M11 3.5h2"/>',
    tiket: '<path d="M3 9.5V7h18v2.5a2.5 2.5 0 0 0 0 5V17H3v-2.5a2.5 2.5 0 0 0 0-5z"/><path d="M14 8v8"/>',
    popcorn: '<path d="M6 9l1.5 12h9L18 9M9.5 9.5l.5 11.5M14.5 9.5l-.5 11.5"/><path d="M6 9a2 2 0 0 1 1-3.5 2.5 2.5 0 0 1 4.5-1.5 2.5 2.5 0 0 1 4.5 1.5A2 2 0 0 1 18 9z"/>',
    tv: '<rect x="3" y="6" width="18" height="12.5" rx="2"/><path d="M8.5 2.5L12 6l3.5-3.5M8 21.5h8"/>'
  } },
  { id: 'kesehatan', nama: 'Kesehatan', emoji: '❤️ 🩺 💊 🧘 🍎 💧 😴 🦷 🫀 🏥 🧠 💪', ikon: {
    hati: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    detak: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    apel: '<path d="M12 7c-1.5-1-5-1.5-6.5 1.5S5 16 8 19.5c1.5 1.5 2.5 1 4 .5 1.5.5 2.5 1 4-.5 3-3.5 4-8 2.5-11S13.5 6 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
    obat: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
    meditasi: '<circle cx="12" cy="5" r="2"/><path d="M12 7.5v5M7 10.5l5 2 5-2M4 19c2.5 0 4.5-2 8-2s5.5 2 8 2M8 16.5l4-1.5 4 1.5"/>',
    tidur: '<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11.5" r="2"/>',
    tetes: '<path d="M12 3.5s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z"/>',
    stetoskop: '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5M6 3.5H4.5M14 3.5h1.5M10 12.5v2a5 5 0 0 0 10 0V12"/><circle cx="20" cy="10.5" r="1.8"/>',
    medis: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>'
  } },
  { id: 'agama', nama: 'Agama & Spiritual', emoji: '🕌 📿 🤲 🌙 🕋 ⛪ 🛕 🕍 🙏 🕯️ ☪️ ✝️', ikon: {
    masjid: '<path d="M3 21h18M5 21v-7h14v7M6.5 14a5.5 5.5 0 0 1 11 0M12 5.5V3M20.5 21V9M20.5 9l-1-2h2zM3.5 21V9M3.5 9l-1-2h2z"/><path d="M10.5 21v-3a1.5 1.5 0 0 1 3 0v3"/>',
    bulan: '<path d="M19 15A8 8 0 1 1 9 5a6.5 6.5 0 0 0 10 10z"/><path d="M17 4l.6 1.4 1.4.6-1.4.6L17 8l-.6-1.4L15 6l1.4-.6z"/>',
    kitab: '<path d="M12 6.5c-2-1.5-5-2-8.5-1.5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5zM12 6.5v13"/>',
    tasbih: '<circle cx="12" cy="9" r="6"/><path d="M12 15v3"/><circle cx="12" cy="19.5" r="1.5"/><path d="M6.8 6h.01M17.2 6h.01M6 9h.01M18 9h.01M6.8 12h.01M17.2 12h.01"/>',
    lilin: '<rect x="9" y="10" width="6" height="11" rx="1"/><path d="M12 10V8M12 3c1.5 1.5 1.5 3 0 4.5-1.5-1.5-1.5-3 0-4.5z"/>'
  } },
  { id: 'kuliner', nama: 'Kuliner', emoji: '🍳 🍜 🍛 🍕 🍰 ☕ 🍵 🥤 🍔 🍲 🥗 🍩', ikon: {
    kopi: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5v2.5M12 3.5v2.5"/>',
    panci: '<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h2M20 10h2M8 6.5c0-1 1-1 1-2M12 6.5c0-1 1-1 1-2M16 6.5c0-1 1-1 1-2"/>',
    makan: '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 21V3c-2 1.5-3 4.5-3 8h3"/>',
    kue: '<path d="M4 20.5h16v-8H4zM4 15.5c1.3 0 1.3 1.5 2.7 1.5s1.3-1.5 2.6-1.5 1.4 1.5 2.7 1.5 1.3-1.5 2.7-1.5 1.3 1.5 2.6 1.5 1.4-1.5 2.7-1.5M8 12.5V9M12 12.5V9M16 12.5V9M8 6.5v.01M12 6.5v.01M16 6.5v.01"/>',
    pizza: '<path d="M12 21L3.5 6.5a17 17 0 0 1 17 0z"/><path d="M5.5 10a13 13 0 0 1 13 0M10 9.5h.01M14 11h.01M12 14.5h.01"/>',
    gelas: '<path d="M6 3.5h12l-1.5 17h-9zM6.5 8.5h11"/>',
    roti: '<path d="M5 20V10.5A3.5 3.5 0 0 1 4 4.5h16a3.5 3.5 0 0 1-1 6V20z"/>'
  } },
  { id: 'travel', nama: 'Travel & Alam', emoji: '✈️ 🗺️ 🧭 🧳 🏖️ 🏝️ 🌳 🍃 ☀️ 🌊 🏕️ 🌍', ikon: {
    dunia: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
    pesawat: '<path d="M10.5 4.5c0-1 .7-2 1.5-2s1.5 1 1.5 2V9l7.5 4.5V16l-7.5-2.5v4l2.5 2V21L12 20l-4 1v-1.5l2.5-2v-4L3 16v-2.5L10.5 9z"/>',
    peta: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5zM9 4v13.5M15 6.5V20"/>',
    kompas: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    koper: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4.5h6V7M9 11v5M15 11v5"/>',
    pantai: '<path d="M12 10.5L8 21M3 10.5a9 9 0 0 1 17.5-2zM3 10.5l17.5-2M3 21h18"/>',
    pohon: '<path d="M12 21v-5M12 3l6 7h-3l4 5H5l4-5H6z"/>',
    daun: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7"/>',
    matahari: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'
  } },
  { id: 'otomotif', nama: 'Otomotif & Teknik', emoji: '🚗 🏍️ 🔧 ⚙️ 🔨 ⛽ 🔋 🛠️ 🚚 🚲 🏗️ 🔩', ikon: {
    mobil: '<path d="M4 16.5v-4l2-5h12l2 5v4z"/><path d="M4 12.5h16"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
    motor: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5L9 10h5l4.5 6.5M12 10l2.5-4h3M9 10H6.5"/>',
    kunci_inggris: '<path d="M15 4.5a4.5 4.5 0 0 0-4.2 6.1L4 17.5 6.5 20l6.9-6.8A4.5 4.5 0 0 0 19.5 9l-2.8 2.8-2.6-.7-.7-2.6L16.2 5.7A4.5 4.5 0 0 0 15 4.5z"/>',
    gir: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    palu: '<path d="M14 6.5l-9.5 9.5a2 2 0 0 0 3 3L17 9.5M11.5 4l6 1 2.5 2.5-1 1.5-3.5-.5-3.5-3.5z"/>',
    bensin: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8l3 1.5v8a1.5 1.5 0 0 0 3 0V9l-2.5-3"/>',
    baterai: '<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3M11 9l-2 3h4l-2 3"/>'
  } },
  { id: 'sosial', nama: 'Sosial & Keluarga', emoji: '👨‍👩‍👧 👥 🏠 🎁 🤝 💐 🐾 👶 💑 🫶 🎉 🧑‍🤝‍🧑', ikon: {
    orang: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6"/>',
    grup: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.7-3.3 3-5 6-5s5.3 1.7 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.5.2 4 1.7 4.5 4.4"/>',
    rumah: '<path d="M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    hadiah: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8C10.5 4 7 4 7 6.2S10 8 12 8zM12 8c1.5-4 5-4 5-1.8S14 8 12 8z"/>',
    relawan: '<path d="M12 9.5s-3.5-2.2-3.5-4.5A2 2 0 0 1 12 4a2 2 0 0 1 3.5 1c0 2.3-3.5 4.5-3.5 4.5z"/><path d="M3 14l3-1.5 4.5 2H14a1.5 1.5 0 0 1 0 3H10M14 17.5l5-2.5a1.5 1.5 0 0 1 1.5 2.5L14 21H5l-2-1"/>',
    bunga: '<circle cx="12" cy="8" r="2.2"/><path d="M12 5.8c0-2.5-3-3-3-.5 0 1.5 1.5 2.4 3 3M12 5.8c0-2.5 3-3 3-.5 0 1.5-1.5 2.4-3 3M9.8 8c-2.5 0-3 3-.5 3 1.5 0 2.4-1.5 3-3M14.2 8c2.5 0 3 3 .5 3-1.5 0-2.4-1.5-3-3M12 10.2V21M12 17c-2-2.5-4.5-2.5-5-1 1 1.5 3 2 5 1z"/>',
    hewan: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="5.8" r="1.8"/><circle cx="15.5" cy="6.5" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/><path d="M8.5 17.5c0-3 2-5.5 4.5-5.5s4 2.5 4 4.5-1.5 3-3.5 3c-1.5 0-2-1-3.5-1s-1.5 1-1.5-1z"/>'
  } }
];
