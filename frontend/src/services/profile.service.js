import { apiV2 } from './api';

class ProfileService {
  async getUserProfile() {
    try {
      const data = await apiV2.get('/profile');
      return data;
    } catch (error) {
      if (error.status === 403) {
        return this.getAdminProfile();
      }
      throw error;
    }
  }

  async getAdminProfile() {
    const data = await apiV2.get('/profile/admin');
    return data;
  }

  async editProfile(payload) {
    const data = await apiV2.put('/profile/edit', payload);
    return data;
  }

  async setDefaultBrand(brandId) {
    const data = await apiV2.put('/profile/default-brand', { defaultBrandId: brandId });
    return data;
  }

  async unlinkAccount(provider) {
    const data = await apiV2.delete(`/profile/accounts/${provider}`);
    return data;
  }

  async changePassword(payload) {
    const data = await apiV2.put('/profile/change-password', payload);
    return data;
  }

  async getGoogleAuthUrl(state = 'settings') {
    const data = await apiV2.get(`/auth/google?state=${state}`);
    return data;
  }

  async getNotificationSettings() {
    const data = await apiV2.get('/profile/notification-settings');
    return data;
  }

  async updateNotificationSettings(payload) {
    const data = await apiV2.put('/profile/notification-settings', payload);
    return data;
  }
}

const profileService = new ProfileService();
export default profileService;
