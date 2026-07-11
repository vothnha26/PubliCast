import React from 'react';
import { useBrand } from "../../context/BrandContext";
import { useBrandPermission } from "../../hooks/useBrandPermission";
import { FEATURE_MAP, PLAN_TIERS } from "../../config/accessSchema";
import { ACCESS_STRATEGIES_REGISTRY } from "../../config/accessStrategies";

export function AccessGuard({ feature, children, fallback = null, overrideStrategy = null }) {
  const { activeBrand } = useBrand();
  const { hasPermission } = useBrandPermission();
  
  const config = FEATURE_MAP[feature];
  if (!config) return <>{children}</>;

  // 1. Kiểm tra Quyền (RBAC)
  const hasRequiredPermission = config.permissions.every(perm => hasPermission(perm));
  
  // 2. Kiểm tra Gói Cước (Subscription Tier)
  const currentPlan = (activeBrand?.currentPlan?.name || "FREE").toUpperCase();
  const requiredPlan = (config.minPlan || "FREE").toUpperCase();
  
  const hasRequiredPlan = PLAN_TIERS.indexOf(currentPlan) >= PLAN_TIERS.indexOf(requiredPlan);

  // 3. Quyết định trạng thái
  const isAllowed = hasRequiredPermission && hasRequiredPlan;
  if (isAllowed) {
    return <>{children}</>;
  }

  // 4. Tìm và thực thi Strategy tương ứng từ Registry
  const strategyName = overrideStrategy || config.fallbackStrategy;
  const executeStrategy = ACCESS_STRATEGIES_REGISTRY[strategyName];

  if (!executeStrategy) {
    console.warn(`Access Strategy "${strategyName}" is not registered.`);
    return fallback;
  }

  return executeStrategy(children, config, fallback);
}
