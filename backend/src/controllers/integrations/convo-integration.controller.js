const prisma = require('../../config/prisma');
const asyncHandler = require('../../utils/async-handler');
const authorizationFacade = require('../../services/auth/authorization.facade');
const { PERMISSION_KEYS } = require('../../utils/constants');

// Permission keys exposed to external integrations (Convo). Kept as an
// explicit allowlist rather than iterating every PERMISSION_KEYS entry —
// deciding which internal permissions are meaningful to an external caller
// is a product decision, not something a new key should silently opt into.
const EXPOSED_PERMISSION_KEYS = [
  PERMISSION_KEYS.MANAGE_CONNECTIONS,
  PERMISSION_KEYS.CREATE_POSTS,
  PERMISSION_KEYS.PUBLISH_POSTS
];

class ConvoIntegrationController {
  /**
   * POST /api/integrations/verify-token
   * req.verifiedPayload / req.integrationClient are set by verifyHmac()
   * middleware — brandId/userId here have already been through the HMAC
   * signature check, so they are NOT attacker-controlled independently of
   * the signed payload (prevents a confused-deputy where the response
   * would otherwise trust a brandId taken from elsewhere).
   */
  verifyToken = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.verifiedPayload;

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, deletedAt: null },
      include: { subscription: { include: { plan: true } } }
    });

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null }
    });

    if (!brand || !user) {
      return res.status(200).json({ valid: false });
    }

    return res.status(200).json({
      valid: true,
      brandId: brand.id,
      brandName: brand.name,
      publicastUserId: user.id,
      planName: brand.subscription?.plan?.name ?? null
    });
  });

  /**
   * GET /api/integrations/brand/:brandId/user-permissions
   * Query: publicastUserId (per SPEC.md §5.2). Always a live query — never
   * cache permissions beyond the single request, since role/permission
   * changes must take effect immediately.
   *
   * brandId/publicastUserId are read from req.verifiedPayload (set by
   * verifyHmac('headers')) — NOT from req.params/req.query independently —
   * because those URL/query values are attacker-controlled and have not
   * been through the signature check. Using them directly would let anyone
   * with one valid signature (for any brand) probe every other brand's
   * permissions by changing the URL param (confused deputy).
   */
  getUserPermissions = asyncHandler(async (req, res) => {
    const { brandId, userId: publicastUserId } = req.verifiedPayload;

    if (req.params.brandId !== brandId || req.query.publicastUserId !== publicastUserId) {
      return res.status(400).json({ message: 'URL/query parameters do not match signed payload' });
    }

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, deletedAt: null }
    });
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    const isOwner = brand.ownerId === publicastUserId;
    const membership = isOwner
      ? null
      : await prisma.team.findUnique({
          where: { brandId_userId: { brandId, userId: publicastUserId } }
        });

    if (!isOwner && (!membership || membership.status !== 'ACTIVE')) {
      return res.status(403).json({ message: 'User has no access to this brand' });
    }

    const permissionEntries = await Promise.all(
      EXPOSED_PERMISSION_KEYS.map(async (key) => [
        key,
        await authorizationFacade.checkPermission(publicastUserId, brandId, key)
      ])
    );

    return res.status(200).json({
      userId: publicastUserId,
      brandId,
      role: isOwner ? 'OWNER' : membership.role,
      isOwner,
      permissions: Object.fromEntries(permissionEntries)
    });
  });
}

module.exports = new ConvoIntegrationController();
