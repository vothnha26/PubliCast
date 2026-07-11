import { useBrand } from '../context/BrandContext';
import { PRODUCT_IDS } from '../constants/products';

export function useFeatureGate() {
  const { activeBrand } = useBrand();
  
  // Default to basic FREE plan features if not loaded or set
  const allowedProducts = activeBrand?.currentPlan?.allowedProducts || [
    PRODUCT_IDS.YOUTUBE_ANALYTICS,
    PRODUCT_IDS.FACEBOOK_MANAGEMENT
  ];
  const planName = activeBrand?.currentPlan?.name || 'FREE';

  const hasAccess = (productId) => {
    return allowedProducts.includes(productId);
  };

  return { hasAccess, allowedProducts, planName };
}
