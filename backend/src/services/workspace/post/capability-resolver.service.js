const { PLATFORM_SPECS } = require('../../../config/platform-capability.spec');
const prisma = require('../../../config/prisma');

/**
 * Resolve capability cho 1 platform & subType cụ thể.
 * Tải DB override từ platform_capability_overrides và hợp nhất với PLATFORM_SPECS.
 */
async function resolveCapability(platform, subType = 'POST') {
  const key = `${platform.toUpperCase()}_${subType.toUpperCase()}`;
  const spec = PLATFORM_SPECS[key];
  if (!spec) {
    throw new Error(`No capability spec for ${key}`);
  }

  const dbRow = await prisma.platformCapabilityOverride.findUnique({
    where: { platform: key }
  });
  const overrides = dbRow?.overrides || {};

  const resolvedConfigurable = {};
  for (const [field, cfg] of Object.entries(spec.configurable || {})) {
    resolvedConfigurable[field] = overrides[field] !== undefined ? overrides[field] : cfg.default;
  }

  return {
    platform: key,
    ...resolvedConfigurable,
    ...spec.fixed,
    isLocked: dbRow?.isLocked || false,
    lockReason: dbRow?.lockReason || null,
    _overriddenKeys: Object.keys(overrides)
  };
}

/**
 * Resolve capability cho tất cả 13 SubTypes.
 */
async function resolveAllCapabilities() {
  const dbRows = await prisma.platformCapabilityOverride.findMany();
  const dbRowMap = new Map(dbRows.map((r) => [r.platform, r]));

  const result = {};
  for (const [key, spec] of Object.entries(PLATFORM_SPECS)) {
    const dbRow = dbRowMap.get(key);
    const overrides = dbRow?.overrides || {};

    const resolvedConfigurable = {};
    for (const [field, cfg] of Object.entries(spec.configurable || {})) {
      resolvedConfigurable[field] = overrides[field] !== undefined ? overrides[field] : cfg.default;
    }

    result[key] = {
      platform: key,
      ...resolvedConfigurable,
      ...spec.fixed,
      isLocked: dbRow?.isLocked || false,
      lockReason: dbRow?.lockReason || null,
      _overriddenKeys: Object.keys(overrides)
    };
  }

  return result;
}

module.exports = {
  resolveCapability,
  resolveAllCapabilities
};
