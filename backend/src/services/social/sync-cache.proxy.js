const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { ANALYTICS } = require('../../utils/constants');

/**
 * Tạo một ES6 Proxy bọc quanh các Social Analytics Service để tối ưu hóa việc gọi API bằng cơ chế Caching.
 * Nếu tài khoản vừa được đồng bộ trong vòng COOLDOWN_HOURS giờ, trả về trực tiếp dữ liệu từ DB.
 * 
 * @param {object} realService - Social Analytics Service thật (ví dụ: facebook-analytics.service)
 * @returns {Proxy}
 */
function createSyncCacheProxy(realService) {
  return new Proxy(realService, {
    get(target, prop, receiver) {
      if (prop === 'syncChannelMetrics') {
        return async function (socialAccountId, startDate, endDate, force = false) {
          const account = await socialAccountRepository.findById(socialAccountId);
          if (!account) {
            throw new Error('Social account not found');
          }

          // Kiểm tra xem có yêu cầu bắt buộc (force refresh) hay không
          if (force) {
            console.log(`[SyncCacheProxy] Force refresh requested. Skipping cooldown for account ${socialAccountId} (${account.platform})...`);
            return target.syncChannelMetrics(socialAccountId, startDate, endDate, force);
          }

          // Tính toán Cooldown
          const cooldownMs = ANALYTICS.COOLDOWN_HOURS * 60 * 60 * 1000;
          const lastSync = account.lastSyncAt ? new Date(account.lastSyncAt).getTime() : 0;
          const hasCooldownPassed = Date.now() - lastSync >= cooldownMs;

          // Kiểm tra xem khoảng thời gian yêu cầu có khác với bản ghi gần nhất không
          const latestAnalytics = account.analytics?.[0];
          let isDifferentRange = true;
          let cacheRangeStr = 'none';

          if (latestAnalytics && startDate && endDate) {
            const cachedStart = new Date(latestAnalytics.dateFrom).toISOString().split('T')[0];
            const cachedEnd = new Date(latestAnalytics.dateTo).toISOString().split('T')[0];
            cacheRangeStr = `${cachedStart} to ${cachedEnd}`;

            // Cho phép endDate chênh lệch tối đa 1 ngày (vì "hôm nay" thường = cache ngày hôm qua)
            // nhưng chỉ khi cooldown vẫn còn active. Nếu cooldown hết thì vẫn sync bình thường.
            const endDateDiffMs = new Date(endDate).getTime() - new Date(cachedEnd).getTime();
            const endDateDiffDays = endDateDiffMs / (1000 * 60 * 60 * 24);
            const isStartSame = cachedStart === startDate;
            const isEndAcceptable = endDateDiffDays >= 0 && endDateDiffDays <= 1;

            if (isStartSame && isEndAcceptable) {
              isDifferentRange = false;
            }
          }

          if (!hasCooldownPassed && !isDifferentRange) {
            console.log(`[SyncCacheProxy] Serving cached data for account ${socialAccountId} (${account.platform}). Range matches: ${cacheRangeStr}. Cooldown active.`);
            return account;
          }

          if (isDifferentRange) {
            console.log(`[SyncCacheProxy] Sync triggered for ${account.platform} (${socialAccountId}). Range mismatch: Requesting ${startDate} to ${endDate}, but Cache has ${cacheRangeStr}`);
          } else {
            console.log(`[SyncCacheProxy] Sync triggered for ${account.platform} (${socialAccountId}). Cooldown passed or Force=true.`);
          }
          
          return target.syncChannelMetrics(socialAccountId, startDate, endDate, force);
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

module.exports = createSyncCacheProxy;
