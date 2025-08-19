// Test Google Script API directly
const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxjV3jJpUVQuO6RE8pnX-kf5rWBe2NxBGqk1EJyByI64Vip1UOj0dlL1XP20ksM8gZl/exec';
const GOOGLE_SCRIPT_AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjAzMmNjMWNiMjg5ZGQ0NjI2YTQzNWQ3Mjk4OWFlNDMyMTJkZWZlNzgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY29sb3JibGluZHByaW50cy02MmNhMCIsImF1ZCI6ImNvbG9yYmxpbmRwcmludHMtNjJjYTAiLCJhdXRoX3RpbWUiOjE3MDMxMzMyNTgsInVzZXJfaWQiOiJjWGFRQmdSV01mV0Y4Q3lVSDNvTlFBWHlTc2oxIiwic3ViIjoiY1hhUUJnUldNZldGOEN5VUgzb05RQVh5U3NqMSIsImlhdCI6MTcwMzEzMzI1OCwiZXhwIjoxNzAzMTM2ODU4LCJlbWFpbCI6ImR2QG5leG93YS5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZHZAbmV4b3dhLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.yMtTDUlXt1yq89W88dapVzBIad8WcF_ltP5zj0x1WUp12q1FGdzZ4bGcU7PL9RN63kbvERT8BCFZrtVaE1NXwSa2dCIWxBQCav9G9S06zvb13Zgl94B7IHH7avMmdXujzDRyPrRg8zopSb8uHxVafo5tY7qjNflBcqKi7s_83QdSbvlUgEztral5qeNJPd841J57Q8bw4O95bLOynIpRvYbdp4e79Urjms7hbt3ewYMgMoKU-NuafVPM12xA8Wwe1mCIhIYdHg8jQB8CVUeGAdDsSYYXkT__-xb5fF4QcGtHA0EifbAmcRbOc47uX6j8B1Od52Y5zWiwx6OV840cQw';

async function testGoogleAPI() {
  try {
    console.log('Testing Google Script API...\n');
    
    // Test with a few sample symbols
    const testSymbols = ['RELIANCE', 'INFY', 'TCS'];
    const formattedSymbols = testSymbols.map(symbol => `NSE:${symbol}`);
    
    console.log('Testing symbols:', formattedSymbols);
    
    const response = await fetch(GOOGLE_SCRIPT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': GOOGLE_SCRIPT_AUTH_TOKEN,
      },
      body: JSON.stringify({
        symbols: formattedSymbols
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response:', data);
      
      // Check if we got prices
      Object.entries(data).forEach(([symbol, price]) => {
        console.log(`${symbol}: ${price}`);
      });
      
    } else {
      console.log('API call failed');
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('API test failed:', error);
  }
}

async function testAMFIAPI() {
  try {
    console.log('\nTesting AMFI API...\n');
    
    const response = await fetch('https://www.amfiindia.com/spages/NAVAll.txt');
    
    console.log('AMFI Response status:', response.status);
    
    if (response.ok) {
      const data = await response.text();
      const lines = data.split('\n');
      
      console.log('Total lines in AMFI response:', lines.length);
      console.log('First 10 lines:');
      lines.slice(0, 10).forEach((line, index) => {
        console.log(`${index + 1}: ${line}`);
      });
      
      // Look for our mutual fund symbols
      const ourMFSymbols = ['INF194KB1AL4', 'INF247L01445'];
      
      console.log('\nSearching for our MF symbols...');
      ourMFSymbols.forEach(symbol => {
        const found = lines.find(line => line.includes(symbol));
        if (found) {
          console.log(`Found ${symbol}: ${found}`);
        } else {
          console.log(`${symbol}: Not found`);
        }
      });
      
    } else {
      console.log('AMFI API call failed');
      const errorText = await response.text();
      console.log('Error response:', errorText.substring(0, 500));
    }
    
  } catch (error) {
    console.error('AMFI API test failed:', error);
  }
}

// Run both tests
async function runTests() {
  await testGoogleAPI();
  await testAMFIAPI();
}

runTests();