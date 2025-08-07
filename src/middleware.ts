import { NextRequest, NextResponse } from 'next/server';
import { getConfig, getCorsConfig, isTrustedHost } from '@/lib/config';

// Enhanced rate limiting with multiple strategies
interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
  blockedUntil?: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // General rate limit
  general: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDuration: 5 * 60 * 1000, // 5 minutes block
  },
  // API-specific rate limit (more strict)
  api: {
    maxRequests: 50,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDuration: 10 * 60 * 1000, // 10 minutes block
  },
  // Search-specific rate limit
  search: {
    maxRequests: 30,
    windowMs: 1 * 60 * 1000, // 1 minute
    blockDuration: 2 * 60 * 1000, // 2 minutes block
  },
};

function getClientIdentifier(request: NextRequest): string {
  // Use IP address or X-Forwarded-For header
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  // Priority order for IP detection
  const ip =
    cfConnectingIp ||
    realIp ||
    (forwarded ? forwarded.split(',')[0].trim() : null) ||
    'unknown';

  // Add user agent for additional uniqueness (helps with proxy scenarios)
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return `${ip}:${userAgent}`;
}

function getRateLimitConfig(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith('/api/weather')) {
    return RATE_LIMIT_CONFIG.api;
  }

  if (path.includes('search') || path.includes('suggest')) {
    return RATE_LIMIT_CONFIG.search;
  }

  return RATE_LIMIT_CONFIG.general;
}

function checkRateLimit(request: NextRequest): {
  allowed: boolean;
  retryAfter?: number;
  blockRemaining?: number;
} {
  const config = getConfig();

  if (!config.enableRateLimiting) {
    return { allowed: true };
  }

  const clientId = getClientIdentifier(request);
  const rateLimitConfig = getRateLimitConfig(request);
  const now = Date.now();

  const clientData = rateLimitMap.get(clientId);

  // Check if client is blocked
  if (clientData?.blockedUntil && now < clientData.blockedUntil) {
    const blockRemaining = Math.ceil((clientData.blockedUntil - now) / 1000);
    return { allowed: false, blockRemaining };
  }

  // Initialize or reset if window expired
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + rateLimitConfig.windowMs,
      lastRequest: now,
    });
    return { allowed: true };
  }

  // Check if rate limit exceeded
  if (clientData.count >= rateLimitConfig.maxRequests) {
    // Block the client
    clientData.blockedUntil = now + rateLimitConfig.blockDuration;
    const retryAfter = Math.ceil(rateLimitConfig.blockDuration / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count and update last request time
  clientData.count++;
  clientData.lastRequest = now;

  return { allowed: true };
}

function validateTrustedHost(request: NextRequest): boolean {
  const host = request.headers.get('host');
  if (!host) return false;

  return isTrustedHost(host);
}

function validateRequestHeaders(request: NextRequest): boolean {
  const config = getConfig();

  // Skip header validation in development
  if (config.nodeEnv === 'development') {
    return true;
  }

  // Check for suspicious headers only in production
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
  ];

  for (const header of suspiciousHeaders) {
    if (request.headers.get(header)) {
      return false;
    }
  }

  return true;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  const config = getConfig();

  // Basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Content Security Policy with enhanced security
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openweathermap.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // HSTS (HTTP Strict Transport Security)
  if (config.nodeEnv === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

function handleCors(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const corsConfig = getCorsConfig();
  const origin = request.headers.get('origin');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 200 });

    if (origin && corsConfig.origin.includes(origin)) {
      preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
    }

    preflightResponse.headers.set(
      'Access-Control-Allow-Methods',
      corsConfig.methods.join(', ')
    );
    preflightResponse.headers.set(
      'Access-Control-Allow-Headers',
      corsConfig.allowedHeaders.join(', ')
    );
    preflightResponse.headers.set(
      'Access-Control-Max-Age',
      corsConfig.maxAge.toString()
    );

    if (corsConfig.credentials) {
      preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return preflightResponse;
  }

  // Handle actual requests
  if (origin && corsConfig.origin.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  if (corsConfig.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

function logSecurityEvent(
  request: NextRequest,
  event: string,
  details?: Record<string, unknown>
) {
  const config = getConfig();

  if (config.enableRequestLogging) {
    console.warn(`SECURITY EVENT: ${event}`, {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      ip: getClientIdentifier(request),
      userAgent: request.headers.get('user-agent'),
      ...details,
    });
  }
}

export function middleware(request: NextRequest) {
  const config = getConfig();

  // Log request if enabled
  if (config.enableRequestLogging) {
    console.log(
      `${new Date().toISOString()} - ${request.method} ${request.url}`,
      {
        userAgent: request.headers.get('user-agent'),
        ip: getClientIdentifier(request),
        referer: request.headers.get('referer'),
      }
    );
  }

  // Validate trusted host
  if (!validateTrustedHost(request)) {
    logSecurityEvent(request, 'UNTRUSTED_HOST', {
      host: request.headers.get('host'),
    });
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Validate request headers (skipped in development)
  if (!validateRequestHeaders(request)) {
    logSecurityEvent(request, 'SUSPICIOUS_HEADERS');
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Check rate limit (more lenient in development)
  if (config.enableRateLimiting) {
    const rateLimitResult = checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      logSecurityEvent(request, 'RATE_LIMIT_EXCEEDED', {
        retryAfter: rateLimitResult.retryAfter,
        blockRemaining: rateLimitResult.blockRemaining,
      });

      const response = new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          blockRemaining: rateLimitResult.blockRemaining,
          message: 'Too many requests, please try again later.',
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (rateLimitResult.retryAfter) {
        response.headers.set(
          'Retry-After',
          rateLimitResult.retryAfter.toString()
        );
      }

      return response;
    }
  }

  // Continue with the request
  const response = NextResponse.next();

  // Add security headers
  addSecurityHeaders(response);

  // Handle CORS
  handleCors(request, response);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
