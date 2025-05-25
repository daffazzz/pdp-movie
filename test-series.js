// Test script to fetch series data from Supabase
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration from MIGRATION_GUIDE.md
const supabaseUrl = 'https://dkhblpxugaxynqqiqdbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraGJscHh1Z2F4eW5xcWlxZGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MTE3ODIsImV4cCI6MjA2MDk4Nzc4Mn0.XyJYSMikdcf1j0Z7I-Ea1DDB_zmRpT8jYCmKo-LYA9k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSeries() {
  console.log('Fetching series data from Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .not('thumbnail_url', 'is', null)
      .not('thumbnail_url', 'eq', '')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching series:', error);
      return;
    }
    
    console.log(`Found ${data?.length || 0} series in Supabase`);
    
    if (data && data.length > 0) {
      console.log('First series:', {
        id: data[0].id,
        title: data[0].title,
        thumbnail_url: data[0].thumbnail_url ? 'exists' : 'missing'
      });
    } else {
      console.log('No series found in the Supabase database');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fetchSeries(); 