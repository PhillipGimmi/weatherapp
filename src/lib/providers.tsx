'use client';

import { ThemeProvider as CustomThemeProvider } from './theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return <CustomThemeProvider>{children}</CustomThemeProvider>;
}
