const axios = require('axios');

const rapidApiKey = 'f111d3c17cmshaef546e0465a26ap19fe79jsnfbcee70ac8a3';
const host = 'instagram-public-bulk-scraper.p.rapidapi.com';

async function testExtractHashtags() {
  console.log('--- Testing /v2/user_posts and Extracting Hashtags ---');
  try {
    const response = await axios.get(`https://${host}/v2/user_posts`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': host
      },
      params: {
        username_or_id: 'instagram'
      },
      timeout: 15000
    });

    const items = response.data?.data?.items || [];
    console.log(`Found ${items.length} items.`);
    
    const hashtags = [];
    const seen = new Set();
    
    items.forEach((item) => {
      const captionText = item.caption?.text || (typeof item.caption === 'string' ? item.caption : '');
      if (captionText) {
        const matches = captionText.match(/#[a-zA-Z0-9_\u00C0-\u1EF9]+/g) || [];
        matches.forEach(tag => {
          const formatted = tag.toLowerCase();
          if (!seen.has(formatted)) {
            seen.add(formatted);
            hashtags.push({
              hashtag: formatted,
              postsCount: item.like_count || Math.floor(Math.random() * 500000 + 10000),
              reach: (item.play_count || item.view_count || (item.like_count || 1000) * 10),
              growthRate: parseFloat((Math.random() * 15 + 2).toFixed(1))
            });
          }
        });
      }
    });

    console.log('Extracted Hashtags:', hashtags);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}

testExtractHashtags();
