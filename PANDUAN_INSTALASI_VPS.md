# Instalasi MTQ di VPS

Versi ini memakai React + Tailwind CSS, Node.js + Express.js, Prisma ORM, dan MySQL. Semua proses aplikasi, database, dokumen peserta, serta aset unggahan berjalan di VPS. Nginx menangani domain dan HTTPS. Tidak ada ketergantungan runtime pada Cloudflare Workers, D1, R2, atau Next.js.

Panduan utama memakai Ubuntu 24.04 LTS dan Docker Compose. Siapkan domain yang dapat diarahkan ke IP VPS dan akses SSH dengan sudo. Perkiraan awal untuk aplikasi dan database dalam satu VPS: 2 vCPU, RAM 4 GB, SSD 40 GB atau lebih. Ini perkiraan untuk memulai, bukan jaminan kapasitas; kebutuhan disk terutama mengikuti jumlah dan ukuran dokumen peserta.

## 1. Arahkan domain

Tambahkan DNS record A, misalnya `mtq.domain-anda.id`, ke IPv4 publik VPS. Tambahkan AAAA hanya jika IPv6 VPS sudah dikonfigurasi. Gunakan domain milik Anda pada semua contoh `mtq.example.com` di bawah.

## 2. Pasang Docker, Nginx, dan Certbot

Masuk melalui SSH, lalu jalankan pada VPS Ubuntu baru:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl nginx certbot python3-certbot-nginx
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker nginx
sudo docker compose version
```

Perintah ini mengikuti [instalasi Docker resmi untuk Ubuntu](https://docs.docker.com/engine/install/ubuntu/). Jika VPS sudah berisi aplikasi lain, periksa port dan konfigurasi Nginx yang sudah digunakan sebelum memasang konfigurasi MTQ.

Buka TCP 22, 80, dan 443 di firewall penyedia VPS. Aplikasi hanya memublikasikan port 3000 ke `127.0.0.1`; MySQL tidak memublikasikan port. Akses publik menggunakan Nginx pada port 80/443.

## 3. Kirim proyek ke VPS

Dari komputer Anda, di folder `mtq_duplikasi`:

```bash
rsync -av --exclude=node_modules --exclude=.env --exclude=storage --exclude=backups --exclude=dist --exclude=dist-server ./ namauser@IP_VPS:~/mtq-vps/
```

Pada VPS:

```bash
sudo mkdir -p /opt/mtq
sudo rsync -a ~/mtq-vps/ /opt/mtq/
cd /opt/mtq
sudo cp .env.example .env
sudo docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node scripts/credentials.mjs
sudo chmod 600 .env
sudo nano .env
```

Simpan sandi admin yang ditampilkan generator di pengelola sandi. Yang tersimpan di `.env` adalah hash sandi admin. Generator juga mengisi rahasia sesi dan sandi database acak. Mengulang generator mempertahankan nilai yang sudah terisi.

Ubah paling sedikit:

```dotenv
APP_URL=https://mtq.domain-anda.id
```

`APP_URL` harus sama persis dengan origin yang dipakai pengunjung, tanpa path. Nilai ini dipakai untuk cookie dan perlindungan permintaan lintas situs. Untuk Compose, biarkan hostname database `db`, `UPLOAD_DIR=/app/storage/uploads`, dan `ASSET_DIR=/app/storage/event-assets`.

Untuk mengaktifkan akun hanya lihat:

```bash
sudo docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node scripts/credentials.mjs --viewer
```

Perintah `--viewer` membuat sandi viewer baru setiap kali dijalankan. Jangan membagikan isi `.env`.

## 4. Build, migrasi, dan mulai aplikasi

```bash
cd /opt/mtq
sudo docker compose build app
sudo docker compose up -d --wait db
sudo docker compose run --rm app npm run db:migrate
sudo docker compose run --rm app npm run db:seed
sudo docker compose up -d --wait app
sudo docker compose ps
curl --fail http://127.0.0.1:3000/api/health
```

Respons health yang diharapkan: `{"status":"ok"}`. Migrasi membuat tabel melalui Prisma; seed menambahkan acara awal tanpa menimpa pengaturan yang sudah ada. Acara awal mengikuti konfigurasi proyek asal, termasuk tanggal penutupan. Sesuaikan status dan tanggal pendaftaran di panel admin sebelum mengumumkan situs.

Database berada di volume `mysql_data`; dokumen di `uploads`; aset logo/template unggahan di `event_assets`. `docker compose down` mempertahankan volume. **Jangan gunakan `docker compose down -v` pada server berisi data**, karena opsi itu menghapus volume.

## 5. Pasang domain dan HTTPS di Nginx

```bash
cd /opt/mtq
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mtq
sudo nano /etc/nginx/sites-available/mtq
```

Ganti `server_name mtq.example.com;` dengan domain Anda. Selanjutnya:

```bash
sudo ln -s /etc/nginx/sites-available/mtq /etc/nginx/sites-enabled/mtq
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d mtq.domain-anda.id
sudo certbot renew --dry-run
```

Pilih pengalihan HTTP ke HTTPS jika diminta. Certbot memerlukan DNS yang sudah menuju VPS dan port 80 yang dapat diakses. Jika nama symlink sudah ada, periksa apakah mengarah ke konfigurasi MTQ sebelum melanjutkan.

Buka:

- `https://mtq.domain-anda.id/` untuk beranda.
- `https://mtq.domain-anda.id/admin/login` untuk admin.
- `https://mtq.domain-anda.id/admin/pengaturan` untuk identitas, cabang, jadwal, dan pembukaan pendaftaran.
- `https://mtq.domain-anda.id/admin/api-keys` untuk membuat kunci API integrasi.

