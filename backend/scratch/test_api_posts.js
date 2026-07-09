const postService = require('../src/services/workspace/post.service');

async function main() {
  const queryParams = {
    startDate: '2026-06-28',
    endDate: '2026-07-04',
    limit: 100
  };
  const brandId = '21deeec1-51b3-4f7a-a3ed-c8714ed6d683';
  
  const result = await postService.getPosts(queryParams, brandId);
  console.log('Result posts count:', result.data.length);
  result.data.forEach(p => {
    console.log({
      id: p.id,
      title: p.title,
      status: p.status,
      scheduledAt: p.scheduledAt,
      platforms: p.platforms,
      isLibrary: p.isLibrary
    });
  });
}

main().catch(err => console.error(err));
