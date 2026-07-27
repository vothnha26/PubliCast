/**
 * SOCIAL.CONNECTED không còn được emit ở bất kỳ đâu — social-account.repository.js
 * ghi outbox row SOCIAL_SYNC_ENQUEUE trực tiếp trong cùng transaction với việc lưu
 * socialAccount (xem outbox-handlers.js), thay vì emit sự kiện để subscriber này lắng
 * nghe rồi mới enqueue job rời rạc, không transaction, không retry.
 *
 * Giữ initSocialSubscriber() là no-op (thay vì xóa hẳn) để app.js không cần đổi theo.
 */
function initSocialSubscriber() {
  console.log('[Social Subscriber] No-op: SOCIAL.CONNECTED handling moved to outbox (SOCIAL_SYNC_ENQUEUE).');
}

module.exports = {
  initSocialSubscriber
};
