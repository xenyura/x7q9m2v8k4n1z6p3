/* Stivora — Kendaraan untuk Putar Perjalanan (digambar dengan Canvas, tampak samping menghadap kanan)
   Nilai tersimpan per bagian perjalanan: 'jenis:model' (mis. 'pesawat:heli'). Nilai lama 'pesawat' tetap dibaca (model pertama).
   Kanvas logis 72 × 44, garis tanah y = 38. */
'use strict';

/* ---------- Alat gambar ---------- */
function kgRR(g, x, y, w, h, r, warna) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fillStyle = warna;
  g.fill();
}
function kgC(g, x, y, r, warna) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = warna;
  g.fill();
}
function kgP(g, t, warna) {
  g.beginPath();
  g.moveTo(t[0], t[1]);
  for (var i = 2; i < t.length; i += 2) g.lineTo(t[i], t[i + 1]);
  g.closePath();
  g.fillStyle = warna;
  g.fill();
}
function kgL(g, t, warna, w) {
  g.beginPath();
  g.moveTo(t[0], t[1]);
  for (var i = 2; i < t.length; i += 2) g.lineTo(t[i], t[i + 1]);
  g.strokeStyle = warna;
  g.lineWidth = w || 2;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}
function kgRoda(g, x, y, r) {
  kgC(g, x, y, r, '#1f2937');
  kgC(g, x, y, r * 0.45, '#cbd5e1');
}
function kgRodaTipis(g, x, y, r, w) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.strokeStyle = '#1f2937';
  g.lineWidth = w || 2.2;
  g.stroke();
  kgC(g, x, y, 1.4, '#64748b');
}
function kgKaca(g, t) {
  kgP(g, t, '#cfe9ff');
}
function kgOrang(g, x, y, baju, helm) {
  /* pengendara duduk; (x, y) = pinggul */
  kgL(g, [x, y, x + 3, y - 10], baju, 4); /* badan */
  kgL(g, [x + 2, y - 7, x + 9, y - 4], baju, 2.6); /* lengan */
  kgL(g, [x, y, x + 6, y + 1, x + 6, y + 7], '#334155', 3); /* kaki */
  kgC(g, x + 4, y - 14, 3.4, helm || '#f2c6a0');
}
function kgPejalan(g, x, warna, ransel) {
  /* orang berjalan; x = posisi tengah */
  if (ransel) kgRR(g, x - 7, 14, 6, 10, 2, ransel);
  kgL(g, [x, 13, x, 26], warna, 4.5);
  kgL(g, [x, 16, x + 5, 22], warna, 2.6);
  kgL(g, [x, 16, x - 4, 22], warna, 2.6);
  kgL(g, [x, 26, x + 5, 37], '#334155', 3);
  kgL(g, [x, 26, x - 4, 37], '#334155', 3);
  kgC(g, x, 8, 4, '#f2c6a0');
}
function kgOmbak(g) {
  kgL(g, [2, 40, 10, 38, 18, 40, 26, 38, 34, 40, 42, 38, 50, 40, 58, 38, 66, 40, 70, 39], '#38bdf8', 2);
}

