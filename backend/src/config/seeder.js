const prisma = require('./prisma');
const logger = require('../utils/logger');
const { PERMISSION_KEYS } = require('../utils/constants');

// UI metadata for each permission key. PERMISSION_KEYS (src/utils/constants.js) is
// the source of truth for which keys exist; this only supplies label/description/category
// for the ones that need to show up in the SystemPermission catalog. A key with no entry
// here still gets seeded (falls back to using the key itself as the label).
const PERMISSION_METADATA = {
  [PERMISSION_KEYS.CREATE_POSTS]: { label: 'Tạo bài đăng (Create Posts)', description: 'Tạo nháp, tải lên đa phương tiện vào Media Library', category: 'content' },
  [PERMISSION_KEYS.PUBLISH_POSTS]: { label: 'Đăng bài viết (Publish Posts)', description: 'Đăng trực tiếp bài viết lên mạng xã hội', category: 'content' },
  [PERMISSION_KEYS.APPROVE_POSTS]: { label: 'Phê duyệt bài đăng (Approve Posts)', description: 'Duyệt hoặc từ chối bài viết trong hàng đợi', category: 'content' },
  [PERMISSION_KEYS.DELETE_POSTS]: { label: 'Xóa bài viết (Delete Posts)', description: 'Xóa bài viết', category: 'content' },
  [PERMISSION_KEYS.MANAGE_MEDIA]: { label: 'Quản lý hình ảnh/Media (Manage Media)', description: 'Tải lên, xóa và quản lý thư viện hình ảnh/video', category: 'content' },
  [PERMISSION_KEYS.CREATE_LIVESTREAM]: { label: 'Quản lý Livestream (Manage Livestream)', description: 'Thiết lập, lên lịch và quản lý phát trực tiếp', category: 'content' },
  [PERMISSION_KEYS.MANAGE_CONNECTIONS]: { label: 'Liên kết MXH (Manage Connections)', description: 'Kết nối hoặc hủy kết nối các kênh mạng xã hội', category: 'management' },
  [PERMISSION_KEYS.MANAGE_TEAM]: { label: 'Quản lý thành viên (Manage Team)', description: 'Mời thành viên mới, cập nhật vai trò, trục xuất', category: 'management' },
  [PERMISSION_KEYS.INVITE_MEMBERS]: { label: 'Mời thành viên (Invite Members)', description: 'Mời thành viên mới vào thương hiệu', category: 'management' },
  [PERMISSION_KEYS.MANAGE_ROLES]: { label: 'Quản lý vai trò (Manage Roles)', description: 'Tạo, sửa và xóa vai trò tùy chỉnh', category: 'management' },
  [PERMISSION_KEYS.VIEW_ANALYTICS]: { label: 'Xem báo cáo (View Analytics)', description: 'Xem báo cáo, phân tích tương tác thương hiệu', category: 'management' }
};

async function seedSystemPermissions() {
  try {
    const data = Object.values(PERMISSION_KEYS).map((key) => ({
      key,
      ...(PERMISSION_METADATA[key] || { label: key })
    }));

    // skipDuplicates keeps any pre-existing row untouched (key is the @id) and only
    // inserts the ones missing — safe to run on every boot against a DB that already
    // has data from an older seed source.
    const result = await prisma.systemPermission.createMany({
      data,
      skipDuplicates: true
    });

    if (result.count > 0) {
      logger.info(`Seeded ${result.count} new system permission(s).`);
    }
  } catch (error) {
    logger.error('Failed to seed system permissions', error);
  }
}

module.exports = { seedSystemPermissions };
