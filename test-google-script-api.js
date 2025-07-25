// Test script to verify Google Apps Script API integration
const GOOGLE_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxjV3jJpUVQuO6RE8pnX-kf5rWBe2NxBGqk1EJyByI64Vip1UOj0dlL1XP20ksM8gZl/exec'
const GOOGLE_SCRIPT_AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjAzMmNjMWNiMjg5ZGQ0NjI2YTQzNWQ3Mjk4OWFlNDMyMTJkZWZlNzgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY29sb3JibGluZHByaW50cy02MmNhMCIsImF1ZCI6ImNvbG9yYmxpbmRwcmludHMtNjJjYTAiLCJhdXRoX3RpbWUiOjE3MDMxMzMyNTgsInVzZXJfaWQiOiJjWGFRQmdSV01mV0Y4Q3lVSDNvTlFBWHlTc2oxIiwic3ViIjoiY1hhUUJnUldNZldGOEN5VUgzb05RQVh5U3NqMSIsImlhdCI6MTcwMzEzMzI1OCwiZXhwIjoxNzAzMTM2ODU4LCJlbWFpbCI6ImR2QG5leG93YS5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiZHZAbmV4b3dhLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.yMtTDUlXt1yq89W88dapVzBIad8WcF_ltP5zj0x1WUp12q1FGdzZ4bGcU7PL9RN63kbvERT8BCFZrtVaE1NXwSa2dCIWxBQCav9G9S06zvb13Zgl94B7IHH7avMmdXujzDRyPrRg8zopSb8uHxVafo5tY7qjNflBcqKi7s_83QdSbvlUgEztral5qeNJPd841J57Q8bw4O95bLOynIpRvYbdp4e79Urjms7hbt3ewYMgMoKU-NuafVPM12xA8Wwe1mCIhIYdHg8jQB8CVUeGAdDsSYYXkT__-xb5fF4QcGtHA0EifbAmcRbOc47uX6j8B1Od52Y5zWiwx6OV840cQw'

async function testGoogleScriptAPI() {
  try {
    console.log('Testing Google Apps Script API...')
    
    const response = await fetch(GOOGLE_SCRIPT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': GOOGLE_SCRIPT_AUTH_TOKEN,
      },
      body: JSON.stringify({
        symbols: ["NSE:RELIANCE", "NSE:INFY", "NSE:TCS"]
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('API Response:', data)
    
    // Verify response format
    if (typeof data === 'object' && data !== null) {
      console.log('✅ API is working correctly!')
      console.log('Sample prices:')
      Object.entries(data).forEach(([symbol, price]) => {
        console.log(`  ${symbol}: ₹${price}`)
      })
    } else {
      console.log('❌ Unexpected response format')
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message)
  }
}

// Test the local API endpoint
async function testLocalAPI() {
  try {
    console.log('\nTesting local API endpoint...')
    
    const response = await fetch('http://localhost:3000/api/prices/stocks?symbols=RELIANCE,INFY')
    
    if (!response.ok) {
      throw new Error(`Local API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Local API Response:', data)
    
    if (data.data && Array.isArray(data.data)) {
      console.log('✅ Local API is working correctly!')
      data.data.forEach(item => {
        console.log(`  ${item.symbol}: ₹${item.price || 'N/A'}`)
      })
    } else {
      console.log('❌ Unexpected local API response format')
    }
    
  } catch (error) {
    console.error('❌ Local API test failed:', error.message)
  }
}

// Run tests
testGoogleScriptAPI()
setTimeout(testLocalAPI, 2000) // Wait 2 seconds before testing local API