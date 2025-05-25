# Panduan Migrasi Data dari Supabase ke PostgreSQL Lokal

Dokumen ini menjelaskan cara memindahkan data dari Supabase ke database PostgreSQL lokal di Ubuntu.

## Prasyarat

1. Node.js dan npm terinstal
2. PostgreSQL terinstal di Ubuntu
3. Database PostgreSQL lokal sudah dibuat (menggunakan `scripts/init-local-db.sh`)
4. Kredensial Supabase (URL dan Anonymous Key)

## Langkah-langkah Migrasi

### 1. Buat file `.env.local`

Buat file `.env.local` di root proyek dengan isi sebagai berikut:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dkhblpxugaxynqqiqdbn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraGJscHh1Z2F4eW5xcWlxZGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MTE3ODIsImV4cCI6MjA2MDk4Nzc4Mn0.XyJYSMikdcf1j0Z7I-Ea1DDB_zmRpT8jYCmKo-LYA9k

# Local PostgreSQL Configuration
USE_LOCAL_PG=true
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pdp_movie
POSTGRES_USE_SSL=false
```

Sesuaikan nilai-nilai di atas dengan kredensial PostgreSQL lokal Anda.

### 2. Instal dependensi yang diperlukan

```bash
npm install dotenv pg @supabase/supabase-js
```

### 3. Jalankan script migrasi

```bash
node scripts/migrate-data.js
```

Script ini akan:
1. Mengambil data dari tabel-tabel di Supabase
2. Menyimpan data tersebut ke database PostgreSQL lokal
3. Menampilkan log proses migrasi

### 4. Verifikasi migrasi

Setelah migrasi selesai, Anda dapat memeriksa data di PostgreSQL lokal:

```bash
sudo -u postgres psql -d pdp_movie -c "SELECT COUNT(*) FROM movies"
sudo -u postgres psql -d pdp_movie -c "SELECT COUNT(*) FROM series"
sudo -u postgres psql -d pdp_movie -c "SELECT COUNT(*) FROM genres"
sudo -u postgres psql -d pdp_movie -c "SELECT COUNT(*) FROM subtitles"
```

### 5. Jalankan aplikasi dengan PostgreSQL lokal

Pastikan nilai `USE_LOCAL_PG=true` di file `.env.local`, lalu jalankan aplikasi:

```bash
npm run dev
```

## Catatan Penting

- Script migrasi akan menghapus data yang ada di tabel PostgreSQL lokal sebelum menyisipkan data baru. Jika Anda tidak ingin menghapus data yang ada, hapus baris `await client.query(`TRUNCATE ${table} CASCADE`);` di script.
- Jika terjadi error selama migrasi, periksa log untuk detail lebih lanjut.
- Pastikan struktur tabel di PostgreSQL lokal sama dengan di Supabase. Script `init-local-db.sh` seharusnya sudah membuat struktur yang sama. 