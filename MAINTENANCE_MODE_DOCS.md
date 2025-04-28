# Fitur Notifikasi Maintenance Mode

## Pengantar

Fitur Maintenance Mode memungkinkan admin untuk menampilkan pemberitahuan kepada pengguna bahwa server sedang dalam pemeliharaan dan beberapa film mungkin tidak dapat diputar. Dokumen ini menjelaskan cara mengatur, menggunakan, dan mengatasi masalah dengan fitur ini.

## Struktur Database

Fitur ini menggunakan tabel `system_settings` di Supabase dengan struktur berikut:

```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Pengaturan "maintenance_mode" disimpan dalam tabel ini dengan nilai "true" atau "false".

## Komponen Utama

1. **MaintenanceContext.tsx**: Context Provider untuk mengelola state notifikasi maintenance.
2. **MaintenanceNotification.tsx**: Komponen untuk menampilkan notifikasi kepada pengguna.
3. **Panel Admin**: Tombol untuk mengaktifkan/menonaktifkan notifikasi di tab "System Settings".

## Cara Mengaktifkan Maintenance Mode

1. Login sebagai Admin.
2. Buka Panel Admin.
3. Klik tab "System Settings".
4. Klik tombol "Enable Notification" untuk mengaktifkan notifikasi maintenance.
5. Klik tombol "Disable Notification" untuk menonaktifkan notifikasi.

## Troubleshooting

### Error: "Error updating maintenance status"

Jika terjadi error saat mencoba mengaktifkan/menonaktifkan maintenance mode, pastikan:

1. **Tabel Sudah Dibuat**: Pastikan tabel `system_settings` sudah ada di database. 
   Jalankan SQL berikut untuk membuatnya:

   ```sql
   CREATE TABLE IF NOT EXISTS system_settings (
     id SERIAL PRIMARY KEY,
     key TEXT UNIQUE NOT NULL,
     value TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Row Level Security**: Pastikan kebijakan RLS sudah dikonfigurasi dengan benar:

   ```sql
   -- Reset existing policies
   DROP POLICY IF EXISTS "Anyone can read system settings" ON system_settings;
   DROP POLICY IF EXISTS "Anyone can update system settings" ON system_settings;
   DROP POLICY IF EXISTS "Anyone can insert system settings" ON system_settings;
   DROP POLICY IF EXISTS "Anyone can delete system settings" ON system_settings;

   -- Create permissive policies
   CREATE POLICY "Anyone can read system settings" 
   ON system_settings FOR SELECT 
   USING (true);

   CREATE POLICY "Anyone can update system settings" 
   ON system_settings FOR UPDATE
   USING (true) 
   WITH CHECK (true);

   CREATE POLICY "Anyone can insert system settings" 
   ON system_settings FOR INSERT
   WITH CHECK (true);

   CREATE POLICY "Anyone can delete system settings" 
   ON system_settings FOR DELETE
   USING (true);
   ```

3. **Data Awal**: Pastikan ada data awal di tabel:

   ```sql
   INSERT INTO system_settings (key, value)
   VALUES ('maintenance_mode', 'false')
   ON CONFLICT (key) DO NOTHING;
   ```

4. **Fungsi RPC**: Jika kesalahan masih terjadi, pastikan fungsi RPC berikut sudah ada:

   ```sql
   CREATE OR REPLACE FUNCTION ensure_system_settings(maintenance_default TEXT)
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
       CREATE TABLE IF NOT EXISTS system_settings (
           id SERIAL PRIMARY KEY,
           key TEXT UNIQUE NOT NULL,
           value TEXT NOT NULL,
           created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
           updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );
       
       ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
       
       -- Check if we need to create RLS policies
       IF NOT EXISTS (
           SELECT 1 FROM pg_policies 
           WHERE tablename = 'system_settings' AND policyname = 'Anyone can read system settings'
       ) THEN
           CREATE POLICY "Anyone can read system settings" 
           ON system_settings FOR SELECT 
           USING (true);
           
           CREATE POLICY "Anyone can update system settings" 
           ON system_settings FOR UPDATE
           USING (true) 
           WITH CHECK (true);
           
           CREATE POLICY "Anyone can insert system settings" 
           ON system_settings FOR INSERT
           WITH CHECK (true);
           
           CREATE POLICY "Anyone can delete system settings" 
           ON system_settings FOR DELETE
           USING (true);
       END IF;
       
       INSERT INTO system_settings (key, value)
       VALUES ('maintenance_mode', maintenance_default)
       ON CONFLICT (key) DO NOTHING;
   END;
   $$;
   ```

## Pemeliharaan

Untuk keamanan produksi yang lebih baik, Anda mungkin ingin membatasi izin modifikasi hanya untuk admin. Anda dapat memodifikasi RLS policy sebagai berikut:

```sql
-- Allow only admin to modify
CREATE POLICY "Only admin can modify system settings" 
ON system_settings FOR ALL 
USING (auth.jwt() ->> 'role' = 'admin');

-- But allow anyone to read
CREATE POLICY "Anyone can read system settings" 
ON system_settings FOR SELECT 
USING (true);
```

## Kesimpulan

Fitur Notifikasi Maintenance Mode memberikan cara sederhana untuk memberi tahu pengguna tentang pemeliharaan server dan potensi masalah dengan pemutaran film. Dengan mengikuti panduan ini, Anda dapat memastikan fitur berfungsi dengan baik dan dapat menyelesaikan masalah yang mungkin muncul. 