/* ---------- Model per jenis ---------- */
var KEND_JENIS = [
  {
    k: 'jalan',
    nama: 'Jalan kaki',
    model: [
      {
        k: 'jalan',
        nama: 'Jalan',
        g: function (g) {
          kgPejalan(g, 36, '#2563eb');
        }
      },
      {
        k: 'ransel',
        nama: 'Ransel',
        g: function (g) {
          kgPejalan(g, 38, '#16a34a', '#f59e0b');
        }
      },
      {
        k: 'rombongan',
        nama: 'Rombongan',
        g: function (g) {
          kgPejalan(g, 22, '#db2777');
          kgPejalan(g, 38, '#2563eb');
          kgPejalan(g, 54, '#16a34a', '#f59e0b');
        }
      }
    ]
  },
  {
    k: 'sepeda',
    nama: 'Sepeda',
    model: [
      {
        k: 'biasa',
        nama: 'Sepeda',
        g: function (g) {
          kgRodaTipis(g, 18, 31, 8);
          kgRodaTipis(g, 52, 31, 8);
          kgL(g, [18, 31, 30, 31, 42, 18, 26, 18, 30, 31], '#2563eb', 2.4);
          kgL(g, [42, 18, 52, 31], '#2563eb', 2.4);
          kgL(g, [24, 15, 29, 15], '#111827', 2.6);
          kgL(g, [41, 13, 44, 13], '#111827', 2.4);
          kgOrang(g, 27, 15, '#ef4444');
        }
      },
      {
        k: 'gunung',
        nama: 'Gunung',
        g: function (g) {
          kgRodaTipis(g, 18, 30, 8, 3.6);
          kgRodaTipis(g, 52, 30, 8, 3.6);
          kgL(g, [18, 30, 30, 30, 43, 17, 26, 19, 30, 30], '#16a34a', 3);
          kgL(g, [43, 17, 52, 30], '#16a34a', 3);
          kgL(g, [24, 16, 29, 16], '#111827', 2.6);
          kgOrang(g, 27, 16, '#f97316', '#111827');
        }
      },
      {
        k: 'listrik',
        nama: 'Listrik',
        g: function (g) {
          kgRodaTipis(g, 18, 31, 8);
          kgRodaTipis(g, 52, 31, 8);
          kgL(g, [18, 31, 30, 31, 42, 18, 26, 18, 30, 31], '#f97316', 2.6);
          kgL(g, [42, 18, 52, 31], '#f97316', 2.6);
          kgRR(g, 30, 20, 9, 5, 1.5, '#111827');
          kgC(g, 52, 31, 3, '#64748b');
          kgL(g, [24, 15, 29, 15], '#111827', 2.6);
          kgOrang(g, 27, 15, '#0ea5e9');
        }
      }
    ]
  },
  {
    k: 'motor',
    nama: 'Motor',
    model: [
      {
        k: 'bebek',
        nama: 'Bebek',
        g: function (g) {
          kgRoda(g, 16, 33, 6);
          kgRoda(g, 54, 33, 6);
          kgP(g, [12, 30, 22, 22, 38, 22, 44, 28, 50, 20, 56, 20, 58, 30, 50, 31, 26, 31], '#2563eb');
          kgRR(g, 22, 19, 16, 4, 2, '#111827');
          kgL(g, [50, 20, 52, 12], '#111827', 2.2);
          kgOrang(g, 30, 19, '#ef4444', '#111827');
        }
      },
      {
        k: 'sport',
        nama: 'Sport',
        g: function (g) {
          kgRoda(g, 16, 33, 6.5);
          kgRoda(g, 56, 33, 6.5);
          kgP(g, [10, 26, 26, 20, 40, 20, 46, 14, 58, 18, 62, 27, 54, 30, 22, 30], '#dc2626');
          kgP(g, [46, 14, 54, 12, 58, 18], '#cfe9ff');
          kgOrang(g, 30, 19, '#111827', '#f8fafc');
        }
      },
      {
        k: 'skuter',
        nama: 'Skuter',
        g: function (g) {
          kgRoda(g, 18, 34, 5);
          kgRoda(g, 54, 34, 5);
          kgP(g, [10, 32, 12, 22, 26, 20, 30, 28, 44, 28, 48, 14, 54, 14, 58, 30], '#14b8a6');
          kgRR(g, 16, 17, 12, 4, 2, '#7c2d12');
          kgL(g, [48, 14, 46, 8], '#111827', 2.2);
          kgOrang(g, 22, 17, '#f59e0b', '#f8fafc');
        }
      },
      {
        k: 'ojek',
        nama: 'Ojek',
        g: function (g) {
          kgRoda(g, 16, 33, 6);
          kgRoda(g, 54, 33, 6);
          kgP(g, [12, 30, 22, 22, 38, 22, 44, 28, 50, 20, 56, 20, 58, 30, 50, 31, 26, 31], '#111827');
          kgRR(g, 16, 19, 22, 4, 2, '#374151');
          kgOrang(g, 20, 19, '#2563eb', '#f2c6a0');
          kgOrang(g, 32, 19, '#16a34a', '#16a34a');
        }
      }
    ]
  },
  {
    k: 'mobil',
    nama: 'Mobil',
    model: [
      {
        k: 'sedan',
        nama: 'Sedan',
        g: function (g) {
          kgRR(g, 5, 21, 62, 12, 5, '#ef4444');
          kgP(g, [18, 22, 27, 12, 46, 12, 56, 22], '#ef4444');
          kgKaca(g, [22, 21, 29, 14, 35, 14, 35, 21]);
          kgKaca(g, [38, 21, 38, 14, 45, 14, 52, 21]);
          kgRR(g, 63, 24, 4, 3, 1, '#fde68a');
          kgRoda(g, 18, 33, 5.5);
          kgRoda(g, 54, 33, 5.5);
        }
      },
      {
        k: 'taksi',
        nama: 'Taksi',
        g: function (g) {
          kgRR(g, 5, 21, 62, 12, 5, '#facc15');
          kgP(g, [18, 22, 27, 12, 46, 12, 56, 22], '#facc15');
          kgKaca(g, [22, 21, 29, 14, 35, 14, 35, 21]);
          kgKaca(g, [38, 21, 38, 14, 45, 14, 52, 21]);
          kgRR(g, 31, 7, 10, 5, 1.5, '#1f2937');
          for (var i = 0; i < 7; i++) kgRR(g, 9 + i * 8, 26, 4, 3, 0.5, '#111827');
          kgRoda(g, 18, 33, 5.5);
          kgRoda(g, 54, 33, 5.5);
        }
      },
      {
        k: 'suv',
        nama: 'SUV',
        g: function (g) {
          kgRR(g, 5, 13, 62, 20, 5, '#059669');
          kgKaca(g, [14, 15, 26, 15, 26, 22, 12, 22]);
          kgKaca(g, [29, 15, 43, 15, 43, 22, 29, 22]);
          kgKaca(g, [46, 15, 56, 15, 61, 22, 46, 22]);
          kgL(g, [10, 11, 58, 11], '#111827', 2);
          kgRR(g, 63, 24, 4, 3, 1, '#fde68a');
          kgRoda(g, 18, 33, 6.5);
          kgRoda(g, 54, 33, 6.5);
        }
      },
      {
        k: 'pikap',
        nama: 'Pikap',
        g: function (g) {
          kgRR(g, 4, 21, 64, 12, 4, '#2563eb');
          kgP(g, [38, 22, 41, 11, 56, 11, 63, 22], '#2563eb');
          kgKaca(g, [43, 21, 44, 14, 54, 14, 59, 21]);
          kgL(g, [6, 21, 36, 21], '#1e3a8a', 2);
          kgRR(g, 10, 15, 8, 6, 1, '#a16207');
          kgRR(g, 20, 17, 8, 4, 1, '#a16207');
          kgRoda(g, 17, 33, 6);
          kgRoda(g, 54, 33, 6);
        }
      }
    ]
  },
  {
    k: 'bus',
    nama: 'Bus',
    model: [
      {
        k: 'kota',
        nama: 'Bus kota',
        g: function (g) {
          kgRR(g, 3, 9, 66, 24, 5, '#2563eb');
          for (var i = 0; i < 6; i++) kgRR(g, 7 + i * 9, 13, 7, 8, 1.5, '#cfe9ff');
          kgRR(g, 61, 13, 5, 15, 1.5, '#cfe9ff');
          kgRR(g, 3, 25, 66, 3, 0, '#facc15');
          kgRoda(g, 15, 33, 5.5);
          kgRoda(g, 55, 33, 5.5);
        }
      },
      {
        k: 'pariwisata',
        nama: 'Pariwisata',
        g: function (g) {
          kgRR(g, 3, 5, 66, 28, 6, '#dc2626');
          kgRR(g, 7, 9, 52, 10, 2, '#1f2937');
          kgP(g, [61, 9, 66, 9, 68, 22, 61, 22], '#cfe9ff');
          kgL(g, [5, 24, 30, 24, 46, 28, 68, 28], '#f8fafc', 2.4);
          kgRoda(g, 14, 33, 5.5);
          kgRoda(g, 24, 33, 5.5);
          kgRoda(g, 56, 33, 5.5);
        }
      },
      {
        k: 'mini',
        nama: 'Minibus',
        g: function (g) {
          kgRR(g, 8, 13, 56, 20, 6, '#0ea5e9');
          kgKaca(g, [12, 16, 24, 16, 24, 23, 12, 23]);
          kgKaca(g, [27, 16, 40, 16, 40, 23, 27, 23]);
          kgKaca(g, [43, 16, 54, 16, 60, 23, 43, 23]);
          kgL(g, [12, 11, 52, 11], '#334155', 2);
          kgRoda(g, 20, 33, 5.5);
          kgRoda(g, 52, 33, 5.5);
        }
      }
    ]
  },
  {
    k: 'truk',
    nama: 'Truk',
    model: [
      {
        k: 'boks',
        nama: 'Boks',
        g: function (g) {
          kgRR(g, 3, 7, 44, 26, 2, '#e5e7eb');
          kgRR(g, 3, 7, 44, 4, 1, '#94a3b8');
          kgRR(g, 49, 15, 19, 18, 4, '#f97316');
          kgKaca(g, [56, 17, 64, 17, 66, 24, 56, 24]);
          kgRoda(g, 14, 33, 5.5);
          kgRoda(g, 28, 33, 5.5);
          kgRoda(g, 58, 33, 5.5);
        }
      },
      {
        k: 'tangki',
        nama: 'Tangki',
        g: function (g) {
          kgRR(g, 3, 12, 44, 18, 9, '#cbd5e1');
          kgRR(g, 3, 19, 44, 3, 0, '#ef4444');
          kgRR(g, 49, 15, 19, 18, 4, '#dc2626');
          kgKaca(g, [56, 17, 64, 17, 66, 24, 56, 24]);
          kgRoda(g, 14, 33, 5.5);
          kgRoda(g, 28, 33, 5.5);
          kgRoda(g, 58, 33, 5.5);
        }
      },
      {
        k: 'bak',
        nama: 'Bak',
        g: function (g) {
          kgP(g, [3, 13, 47, 13, 45, 30, 5, 30], '#eab308');
          kgP(g, [8, 13, 20, 7, 34, 9, 44, 13], '#92400e');
          kgRR(g, 49, 15, 19, 18, 4, '#16a34a');
          kgKaca(g, [56, 17, 64, 17, 66, 24, 56, 24]);
          kgRoda(g, 14, 33, 5.5);
          kgRoda(g, 28, 33, 5.5);
          kgRoda(g, 58, 33, 5.5);
        }
      }
    ]
  },
  {
    k: 'kereta',
    nama: 'Kereta',
    model: [
      {
        k: 'lokomotif',
        nama: 'Kereta api',
        g: function (g) {
          kgRR(g, 1, 14, 30, 19, 3, '#f8fafc');
          for (var i = 0; i < 3; i++) kgRR(g, 4 + i * 9, 17, 6, 6, 1, '#93c5fd');
          kgRR(g, 1, 26, 30, 3, 0, '#2563eb');
          kgRR(g, 34, 11, 36, 22, 3, '#f97316');
          kgKaca(g, [59, 14, 67, 14, 69, 21, 59, 21]);
          kgRR(g, 34, 26, 36, 3, 0, '#1f2937');
          [6, 24, 40, 64].forEach(function (x) {
            kgRoda(g, x, 35, 3.5);
          });
          kgL(g, [0, 39, 72, 39], '#64748b', 1.5);
        }
      },
      {
        k: 'krl',
        nama: 'KRL',
        g: function (g) {
          kgRR(g, 1, 11, 34, 22, 4, '#f8fafc');
          kgRR(g, 37, 11, 34, 22, 6, '#f8fafc');
          kgRR(g, 1, 25, 70, 3, 0, '#dc2626');
          for (var i = 0; i < 3; i++) kgRR(g, 5 + i * 10, 14, 7, 8, 1, '#93c5fd');
          for (i = 0; i < 2; i++) kgRR(g, 41 + i * 10, 14, 7, 8, 1, '#93c5fd');
          kgKaca(g, [61, 14, 66, 14, 69, 22, 61, 22]);
          [7, 28, 43, 64].forEach(function (x) {
            kgRoda(g, x, 35, 3.5);
          });
          kgL(g, [0, 39, 72, 39], '#64748b', 1.5);
        }
      },
      {
        k: 'cepat',
        nama: 'Kereta cepat',
        g: function (g) {
          kgP(g, [1, 13, 44, 13, 60, 16, 70, 27, 70, 31, 1, 31], '#f8fafc');
          kgP(g, [1, 24, 66, 24, 70, 29, 1, 29], '#dc2626');
          kgKaca(g, [50, 15, 60, 17, 64, 21, 52, 21]);
          for (var i = 0; i < 4; i++) kgRR(g, 5 + i * 10, 16, 7, 5, 1, '#93c5fd');
          [8, 26, 44, 60].forEach(function (x) {
            kgRoda(g, x, 34, 3);
          });
          kgL(g, [0, 38, 72, 38], '#64748b', 1.5);
        }
      }
    ]
  },
  {
    k: 'perahu',
    nama: 'Perahu',
    model: [
      {
        k: 'motor',
        nama: 'Perahu motor',
        g: function (g) {
          kgP(g, [4, 26, 68, 22, 62, 35, 12, 35], '#b45309');
          kgL(g, [8, 27, 66, 23], '#fde68a', 1.6);
          kgRR(g, 2, 18, 5, 10, 1.5, '#111827');
          kgOrang(g, 14, 25, '#ef4444', '#f2c6a0');
          kgOmbak(g);
        }
      },
      {
        k: 'speedboat',
        nama: 'Speedboat',
        g: function (g) {
          kgP(g, [6, 22, 52, 22, 70, 27, 60, 34, 10, 34], '#f8fafc');
          kgP(g, [6, 29, 64, 29, 60, 34, 10, 34], '#2563eb');
          kgKaca(g, [36, 22, 42, 15, 48, 15, 46, 22]);
          kgRR(g, 3, 20, 5, 9, 1.5, '#111827');
          kgOmbak(g);
        }
      },
      {
        k: 'layar',
        nama: 'Kapal layar',
        g: function (g) {
          kgP(g, [6, 28, 66, 28, 58, 35, 14, 35], '#92400e');
          kgL(g, [36, 28, 36, 3], '#334155', 2);
          kgP(g, [37, 4, 37, 26, 58, 26], '#f8fafc');
          kgP(g, [35, 8, 35, 26, 18, 26], '#fde68a');
          kgOmbak(g);
        }
      },
      {
        k: 'sampan',
        nama: 'Sampan',
        g: function (g) {
          kgP(g, [8, 29, 64, 29, 58, 35, 14, 35], '#a16207');
          kgOrang(g, 34, 28, '#16a34a', '#f2c6a0');
          kgL(g, [46, 14, 30, 38], '#7c2d12', 2);
          kgOmbak(g);
        }
      }
    ]
  },
  {
    k: 'kapal',
    nama: 'Kapal',
    model: [
      {
        k: 'feri',
        nama: 'Feri',
        g: function (g) {
          kgP(g, [2, 24, 70, 24, 64, 35, 8, 35], '#1d4ed8');
          kgRR(g, 10, 15, 52, 9, 2, '#f8fafc');
          kgRR(g, 18, 8, 34, 7, 2, '#f8fafc');
          for (var i = 0; i < 6; i++) kgRR(g, 13 + i * 8, 18, 5, 3, 1, '#1e3a8a');
          kgRR(g, 40, 2, 6, 6, 1, '#ef4444');
          kgOmbak(g);
        }
      },
      {
        k: 'pesiar',
        nama: 'Kapal pesiar',
        g: function (g) {
          kgP(g, [2, 22, 70, 22, 64, 35, 6, 35], '#f8fafc');
          kgRR(g, 8, 14, 54, 8, 2, '#f8fafc');
          kgRR(g, 14, 7, 40, 7, 2, '#f8fafc');
          kgL(g, [4, 28, 66, 28], '#1e3a8a', 2);
          for (var r = 0; r < 3; r++) for (var i = 0; i < 9; i++) kgC(g, 12 + i * 6 - r * 2, 9.5 + r * 7, 1.1, '#0ea5e9');
          kgRR(g, 46, 1, 6, 6, 1, '#1d4ed8');
          kgOmbak(g);
        }
      },
      {
        k: 'kargo',
        nama: 'Kargo',
        g: function (g) {
          kgP(g, [2, 24, 70, 24, 66, 35, 8, 35], '#7f1d1d');
          var w = ['#2563eb', '#f97316', '#16a34a', '#eab308', '#dc2626', '#0ea5e9'];
          for (var i = 0; i < 6; i++) {
            kgRR(g, 6 + i * 8, 17, 7, 7, 0.5, w[i]);
            if (i % 2 === 0) kgRR(g, 6 + i * 8, 10, 7, 7, 0.5, w[(i + 3) % 6]);
          }
          kgRR(g, 56, 9, 10, 15, 1.5, '#f8fafc');
          kgKaca(g, [57, 11, 65, 11, 65, 14, 57, 14]);
          kgOmbak(g);
        }
      }
    ]
  },
  {
    k: 'pesawat',
    nama: 'Pesawat',
    model: [
      {
        k: 'jet',
        nama: 'Jet',
        g: function (g) {
          kgP(g, [6, 6, 13, 6, 22, 18, 12, 18], '#2563eb');
          kgRR(g, 4, 17, 64, 9, 4.5, '#f8fafc');
          kgP(g, [60, 17, 70, 21, 60, 26], '#f8fafc');
          kgP(g, [28, 22, 44, 22, 34, 34, 26, 34], '#cbd5e1');
          kgRR(g, 30, 26, 10, 4, 2, '#64748b');
          for (var i = 0; i < 9; i++) kgC(g, 18 + i * 4.5, 20, 1, '#1e3a8a');
          kgKaca(g, [61, 19, 66, 19, 66, 21, 62, 21]);
        }
      },
      {
        k: 'baling',
        nama: 'Baling-baling',
        g: function (g) {
          kgP(g, [6, 8, 12, 8, 18, 18, 10, 18], '#dc2626');
          kgRR(g, 6, 17, 56, 9, 4, '#facc15');
          kgRR(g, 22, 13, 30, 4, 2, '#dc2626');
          kgC(g, 63, 21.5, 2, '#334155');
          kgL(g, [64, 12, 64, 31], '#334155', 1.6);
          kgKaca(g, [46, 17, 54, 17, 56, 21, 46, 21]);
          kgL(g, [36, 26, 36, 32], '#334155', 1.4);
          kgRoda(g, 36, 33, 2.4);
        }
      },
      {
        k: 'pribadi',
        nama: 'Jet pribadi',
        g: function (g) {
          kgP(g, [8, 6, 18, 6, 18, 9, 12, 9, 16, 19, 10, 19], '#111827');
          kgRR(g, 8, 18, 58, 7, 3.5, '#f8fafc');
          kgP(g, [58, 18, 70, 21.5, 58, 25], '#f8fafc');
          kgRR(g, 14, 14, 12, 5, 2.5, '#94a3b8');
          kgP(g, [32, 22, 44, 22, 38, 30, 32, 30], '#cbd5e1');
          for (var i = 0; i < 4; i++) kgC(g, 32 + i * 5, 20.5, 1, '#1e3a8a');
          kgKaca(g, [60, 19.5, 65, 20.5, 60, 21.5]);
        }
      },
      {
        k: 'heli',
        nama: 'Helikopter',
        g: function (g) {
          kgL(g, [10, 7, 66, 7], '#334155', 2);
          kgL(g, [42, 7, 42, 12], '#334155', 2.4);
          kgRR(g, 30, 11, 30, 16, 8, '#dc2626');
          kgKaca(g, [48, 13, 56, 14, 59, 21, 48, 21]);
          kgL(g, [4, 15, 30, 18], '#dc2626', 3.2);
          kgL(g, [3, 11, 5, 19], '#334155', 1.6);
          kgL(g, [34, 27, 34, 31, 56, 31, 56, 27], '#334155', 1.8);
          kgL(g, [28, 31, 62, 31], '#334155', 2);
        }
      }
    ]
  },
  {
    k: 'tradisional',
    nama: 'Tradisional',
    model: [
      {
        k: 'becak',
        nama: 'Becak',
        g: function (g) {
          kgRodaTipis(g, 16, 30, 8);
          kgRodaTipis(g, 56, 32, 6);
          kgRR(g, 6, 16, 22, 12, 3, '#dc2626');
          kgP(g, [4, 16, 8, 6, 26, 6, 30, 16], '#16a34a');
          kgL(g, [28, 26, 56, 32, 50, 18], '#334155', 2.4);
          kgOrang(g, 48, 18, '#2563eb', '#f2c6a0');
        }
      },
      {
        k: 'bajaj',
        nama: 'Bajaj',
        g: function (g) {
          kgRoda(g, 18, 33, 5);
          kgRoda(g, 54, 33, 5);
          kgP(g, [10, 32, 10, 14, 22, 8, 50, 8, 62, 22, 62, 32], '#ea580c');
          kgKaca(g, [48, 11, 58, 22, 48, 22]);
          kgRR(g, 14, 12, 14, 12, 2, '#1f2937');
          kgOrang(g, 40, 24, '#16a34a', '#f2c6a0');
        }
      },
      {
        k: 'delman',
        nama: 'Delman',
        g: function (g) {
          kgRodaTipis(g, 18, 29, 9, 2);
          kgRR(g, 6, 14, 26, 8, 2, '#b45309');
          kgP(g, [4, 14, 8, 6, 30, 6, 34, 14], '#facc15');
          kgL(g, [32, 18, 48, 20], '#78350f', 2);
          kgRR(g, 44, 14, 18, 10, 5, '#78350f');
          kgL(g, [60, 16, 66, 8], '#78350f', 5);
          kgC(g, 67, 8, 3, '#78350f');
          [47, 51, 56, 60].forEach(function (x, i) {
            kgL(g, [x, 23, x + (i % 2 ? 2 : -2), 37], '#78350f', 2.2);
          });
        }
      }
    ]
  }
];
/* Arti nilai tersimpan → { jenis, model } (nilai lama atau tak dikenal: model pertama dari jenisnya / null) */
function kendUrai(v) {
  var p = String(v || '').split(':'),
    j = null,
    m = null;
  for (var i = 0; i < KEND_JENIS.length; i++) if (KEND_JENIS[i].k === p[0]) j = KEND_JENIS[i];
  if (!j) return null;
  for (i = 0; i < j.model.length; i++) if (j.model[i].k === p[1]) m = j.model[i];
  return { jenis: j, model: m || j.model[0], nilai: j.k + ':' + (m || j.model[0]).k };
}
function kendNama(v) {
  var u = kendUrai(v);
  if (!u) return '';
  return u.model.nama === u.jenis.nama ? u.jenis.nama : u.jenis.nama + ' · ' + u.model.nama;
}
/* Gambar kendaraan (cache). arah -1 = dicerminkan (bergerak ke barat). */
var kendCache = {};
function kendKanvas(v, arah, skala) {
  var u = kendUrai(v) || kendUrai('mobil');
  skala = skala || 2;
  var kunci = u.nilai + (arah < 0 ? '<' : '>') + skala;
  if (kendCache[kunci]) return kendCache[kunci];
  var cv = document.createElement('canvas');
  cv.width = 76 * skala;
  cv.height = 48 * skala;
  var g = cv.getContext('2d');
  g.scale(skala, skala);
  g.translate(2, 2);
  if (arah < 0) {
    g.translate(72, 0);
    g.scale(-1, 1);
  }
  g.shadowColor = 'rgba(0,0,0,.55)';
  g.shadowBlur = 3;
  g.shadowOffsetY = 1; /* tetap terlihat di atas citra satelit */
  try {
    u.model.g(g);
  } catch (e) {}
  kendCache[kunci] = cv;
  return cv;
}
var kendURLCache = {};
function kendGambarURL(v) {
  var u = kendUrai(v) || kendUrai('mobil');
  if (!kendURLCache[u.nilai]) {
    try {
      kendURLCache[u.nilai] = kendKanvas(u.nilai, 1, 2).toDataURL('image/png');
    } catch (e) {
      kendURLCache[u.nilai] = '';
    }
  }
  return kendURLCache[u.nilai];
}
function kendImg(v, kelas) {
  return '<img class="' + (kelas || 'kend-img') + '" src="' + kendGambarURL(v) + '" alt="' + esc(kendNama(v)) + '">';
}
