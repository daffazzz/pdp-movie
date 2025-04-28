# Automatic GitHub Repository Update Script untuk pdpx-movie

Script ini secara otomatis mengambil perubahan terbaru dari repository GitHub pdpx-movie ke VPS Anda. Ini berguna untuk menjaga agar lingkungan produksi tetap sinkron dengan repository tanpa intervensi manual.

## Konfigurasi yang Sudah Disesuaikan

Script sudah dikonfigurasi dengan pengaturan berikut:
- **Path Repository**: `/www/wwwroot/pdpx-movie`
- **Branch**: `main`
- **File Log**: `/var/log/git-auto-update.log`
- **Service**: `pdpx.service`

## Petunjuk Pengaturan

### 1. Salin Script ke VPS Anda

Upload script `auto_update.sh` ke VPS menggunakan SCP, SFTP, atau dengan membuatnya langsung di server:

```bash
scp auto_update.sh username@your-vps-ip:/path/to/destination/
```

Atau buat langsung di server:

```bash
nano /root/auto_update.sh  # atau lokasi pilihan Anda
# Tempel konten script dan simpan (Ctrl+X, Y, Enter)
```

### 2. Buat Script Dapat Dieksekusi

```bash
chmod +x /root/auto_update.sh  # sesuaikan dengan lokasi script Anda
```

### 3. Uji Script

Jalankan script secara manual untuk memastikan bahwa script berfungsi dengan benar:

```bash
/root/auto_update.sh  # sesuaikan dengan lokasi script Anda
```

Periksa file log untuk memverifikasi bahwa script berjalan dengan sukses:

```bash
cat /var/log/git-auto-update.log
```

### 4. Atur Update Otomatis dengan Cron

Edit crontab untuk menjadwalkan script agar berjalan secara otomatis:

```bash
crontab -e
```

Tambahkan baris untuk menjalankan script pada frekuensi yang diinginkan. Misalnya, untuk menjalankan setiap 15 menit:

```
*/15 * * * * /root/auto_update.sh  # sesuaikan dengan lokasi script Anda
```

Untuk menjalankan sekali per jam:

```
0 * * * * /root/auto_update.sh  # sesuaikan dengan lokasi script Anda
```

Untuk menjalankan dua kali sehari (pukul 6 pagi dan 6 sore):

```
0 6,18 * * * /root/auto_update.sh  # sesuaikan dengan lokasi script Anda
```

### 5. Verifikasi Pengaturan Cron

Periksa apakah cron job telah diatur dengan benar:

```bash
crontab -l
```

## Monitoring Service pdpx.service

### Periksa Status Service

```bash
systemctl status pdpx.service
```

### Lihat Log Service

```bash
journalctl -u pdpx.service -n 100  # Tampilkan 100 log terakhir
```

Untuk memantau log secara real-time:

```bash
journalctl -u pdpx.service -f
```

### Restart Service Secara Manual

```bash
systemctl restart pdpx.service
```

## Monitoring Update

Anda dapat memantau proses update dengan memeriksa file log:

```bash
tail -f /var/log/git-auto-update.log
```

## Penanganan Autentikasi

Jika repository memerlukan autentikasi, pertimbangkan opsi berikut:

### Opsi 1: SSH Keys (Direkomendasikan)

1. Siapkan SSH key di VPS Anda
2. Tambahkan public key ke akun GitHub Anda
3. Gunakan SSH URL untuk repository Anda (git@github.com:username/repo.git)

### Opsi 2: Personal Access Token

1. Buat Personal Access Token di GitHub
2. Gunakan HTTPS URL dengan token yang disematkan:
   ```
   https://username:personal_access_token@github.com/username/repo.git
   ```

## Pemecahan Masalah

Jika script gagal memperbarui repository, periksa:

1. File log untuk pesan kesalahan
2. Izin repository
3. Autentikasi GitHub
4. Konektivitas jaringan dari VPS ke GitHub
5. Status service dengan `systemctl status pdpx.service`

## Modifikasi Proses Post-Update

Script ini sudah dikonfigurasi untuk secara otomatis:
1. Mengambil perubahan terbaru dari repository
2. Menginstal dependensi npm jika ada yang baru
3. Membangun ulang aplikasi Next.js dengan `npm run build`
4. Melakukan reload daemon systemd
5. Restart service `pdpx.service`
6. Memeriksa dan mencatat status service setelah restart

Jika Anda perlu memodifikasi tindakan pasca-pembaruan, edit bagian post-update di script. 