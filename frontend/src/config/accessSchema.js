export const PLAN_TIERS = ["FREE", "STARTER", "PRO", "AGENCY", "ENTERPRISE"];

export const ACCESS_STRATEGIES = {
  HIDE: "HIDE",             // Ẩn phần tử khỏi DOM
  DISABLE: "DISABLE",       // Render nhưng disabled nút + hiển thị lý do
  UPGRADE: "UPGRADE",       // Bấm vào sẽ mở popup yêu cầu nâng cấp gói cước
  SHOW_ADS: "SHOW_ADS",     // Chèn quảng cáo xung quanh hoặc bắt xem quảng cáo
};

export const FEATURE_MAP = {
  // Quyền tạo bài viết
  CREATE_POSTS: {
    permissions: ["CREATE_POSTS"],
    minPlan: "FREE",
    fallbackStrategy: ACCESS_STRATEGIES.DISABLE,
    fallbackMessage: "Bạn cần có quyền tạo bài viết để sử dụng tính năng này."
  },
  
  // Tính năng import dữ liệu nâng cao
  IMPORT_CSV: {
    permissions: ["CREATE_POSTS"],
    minPlan: "PRO", // Chỉ dành cho gói PRO
    fallbackStrategy: ACCESS_STRATEGIES.UPGRADE,
    fallbackMessage: "Tính năng nhập bài viết từ CSV chỉ dành cho thành viên gói PRO."
  },

  // Phê duyệt bài viết
  APPROVE_POSTS: {
    permissions: ["APPROVE_POSTS"],
    minPlan: "FREE",
    fallbackStrategy: ACCESS_STRATEGIES.DISABLE,
    fallbackMessage: "Bạn không có quyền phê duyệt bài viết."
  },

  // Xóa bài viết
  DELETE_POSTS: {
    permissions: ["DELETE_POSTS"],
    minPlan: "FREE",
    fallbackStrategy: ACCESS_STRATEGIES.DISABLE,
    fallbackMessage: "Bạn không có quyền xóa bài viết."
  },

  // Mời thành viên mới
  INVITE_MEMBERS: {
    permissions: ["INVITE_MEMBERS"],
    minPlan: "FREE",
    fallbackStrategy: ACCESS_STRATEGIES.HIDE,
    fallbackMessage: "Bạn không có quyền mời thành viên."
  },

  // Quản lý vai trò (Role Management)
  MANAGE_ROLES: {
    permissions: ["MANAGE_ROLES"],
    minPlan: "FREE",
    fallbackStrategy: ACCESS_STRATEGIES.HIDE,
    fallbackMessage: "Bạn không có quyền quản lý vai trò."
  }
};
