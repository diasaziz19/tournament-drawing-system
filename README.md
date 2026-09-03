# 🏆 Online Tournament Drawing & Management System

Sistem Pengundian (*Live Drawing*) & Manajemen Turnamen Olahraga (Minisoccer, Futsal, Sepak Bola) multi-user dengan sinkronisasi realtime berbasis **Next.js (App Router, TypeScript)**, **Tailwind CSS**, **Framer Motion**, dan **Google Cloud Firebase (Firestore & Auth)**.

Aplikasi ini dirancang sebagai **sistem terpisah (*isolated standalone micro-app*)** yang siap di-hosting di **Vercel**, dan terkoneksi ke Firebase secara aman tanpa mengganggu atau menimpa database turnamen yang saat ini sedang berjalan.

---

## 🌟 Keunggulan & Fitur Utama

1. **Zero Database Conflict (Aman 100% dari Crash Kompetisi Berjalan)**:
   - Database kompetisi lama tersimpan di `tournament_data/main`.
   - Sistem drawing baru ini menggunakan skema modular multi-tenant:
     - `tournaments/{tournamentId}`
     - `tournaments/{tournamentId}/teams`
     - `tournaments/{tournamentId}/matches`
     - `tournaments/{tournamentId}/groups`
     - `tournaments/{tournamentId}/drawing_sessions`
   - Kedua sistem berjalan paralel di Firebase yang sama tanpa risiko interferensi!

2. **Knockout Bracket Tree Balancing (Jumlah Tim Fleksibel / Non-Power of Two)**:
   - Mendukung tim ganjil/irregular (misal: 17, 18, 19, 21 tim).
   - Secara matematis menghitung babak playoff pendahuluan dan direct Bye menuju 16 Besar ($2^n$).
   - Contoh untuk 18 tim:
     - 2 Pertandingan Playoff (4 tim terbawah/pot 3).
     - 14 Tim langsung Bye ke 16 Besar (Tim Unggulan / Pot 1 & 2).
     - 14 Bye + 2 Pemenang Playoff = Tepat 16 Tim di Babak 16 Besar!
   - Otomatis membuat pertandingan **Perebutan Juara 3** untuk tim yang gugur di semifinal.

3. **Schedule Rest Engine (Aturan Maksimal 1 Laga/Hari per Tim)**:
   - Menjamin kepatuhan regulasi: Tidak ada tim yang bermain lebih dari 1 kali dalam satu hari kalender.
   - Pemenang playoff (Hari ke-1) tidak akan dijadwalkan bertanding di babak 16 besar pada hari yang sama (dijadwalkan ke Hari ke-2).

4. **Berger Round-Robin Engine (Setengah & Penuh Kompetisi)**:
   - Algoritma Circle / Berger untuk babak grup dengan rotasi Home & Away yang adil.
   - Tabel klasemen otomatis realtime: Poin ($W=3, D=1, L=0$), Selisih Gol, Gol Masuk, dan Head-to-Head tie-breaker.

5. **Cloud-Synced Live Drawing Presentation Mode**:
   - Mode Layar Penuh (16:9 Cinema Presenter) untuk proyektor Technical Meeting & Zoom Screen Share.
   - Animasi dramatis bola undian / velvet mystery card dengan **Framer Motion** dan efek audio sintetis Web Audio API.
   - Kontrol Admin: Ambil undian berikutnya, filter pot, validasi benturan departemen/fakultas yang sama (*Department Protection*), dan kunci slot.
   - Sinkronisasi realtime otomatis ke seluruh layar penonton via Firestore `onSnapshot`.

6. **Reporting & Export Suite**:
   - Ekspor jadwal pertandingan lengkap ke file Excel / CSV.
   - Ekspor daftar tim peserta ke file CSV.
   - Tampilan cetak PDF A4 Landscape siap pakai (`@media print`).

---

## 🚀 Panduan Deploy ke Vercel (Production)

