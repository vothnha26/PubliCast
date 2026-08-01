import { apiV2 } from './api';

class BrandService {
  async getBrands() {
    const data = await apiV2.get('/workspace/brands');
    return data;
  }

  async createBrand(brandData) {
    const data = await apiV2.post('/workspace/brands', brandData);
    return data;
  }

  async updateBrand(id, brandData) {
    const data = await apiV2.put(`/workspace/brands/${id}`, brandData);
    return data;
  }

  async deleteBrand(id) {
    const data = await apiV2.delete(`/workspace/brands/${id}`);
    return data;
  }
}

const brandService = new BrandService();
export default brandService;
