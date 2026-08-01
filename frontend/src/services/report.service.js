import { apiV2 } from './api';

class ReportService {
  async getReports(brandId) {
    const data = await apiV2.get(`/analytics-support/reports?brandId=${brandId}`);
    return data;
  }

  async createReport(brandId, payload) {
    const data = await apiV2.post(`/analytics-support/reports?brandId=${brandId}`, payload);
    return data;
  }

  async deleteReport(id, brandId) {
    const data = await apiV2.delete(`/analytics-support/reports/${id}?brandId=${brandId}`);
    return data;
  }

  async downloadReport(reportId, brandId) {
    const data = await apiV2.get(`/analytics-support/reports/${reportId}/download?brandId=${brandId}`, {
      responseType: 'blob'
    });
    return data;
  }

  async getPreviewData(brandId, dateRange, platforms) {
    const data = await apiV2.get(`/analytics-support/reports/preview-data`, {
      params: { brandId, dateRange, platforms }
    });
    return data;
  }

  async getScheduleConfig(brandId) {
    const data = await apiV2.get(`/analytics-support/reports/schedule-config?brandId=${brandId}`);
    return data;
  }

  async saveScheduleConfig(brandId, payload) {
    const data = await apiV2.post(`/analytics-support/reports/schedule-config?brandId=${brandId}`, payload);
    return data;
  }

  async sendTestReport(brandId, payload) {
    const data = await apiV2.post(`/analytics-support/reports/send-test?brandId=${brandId}`, payload);
    return data;
  }
}

const reportService = new ReportService();
export default reportService;
