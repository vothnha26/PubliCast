import { ValidationOperatorRegistry } from './operatorRegistry';

export class PostValidationEngine {
  /**
   * Đánh giá danh sách quy tắc động đối với context bài đăng hiện tại
   * @param {Object} platformLimit Cấu hình limits của nền tảng chứa trường rules JSON
   * @param {Object} enrichedContext Context bài đăng đã được chuẩn hóa và tính toán thêm thông số
   * @returns {string[]} Mảng các chuỗi thông báo lỗi đã format
   */
  static evaluateRules(platformLimit, enrichedContext) {
    const errors = [];
    if (!platformLimit) return errors;

    // TẦNG PHÒNG VỆ (GUARD CLAUSES) TRÁNH CRASH CLIENT
    if (!platformLimit.rules || typeof platformLimit.rules !== 'object') {
      console.warn(`No rules object configured for platform ${platformLimit.platform}`);
      return errors;
    }

    const { subType } = platformLimit;
    const alwaysRules = platformLimit.rules._always || [];
    const subtypeRules = platformLimit.rules[subType.toLowerCase()] || [];

    if (!Array.isArray(alwaysRules) || !Array.isArray(subtypeRules)) {
      console.warn(`Rules config structure is invalid for platform ${platformLimit.platform}`);
      return errors;
    }

    const allRules = [...alwaysRules, ...subtypeRules];

    for (const rule of allRules) {
      if (!rule || !rule.id || !rule.field || !rule.operator) {
        continue; // Bỏ qua rule bị hỏng cấu trúc
      }

      // Tối ưu hóa: Bỏ qua kiểm tra các thông số video nếu bài đăng hiện tại không chứa video
      if (['videoDuration', 'videoRatio', 'videoWidth', 'videoHeight'].includes(rule.field) && !enrichedContext.isVideo) {
        continue;
      }
      
      const strategy = ValidationOperatorRegistry.get(rule.operator);
      if (!strategy) {
        console.warn(`Operator strategy not found: ${rule.operator}`);
        continue;
      }

      const rawValue = enrichedContext[rule.field];
      if (strategy.evaluate(rawValue, rule.value, enrichedContext)) {
        // Đẩy lỗi dạng string tương thích với parseValidationError của UI cũ
        errors.push(this.formatMessage(rule, enrichedContext));
      }
    }

    return errors;
  }
  
  /**
   * Định dạng câu thông báo lỗi động, thay thế các biến token dạng {variable} thành giá trị thực tế
   * @param {Object} rule Quy tắc vi phạm
   * @param {Object} context Context bài đăng
   * @returns {string} Chuỗi lỗi đã format chuẩn: [PLATFORM - RULEID] Message
   */
  static formatMessage(rule, context) {
    let msg = rule.message || "Vi phạm quy tắc.";
    
    // Tổng hợp tất cả các token có thể dùng để render thông điệp động
    const tokens = { 
      ...context, 
      limitValue: rule.value 
    };

    // Replace các token {variable} bằng giá trị thực
    msg = msg.replace(/{(\w+)}/g, (match, key) => {
      return tokens[key] !== undefined ? tokens[key] : match;
    });
    
    // Gắn platform và rule ID viết hoa để ComposerErrorPanel.jsx phân tích
    const platformUpper = context.platform.toUpperCase();
    const ruleIdUpper = rule.id.toUpperCase();
    return `[${platformUpper} - ${ruleIdUpper}] ${msg}`;
  }
}