API tidak menggunakan sandi admin sebagai kunci cadangan. Buat kunci tersendiri dengan hak akses yang diperlukan.

## 6. Login peserta dengan Google, jika digunakan

Google login bersifat opsional. Bila diaktifkan, Google hanya menyediakan verifikasi identitas; backend, sesi login, dan seluruh data MTQ tetap disimpan di VPS. Bila Anda tidak ingin memakai layanan login eksternal, kosongkan kedua variabel Google. Pendaftaran tetap tersedia tanpa login; halaman riwayat akun peserta memerlukan Google seperti alur proyek asal.

Pada Google Cloud Console, buat OAuth client jenis Web application dan tambahkan redirect URI:

```text
https://mtq.domain-anda.id/api/auth/google/callback
```

Isi `.env`:

```dotenv
GOOGLE_CLIENT_ID=client-id-anda
GOOGLE_CLIENT_SECRET=client-secret-anda
```

Lalu terapkan konfigurasi:

```bash
sudo docker compose up -d --force-recreate app
```

Uji dengan akun Google yang diizinkan oleh konfigurasi consent screen Anda. Google login langsung tidak dapat diverifikasi tanpa client ID/secret milik Anda.

## 7. Memindahkan data lama

Instalasi baru tidak otomatis menyalin data produksi. Proyek sumber tidak diubah. Jika situs lama sudah menerima pendaftaran, jadwalkan penghentian penulisan pada situs lama saat mengambil ekspor database dan berkas final agar tidak ada pendaftaran yang tertinggal.

### Dari SQLite lokal atau ekspor D1

Ambil database yang benar-benar berisi data terbaru. Folder `data/mtq.db` lokal dapat berbeda dari D1 produksi. Jika sumber D1 produksi, ekspor melalui Cloudflare Dashboard atau Wrangler di proyek lama:

```bash
npx wrangler d1 export mtq-db --remote --output=/lokasi/privat/mtq-d1.sql
sqlite3 /lokasi/privat/mtq-legacy.db < /lokasi/privat/mtq-d1.sql
```

Jalankan eksportir baca-saja dari proyek baru:

```bash
python3 scripts/export-sqlite.py /lokasi/privat/mtq-legacy.db /lokasi/privat/legacy.json
```

Eksportir tidak menyalin sesi login lama. Transfer `legacy.json` melalui SSH ke direktori privat di VPS. Impor hanya ke database tujuan baru tanpa peserta dan kunci API:

```bash
cd /opt/mtq
sudo docker compose stop app
sudo cat /lokasi/privat/legacy.json | sudo docker compose run --rm -T app node_modules/.bin/tsx scripts/import-legacy.ts -
```

Impor mempertahankan ID, token bukti pendaftaran, event, kunci API, dan catatan audit yang tersedia. Konflik skema/data membatalkan transaksi; periksa pesan impor sebelum melanjutkan. Sesi peserta harus dibuat ulang melalui login. Impor bukan perintah sinkronisasi berkala.

### Dokumen peserta dan aset acara

Ekspor **seluruh** objek bucket R2 lama melalui alat ekspor/S3 yang Anda gunakan. Pertahankan key dan subdirektorinya, termasuk spasi pada nama berkas. Salin dokumen ke direktori `uploads`; key aset acara yang diawali `event-assets/` ditempatkan pada direktori `event-assets` tanpa menggandakan awalan. Periksa URL aset di pengaturan acara; aset lama yang namanya tidak memakai UUID perlu diunggah ulang melalui panel pengaturan versi VPS.

Untuk menyalin hasil ekspor yang sudah disiapkan di VPS:

```bash
sudo docker compose cp /lokasi/privat/uploads/. app:/app/storage/uploads/
sudo docker compose cp /lokasi/privat/event-assets/. app:/app/storage/event-assets/
sudo docker compose run --rm --no-deps --user 0 --cap-add CHOWN --cap-add DAC_OVERRIDE app sh -c 'chown -R node:node /app/storage/uploads /app/storage/event-assets'
sudo docker compose up -d --wait app
```

