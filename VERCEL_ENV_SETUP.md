# Panduan Konfigurasi Variabel Lingkungan di Vercel

Dokumen ini menjelaskan cara mengatur variabel lingkungan yang diperlukan untuk proyek PDP Movie di Vercel.

## Variabel Lingkungan yang Diperlukan

Proyek ini membutuhkan variabel lingkungan berikut:

1. `NEXT_PUBLIC_SUPABASE_URL` - URL proyek Supabase Anda
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Kunci akses anonim Supabase Anda
3. `NEXT_PUBLIC_TMDB_API_KEY` - Kunci API TMDB Anda

## Cara Mengatur Variabel Lingkungan di Vercel

1. **Login ke Dasbor Vercel**
   - Kunjungi [https://vercel.com](https://vercel.com) dan login ke akun Anda

2. **Pilih Proyek Anda**
   - Pilih proyek `pdp-movie` dari daftar proyek Anda
   
3. **Akses Pengaturan Proyek**
   - Klik tab `Settings` di navigasi atas

4. **Konfigurasi Variabel Lingkungan**
   - Klik opsi `Environment Variables` di menu sebelah kiri
   - Tambahkan setiap variabel dengan mengklik tombol `Add New`
   - Masukkan setiap pasangan nama variabel dan nilai:

   | NAME | VALUE |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://dkhblpxugaxynqqiqdbn.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraGJscHh1Z2F4eW5xcWlxZGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MTE3ODIsImV4cCI6MjA2MDk4Nzc4Mn0.XyJYSMikdcf1j0Z7I-Ea1DDB_zmRpT8jYCmKo-LYA9k` |
   | `NEXT_PUBLIC_TMDB_API_KEY` | `f6d3ebb49663df38c7b2fad96e95a16b` |

5. **Atur Lingkungan Penerapan**
   - Pastikan variabel diaktifkan untuk semua lingkungan (Production, Preview, dan Development)
   
6. **Simpan Perubahan**
   - Klik tombol `Save` untuk menyimpan semua variabel lingkungan

7. **Re-deploy Proyek Anda**
   - Kembali ke tab `Deployments` 
   - Klik tombol `Redeploy` untuk menerapkan ulang dengan variabel baru

## Verifikasi Konfigurasi

Setelah deployment selesai, Anda dapat memverifikasi bahwa variabel lingkungan telah dikonfigurasi dengan benar:

1. Kunjungi halaman API endpoint proyek Anda (contoh: `https://pdp-movie.vercel.app/api/movies`)
2. API seharusnya berhasil terhubung ke Supabase dan tidak lagi menampilkan error `supabaseUrl is required`

## Pemecahan Masalah

Jika Anda masih mengalami masalah setelah mengatur variabel lingkungan:

1. **Periksa Logs di Vercel**
   - Klik pada deployment terakhir di tab `Deployments`
   - Klik `View Function Logs` untuk melihat detail error

2. **Periksa Pembatasan CORS di Supabase**
   - Pastikan URL domain Vercel Anda (contoh: `pdp-movie.vercel.app`) telah ditambahkan ke daftar yang diizinkan di pengaturan CORS Supabase

3. **Restart Build**
   - Terkadang Anda perlu menghapus cache dengan memulai ulang build secara manual
   - Di Vercel, klik `Settings` > `General` > `Build & Development Settings` > `Clear Cache and Redeploy` 