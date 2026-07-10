const HashtagAnalysisStrategy = require('./HashtagAnalysisStrategy');
const hashtagAnalysisGenerator = require('../hashtag-analysis-generator');

class MockAnalysisStrategy extends HashtagAnalysisStrategy {
  async analyze(hashtag, tracker) {
    const platform = tracker?.platform || 'INSTAGRAM';
    return hashtagAnalysisGenerator.generate(hashtag, platform);
  }
}

module.exports = MockAnalysisStrategy;
