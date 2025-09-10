// Simple test script
async function test() {
  console.log('Starting test...');
  
  try {
    const response = await fetch('https://api.themoviedb.org/3/configuration?api_key=f6d3ebb49663df38c7b2fad96e95a16b');
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Successfully parsed JSON');
    } else {
      console.log('Not JSON response');
      const text = await response.text();
      console.log('Text content:', text.substring(0, 200));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();