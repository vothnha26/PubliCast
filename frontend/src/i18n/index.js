import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LANGUAGE_CODES } from '../constants/language';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Import all namespaces for EN
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enPlanner from './locales/en/planner.json';
import enSettings from './locales/en/settings.json';
import enTopbar from './locales/en/topbar.json';
import enDashboard from './locales/en/dashboard.json';
import enManage from './locales/en/manage.json';
import enErrors from './locales/en/errors.json';

// Import all namespaces for VI
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viPlanner from './locales/vi/planner.json';
import viSettings from './locales/vi/settings.json';
import viTopbar from './locales/vi/topbar.json';
import viDashboard from './locales/vi/dashboard.json';
import viManage from './locales/vi/manage.json';
import viErrors from './locales/vi/errors.json';

const savedLanguage = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || LANGUAGE_CODES.EN;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        planner: enPlanner,
        settings: enSettings,
        topbar: enTopbar,
        dashboard: enDashboard,
        manage: enManage,
        errors: enErrors,
      },
      vi: {
        common: viCommon,
        auth: viAuth,
        planner: viPlanner,
        settings: viSettings,
        topbar: viTopbar,
        dashboard: viDashboard,
        manage: viManage,
        errors: viErrors,
      },
    },
    lng: savedLanguage,
    fallbackLng: LANGUAGE_CODES.EN,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    defaultNS: 'common',
  });

export default i18n;
