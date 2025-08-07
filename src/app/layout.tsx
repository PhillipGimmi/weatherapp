import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Weather App - South Africa',
  description:
    'A beautiful mobile-first weather application for South Africa with real-time weather data and interactive map',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Weather App',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f23' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Weather App" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function applyTheme() {
                  try {
                    const theme = localStorage.getItem('weather-app-theme') || 'system';
                    const resolvedTheme = theme === 'system' 
                      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                      : theme;
                    
                    if (document.documentElement) {
                      document.documentElement.classList.add(resolvedTheme);
                      document.documentElement.setAttribute('data-theme', resolvedTheme);
                    }
                    
                    if (document.body) {
                      document.body.classList.add(resolvedTheme);
                    }
                  } catch (e) {
                    // Fallback to dark theme
                    if (document.documentElement) {
                      document.documentElement.classList.add('dark');
                    }
                    if (document.body) {
                      document.body.classList.add('dark');
                    }
                  }
                }
                
                // Wait for next tick to avoid hydration issues
                setTimeout(() => {
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', applyTheme);
                  } else {
                    applyTheme();
                  }
                }, 0);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full weather-app`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
