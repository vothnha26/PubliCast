/**
 * Base strategy for generating reports.
 * Following the Strategy Pattern for Open/Closed Principle (OCP).
 */
class ReportGeneratorStrategy {
  /**
   * Generate report file and return buffer/stream.
   * @param {string} title
   * @param {Object} brand
   * @param {Object} data - Processed analytics data
   * @param {Object} options - white label, brand colors, etc.
   * @returns {Promise<{buffer: Buffer, contentType: string, extension: string}>}
   */
  async generate(title, brand, data, options = {}) {
    throw new Error('Method "generate" must be implemented.');
  }
}

module.exports = ReportGeneratorStrategy;
