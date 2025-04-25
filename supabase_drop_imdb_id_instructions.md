# Panduan Menghapus Kolom `imdb_id` dari Tabel Series di Supabase

Berikut langkah-langkah untuk menghapus kolom `imdb_id` dari tabel `series` di database Supabase:

## Melalui Dashboard Supabase

1. Login ke dashboard Supabase Anda
2. Pilih project yang sesuai
3. Navigasi ke bagian **Table Editor** (atau **SQL**)
4. Klik pada tab **SQL Editor**
5. Buat query baru dengan menekan tombol **New Query**
6. Paste SQL berikut ke dalam editor:

```sql
-- Script untuk menghapus kolom imdb_id dari tabel series
-- Dibuat untuk memisahkan data movie dan tv series dengan lebih baik

-- 1. Pertama, backup data yang ada di kolom imdb_id (jika perlu)
CREATE TABLE IF NOT EXISTS series_imdb_backup AS 
SELECT id, imdb_id FROM series WHERE imdb_id IS NOT NULL;

-- 2. Hapus kolom imdb_id dari tabel series
ALTER TABLE public.series DROP COLUMN IF EXISTS imdb_id;

-- 3. Verifikasi perubahan
-- Jalankan query ini untuk memverifikasi bahwa kolom telah dihapus:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'series' AND column_name = 'imdb_id';
-- Jika tidak ada hasil yang dikembalikan, maka kolom berhasil dihapus

-- 4. Commit perubahan
COMMIT;
```

7. Klik tombol **Run** atau tekan `Ctrl+Enter` untuk menjalankan query
8. Verifikasi bahwa kolom `imdb_id` telah dihapus dengan melihat struktur tabel `series`

## Melalui Supabase CLI

Jika Anda menggunakan Supabase CLI, Anda bisa menjalankan perintah berikut:

```bash
# Simpan SQL di atas ke file drop_imdb_id.sql
# Kemudian jalankan:
supabase db execute -f drop_imdb_id.sql
```

## Dampak pada Aplikasi

Setelah menghapus kolom `imdb_id`, perlu dilakukan beberapa perubahan pada kode aplikasi:

1. File-file yang perlu diedit untuk menghapus referensi `imdb_id`:
   - `pdp-movie/app/tvshows/[id]/page.tsx` - Hapus `imdb_id?: string;` dari interface Series
   - `pdp-movie/app/tvshows/page.tsx` - Hapus `imdb_id?: string;` dari interface Series

2. File-file yang perlu dicek:
   - `pdp-movie/app/admin/page.tsx` - Periksa penggunaan imdb_id ketika menambahkan serial TV baru
   - File lain yang mungkin mengakses data Series (meskipun sebagian besar navigasi sudah menggunakan tmdb_id)

3. Fungsi-fungsi SQL yang mungkin terdampak:
   - Periksa trigger yang menggunakan imdb_id untuk menghasilkan embed_url untuk episode
   - Update fungsi-fungsi tersebut jika perlu

4. Beberapa perubahan sudah dilakukan sebelumnya:
   - Aplikasi sudah menggunakan `tmdb_id` untuk navigasi ke halaman detail TV series
   - Format URL player untuk episode mungkin perlu disesuaikan jika sebelumnya menggunakan imdb_id

## Catatan Penting

- Query ini menyimpan backup data `imdb_id` ke tabel `series_imdb_backup` sebelum menghapus kolom, sehingga Anda dapat memulihkan data jika diperlukan
- Selalu lakukan backup database penuh sebelum melakukan perubahan struktur tabel 