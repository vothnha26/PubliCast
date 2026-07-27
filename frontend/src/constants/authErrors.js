/**
 * GOOGLE_OAUTH_ERROR_CODES — mã lỗi query param (?error=) mà backend redirect về
 * khi OAuth callback thất bại, đồng bộ với ERROR_CODES trong backend/src/utils/constants.js.
 */
export const GOOGLE_OAUTH_ERROR_CODES = {
  ACCOUNT_NOT_LINKED: 'google_account_not_linked',
};
