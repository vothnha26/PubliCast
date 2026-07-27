import { PLATFORMS } from './platforms';

/**
 * PLATFORM_LIMITS — Giới hạn kỹ thuật từng nền tảng (theo tài liệu API chính thức).
 * Tập trung tại đây để validation trong usePostCreatorForm không dùng magic numbers.
 */
export const PLATFORM_LIMITS = {
  [PLATFORMS.FACEBOOK]: {
    REEL: {
      MIN_DURATION_SECONDS: 3,
      MAX_DURATION_SECONDS: 900, // 15 phút
      REQUIRED_ORIENTATION: 'vertical', // 9:16
    },
    STORY: {
      MAX_VIDEO_DURATION_SECONDS: 15,
      REQUIRED_ORIENTATION: 'vertical',
    },
  },
  [PLATFORMS.YOUTUBE]: {
    SHORT: {
      MAX_DURATION_SECONDS: 60,
      REQUIRED_ORIENTATION: 'vertical_or_square',
    },
  },
};

/**
 * VIDEO_EXTENSIONS — Các đuôi file video được chấp nhận.
 * Dùng thay cho chuỗi .endsWith(".mp4") rải rác.
 */
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm'];

/**
 * CLOUDINARY_VIDEO_MARKER — Dấu hiệu URL video từ Cloudinary.
 */
export const CLOUDINARY_VIDEO_MARKER = '/video/upload/';
