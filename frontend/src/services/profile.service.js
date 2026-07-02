import apiService from './api';

class ProfileService {
  async getUserProfile() {
    try {
      const response = await apiService.get('/user/profile');
      return response.data;
    } catch (error) {
      if (error.status === 403) {
        return this.getAdminProfile();
      }
      throw error;
    }
  }

  async getAdminProfile() {
    const response = await apiService.get('/admin/profile');
    return response.data;
  }

  async editProfile(payload) {
    const response = await apiService.put('/profile/edit', payload);
    return response.data;
  }

  async setDefaultBrand(brandId) {
    const response = await apiService.put('/profile/default-brand', { defaultBrandId: brandId });
    return response.data;
  }
}

const profileService = new ProfileService();
export default profileService;