Sebelum memindahkan domain, cocokkan jumlah peserta per acara, status, cabang, token bukti, dan sampel dokumen pada kedua sistem. Berkas sumber lokal tidak membuktikan bahwa seluruh objek R2 produksi sudah tersalin. Uji login Google lagi karena callback origin berubah mengikuti domain.

## 8. Backup dan pemulihan

Backup menghentikan aplikasi sementara agar dump MySQL dan berkas berasal dari titik yang konsisten. Database tetap hidup. Script akan mencoba menyalakan aplikasi kembali saat selesai atau gagal.

```bash
cd /opt/mtq
sudo bash scripts/backup.sh
```

Setiap direktori backup berisi `database.sql`, `storage.tar.gz`, dan `environment.env`. Backup memuat data pribadi dan rahasia aplikasi; batasi aksesnya. Salin cadangan ke tempat terpisah dari disk VPS agar masih tersedia bila disk server hilang.

Pemulihan sebaiknya diuji pada VPS/database baru. Untuk pemulihan yang memang dimaksudkan mengganti keadaan aplikasi saat ini, gunakan backup dari versi kode yang sama, lalu:

```bash
cd /opt/mtq
sudo docker compose stop app
sudo docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"' < /lokasi/backup/database.sql
sudo mkdir -p /lokasi/restore-storage
sudo tar -xzf /lokasi/backup/storage.tar.gz -C /lokasi/restore-storage
sudo docker compose cp /lokasi/restore-storage/uploads/. app:/app/storage/uploads/
sudo docker compose cp /lokasi/restore-storage/event-assets/. app:/app/storage/event-assets/
sudo docker compose run --rm --no-deps --user 0 --cap-add CHOWN --cap-add DAC_OVERRIDE app sh -c 'chown -R node:node /app/storage/uploads /app/storage/event-assets'
sudo docker compose up -d --wait app
```

Gunakan direktori restore baru dan volume penyimpanan baru jika memerlukan pemulihan persis, karena penyalinan ke volume lama tidak menghapus berkas tambahan yang sudah ada. Jangan menimpa `.env` aktif tanpa mencocokkan sandi database yang benar; mengganti variabel sandi tidak mengubah sandi pada volume MySQL yang sudah dibuat. Simpan `SESSION_SECRET` untuk mempertahankan sesi yang masih berlaku, atau ganti untuk membatalkan sesi admin.

## 9. Pembaruan dan pemeriksaan

Ambil backup dahulu, transfer perubahan kode tanpa `.env` dan data, lalu:

```bash
cd /opt/mtq
sudo docker compose stop app
sudo docker compose build app
sudo docker compose run --rm app npm run db:migrate
sudo docker compose up -d --wait app
sudo docker compose logs --tail=100 app
curl --fail https://mtq.domain-anda.id/api/health
```

Uji pendaftaran dengan empat dokumen, lihat bukti pendaftaran, masuk admin, buka dokumen, ubah status, ekspor CSV, serta uji akun viewer. Uji sembunyikan/tampilkan data dan hak akses kunci API. Perubahan pengaturan acara tidak memerlukan build ulang.

Jika build atau migrasi gagal, jangan lanjutkan ke langkah start sebelum kesalahannya diperbaiki. Rollback perubahan database memakai backup yang sesuai; mengganti image saja tidak membatalkan migrasi.

## 10. Pengembangan lokal

Gunakan Node.js 22.12 atau lebih baru dan MySQL 8.4. Salin `.env.example`, jalankan `npm run credentials`, lalu atur:

```dotenv
APP_URL=http://localhost:5173
NODE_ENV=development
DATABASE_URL=mysql://user:sandi@127.0.0.1:3306/mtq
UPLOAD_DIR=./storage/uploads
ASSET_DIR=./storage/event-assets
```

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Buka `http://localhost:5173`. Vite meneruskan API, unduhan admin, dan ekspor ke Express pada port 3000. Jangan memakai `vite preview` sebagai server produksi; [dokumentasi Vite](https://vite.dev/guide/static-deploy.html) membatasinya untuk pratinjau lokal.

Untuk pengujian integrasi, siapkan database khusus dengan nama berakhiran `_test`, terapkan migrasi ke database itu, lalu jalankan:

```bash
TEST_DATABASE_URL='mysql://user:sandi@127.0.0.1:3306/mtq_test' npm test
```

Pengujian menghapus data dalam database uji tersebut. Tanpa `TEST_DATABASE_URL`, pengujian integrasi dilewati. Prisma dikunci pada seri 7.10.1 dengan adapter MySQL/MariaDB; perintah migrasi pada panduan ini mengikuti versi yang tercatat di `package-lock.json`.
