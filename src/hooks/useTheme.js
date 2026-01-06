import { useState, useCallback, useEffect } from 'react';
import { getTheme, toggleTheme as serviceToggleTheme, applyTheme, THEMES } from '../services/themeService';

export const useTheme = () => {
  const [theme, setThemeState] = useState(() => getTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = serviceToggleTheme();
    setThemeState(newTheme);
  }, []);

  return {
    theme,
    toggleTheme,
    THEMES
  };
};
