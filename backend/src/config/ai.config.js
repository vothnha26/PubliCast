/**
 * Centralized AI Configurations for PubliCast Content Engine.
 * Following SOLID principles to avoid magic strings and ensure easy extensibility.
 */

const AI_TONES = {
  PROFESSIONAL: { value: 'PROFESSIONAL', label: 'Chuyên nghiệp', emoji: '💼' },
  CASUAL: { value: 'CASUAL', label: 'Thân thiện', emoji: '🌟' },
  FUNNY: { value: 'FUNNY', label: 'Hài hước', emoji: '😂' },
  INSPIRATIONAL: { value: 'INSPIRATIONAL', label: 'Truyền cảm hứng', emoji: '✨' },
  URGENT: { value: 'URGENT', label: 'Khẩn cấp', emoji: '🚨' },
  EDUCATIONAL: { value: 'EDUCATIONAL', label: 'Giáo dục', emoji: '💡' }
};

const AI_LANGUAGES = {
  VI: 'vi',
  EN: 'en'
};

const AI_POST_FORMATS = {
  CAPTION: { value: 'Caption', label: 'Caption ngắn', emoji: '📝', description: 'Caption ngắn gọn kèm hashtag thu hút' },
  ARTICLE: { value: 'Article', label: 'Bài viết dài', emoji: '📰', description: 'Bài viết chia sẻ kiến thức chi tiết' },
  STORY: { value: 'Story', label: 'Kịch bản Story/Reels', emoji: '⚡', description: 'Nội dung ngắn, kịch tính cho Reels/Story' },
  HOOK: { value: 'Hook', label: 'Tiêu đề giật tít', emoji: '🎯', description: 'Các câu tiêu đề gây tò mò, thu hút click' }
};

const DEFAULT_SUPPORTED_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'tiktok'];

/**
 * Dynamically constructs the response schema contract based on active target platforms.
 * Fully supports extending new platforms at runtime without code modifications.
 */
function generateResponseSchema(platforms = DEFAULT_SUPPORTED_PLATFORMS) {
  const adjustments = {};
  
  platforms.forEach(platform => {
    const key = platform.trim().toLowerCase();
    if (key) {
      adjustments[key] = `adjusted caption copy optimized specifically for ${platform}`;
    }
  });

  return {
    caption: "The main copy optimized for the default platform",
    suggestedHashtags: ["hashtag1", "hashtag2"],
    platformSpecificAdjustments: adjustments
  };
}

const OPENAI_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  API_URL: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions'
};

const GEMINI_CONFIG = {
  MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  // No {apiKey} placeholder — the key travels via the x-goog-api-key header
  // instead of the URL query string, where it would otherwise get logged by
  // proxies/APM/error trackers (#108 I11).
  API_URL_TEMPLATE: process.env.GEMINI_API_URL_TEMPLATE || 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
};

/**
 * Dynamically compiles the JS schema object into a clear string instruction for the LLM.
 * Avoids hardcoded multiline string contracts.
 */
function compileResponseSchemaInstruction(schema) {
  const targetSchema = schema || generateResponseSchema();
  const jsonTemplate = JSON.stringify(targetSchema, null, 2);
  
  return `You MUST output your response in valid JSON format. The JSON object MUST strictly adhere to the following schema structure:
\`\`\`json
${jsonTemplate}
\`\`\`
Make sure all keys exist and are populated with the correct data types. Do not include any introductory or concluding text, only the raw JSON.`;
}

/**
 * Builds the comprehensive system instruction for LLM providers.
 * Decoupled from concrete provider implementations (OpenAI / Gemini).
 */
function buildSystemInstruction({ language, tone, genre, situation, brandVoiceContext, targetAudience, targetPlatforms, customSchema }) {
  let instructions = `You are a social media copywriter AI assistant. You generate engaging copy based on user input, brand context, tone, and platform requirements.\n`;
  instructions += `Language request: ${language || 'vi'}\n`;
  instructions += `Tone requested: ${tone || 'PROFESSIONAL'}\n`;

  if (genre) {
    instructions += `Genre/Writing style requested: ${genre}\n`;
  }
  if (situation) {
    instructions += `Context/Situation: ${situation}\n`;
  }
  if (brandVoiceContext) {
    instructions += `Brand Voice Context: ${brandVoiceContext}\n`;
  }
  if (targetAudience) {
    instructions += `Target Audience: ${targetAudience}\n`;
  }
  if (targetPlatforms) {
    instructions += `Target Platforms: ${targetPlatforms}\n`;
  }

  // Determine platforms for the response schema
  let schema = customSchema;
  if (!schema) {
    let platformList = DEFAULT_SUPPORTED_PLATFORMS;
    if (targetPlatforms) {
      // Handle comma-separated list or custom formats
      platformList = targetPlatforms
        .split(/[,,;]/)
        .map(p => p.trim().toLowerCase())
        .filter(Boolean);
    }
    schema = generateResponseSchema(platformList);
  }

  instructions += `\n${compileResponseSchemaInstruction(schema)}`;
  return instructions;
}

module.exports = {
  AI_TONES,
  AI_LANGUAGES,
  AI_POST_FORMATS,
  DEFAULT_SUPPORTED_PLATFORMS,
  generateResponseSchema,
  OPENAI_CONFIG,
  GEMINI_CONFIG,
  compileResponseSchemaInstruction,
  buildSystemInstruction
};
