// Script untuk memigrasikan data dari Supabase ke PostgreSQL lokal
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Konfigurasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Konfigurasi PostgreSQL lokal
const pgConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'pdp_movie',
  ssl: process.env.POSTGRES_USE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

// Buat koneksi ke PostgreSQL lokal
const pool = new Pool(pgConfig);

// Fungsi untuk mengambil data dari Supabase
async function fetchDataFromSupabase(table) {
  console.log(`Mengambil data dari tabel ${table}...`);
  const { data, error } = await supabase.from(table).select('*');
  
  if (error) {
    console.error(`Error mengambil data dari tabel ${table}:`, error);
    return [];
  }
  
  console.log(`Berhasil mengambil ${data.length} baris dari tabel ${table}`);
  return data;
}

// Fungsi untuk menyimpan data ke PostgreSQL lokal
async function saveDataToPostgres(table, data) {
  if (!data || data.length === 0) {
    console.log(`Tidak ada data untuk disimpan ke tabel ${table}`);
    return;
  }
  
  console.log(`Menyimpan ${data.length} baris ke tabel ${table}...`);
  
  // Mendapatkan client dari pool
  const client = await pool.connect();
  
  try {
    // Mulai transaksi
    await client.query('BEGIN');
    
    // Hapus data yang ada di tabel (optional, hapus baris ini jika tidak ingin menghapus data)
    await client.query(`TRUNCATE ${table} CASCADE`);
    
    // Dapatkan nama kolom dari objek pertama
    const columns = Object.keys(data[0]);
    
    // Buat query untuk menyisipkan data
    for (const row of data) {
      const values = columns.map(col => row[col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      await client.query(query, values);
    }
    
    // Commit transaksi
    await client.query('COMMIT');
    console.log(`Berhasil menyimpan data ke tabel ${table}`);
  } catch (err) {
    // Rollback jika terjadi error
    await client.query('ROLLBACK');
    console.error(`Error menyimpan data ke tabel ${table}:`, err);
  } finally {
    // Kembalikan client ke pool
    client.release();
  }
}

// Fungsi utama untuk migrasi
async function migrateData() {
  try {
    console.log('Memulai migrasi data dari Supabase ke PostgreSQL lokal...');
    
    // Daftar tabel yang akan dimigrasi
    const tables = ['movies', 'series', 'genres', 'subtitles'];
    
    // Migrasi setiap tabel
    for (const table of tables) {
      const data = await fetchDataFromSupabase(table);
      await saveDataToPostgres(table, data);
    }
    
    console.log('Migrasi data selesai!');
  } catch (err) {
    console.error('Error selama migrasi:', err);
  } finally {
    // Tutup pool koneksi
    await pool.end();
  }
}

// Jalankan migrasi
migrateData(); 