// Script to migrate series data from Supabase to local PostgreSQL
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Local PostgreSQL configuration
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

// Create connection to local PostgreSQL
const pool = new Pool(pgConfig);

// Function to fetch series data from Supabase
async function fetchSeriesFromSupabase() {
  console.log('Fetching series data from Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*');
    
    if (error) {
      console.error('Error fetching series from Supabase:', error);
      return [];
    }
    
    console.log(`Successfully fetched ${data.length} series from Supabase`);
    return data;
  } catch (err) {
    console.error('Unexpected error fetching series:', err);
    return [];
  }
}

// Function to fetch episodes data from Supabase
async function fetchEpisodesFromSupabase() {
  console.log('Fetching episodes data from Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*');
    
    if (error) {
      console.error('Error fetching episodes from Supabase:', error);
      return [];
    }
    
    console.log(`Successfully fetched ${data.length} episodes from Supabase`);
    return data;
  } catch (err) {
    console.error('Unexpected error fetching episodes:', err);
    return [];
  }
}

// Function to fetch episode subtitles data from Supabase
async function fetchEpisodeSubtitlesFromSupabase() {
  console.log('Fetching episode subtitles data from Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('episode_subtitles')
      .select('*');
    
    if (error) {
      console.error('Error fetching episode subtitles from Supabase:', error);
      return [];
    }
    
    console.log(`Successfully fetched ${data.length} episode subtitles from Supabase`);
    return data;
  } catch (err) {
    console.error('Unexpected error fetching episode subtitles:', err);
    return [];
  }
}

// Function to save data to PostgreSQL
async function saveDataToPostgres(table, data) {
  if (!data || data.length === 0) {
    console.log(`No data to save to table ${table}`);
    return;
  }
  
  console.log(`Saving ${data.length} rows to table ${table}...`);
  
  // Get client from pool
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Get column names from first object
    const columns = Object.keys(data[0]);
    
    // Create query to insert data
    for (const row of data) {
      const values = columns.map(col => row[col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      // Use a simpler approach to avoid ON CONFLICT issues
      try {
        const query = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
        `;
        
        await client.query(query, values);
      } catch (insertErr) {
        // If insertion fails (likely due to duplicate key), try update
        if (insertErr.code === '23505') { // Duplicate key violation
          console.log(`Duplicate key found in ${table}, updating instead...`);
          
          // Update excluding the id column which is the primary key
          const updateColumns = columns.filter(col => col !== 'id');
          const updateValues = updateColumns.map(col => row[col]);
          
          const updateQuery = `
            UPDATE ${table}
            SET ${updateColumns.map((col, i) => `${col} = $${i + 1}`).join(', ')}
            WHERE id = $${updateColumns.length + 1}
          `;
          
          await client.query(updateQuery, [...updateValues, row.id]);
        } else {
          // Re-throw if it's not a duplicate key error
          throw insertErr;
        }
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log(`Successfully saved data to table ${table}`);
  } catch (err) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error(`Error saving data to table ${table}:`, err);
  } finally {
    // Return client to pool
    client.release();
  }
}

// Main migration function
async function migrateSeries() {
  try {
    console.log('Starting migration of series data from Supabase to PostgreSQL...');
    
    // Fetch data from Supabase
    const seriesData = await fetchSeriesFromSupabase();
    const episodesData = await fetchEpisodesFromSupabase();
    const subtitlesData = await fetchEpisodeSubtitlesFromSupabase();
    
    // Save data to PostgreSQL
    await saveDataToPostgres('series', seriesData);
    await saveDataToPostgres('episodes', episodesData);
    await saveDataToPostgres('episode_subtitles', subtitlesData);
    
    console.log('Series data migration completed successfully!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    // Close pool connection
    await pool.end();
  }
}

// Run migration
migrateSeries(); 
 