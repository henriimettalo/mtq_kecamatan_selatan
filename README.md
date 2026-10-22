# MTQ VPS

Migrasi aplikasi `2026_MTQ` ke React + Tailwind CSS, Express.js di Node.js, Prisma ORM, dan MySQL. Database dan berkas unggahan disimpan pada VPS melalui volume Docker. Folder sumber `2026_MTQ` tidak diubah dan data produksi belum dipindahkan.

Mulai dari [panduan instalasi VPS](PANDUAN_INSTALASI_VPS.md). Panduan mencakup domain/HTTPS, akun admin, migrasi data lama, backup, restore, dan pengembangan lokal.

- `client/`: halaman React, formulir pendaftaran, panel admin, dan pengaturan acara.
- `server/`: API Express, autentikasi, validasi, otorisasi, dan penyimpanan berkas privat.
- `shared/`: aturan usia, cabang, validasi dan tipe bersama.
- `prisma/`: skema MySQL, migrasi dan seed.
- `deploy/`: konfigurasi Nginx.
- `scripts/`: pembuat kredensial, backup dan pemindahan data lama.

Login peserta Google bersifat opsional dan memerlukan kredensial OAuth sendiri. Tanpa kredensial Google, pendaftaran tetap tersedia tanpa login, sedangkan riwayat akun peserta memerlukan login Google. Kunci integrasi dibuat melalui panel admin; sandi admin tidak berlaku sebagai kunci API.
