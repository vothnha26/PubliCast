import { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { LANGUAGE_CODES } from '../constants/language';

import i18n from 'i18next';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return Object.values(LANGUAGE_CODES).includes(saved)
      ? saved
      : LANGUAGE_CODES.EN;
  });

  const setLanguage = (newLang) => {
    if (!Object.values(LANGUAGE_CODES).includes(newLang)) {
      console.warn(`Invalid language code: ${newLang}`);
      return;
    }
    setLanguageState(newLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
    i18n.changeLanguage(newLang);
  };

  // Keep <html lang="..."> in sync for accessibility & SEO
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
