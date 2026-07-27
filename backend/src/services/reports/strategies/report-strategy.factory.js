const { REPORT_FORMATS } = require('../../../utils/constants');
const PdfReportStrategy = require('./pdf-report.strategy');
const CsvReportStrategy = require('./csv-report.strategy');

class ReportStrategyFactory {
  constructor() {
    this.strategies = {
      [REPORT_FORMATS.PDF]: new PdfReportStrategy(),
      [REPORT_FORMATS.CSV]: new CsvReportStrategy()
    };
  }

  /**
   * Get report generator strategy based on format
   * @param {string} format 
   * @returns {ReportGeneratorStrategy}
   */
  getStrategy(format) {
    const formattedKey = (format || '').toUpperCase();
    
    // Map "EXCEL" format from frontend modal to CSV
    if (formattedKey === 'EXCEL' || formattedKey === REPORT_FORMATS.CSV) {
      return this.strategies[REPORT_FORMATS.CSV];
    }
    
    if (formattedKey === REPORT_FORMATS.PDF) {
      return this.strategies[REPORT_FORMATS.PDF];
    }

    // Default fallback to PDF
    return this.strategies[REPORT_FORMATS.PDF];
  }
}

const reportStrategyFactory = new ReportStrategyFactory();
module.exports = reportStrategyFactory;
