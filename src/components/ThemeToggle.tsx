'use client';

import { useTheme } from '@/lib/use-theme';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientOnly } from './ClientOnly';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <ClientOnly
      fallback={
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-full bg-accent/50 border border-border text-foreground hover:bg-accent transition-all duration-200 hover:scale-105"
          disabled
        >
          <Sun className="w-4 h-4" />
        </Button>
      }
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="w-9 h-9 rounded-full bg-accent/50 border border-border text-foreground hover:bg-accent transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10 group"
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
        )}
      </Button>
    </ClientOnly>
  );
}
