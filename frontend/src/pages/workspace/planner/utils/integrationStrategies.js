import postService from '@/services/post.service';
import calendarService from '@/services/calendar.service';
import { 
  parseCSVRow, 
  detectCSVFormat, 
  mapMetricoolRow, 
  mapPublicastRow 
} from '@/utils/csvHelper';

// --- HẰNG SỐ KHÔNG DÙNG MAGIC STRING ---
export const INTEGRATION_ACTIONS = {
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT'
};

export const INTEGRATION_FORMATS = {
  CSV: 'CSV',
  ICS: 'ICS'
};

/**
 * CsvIntegrationStrategy
 * Thực hiện phân tích, kiểm tra và gửi yêu cầu nhập/xuất cho định dạng CSV.
 */
export const CsvIntegrationStrategy = {
  format: INTEGRATION_FORMATS.CSV,
  
  parseAndValidate: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const raw = event.target.result;
          const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw; // Bỏ BOM
          const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
          
          if (lines.length <= 1) {
            return resolve({
              success: false,
              message: 'Tệp CSV trống hoặc chỉ chứa tiêu đề.',
              items: [],
              stats: { valid: 0, failed: 0 }
            });
          }

          const rawHeaders = parseCSVRow(lines[0]);
          const formatType = detectCSVFormat(rawHeaders);
          if (formatType === 'unknown') {
            return resolve({
              success: false,
              message: 'Định dạng tệp CSV không hợp lệ. Vui lòng sử dụng mẫu PubliCast hoặc Metricool.',
              items: [],
              stats: { valid: 0, failed: 0 }
            });
          }

          const items = [];
          const errorsList = [];
          let validCount = 0;
          let failedCount = 0;

          for (let i = 1; i < lines.length; i++) {
            const row = parseCSVRow(lines[i]);
            if (row.every(c => c === '')) continue;

            const p = formatType === 'metricool' ? mapMetricoolRow(row, rawHeaders) : mapPublicastRow(row, rawHeaders);
            
            if (!p.targetPlatforms || p.targetPlatforms.length === 0) {
              errorsList.push({
                row: i,
                title: p.title || p.caption || `Dòng ${i}`,
                error: 'Vui lòng chỉ định ít nhất một nền tảng (col: Platforms).'
              });
              failedCount++;
            } else {
              items.push({
                rowIndex: i,
                title: p.title || 'Imported Post',
                caption: p.caption || '',
                targetPlatforms: p.targetPlatforms,
                type: p.type || 'IMAGE',
                mediaUrls: p.mediaUrls || [],
                altText: p.altText || null,
                scheduledAt: p.scheduledAt ? new Date(p.scheduledAt).toISOString() : null,
                status: p.status || 'DRAFT',
                options: p.options || {},
                rawPayload: p
              });
              validCount++;
            }
          }

          resolve({
            success: true,
            formatType,
            items,
            errors: errorsList,
            stats: { valid: validCount, failed: failedCount }
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Không thể đọc tệp CSV.'));
      reader.readAsText(file, 'UTF-8');
    });
  },

  executeImport: async (brandId, items, onProgressRow) => {
    let successCount = 0;
    let failCount = 0;
    const errorsList = [];

    for (const item of items) {
      try {
        const createPayload = {
          brandId,
          title: item.title,
          caption: item.caption,
          targetPlatforms: item.targetPlatforms,
          type: item.type,
          mediaUrls: item.mediaUrls,
          altText: item.altText,
          scheduledAt: item.scheduledAt,
          status: item.status,
          options: item.options
        };
        await postService.createPost(createPayload);
        successCount++;
        if (onProgressRow) onProgressRow(item.rowIndex, true);
      } catch (err) {
        const errDetail = err.response?.data?.message || err.message;
        errorsList.push({
          row: item.rowIndex,
          title: item.title || `Dòng ${item.rowIndex}`,
          error: errDetail
        });
        failCount++;
        if (onProgressRow) onProgressRow(item.rowIndex, false, errDetail);
      }
    }

    return { successCount, failCount, errors: errorsList };
  },

  executeExport: async (brandId, options) => {
    // Gọi API của server để xuất dữ liệu CSV
    const { startDate, endDate } = options;
    const res = await calendarService.exportCsv(brandId, startDate, endDate);
    return {
      blob: res.data || res,
      filename: `publicast_export_${brandId}_${startDate}_to_${endDate}.csv`
    };
  }
};

/**
 * IcsIntegrationStrategy
 * Thực hiện phân tích, kiểm tra và gửi yêu cầu nhập/xuất cho định dạng ICS.
 */
