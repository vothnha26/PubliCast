import { describe, it, expect } from 'vitest';
import { validatePostPayload, getGraphemeCount } from '../utils/platformValidator';

describe('Platform Validator Module 3 Tests', () => {
  describe('getGraphemeCount helper', () => {
    it('should count standard ASCII strings correctly', () => {
      expect(getGraphemeCount('Hello')).toBe(5);
    });

    it('should count complex emoji graphemes correctly', () => {
      // Emoji with skin tone or multi-character sequence
      expect(getGraphemeCount('👍')).toBe(1);
      expect(getGraphemeCount('👨‍👩‍👧‍👦')).toBe(1);
    });
  });

  describe('Twitch Validation Rules', () => {
    it('should fail when media is attached to a Twitch scheduled post', () => {
      const result = validatePostPayload('twitch', {
        title: 'Valorant Stream',
        hasMedia: true,
        media: [{ url: 'http://video.mp4' }]
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'media',
            message: expect.stringContaining('Twitch does not support media attachments')
          })
        ])
      );
    });

    it('should fail when stream title exceeds 140 characters', () => {
      const longTitle = 'A'.repeat(141);
      const result = validatePostPayload('twitch', {
        title: longTitle
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('Stream title must be 140 characters or less')
          })
        ])
      );
    });

    it('should fail when chat message exceeds 500 characters', () => {
      const longCaption = 'B'.repeat(501);
      const result = validatePostPayload('twitch', {
        caption: longCaption
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'caption',
            message: expect.stringContaining('Chat message must be 500 characters or less')
          })
        ])
      );
    });

    it('should pass for valid Twitch broadcast message', () => {
      const result = validatePostPayload('twitch', {
        title: 'Weekend Gaming Stream',
        caption: 'Join us live on Twitch!'
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Reddit Validation Rules', () => {
    it('should fail when Reddit post has no title or content', () => {
      const result = validatePostPayload('reddit', {
        subreddit: 'technology'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('Reddit post requires a title')
          })
        ])
      );
    });

    it('should fail when Reddit post title exceeds 300 characters', () => {
      const longTitle = 'R'.repeat(301);
      const result = validatePostPayload('reddit', {
        title: longTitle,
        subreddit: 'technology'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('Reddit post title cannot exceed 300 characters')
          })
        ])
      );
    });

    it('should fail when Reddit body text exceeds 40,000 characters', () => {
      const longBody = 'C'.repeat(40001);
      const result = validatePostPayload('reddit', {
        title: 'Valid Title',
        caption: longBody,
        subreddit: 'technology'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'caption',
            message: expect.stringContaining('Reddit body text cannot exceed 40,000 characters')
          })
        ])
      );
    });

    it('should fail when target Subreddit is missing', () => {
      const result = validatePostPayload('reddit', {
        title: 'Valid Title',
        caption: 'Valid content'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'subreddit',
            message: expect.stringContaining('Reddit post requires a target Subreddit')
          })
        ])
      );
    });

    it('should pass for valid Reddit post', () => {
      const result = validatePostPayload('reddit', {
        title: 'New AI Breakthrough',
        caption: 'Check out the details here.',
        subreddit: 'technology'
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Bluesky Validation Rules', () => {
    it('should fail when Bluesky post exceeds 300 graphemes', () => {
      const longCaption = 'X'.repeat(301);
      const result = validatePostPayload('bluesky', {
        caption: longCaption
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'caption',
            message: expect.stringContaining('Bluesky post exceeds 300 graphemes')
          })
        ])
      );
    });

    it('should fail when Bluesky post has more than 4 images', () => {
      const result = validatePostPayload('bluesky', {
        caption: 'Hello Bluesky!',
        images: [1, 2, 3, 4, 5],
        mediaCount: 5
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'media',
            message: expect.stringContaining('Bluesky posts allow a maximum of 4 images')
          })
        ])
      );
    });

    it('should pass for valid Bluesky post', () => {
      const result = validatePostPayload('bluesky', {
        caption: 'Hello Bluesky 🚀',
        images: [1, 2],
        mediaCount: 2
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
