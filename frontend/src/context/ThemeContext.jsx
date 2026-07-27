import { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { THEME_MODES } from '../constants/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    // Migrate legacy 'system' value to light
    if (saved === 'system' || !Object.values(THEME_MODES).includes(saved)) {
      return THEME_MODES.LIGHT;
    }
    return saved || THEME_MODES.LIGHT;
  });

  const setTheme = (newTheme) => {
    if (!Object.values(THEME_MODES).includes(newTheme)) {
      console.warn(`Invalid theme mode: ${newTheme}`);
      return;
    }
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === THEME_MODES.DARK) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
