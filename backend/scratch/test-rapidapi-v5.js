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
    { url: '/v2/hashtag_medias_by_name', params: { hashtag_name: 'viral' } },
    { url: '/v2/hashtag_medias_by_name', params: { name: 'viral' } },
    { url: '/v2/hashtag_info', params: { hashtag_name: 'viral' } },
    { url: '/v2/hashtag_info', params: { name: 'viral' } },
    { url: '/v2/search_hashtag', params: { keyword: 'viral' } },
    { url: '/v2/search_hashtag', params: { query: 'viral' } },
    { url: '/v2/search/hashtag', params: { keyword: 'viral' } },
    { url: '/v2/search/hashtag', params: { q: 'viral' } },
    { url: '/v2/hashtag_posts', params: { hashtag_name: 'viral' } },
  ];

  for (const tc of testCases) {
    await testEndpoint(tc.url, tc.params);
  }
}

run();