1. **Inisialisasi Git & Push ke GitHub**:
   ```bash
   cd /Users/diasaziz/.gemini/antigravity/scratch/tournament-drawing-system
   git init
   git add .
   git commit -m "feat: initial release tournament drawing & management system"
   git branch -M main
   git remote add origin https://github.com/USERNAME/tournament-drawing-system.git
   git push -u origin main
   ```

2. **Impor ke Vercel**:
   - Buka [Vercel Dashboard](https://vercel.com/new).
   - Hubungkan repositori GitHub `tournament-drawing-system`.
   - Pada bagian **Environment Variables**, tambahkan:
     - `NEXT_PUBLIC_FIREBASE_API_KEY` = `AIzaSyB5ggfDs3r3hdzQGGrteiZtW4vFgWVtVCI`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `dies-natalis-ums-2026.firebaseapp.com`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `dies-natalis-ums-2026`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `dies-natalis-ums-2026.firebasestorage.app`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = `912617266657`
     - `NEXT_PUBLIC_FIREBASE_APP_ID` = `1:912617266657:web:c6d163bd67cd5b83e506a0`
   - Klik **Deploy**. Dalam 1-2 menit, aplikasi sudah aktif dengan URL publik HTTPS!

---

## 🛡️ Menerapkan Firestore Security Rules

File `firestore.rules` sudah siap di root proyek.
Untuk menerapkan rules ke Google Firebase Console:
1. Buka [Firebase Console](https://console.firebase.google.com/project/dies-natalis-ums-2026/firestore/rules).
2. Salin isi file `firestore.rules`.
3. Klik **Publish**.
4. Rules ini memberikan akses publik untuk membaca (*spectator viewing*) dan membatasi aksi perubahan/skor hanya kepada panitia turnamen.

---

## 📁 Struktur Proyek

```
tournament-drawing-system/
├── firestore.rules                         # Aturan keamanan database Firestore
├── package.json                            # Dependensi Next.js, Firebase, Framer Motion, Lucide
├── tsconfig.json                           # Konfigurasi TypeScript
├── tailwind.config.js                      # Desain & styling Tailwind
├── next.config.mjs                         # Pengaturan Next.js App Router
├── .env.example                            # Variabel lingkungan Firebase
├── .env.local                              # Kredensial lokal
└── src/
    ├── types/
    │   └── tournament.ts                   # Model data TypeScript (Tournament, Team, Match, Group, Session)
    ├── lib/
    │   ├── firebase.ts                     # Inisialisasi Firebase Client SDK
    │   ├── firestore-converters.ts         # Data converters & Firestore sync service
    │   ├── export-utils.ts                 # Generator CSV & trigger cetak PDF
    │   └── engines/
    │       ├── knockout-engine.ts          # Algoritma bagan gugur, playoff non-2^n, schedule rest constraint
    │       └── round-robin-engine.ts       # Algoritma Berger rotasi circle & klasemen otomatis
    ├── components/
    │   ├── drawing/
    │   │   └── LiveDrawingPresenter.tsx    # Presenter mode undian proyektor, animasi kartu/bola & admin dock
    │   ├── bracket/
    │   │   ├── BracketTreeVisualizer.tsx   # Visualisasi bagan interaktif (Playoff, 16 Besar, QF, SF, Final, 3rd)
    │   │   └── MatchScoreModal.tsx         # Modal input skor panitia & penalti auto-advance
    │   ├── schedule/
    │   │   └── ScheduleMatrix.tsx          # Matriks jadwal harian per lapangan
    │   ├── setup/
    │   │   └── TeamBatchImporter.tsx       # Impor massal tim via CSV/teks & pembagian pot
    │   └── groups/
    │       └── GroupStageVisualizer.tsx    # Tampilan klasemen & jadwal babak grup
    └── app/
        ├── layout.tsx                      # Root layout Next.js
        ├── globals.css                     # Styling global & media print
        └── page.tsx                        # Halaman utama studio turnamen
```
