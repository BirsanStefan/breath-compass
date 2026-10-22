import { useEffect, useState } from 'react';

// Theme preference (per device): 'system' follows the OS, else 'dark' or 'light'.
// When the OS preference can't be detected, 'system' means dark.
export const THEMES = ['system', 'dark', 'light'];

const lightQuery = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

export const systemTheme = () => (lightQuery()?.matches ? 'light' : 'dark');

export const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
};

// Phase color palettes (per device), defined in styles/theme.css
export const PALETTES = ['default', 'soft', 'vivid', 'colorblind'];

export const usePalette = (palette = 'default') => {
  useEffect(() => {
    document.documentElement.dataset.palette = PALETTES.includes(palette) ? palette : 'default';
  }, [palette]);
};

// Resolves the preference to 'dark' or 'light', applies it to the page and
// follows OS changes while the preference is 'system'
export const useTheme = (preference = 'system') => {
  const [system, setSystem] = useState(systemTheme);

  useEffect(() => {
    const query = lightQuery();
    if (!query) return;
    const handleChange = () => setSystem(systemTheme());
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const theme = preference === 'dark' || preference === 'light' ? preference : system;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return theme;
};
