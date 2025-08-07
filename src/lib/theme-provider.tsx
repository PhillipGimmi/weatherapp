'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useThemeStore, Theme } from './theme-store';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme, setTheme, toggleTheme, initializeTheme } =
    useThemeStore();

  useEffect(() => {
    // Initialize theme on mount, but wait for hydration to complete
    const timer = setTimeout(() => {
      initializeTheme();
    }, 100);

    return () => clearTimeout(timer);
  }, [initializeTheme]);

  useEffect(() => {
    // Listen for system theme changes
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        const newResolvedTheme = mediaQuery.matches ? 'dark' : 'light';
        useThemeStore.setState({ resolvedTheme: newResolvedTheme });

        // Apply theme to document
        const root = document.documentElement;
        const body = document.body;

        if (root && body) {
          root.classList.remove('light', 'dark');
          body.classList.remove('light', 'dark');

          root.classList.add(newResolvedTheme);
          body.classList.add(newResolvedTheme);
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
