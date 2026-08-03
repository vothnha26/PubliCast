const prisma = require('../../../config/prisma');
const subscriptionGate = require('../../subscription/subscription-gate.facade');
const AiProviderFactory = require('./providers/provider.factory');
const { PRODUCT_IDS } = require('../../../utils/constants');
const postService = require('../post.service');
const { buildSystemInstruction } = require('../../../config/ai.config');

class AiService {
  async getConfig() {
    const { AI_TONES, AI_LANGUAGES, AI_POST_FORMATS, DEFAULT_SUPPORTED_PLATFORMS } = require('../../../config/ai.config');
    return {
      supportedTones: Object.values(AI_TONES),
      supportedLanguages: Object.values(AI_LANGUAGES),
      supportedFormats: Object.values(AI_POST_FORMATS),
      defaultPlatforms: DEFAULT_SUPPORTED_PLATFORMS
    };
  }

  async getSettings(brandId) {
    let settings = await prisma.aIAssistant.findUnique({
      where: { brandId }
    });

    if (!settings) {
      settings = await prisma.aIAssistant.create({
        data: {
          brandId,
          defaultTone: 'PROFESSIONAL',
          defaultLanguage: 'vi',
          creditsLimit: 10,
          creditsUsed: 0,
          usageCountThisMonth: 0
        }
      });
    } else if (settings.creditsLimit > 10) {
      settings = await prisma.aIAssistant.update({
        where: { brandId },
        data: { creditsLimit: 10 }
      });
    }

    return settings;
  }

  async updateSettings(brandId, data) {
    await this.getSettings(brandId);

    // aiProvider/aiModel let a brand pick which already-configured provider
    // (OpenAI/Gemini) its generations use — null means "use the app-wide
    // AI_PROVIDER env default". This never stores a brand-supplied API key.
    // Only touch these fields when the caller actually sent them — passing
    // `undefined` to Prisma's update `data` leaves the column untouched,
    // whereas an empty-string/"" or unrecognized provider is treated as
    // "clear the override back to null" (explicit opt-out).
    const AI_PROVIDERS = ['OPENAI', 'GEMINI'];
    const updateData = {
      defaultTone: data.defaultTone,
      defaultLanguage: data.defaultLanguage,
      brandVoiceContext: data.brandVoiceContext,
      targetAudience: data.targetAudience,
      targetPlatforms: data.targetPlatforms
    };

    if ('aiProvider' in data) {
      const normalized = (data.aiProvider || '').toUpperCase();
      updateData.aiProvider = AI_PROVIDERS.includes(normalized) ? normalized : null;
    }
    if ('aiModel' in data) {
      updateData.aiModel = data.aiModel ? data.aiModel.trim() || null : null;
    }

    return prisma.aIAssistant.update({
      where: { brandId },
      data: updateData
    });
  }

  async generateContent(userId, brandId, { prompt, platform, tone, image, language, genre, situation }) {
    const hasAccess = await subscriptionGate.checkFeatureAccess(brandId, PRODUCT_IDS.AI_CONTENT_ENGINE);
    if (!hasAccess) {
      const error = new Error('Bạn không có quyền truy cập vào AI Content Engine. Vui lòng nâng cấp gói cước.');
      error.statusCode = 403;
      throw error;
    }

    const settings = await this.getSettings(brandId);
    if (settings.creditsUsed >= settings.creditsLimit) {
      const error = new Error('Hạn mức sử dụng AI hàng tháng của bạn đã hết.');
      error.statusCode = 403;
      throw error;
    }

    const toneToUse = tone || settings.defaultTone;
    const langToUse = language || settings.defaultLanguage || 'vi';

    const systemInstruction = buildSystemInstruction({
      language: langToUse,
      tone: toneToUse,
      genre,
      situation,
      brandVoiceContext: settings.brandVoiceContext,
      targetAudience: settings.targetAudience,
      targetPlatforms: platform || settings.targetPlatforms
    });

    const provider = AiProviderFactory.getProvider(settings.aiProvider);
    const result = await provider.generate(prompt, {
      tone: toneToUse,
      platform,
      image,
      systemInstruction,
      model: settings.aiModel || undefined
    });

    const updatedSettings = await prisma.aIAssistant.update({
      where: { brandId },
      data: {
        creditsUsed: { increment: 1 },
        usageCountThisMonth: { increment: 1 }
      }
    });

    await prisma.auditLog.create({
      data: {
        brandId,
        userId,
        action: 'AI_GENERATE_CONTENT',
        targetType: 'AI_ASSISTANT',
        details: JSON.stringify({
          prompt,
          tone: toneToUse,
          platform,
          language: langToUse,
          genre,
          situation,
          response: result.caption || '',
          hashtags: result.suggestedHashtags || [],
          adjustments: result.platformSpecificAdjustments || {}
        })
      }
    });

    return {
      ...result,
      creditsUsed: updatedSettings.creditsUsed,
      creditsLimit: updatedSettings.creditsLimit
    };
  }

  async quickPost(userId, brandId, postData) {
    return postService.createPost({
      title: postData.title || `AI Post - ${new Date().toLocaleDateString()}`,
      caption: postData.caption,
      hashtags: postData.hashtags || [],
      targetPlatforms: postData.targetPlatforms || [],
      autoListId: postData.autoListId || null,
      status: postData.status || 'DRAFT',
      isLibrary: postData.isLibrary || false
    }, userId, brandId);
  }

  async getHistory(brandId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          brandId,
          action: 'AI_GENERATE_CONTENT'
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.auditLog.count({
        where: {
          brandId,
          action: 'AI_GENERATE_CONTENT'
        }
      })
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}

module.exports = new AiService();
