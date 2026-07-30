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
import enMedialibrary from './locales/en/medialibrary.json';
import enNotifications from './locales/en/notifications.json';
import enHashtag from './locales/en/hashtag.json';
import enSmartlinks from './locales/en/smartlinks.json';
import enCompetitors from './locales/en/competitors.json';
import enReports from './locales/en/reports.json';

// Import all namespaces for VI
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viPlanner from './locales/vi/planner.json';
import viSettings from './locales/vi/settings.json';
import viTopbar from './locales/vi/topbar.json';
import viDashboard from './locales/vi/dashboard.json';
import viManage from './locales/vi/manage.json';
import viErrors from './locales/vi/errors.json';
import viMedialibrary from './locales/vi/medialibrary.json';
import viNotifications from './locales/vi/notifications.json';
import viHashtag from './locales/vi/hashtag.json';
import viSmartlinks from './locales/vi/smartlinks.json';
import viCompetitors from './locales/vi/competitors.json';
import viReports from './locales/vi/reports.json';

const savedLanguage = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || LANGUAGE_CODES.VI;

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
        medialibrary: enMedialibrary,
        notifications: enNotifications,
        hashtag: enHashtag,
        smartlinks: enSmartlinks,
        competitors: enCompetitors,
        reports: enReports,
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
        medialibrary: viMedialibrary,
        notifications: viNotifications,
        hashtag: viHashtag,
        smartlinks: viSmartlinks,
        competitors: viCompetitors,
        reports: viReports,
      },
    },
    lng: savedLanguage,
    fallbackLng: LANGUAGE_CODES.VI,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    defaultNS: 'common',
  });

export default i18n;
