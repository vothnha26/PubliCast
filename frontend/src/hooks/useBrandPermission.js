import { useBrand } from '../context/BrandContext';

export function useBrandPermission() {
  const { activeBrand } = useBrand();

  const hasPermission = (permissionKey) => {
    if (!activeBrand) return false;

    // Owner and Admin have full access to all features
    if (
      activeBrand.isOwner ||
      activeBrand.userRole === 'OWNER' ||
      activeBrand.userRole === 'ADMIN'
    ) {
      return true;
    }

    // Check specific permission in the userPermissions array
    const permissions = activeBrand.userPermissions || [];
    return permissions.some(p =>
      (p.key === permissionKey || p.permissionKey === permissionKey) &&
      p.isAllowed === true
    );
  };

  return { hasPermission };
}
