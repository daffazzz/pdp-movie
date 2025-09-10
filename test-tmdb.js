// Test script to verify TMDB API connectivity
const TMDB_API_KEY = 'f6d3ebb49663df38c7b2fad96e95a16b';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function testTMDBEndpoint() {
  console.log('Testing TMDB API connectivity...');
  
  try {
    // Test the configuration endpoint
    const configUrl = `${TMDB_BASE_URL}/configuration?api_key=${TMDB_API_KEY}`;
    console.log(`Testing URL: ${configUrl}`);
    
    const response = await fetch(configUrl);
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers: ${JSON.stringify([...response.headers.entries()], null, 2)}`);
    
    // Check content type
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(`Response body: ${text.substring(0, 500)}...`);
      return;
    }
    
    // Check if response is actually JSON
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Response is not JSON');
      const text = await response.text();
      console.log(`Response body (first 500 chars): ${text.substring(0, 500)}`);
      return;
    }
    
    const data = await response.json();
    console.log('TMDB API is accessible!');
    console.log(`Configuration data keys: ${Object.keys(data)}`);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testTMDBEndpoint();