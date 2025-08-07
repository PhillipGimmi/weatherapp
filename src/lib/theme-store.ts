import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

// Get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

// Apply theme to document
const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // Check if elements exist before accessing them
  if (!root || !body) return;

  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  body.classList.remove('light', 'dark');

  // Add new theme class
  root.classList.add(theme);
  body.classList.add(theme);

  // Update color scheme meta tag
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute('content', theme);
  } else {
    const meta = document.createElement('meta');
    meta.name = 'color-scheme';
    meta.content = theme;
    if (document.head) {
      document.head.appendChild(meta);
    }
  }

  // Update theme attribute for next-themes compatibility
  root.setAttribute('data-theme', theme);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'dark',

      setTheme: (theme: Theme) => {
        let resolvedTheme: 'light' | 'dark';

        if (theme === 'system') {
          resolvedTheme = getSystemTheme();
        } else {
          resolvedTheme = theme;
        }

        set({ theme, resolvedTheme });
        applyTheme(resolvedTheme);

        // Listen for system theme changes if using system theme
        if (theme === 'system' && typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => {
            const newResolvedTheme = getSystemTheme();
            set({ resolvedTheme: newResolvedTheme });
            applyTheme(newResolvedTheme);
          };

          mediaQuery.addEventListener('change', handleChange);
          return () => mediaQuery.removeEventListener('change', handleChange);
        }
      },

      toggleTheme: () => {
        const { theme } = get();
        const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      initializeTheme: () => {
        const { theme } = get();
        let resolvedTheme: 'light' | 'dark';

        if (theme === 'system') {
          resolvedTheme = getSystemTheme();
        } else {
          resolvedTheme = theme;
        }

        set({ resolvedTheme });
        applyTheme(resolvedTheme);
      },
    }),
    {
      name: 'weather-app-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initializeTheme();
        }
      },
    }
  )
);

// Initialize theme on store creation (only on client side)
if (typeof window !== 'undefined') {
  // Wait for hydration to complete
  const initializeThemeAfterHydration = () => {
    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
      useThemeStore.getState().initializeTheme();
    } else {
      setTimeout(initializeThemeAfterHydration, 10);
    }
  };

  // Start initialization after a delay to avoid hydration issues
  setTimeout(initializeThemeAfterHydration, 100);
}
