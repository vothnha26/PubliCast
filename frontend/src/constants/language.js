/**
 * LANGUAGE_CODES — Supported UI language codes.
 * No magic strings — always reference these constants.
 */
export const LANGUAGE_CODES = {
  EN: 'en',
  VI: 'vi',
};

/**
 * LANGUAGES — Ordered list of language options for the UI selector.
 */
export const LANGUAGES = [
  { code: LANGUAGE_CODES.EN, label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  { code: LANGUAGE_CODES.VI, label: 'Vietnamese', nativeLabel: 'Tiếng Việt', flag: '🇻🇳' },
];
