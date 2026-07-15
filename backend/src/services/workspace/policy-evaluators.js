/**
 * Policy Evaluators — Strategy Pattern
 *
 * Single Source of Truth cho câu hỏi "chính sách phê duyệt này đã thỏa mãn để
 * chuyển workflow sang APPROVED chưa?", dựa hoàn toàn trên dữ liệu thực tế của
 * bảng quan hệ workflow_reviewers (không còn phụ thuộc selectedReviewers JSON).
 *
 * Pure functions — không I/O, không phụ thuộc Prisma — để dùng chung được ở cả
 * approval-workflow.service.js (reviewer chủ động duyệt) và team.service.js
 * (reviewer bị xóa khỏi nhóm khiến danh sách còn lại tự động đủ điều kiện).
 *
 * Thêm chính sách mới: thêm 1 entry vào POLICY_EVALUATORS bên dưới — không sửa
 * bất kỳ service nào đang gọi isSatisfied (Open/Closed Principle).
 */

const { WORKFLOW_POLICY, WORKFLOW_STATUS } = require('../../utils/constants');

const POLICY_EVALUATORS = {
  [WORKFLOW_POLICY.AT_LEAST_ONE]: {
    isSatisfied: (decisions) => decisions.some(d => d.status === WORKFLOW_STATUS.APPROVED)
  },
  [WORKFLOW_POLICY.ALL]: {
    isSatisfied: (decisions) => decisions.length > 0 && decisions.every(d => d.status === WORKFLOW_STATUS.APPROVED)
  }
};

module.exports = { POLICY_EVALUATORS };
