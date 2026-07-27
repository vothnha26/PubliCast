/**
 * logger.js
 * Tiện ích logging tập trung cho ứng dụng frontend.
 * Áp dụng Facade Pattern để quản lý tập trung và dễ dàng tích hợp dịch vụ giám sát lỗi (như Sentry) sau này.
 */

const IS_PROD = import.meta.env.PROD;

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

const formatMessage = (level, message) => {
  return `[PubliCast] [${level.toUpperCase()}] ${message}`;
};

export const logger = {
  debug: (message, ...args) => {
    if (!IS_PROD) {
      originalConsole.debug(formatMessage('debug', message), ...args);
    }
  },

  info: (message, ...args) => {
    if (!IS_PROD) {
      originalConsole.info(formatMessage('info', message), ...args);
    }
  },

  warn: (message, ...args) => {
    if (!IS_PROD) {
      originalConsole.warn(formatMessage('warn', message), ...args);
    }
  },

  error: (message, ...args) => {
    // Luôn log lỗi ra console trong dev, còn prod có thể gửi lỗi về Sentry
    if (!IS_PROD) {
      originalConsole.error(formatMessage('error', message), ...args);
    } else {
      // TODO: Tích hợp Sentry/LogRocket tại đây ở môi trường Production
      // Sentry.captureException(args[0] || new Error(message));
      originalConsole.error(formatMessage('error', message)); // Chỉ log thông điệp rút gọn
    }
  }
};

export default logger;
