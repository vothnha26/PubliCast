const axios = require('axios');

const rapidApiKey = 'f111d3c17cmshaef546e0465a26ap19fe79jsnfbcee70ac8a3';
const host = 'instagram-public-bulk-scraper.p.rapidapi.com';

async function testEndpoint() {
  console.log('--- Testing /v2/web_trending_hashtags ---');
  try {
    const response = await axios.get(`https://${host}/v2/web_trending_hashtags`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': host
      },
      timeout: 15000
    });
    console.log('Success! Status:', response.status);
    console.log('Response Snippet:', JSON.stringify(response.data).slice(0, 500));
  } catch (err) {
    console.error('Failed:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
  }
}

testEndpoint();
