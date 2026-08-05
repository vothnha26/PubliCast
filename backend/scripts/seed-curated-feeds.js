#!/usr/bin/env node
/**
 * Seeds curated (system) feeds for the Explore Curated Feeds catalog —
 * these are shown to every brand automatically (isSystem: true, no
 * brandId), same as Featured Templates. Safe to re-run: skips any URL
 * that's already a system feed instead of creating duplicates.
 *
 * Usage:
 *   node scripts/seed-curated-feeds.js
 */
require('dotenv').config();
const prisma = require('../src/config/prisma');
const feedService = require('../src/services/workspace/feed.service');

const CURATED_FEEDS = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tech' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Tech' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'Tech' },
  { name: 'HubSpot Marketing Blog', url: 'https://blog.hubspot.com/marketing/rss.xml', category: 'Marketing' },
  { name: 'Social Media Examiner', url: 'https://www.socialmediaexaminer.com/feed/', category: 'Marketing' },
  { name: 'Buffer Blog', url: 'https://buffer.com/resources/feed/', category: 'Marketing' },
  { name: 'BBC News - World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'News' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'News' },
  { name: 'Forbes Business', url: 'https://www.forbes.com/business/feed/', category: 'Business' },
  { name: 'Fast Company', url: 'https://www.fastcompany.com/latest/rss', category: 'Business' }
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const feed of CURATED_FEEDS) {
    const existing = await prisma.feedSource.findFirst({ where: { url: feed.url, isSystem: true } });
    if (existing) {
      console.log(`skip (already exists): ${feed.name}`);
      skipped += 1;
      continue;
    }

    const feedSource = await prisma.feedSource.create({
      data: { brandId: null, name: feed.name, url: feed.url, category: feed.category, isSystem: true }
    });

    try {
      const { added } = await feedService.refreshFeedSource(feedSource.id);
      console.log(`created: ${feed.name} (${feed.category}) — ${added} entries fetched`);
    } catch (error) {
      console.warn(`created: ${feed.name} (${feed.category}) — initial refresh failed: ${error.message}`);
    }
    created += 1;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed curated feeds:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
