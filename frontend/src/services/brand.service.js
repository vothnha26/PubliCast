import apiService from './api';

class BrandService {
  async getBrands() {
    const response = await apiService.get('/brands');
    return response.data;
  }

  async createBrand(brandData) {
    const response = await apiService.post('/brands', brandData);
    return response.data;
  }

  async updateBrand(id, brandData) {
    const response = await apiService.put(`/brands/${id}`, brandData);
    return response.data;
  }

  async deleteBrand(id) {
    const response = await apiService.delete(`/brands/${id}`);
    return response.data;
  }
}

const brandService = new BrandService();
export default brandService;
