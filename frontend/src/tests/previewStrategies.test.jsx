import { describe, it, expect } from 'vitest';
import { PreviewStrategies } from '../components/workspace/post-creator/previews/PreviewStrategies';
import { BlueskyPreview } from '../components/workspace/post-creator/previews/BlueskyPreview';
import { RedditPreview } from '../components/workspace/post-creator/previews/RedditPreview';
import { TwitchPreview } from '../components/workspace/post-creator/previews/TwitchPreview';

describe('Composer Preview Strategies Registry', () => {
  it('should register BlueskyPreview strategy correctly', () => {
    expect(PreviewStrategies.bluesky).toBe(BlueskyPreview);
  });

  it('should register RedditPreview strategy correctly', () => {
    expect(PreviewStrategies.reddit).toBe(RedditPreview);
  });

  it('should register TwitchPreview strategy correctly', () => {
    expect(PreviewStrategies.twitch).toBe(TwitchPreview);
  });

  it('should contain all 9 platform preview strategies', () => {
    const keys = Object.keys(PreviewStrategies);
    expect(keys).toContain('youtube');
    expect(keys).toContain('facebook');
    expect(keys).toContain('tiktok');
    expect(keys).toContain('instagram');
    expect(keys).toContain('telegram');
    expect(keys).toContain('threads');
    expect(keys).toContain('bluesky');
    expect(keys).toContain('reddit');
    expect(keys).toContain('twitch');
    expect(keys.length).toBe(9);
  });
});
