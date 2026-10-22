# Hasil verifikasi — 22 Oktober 2026

Versi VPS disiapkan di `mtq_duplikasi`. Proyek sumber `2026_MTQ` tidak diedit oleh pekerjaan ini. Database dan objek produksi belum diekspor atau dipindahkan.

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript, build React/Vite, build backend Express | Lulus melalui `npm run build` |
| Integrasi Express + Prisma + MySQL 8.4 | 9 tes lulus, 0 gagal, 0 dilewati; mencakup 8 skenario di bawah satu pengujian induk |
| Audit dependency | Audit npm setelah pembaruan: 0 kerentanan; audit dependency runtime akhir juga 0 |
| Dockerfile | Berhasil dibangun pada Docker lokal Linux arm64 |
| Compose | Konfigurasi valid, MySQL sehat, migrasi berhasil, seed berhasil, aplikasi sehat |
| Health aplikasi dalam container | HTTP 200, `{"status":"ok"}` |
| Backup | Dump SQL, arsip dua direktori penyimpanan, dan salinan konfigurasi berhasil dibuat; aplikasi dinyalakan kembali oleh script |
| Impor data lama | Ekspor SQLite baca-saja ke JSON, kemudian impor 1 peserta fixture ke MySQL Compose berhasil |
| Restore database | Dump backup memulihkan jumlah peserta dari 1 fixture kembali ke 0 sesuai titik backup |
| Restore berkas | Penyalinan direktori unggahan dan perintah izin pada volume berhasil; arsip uji berisi direktori kosong |
| Browser | Beranda dan formulir tampil; login admin, navigasi pengaturan, pratinjau, serta simpan pengaturan berhasil |

Pengujian integrasi meliputi perlindungan origin, autentikasi admin/viewer, pembatasan hak tulis, validasi isi berkas, pendaftaran bersamaan, kerahasiaan dokumen, ekspor CSV, audit perubahan status, unggahan aset acara, scope dan pencabutan/rotasi kunci API, penyembunyian data, konflik revisi pengaturan, klaim peserta secara atomik, sesi peserta lokal, serta penyalinan dan pengaktifan acara.

Pengujian browser belum mencakup seluruh tahapan formulir sampai submit. Login Google langsung memerlukan kredensial OAuth milik pengelola dan belum diuji. Pemasangan Nginx, penerbitan sertifikat untuk domain nyata, kapasitas beban VPS, dan kelengkapan data produksi perlu diperiksa pada lingkungan tujuan.

Bukti penyimpanan pengaturan dengan data uji:

![Pengaturan tersimpan](test-results/pengaturan-tersimpan.png)
