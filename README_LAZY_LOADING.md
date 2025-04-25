# Implementasi Lazy Loading untuk PDP-Movie App

Dokumen ini menjelaskan implementasi lazy loading yang telah ditambahkan ke aplikasi PDP-Movie untuk meningkatkan performa dan efisiensi rendering.

## Tujuan

Tujuan dari implementasi ini adalah untuk:
1. Mengurangi waktu muat awal halaman
2. Mengoptimalkan penggunaan sumber daya dengan hanya merender konten saat diperlukan
3. Meningkatkan pengalaman pengguna dengan placeholder yang mulus saat konten dimuat

## Komponen yang Ditambahkan

### 1. LazyMovieRow

Komponen ini membungkus `MovieRow` yang ada dengan logika lazy loading menggunakan Intersection Observer API. Komponen ini hanya merender baris film ketika area tersebut mendekati viewport pengguna.

**File**: `pdp-movie/app/components/LazyMovieRow.tsx`

**Fitur Utama**:
- Menggunakan IntersectionObserver untuk mendeteksi kapan baris muncul dalam viewport
- Menampilkan placeholder saat konten belum dimuat
- Hanya merender konten MovieRow saat area terlihat atau pernah terlihat (untuk menghindari memuat ulang saat kembali menggulir)

### 2. LazyMovieCard (pada halaman pencarian)

Komponen ini mengimplementasikan lazy loading untuk kartu film individual pada grid hasil pencarian.

**File**: `pdp-movie/app/search/page.tsx`

**Fitur Utama**:
- Membungkus MovieCard tunggal dengan logika lazy loading
- Menampilkan placeholder saat kartu film belum terlihat
- Merender MovieCard lengkap hanya saat berada dalam atau mendekati viewport

## Halaman yang Diperbarui

### 1. Halaman Utama (app/page.tsx)
- Baris "Trending Now" dan "Popular TV Shows" tetap menggunakan rendering langsung
- Semua baris genre dan kategori lainnya menggunakan `LazyMovieRow`

### 2. Halaman Movies (app/movies/page.tsx)
- Baris "Popular Movies" dan "Recently Added" tetap menggunakan rendering langsung
- Semua baris genre menggunakan `LazyMovieRow`

### 3. Halaman TV Shows (app/tvshows/page.tsx)
- Baris "Popular TV Shows" dan "Recently Added" tetap menggunakan rendering langsung
- Semua baris genre menggunakan `LazyMovieRow` 

### 4. Halaman Search (app/search/page.tsx)
- Implementasi LazyMovieCard untuk hasil pencarian dalam grid

## Cara Kerja

1. Saat halaman dimuat, hanya komponen yang terlihat dalam viewport awal (atau dalam jarak rootMargin) yang dirender lengkap
2. Komponen yang belum terlihat akan menampilkan placeholder yang ringan
3. Saat pengguna melakukan scroll, komponen dalam tampilan akan dimuat dengan penuh
4. Setelah komponen dimuat, itu akan tetap dimuat bahkan jika pengguna scroll menjauh dan kembali

## Keuntungan
1. Waktu muat awal lebih cepat
2. Penggunaan memori lebih efisien
3. Pengalaman pengguna yang lebih responsif
4. Hemat bandwidth dengan hanya memuat gambar saat diperlukan

## Batasan
1. Pengguna dengan JavaScript dinonaktifkan tidak akan mendapatkan pengalaman lazy loading
2. Pengguna dengan perangkat low-end mungkin mengalami sedikit jitter saat memuat konten selama scrolling cepat 