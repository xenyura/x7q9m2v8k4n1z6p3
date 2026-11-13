/* Stivora — Data wilayah Indonesia untuk peta (38 provinsi + kota utama)
   =========================================================
   Format: { nama, pusat: [bujur, lintang], tinggi (km), kota: [[nama, bujur, lintang], ...] }
   - pusat  : titik tengah kira-kira, untuk terbang ke provinsi
   - tinggi : ketinggian kamera saat melihat provinsi (km)
   - kota   : ibu kota provinsi selalu di urutan pertama
   Koordinat dibulatkan (±1 km), cukup untuk navigasi kamera.
   Kota lain yang belum ada di sini bisa dicari lewat ikon cari di peta.
   ========================================================= */
var WILAYAH = [
  { nama: 'Aceh', pusat: [96.8, 4.3], tinggi: 650, kota: [['Banda Aceh', 95.32, 5.55], ['Lhokseumawe', 97.15, 5.18], ['Langsa', 97.97, 4.47], ['Sabang', 95.32, 5.89], ['Meulaboh', 96.13, 4.14], ['Takengon', 96.85, 4.63]] },
  { nama: 'Sumatera Utara', pusat: [99.1, 2.2], tinggi: 700, kota: [['Medan', 98.67, 3.59], ['Binjai', 98.49, 3.60], ['Pematangsiantar', 99.06, 2.96], ['Tebing Tinggi', 99.16, 3.33], ['Sibolga', 98.78, 1.74], ['Parapat (Danau Toba)', 98.93, 2.66]] },
  { nama: 'Sumatera Barat', pusat: [100.5, -0.8], tinggi: 550, kota: [['Padang', 100.35, -0.95], ['Bukittinggi', 100.37, -0.30], ['Payakumbuh', 100.63, -0.22], ['Solok', 100.65, -0.79], ['Pariaman', 100.12, -0.63]] },
  { nama: 'Riau', pusat: [101.7, 0.4], tinggi: 650, kota: [['Pekanbaru', 101.45, 0.51], ['Dumai', 101.45, 1.67]] },
  { nama: 'Kepulauan Riau', pusat: [105.6, 1.8], tinggi: 1100, kota: [['Tanjungpinang', 104.45, 0.92], ['Batam', 104.03, 1.08], ['Ranai (Natuna)', 108.38, 3.94]] },
  { nama: 'Jambi', pusat: [102.7, -1.6], tinggi: 550, kota: [['Jambi', 103.61, -1.61], ['Sungai Penuh', 101.39, -2.06]] },
  { nama: 'Sumatera Selatan', pusat: [104.0, -3.3], tinggi: 650, kota: [['Palembang', 104.76, -2.98], ['Prabumulih', 104.23, -3.43], ['Lubuklinggau', 102.86, -3.29], ['Pagar Alam', 103.25, -4.02]] },
  { nama: 'Bengkulu', pusat: [102.4, -3.6], tinggi: 550, kota: [['Bengkulu', 102.27, -3.80]] },
  { nama: 'Kepulauan Bangka Belitung', pusat: [106.6, -2.5], tinggi: 550, kota: [['Pangkalpinang', 106.11, -2.13], ['Tanjung Pandan', 107.65, -2.74]] },
  { nama: 'Lampung', pusat: [105.2, -4.9], tinggi: 500, kota: [['Bandar Lampung', 105.26, -5.43], ['Metro', 105.31, -5.11]] },
  { nama: 'DKI Jakarta', pusat: [106.83, -6.2], tinggi: 90, kota: [['Jakarta', 106.83, -6.18], ['Kepulauan Seribu', 106.55, -5.60]] },
  { nama: 'Jawa Barat', pusat: [107.6, -6.9], tinggi: 450, kota: [['Bandung', 107.61, -6.91], ['Bogor', 106.80, -6.60], ['Bekasi', 106.99, -6.24], ['Depok', 106.82, -6.40], ['Cirebon', 108.56, -6.71], ['Sukabumi', 106.93, -6.92], ['Tasikmalaya', 108.22, -7.33]] },
  { nama: 'Banten', pusat: [106.1, -6.4], tinggi: 300, kota: [['Serang', 106.15, -6.12], ['Tangerang', 106.63, -6.18], ['Tangerang Selatan', 106.72, -6.29], ['Cilegon', 106.02, -6.00]] },
  { nama: 'Jawa Tengah', pusat: [110.1, -7.2], tinggi: 500, kota: [['Semarang', 110.42, -6.97], ['Surakarta (Solo)', 110.82, -7.57], ['Magelang', 110.22, -7.47], ['Salatiga', 110.49, -7.33], ['Pekalongan', 109.67, -6.89], ['Tegal', 109.14, -6.87]] },
  { nama: 'DI Yogyakarta', pusat: [110.4, -7.88], tinggi: 150, kota: [['Yogyakarta', 110.37, -7.80]] },
  { nama: 'Jawa Timur', pusat: [112.5, -7.6], tinggi: 550, kota: [['Surabaya', 112.75, -7.25], ['Malang', 112.63, -7.98], ['Batu', 112.52, -7.87], ['Kediri', 112.01, -7.82], ['Madiun', 111.52, -7.63], ['Banyuwangi', 114.37, -8.22]] },
  { nama: 'Bali', pusat: [115.2, -8.4], tinggi: 220, kota: [['Denpasar', 115.22, -8.65], ['Singaraja', 115.09, -8.11], ['Ubud', 115.26, -8.51]] },
  { nama: 'Nusa Tenggara Barat', pusat: [117.4, -8.6], tinggi: 450, kota: [['Mataram', 116.12, -8.58], ['Sumbawa Besar', 117.42, -8.50], ['Bima', 118.73, -8.46]] },
  { nama: 'Nusa Tenggara Timur', pusat: [121.5, -9.0], tinggi: 900, kota: [['Kupang', 123.61, -10.17], ['Labuan Bajo', 119.88, -8.49], ['Ende', 121.66, -8.84], ['Maumere', 122.21, -8.62], ['Waingapu', 120.26, -9.66]] },
  { nama: 'Kalimantan Barat', pusat: [111.0, -0.2], tinggi: 800, kota: [['Pontianak', 109.33, -0.03], ['Singkawang', 108.98, 0.91]] },
  { nama: 'Kalimantan Tengah', pusat: [113.4, -1.7], tinggi: 800, kota: [['Palangka Raya', 113.92, -2.21]] },
  { nama: 'Kalimantan Selatan', pusat: [115.3, -3.0], tinggi: 450, kota: [['Banjarbaru', 114.83, -3.44], ['Banjarmasin', 114.59, -3.32]] },
  { nama: 'Kalimantan Timur', pusat: [116.4, 0.5], tinggi: 850, kota: [['Samarinda', 117.15, -0.50], ['Balikpapan', 116.83, -1.27], ['Bontang', 117.50, 0.13], ['IKN Nusantara', 116.70, -0.97]] },
  { nama: 'Kalimantan Utara', pusat: [116.2, 3.0], tinggi: 600, kota: [['Tanjung Selor', 117.37, 2.84], ['Tarakan', 117.63, 3.30]] },
  { nama: 'Sulawesi Utara', pusat: [124.4, 1.0], tinggi: 450, kota: [['Manado', 124.84, 1.47], ['Bitung', 125.18, 1.44], ['Tomohon', 124.84, 1.33], ['Kotamobagu', 124.32, 0.73]] },
  { nama: 'Gorontalo', pusat: [122.4, 0.7], tinggi: 350, kota: [['Gorontalo', 123.06, 0.54]] },
  { nama: 'Sulawesi Tengah', pusat: [121.4, -1.4], tinggi: 750, kota: [['Palu', 119.87, -0.90], ['Poso', 120.75, -1.39], ['Luwuk', 122.79, -0.95]] },
  { nama: 'Sulawesi Barat', pusat: [119.3, -2.5], tinggi: 400, kota: [['Mamuju', 118.89, -2.68]] },
  { nama: 'Sulawesi Selatan', pusat: [120.0, -3.7], tinggi: 650, kota: [['Makassar', 119.43, -5.15], ['Parepare', 119.62, -4.01], ['Palopo', 120.20, -2.99], ['Toraja (Rantepao)', 119.90, -2.97]] },
  { nama: 'Sulawesi Tenggara', pusat: [122.2, -4.1], tinggi: 550, kota: [['Kendari', 122.51, -3.97], ['Baubau', 122.60, -5.47], ['Wakatobi (Wangi-Wangi)', 123.55, -5.32]] },
  { nama: 'Maluku', pusat: [130.1, -3.4], tinggi: 1200, kota: [['Ambon', 128.18, -3.70], ['Tual', 132.75, -5.64], ['Banda Neira', 129.90, -4.53]] },
  { nama: 'Maluku Utara', pusat: [127.8, 1.0], tinggi: 750, kota: [['Sofifi', 127.57, 0.74], ['Ternate', 127.38, 0.79], ['Tidore', 127.40, 0.68]] },
  { nama: 'Papua', pusat: [139.0, -2.5], tinggi: 750, kota: [['Jayapura', 140.72, -2.53], ['Biak', 136.10, -1.18]] },
  { nama: 'Papua Barat', pusat: [133.2, -1.6], tinggi: 600, kota: [['Manokwari', 134.08, -0.86], ['Fakfak', 132.30, -2.93]] },
  { nama: 'Papua Barat Daya', pusat: [131.4, -1.0], tinggi: 450, kota: [['Sorong', 131.25, -0.88], ['Raja Ampat (Waisai)', 130.82, -0.43]] },
  { nama: 'Papua Tengah', pusat: [136.6, -3.8], tinggi: 600, kota: [['Nabire', 135.50, -3.37], ['Timika', 136.89, -4.55]] },
  { nama: 'Papua Pegunungan', pusat: [139.2, -4.2], tinggi: 450, kota: [['Wamena', 138.95, -4.10]] },
  { nama: 'Papua Selatan', pusat: [139.5, -7.0], tinggi: 750, kota: [['Merauke', 140.40, -8.49]] }
];
var INDONESIA_KOTAK = [94.0, -11.5, 141.5, 6.5];   // barat, selatan, timur, utara (derajat)
