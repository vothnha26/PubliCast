const { computeCommentScore } = require('../../src/utils/comment-score.util');

describe('computeCommentScore', () => {
  it('returns null when reach is null (Threads has no real reach figure)', () => {
    expect(computeCommentScore({ comments: 10, likes: 5, shares: 2, reach: null })).toBeNull();
  });

  it('returns null when reach is undefined', () => {
    expect(computeCommentScore({ comments: 10, likes: 5, shares: 2 })).toBeNull();
  });

  it('returns 0 when reach is exactly 0 (a real zero-audience measurement)', () => {
    expect(computeCommentScore({ comments: 10, likes: 5, shares: 2, reach: 0 })).toBe(0);
  });

  it('returns 0 for a post with zero engagement', () => {
    expect(computeCommentScore({ comments: 0, likes: 0, shares: 0, reach: 1000 })).toBe(0);
  });

  it('weights comments higher than likes for the same count', () => {
    const commentHeavy = computeCommentScore({ comments: 10, likes: 0, shares: 0, reach: 100 });
    const likeHeavy = computeCommentScore({ comments: 0, likes: 10, shares: 0, reach: 100 });
    expect(commentHeavy).toBeGreaterThan(likeHeavy);
  });

  it('weights shares higher than likes but lower than comments for the same count', () => {
    const shareHeavy = computeCommentScore({ comments: 0, likes: 0, shares: 10, reach: 100 });
    const likeHeavy = computeCommentScore({ comments: 0, likes: 10, shares: 0, reach: 100 });
    const commentHeavy = computeCommentScore({ comments: 10, likes: 0, shares: 0, reach: 100 });
    expect(shareHeavy).toBeGreaterThan(likeHeavy);
    expect(commentHeavy).toBeGreaterThan(shareHeavy);
  });

  it('normalizes by reach so the same engagement scores lower on a bigger audience', () => {
    const smallReach = computeCommentScore({ comments: 50, likes: 0, shares: 0, reach: 500 });
    const bigReach = computeCommentScore({ comments: 50, likes: 0, shares: 0, reach: 50000 });
    expect(smallReach).toBeGreaterThan(bigReach);
  });

  it('clamps the score at 100 for extreme engagement relative to reach', () => {
    expect(computeCommentScore({ comments: 1000, likes: 1000, shares: 1000, reach: 10 })).toBe(100);
  });

  it('rounds to the nearest integer', () => {
    const score = computeCommentScore({ comments: 1, likes: 0, shares: 0, reach: 33 });
    expect(Number.isInteger(score)).toBe(true);
  });
});
