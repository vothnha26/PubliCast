import { apiV2 } from './api';

class CalendarService {
  async exportCsv(brandId, startDate, endDate) {
    const res = await apiV2.get(`/posts/export-csv?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`, {
      responseType: 'blob'
    });
    return res;
  }

  async importIcs(brandId, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('brandId', brandId);
    const data = await apiV2.post('/calendar-events/import-ics', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  async exportIcs(brandId, startDate, endDate) {
    const res = await apiV2.get(`/calendar-events/export-ics?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`, {
      responseType: 'blob'
    });
    return res;
  }
}

const calendarService = new CalendarService();
export default calendarService;
