export interface AppConfig {
  // API Configuration
  openWeatherApiKey: string;
  openWeatherBaseUrl: string;

  // Security & CORS
  appUrl: string;
  allowedOrigins: string[];
  trustedHosts: string[];

  // Rate Limiting
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;

  // Cache Configuration (In-Memory)
  cacheTtlSeconds: number;
  cacheMaxSize: number;

  // Error Reporting
  sentryDsn?: string;
  nodeEnv: string;

  // Feature Flags
  enableCache: boolean;
  enableRateLimiting: boolean;
  enableErrorReporting: boolean;
  enableMetrics: boolean;

  // Logging
  logLevel: string;
  enableRequestLogging: boolean;
}

function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseStringArray(
  value: string,
  defaultValue: string[] = []
): string[] {
  if (!value) return defaultValue;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getConfig(): AppConfig {
  return {
    // API Configuration
    openWeatherApiKey: getRequiredEnvVar('OPENWEATHER_API_KEY'),
    openWeatherBaseUrl: getOptionalEnvVar(
      'OPENWEATHER_BASE_URL',
      'https://api.openweathermap.org/data/2.5'
    ),

    // Security & CORS
    appUrl: getOptionalEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    allowedOrigins: parseStringArray(
      getOptionalEnvVar('ALLOWED_ORIGINS', 'http://localhost:3000'),
      ['http://localhost:3000']
    ),
    trustedHosts: parseStringArray(
      getOptionalEnvVar('TRUSTED_HOSTS', 'localhost,localhost:3000'),
      ['localhost', 'localhost:3000']
    ),

    // Rate Limiting
    rateLimitMaxRequests: getNumberEnvVar('RATE_LIMIT_MAX_REQUESTS', 100),
    rateLimitWindowMs: getNumberEnvVar('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes

    // Cache Configuration (In-Memory)
    cacheTtlSeconds: getNumberEnvVar('CACHE_TTL_SECONDS', 300), // 5 minutes
    cacheMaxSize: getNumberEnvVar('CACHE_MAX_SIZE', 100),

    // Error Reporting
    sentryDsn: getOptionalEnvVar('SENTRY_DSN'),
    nodeEnv: getOptionalEnvVar('NODE_ENV', 'development'),

    // Feature Flags
    enableCache: getBooleanEnvVar('ENABLE_CACHE', true),
    enableRateLimiting: getBooleanEnvVar('ENABLE_RATE_LIMITING', true),
    enableErrorReporting: getBooleanEnvVar('ENABLE_ERROR_REPORTING', false),
    enableMetrics: getBooleanEnvVar('ENABLE_METRICS', false),

    // Logging
    logLevel: getOptionalEnvVar('LOG_LEVEL', 'info'),
    enableRequestLogging: getBooleanEnvVar('ENABLE_REQUEST_LOGGING', true),
  };
}

// CORS configuration
export function getCorsConfig() {
  const config = getConfig();

  return {
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours
  };
}

// Trusted hosts validation
export function isTrustedHost(host: string): boolean {
  const config = getConfig();
  return config.trustedHosts.some(
    (trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`)
  );
}

// Rate limiting configuration
export function getRateLimitConfig() {
  const config = getConfig();

  return {
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(config.rateLimitWindowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  };
}
