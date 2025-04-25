# Fitur Bulk Import Film dan Series

Fitur ini memungkinkan admin untuk mencari dan mengimpor banyak film/series sekaligus ke dalam database berdasarkan tahun atau genre.

## Update Terbaru

1. **Tampilan Diperbanyak**: Sekarang menampilkan 100 film/series per halaman (sebelumnya hanya 20)
2. **Pencarian di Existing Movies/Series**: Ditambahkan fitur pencarian untuk memudahkan mencari film/series yang sudah diimpor
3. **Tampilan Grid Dioptimalkan**: Tampilan grid lebih padat untuk menampilkan lebih banyak item sekaligus
4. **Quick Selection Overlay**: Menambahkan overlay ketika hover di poster untuk pemilihan cepat
5. **Navigasi Halaman yang Lebih Baik**: Tombol First/Last page dan informasi jumlah item pada tombol select all

## Cara Menggunakan Fitur Bulk Import

### Bulk Import Film

1. Login sebagai admin
2. Buka halaman Admin Panel
3. Klik tab "Bulk Import Movies"
4. Pilih filter yang diinginkan:
   - **Tahun**: Untuk mencari film berdasarkan tahun rilis
   - **Genre**: Untuk mencari film berdasarkan genre
5. Klik tombol "Discover Movies" untuk mencari film yang sesuai dengan filter
6. Hasil pencarian akan ditampilkan dalam bentuk grid (hingga 100 film per halaman)
7. Film yang sudah pernah diimpor sebelumnya akan ditandai dengan label "Imported"
8. Pilih film yang ingin diimpor dengan mengklik poster film atau tombol "Select" di bawah masing-masing film
9. Setelah memilih film, klik tombol "Import X Movies" di bagian bawah halaman
10. Tunggu proses import selesai. Progress akan ditampilkan di bagian bawah halaman

### Bulk Import Series

1. Login sebagai admin
2. Buka halaman Admin Panel
3. Klik tab "Bulk Import Series"
4. Pilih filter yang diinginkan:
   - **Tahun**: Untuk mencari series berdasarkan tahun rilis pertama
   - **Genre**: Untuk mencari series berdasarkan genre
5. Klik tombol "Discover Series" untuk mencari series yang sesuai dengan filter
6. Hasil pencarian akan ditampilkan dalam bentuk grid (hingga 100 series per halaman)
7. Series yang sudah pernah diimpor sebelumnya akan ditandai dengan label "Imported"
8. Pilih series yang ingin diimpor dengan mengklik poster series atau tombol "Select" di bawah masing-masing series
9. Setelah memilih series, klik tombol "Import X Series" di bagian bawah halaman
10. Tunggu proses import selesai. Progress akan ditampilkan di bagian bawah halaman

## Fitur Pencarian di Existing Movies/Series

Untuk mencari film/series yang sudah diimpor:

1. Klik tab "Existing Movies" atau "Existing Series"
2. Gunakan kotak pencarian di bagian atas halaman
3. Ketik kata kunci (judul, genre, director, tahun, dll)
4. Hasil pencarian akan ditampilkan secara real-time saat Anda mengetik
5. Untuk menghapus kata kunci pencarian, klik ikon X di sebelah kanan kotak pencarian

## Fitur Tambahan

- **Select All**: Memilih semua film/series pada halaman saat ini (kecuali yang sudah diimpor)
- **Deselect All**: Membatalkan semua pilihan
- **Pagination**: Navigasi antar halaman hasil pencarian dengan tombol First, Prev, Next, dan Last
- **Hover Selection**: Hover pada poster untuk memunculkan tombol pemilihan cepat

## Catatan Penting

- Proses import film/series bisa memakan waktu cukup lama, terutama untuk series yang memiliki banyak musim dan episode
- Film/series yang sudah diimpor sebelumnya tidak dapat dipilih untuk diimpor lagi
- Pastikan koneksi internet stabil selama proses import
- Fitur ini menggunakan TMDB API untuk mendapatkan data film/series
- Proses import akan gagal jika TMDB API key tidak valid atau batas kuota API telah tercapai

## Troubleshooting

Jika mengalami masalah saat menggunakan fitur bulk import:

1. Periksa koneksi internet
2. Pastikan TMDB API key masih valid
3. Refresh halaman dan coba kembali
4. Jika masalah berlanjut, coba impor dengan jumlah yang lebih sedikit
5. Untuk performa optimal, gunakan browser modern seperti Chrome, Firefox, atau Edge 