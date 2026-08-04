/**
 * TEMPLATE_FORMAT / TEMPLATE_GOAL — đồng bộ với backend enum TemplateFormat/
 * TemplateGoal. Closed classification sets for Featured Templates (unlike
 * TemplateCategory.name, which is free text).
 */
export const TEMPLATE_FORMAT = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  TEXT: 'TEXT',
  CAROUSEL: 'CAROUSEL',
};

export const TEMPLATE_FORMAT_LABELS = {
  [TEMPLATE_FORMAT.IMAGE]: 'Image',
  [TEMPLATE_FORMAT.VIDEO]: 'Video',
  [TEMPLATE_FORMAT.TEXT]: 'Text',
  [TEMPLATE_FORMAT.CAROUSEL]: 'Carousel',
};

export const TEMPLATE_GOAL = {
  ENGAGEMENT: 'ENGAGEMENT',
  BRAND_AWARENESS: 'BRAND_AWARENESS',
  EDUCATION: 'EDUCATION',
  COMMUNITY: 'COMMUNITY',
  SALES: 'SALES',
};

export const TEMPLATE_GOAL_LABELS = {
  [TEMPLATE_GOAL.ENGAGEMENT]: 'Engagement',
  [TEMPLATE_GOAL.BRAND_AWARENESS]: 'Brand Awareness',
  [TEMPLATE_GOAL.EDUCATION]: 'Education',
  [TEMPLATE_GOAL.COMMUNITY]: 'Community',
  [TEMPLATE_GOAL.SALES]: 'Sales',
};
