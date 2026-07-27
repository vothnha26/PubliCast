const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

/**
 * Get all connected ad accounts and their aggregated performance analytics
 */
exports.getAdPerformanceData = async (req, res, next) => {
  try {
    const { brandId, dateFrom, dateTo } = req.query;

    if (!brandId) {
      return res.status(400).json({ message: 'Missing brandId parameter' });
    }

    const start = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = dateTo ? new Date(dateTo) : new Date();

    // Fetch ad accounts for this brand
    const adAccounts = await prisma.adAccount.findMany({
      where: { brandId, isActive: true }
    });

    // Fetch ad analytics aggregated by campaign / day
    const analytics = await prisma.analytics.findMany({
      where: {
        brandId,
        adAccountId: { not: null },
        dateFrom: { gte: start },
        dateTo: { lte: end }
      },
      include: {
        adAnalytics: true
      },
      orderBy: { dateFrom: 'asc' }
    });

    return res.status(200).json({
      adAccounts,
      analytics: analytics.map(a => ({
        id: a.id,
        adAccountId: a.adAccountId,
        dateFrom: a.dateFrom,
        dateTo: a.dateTo,
        ...a.adAnalytics
      }))
    });
  } catch (error) {
    logger.error('Error in getAdPerformanceData:', error);
    next(error);
  }
};

/**
 * Toggle campaign status (simulation of pause/resume)
 */
exports.toggleCampaignStatus = async (req, res, next) => {
  try {
    const { adAccountId, campaignId, status } = req.body;

    if (!adAccountId || !campaignId || !status) {
      return res.status(400).json({ message: 'Missing required parameters: adAccountId, campaignId, status' });
    }

    // In a real application, we would call Meta Ads API or Google Ads API here
    // For local simulation, we return a success status
    logger.info(`Simulated campaign toggle: AdAccount=${adAccountId}, Campaign=${campaignId}, NewStatus=${status}`);

    return res.status(200).json({
      message: `Campaign status updated successfully to ${status}`,
      campaignId,
      status
    });
  } catch (error) {
    logger.error('Error in toggleCampaignStatus:', error);
    next(error);
  }
};

/**
 * Connect a new simulated ad account
 */
exports.connectAdAccount = async (req, res, next) => {
  try {
    const { brandId, platform, accountName, currency } = req.body;

    if (!brandId || !platform || !accountName) {
      return res.status(400).json({ message: 'Missing required parameters to connect ad account' });
    }

    const platformAccountId = `act_${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newAdAccount = await prisma.adAccount.create({
      data: {
        brandId,
        platform,
        platformAccountId,
        accountName,
        currency: currency || 'USD',
        timezone: 'Asia/Ho_Chi_Minh',
        accessToken: `simulated_token_${Math.random().toString(36).substring(2)}`,
        isActive: true,
        lastSyncAt: new Date()
      }
    });

    return res.status(201).json({
      message: 'Ad account connected successfully',
      data: newAdAccount
    });
  } catch (error) {
    logger.error('Error in connectAdAccount:', error);
    next(error);
  }
};
