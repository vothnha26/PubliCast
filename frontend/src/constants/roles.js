/**
 * MEMBER_STATUS — Trạng thái thành viên trong team.
 */
export const MEMBER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
};

/**
 * SYSTEM_ROLES — Role cố định của hệ thống (không thể xóa/sửa).
 * Dùng cho filter UI và kiểm tra permission.
 */
export const SYSTEM_ROLES = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  ANALYST: 'Analyst',
};

/**
 * ASSIGNABLE_ROLES — Danh sách role có thể gán cho thành viên (không bao gồm Owner).
 * Dùng cho dropdown invite/role change.
 */
export const ASSIGNABLE_ROLES = [
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.MEMBER,
  SYSTEM_ROLES.ANALYST,
];

/**
 * TEAM_FILTER_ROLES — Danh sách role cho filter UI, bao gồm "All".
 */
export const TEAM_FILTER_ROLES = ['All', SYSTEM_ROLES.OWNER, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.MEMBER];
