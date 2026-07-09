import { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { THEME_MODES } from '../constants/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    return savedTheme || THEME_MODES.SYSTEM;
  });

  const [activeTheme, setActiveTheme] = useState(() => {
    // Giá trị khởi tạo tạm thời của activeTheme
    if (theme === THEME_MODES.SYSTEM) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? THEME_MODES.DARK
        : THEME_MODES.LIGHT;
    }
    return theme;
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
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let resolvedTheme = theme;

      if (theme === THEME_MODES.SYSTEM) {
        resolvedTheme = mediaQuery.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT;
      }

      setActiveTheme(resolvedTheme);

      if (resolvedTheme === THEME_MODES.DARK) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    // Lắng nghe thay đổi của hệ thống nếu đang ở chế độ SYSTEM
    const handleChange = () => {
      if (theme === THEME_MODES.SYSTEM) {
        applyTheme();
      }
    };

    // Tương thích với các trình duyệt cũ hơn
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, activeTheme, setTheme }}>
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
