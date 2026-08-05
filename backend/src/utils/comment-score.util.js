const { COMMENT_SCORE_WEIGHTS } = require('./constants');

// Comment Score: a 0-100 score weighting comment volume higher than likes/
// shares, since comments are the highest-effort engagement signal — a like
// costs one tap, a comment costs typing. Normalized by reach so a post with
// 50 comments on 500 reach doesn't lose to one with 50 comments on 50,000
// reach just because the latter also racked up more likes.

/**
 * @param {{ comments?: number, likes?: number, shares?: number, reach?: number|null }} metrics
 * @returns {number|null} 0-100, rounded to the nearest integer. `null` when
 *   reach is null/undefined (Threads has no real reach figure — see
 *   threads/index.js's _formatThreadsPost — so there's nothing to normalize
 *   against). A reach of exactly 0 still scores 0, since that's a real
 *   "zero audience" measurement rather than missing data.
 */
function computeCommentScore({ comments = 0, likes = 0, shares = 0, reach }) {
  if (reach == null) return null;
  if (!reach) return 0;

  const weighted = (comments * COMMENT_SCORE_WEIGHTS.COMMENT)
    + (likes * COMMENT_SCORE_WEIGHTS.LIKE)
    + (shares * COMMENT_SCORE_WEIGHTS.SHARE);
  const score = (weighted / reach) * 100;

  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { computeCommentScore };
