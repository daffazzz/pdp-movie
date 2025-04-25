#!/usr/bin/env node

/**
 * Helper script untuk mengatur variabel lingkungan di proyek Vercel
 * 
 * Penggunaan:
 * 1. Install Vercel CLI: npm i -g vercel
 * 2. Login: vercel login
 * 3. Jalankan script: node setup-vercel-env.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Baca file .env lokal
try {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Parse variabel lingkungan dari file .env
  const envVars = envContent.split('\n').filter(line => {
    return line.trim() && !line.startsWith('#');
  }).map(line => {
    const [key, ...values] = line.split('=');
    return { key: key.trim(), value: values.join('=').trim() };
  });
  
  console.log('Variabel lingkungan yang akan ditambahkan ke Vercel:');
  console.log('-------------------------------------------------');
  
  // Tambahkan setiap variabel ke proyek Vercel
  envVars.forEach(({ key, value }) => {
    if (!key || !value) return;
    
    try {
      console.log(`Menambahkan ${key}...`);
      
      // Gunakan Vercel CLI untuk menambahkan variabel lingkungan
      execSync(`vercel env add ${key}`, { stdio: 'inherit' });
    } catch (error) {
      console.error(`Error saat menambahkan ${key}:`, error.message);
    }
  });
  
  console.log('\nSelesai menambahkan variabel lingkungan!');
  console.log('\nLangkah selanjutnya:');
  console.log('1. Jalankan: vercel --prod');
  console.log('2. Pastikan variabel telah dikonfigurasi di dasbor Vercel');
  
} catch (error) {
  console.error('Error saat membaca file .env:', error.message);
  process.exit(1);
} 