export const IcsIntegrationStrategy = {
  format: INTEGRATION_FORMATS.ICS,

  parseAndValidate: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          
          // Phân tích file ICS phía client để hiển thị Preview trước khi lưu
          const rawLines = text.split(/\r?\n/);
          const lines = [];
          
          // Ghép dòng (unfolding)
          for (const line of rawLines) {
            if (line.startsWith(' ') || line.startsWith('\t')) {
              if (lines.length > 0) {
                lines[lines.length - 1] += line.slice(1);
              }
            } else {
              lines.push(line);
            }
          }

          const items = [];
          let currentEvent = null;
          let validCount = 0;
          let rowIndex = 0;

          const unescapeValue = (str) => {
            if (!str) return '';
            return str
              .replace(/\\n/gi, '\n')
              .replace(/\\,/g, ',')
              .replace(/\\;/g, ';')
              .replace(/\\\\/g, '\\');
          };

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === 'BEGIN:VEVENT') {
              currentEvent = {};
              rowIndex++;
            } else if (line === 'END:VEVENT') {
              if (currentEvent && currentEvent.title && currentEvent.date) {
                items.push({
                  rowIndex,
                  title: currentEvent.title,
                  caption: currentEvent.description || '',
                  scheduledAt: currentEvent.date.toISOString(),
                  targetPlatforms: currentEvent.platforms || 'GOOGLE_CALENDAR',
                  type: 'IMAGE',
                  mediaUrls: [],
                  status: currentEvent.status || 'SCHEDULED',
                  options: {}
                });
                validCount++;
              }
              currentEvent = null;
            } else if (currentEvent) {
              const match = line.match(/^([A-Z0-9-]+)(;[^:]+)?:(.*)$/i);
              if (match) {
                const key = match[1].toUpperCase();
                const value = match[3];

                if (key === 'SUMMARY') {
                  currentEvent.title = unescapeValue(value);
                } else if (key === 'DESCRIPTION') {
                  const desc = unescapeValue(value);
                  currentEvent.description = desc;
                  // Thử phân tích thêm nền tảng & trạng thái nếu là bài viết từ PubliCast
                  if (desc.includes('Nền tảng:')) {
                    const platMatch = desc.match(/Nền tảng:\s*([^\n]+)/);
                    if (platMatch) currentEvent.platforms = platMatch[1].trim();
                  }
                  if (desc.includes('Trạng thái:')) {
                    const statusMatch = desc.match(/Trạng thái:\s*([^\n]+)/);
                    if (statusMatch) currentEvent.status = statusMatch[1].trim();
                  }
                } else if (key === 'DTSTART') {
                  let dateStr = value;
                  if (dateStr.includes('VALUE=DATE:')) {
                    dateStr = dateStr.split('VALUE=DATE:')[1];
                  }
                  const y = dateStr.substring(0, 4);
                  const m = dateStr.substring(4, 6);
                  const d = dateStr.substring(6, 8);
                  if (y && m && d) {
                    let dateObj;
                    if (dateStr.includes('T')) {
                      const tStr = dateStr.split('T')[1];
                      const hh = tStr.substring(0, 2) || '00';
                      const mm = tStr.substring(2, 4) || '00';
                      const ss = tStr.substring(4, 6) || '00';
                      dateObj = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`);
                    } else {
                      dateObj = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
                    }
                    if (!isNaN(dateObj.getTime())) {
                      currentEvent.date = dateObj;
                    }
                  }
                }
              }
            }
          }

          if (items.length === 0) {
            return resolve({
              success: false,
              message: 'Không tìm thấy sự kiện hợp lệ nào trong tệp ICS.',
              items: [],
              stats: { valid: 0, failed: 0 }
            });
          }

          resolve({
            success: true,
            items,
            rawFile: file, // Giữ file thô để gửi lên backend khi bấm import
            stats: { valid: validCount, failed: 0 }
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Không thể đọc tệp ICS.'));
      reader.readAsText(file, 'UTF-8');
    });
  },

  executeImport: async (brandId, items, onProgressRow, parsedResult) => {
    const res = await calendarService.importIcs(brandId, parsedResult.rawFile);
    const importedCount = Array.isArray(res?.data || res) ? (res?.data || res).length : 0;
    return {
      successCount: importedCount,
      failCount: 0,
      errors: []
    };
  },

  executeExport: async (brandId, options) => {
    const { startDate, endDate } = options;
    const res = await calendarService.exportIcs(brandId, startDate, endDate);
    return {
      blob: res.data || res,
      filename: `publicast_calendar_${brandId}_${startDate}_to_${endDate}.ics`
    };
  }
};

/**
 * Factory pattern: Lấy tích hợp dựa trên định dạng
 */
export const getIntegrationStrategy = (format) => {
  if (format === INTEGRATION_FORMATS.CSV) return CsvIntegrationStrategy;
  if (format === INTEGRATION_FORMATS.ICS) return IcsIntegrationStrategy;
  throw new Error(`Định dạng tích hợp không được hỗ trợ: ${format}`);
};
