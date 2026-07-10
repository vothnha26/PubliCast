const axios = require('axios');

const rapidApiKey = 'f111d3c17cmshaef546e0465a26ap19fe79jsnfbcee70ac8a3';
const host = 'instagram-public-bulk-scraper.p.rapidapi.com';

async function testEndpoint(endpoint, params = {}) {
  console.log(`\n--- Testing ${endpoint} ---`);
  try {
    const response = await axios.get(`https://${host}${endpoint}`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': host
      },
      params,
      timeout: 10000
    });
    console.log(`Success! Status:`, response.status);
    console.log('Response Snippet:', JSON.stringify(response.data).slice(0, 500));
    return true;
  } catch (err) {
    console.error(`Failed:`, err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
    return false;
  }
}

async function run() {
  const testCases = [
    { url: '/v2/trending_hashtags' },
    { url: '/v2/trends' },
    { url: '/v2/trending' },
    { url: '/v2/tags/trending' },
    { url: '/v2/tags' },
    { url: '/v2/web_trending_hashtags' } // test lại cho chắc
  ];

  for (const tc of testCases) {
    await testEndpoint(tc.url, tc.params);
  }
}

run();
