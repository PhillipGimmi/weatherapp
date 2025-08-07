# 🔒 Security Documentation

This document outlines the comprehensive security measures implemented in the Weather App.

## 🛡️ Security Overview

The Weather App implements multiple layers of security to protect against common web vulnerabilities and ensure robust operation in production environments.

## 🔐 Input Validation & Sanitization

### City Input Validation

- **Length Limits**: 2-50 characters
- **Character Whitelist**: Only letters, spaces, hyphens, apostrophes, and periods
- **XSS Prevention**: Blocks dangerous patterns like `<script>`, `javascript:`, `onclick=`, etc.
- **Whitespace Normalization**: Multiple spaces converted to single space
- **Real-time Validation**: Immediate feedback with error messages

### API Input Validation

- **Parameter Validation**: Required city parameter with type checking
- **Length Validation**: Maximum 100 characters for city names
- **Character Sanitization**: Removes invalid characters
- **Malicious Pattern Detection**: Blocks script injection attempts

## 🚦 Rate Limiting

### Multi-Tier Rate Limiting

- **General Requests**: 100 requests per 15 minutes
- **API Endpoints**: 50 requests per 5 minutes (stricter)
- **Search Operations**: 30 requests per 1 minute (most strict)

### Rate Limiting Features

- **IP-based Tracking**: Uses multiple IP detection methods
- **User Agent Tracking**: Combines IP + User Agent for uniqueness
- **Blocking Mechanism**: Temporary blocks for repeated violations
- **Configurable Windows**: Adjustable time windows and limits
- **Retry-After Headers**: Proper HTTP 429 responses

### Rate Limit Configuration

```typescript
const RATE_LIMIT_CONFIG = {
  general: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDuration: 5 * 60 * 1000, // 5 minutes block
  },
  api: {
    maxRequests: 50,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDuration: 10 * 60 * 1000, // 10 minutes block
  },
  search: {
    maxRequests: 30,
    windowMs: 1 * 60 * 1000, // 1 minute
    blockDuration: 2 * 60 * 1000, // 2 minutes block
  },
};
```

## 🌐 CORS & Trusted Hosts

### CORS Configuration

- **Configurable Origins**: Environment-based allowed origins
- **Preflight Handling**: Proper OPTIONS request handling
- **Credentials Support**: Secure credential handling
- **Method Restrictions**: Limited to necessary HTTP methods

### Trusted Hosts Validation

- **Host Validation**: Validates incoming request hosts
- **Subdomain Support**: Supports wildcard subdomains
- **Configurable Domains**: Environment-based trusted hosts
- **Security Logging**: Logs untrusted host attempts

## 🔒 Security Headers

### Implemented Headers

```typescript
// Basic Security Headers
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'X-XSS-Protection': '1; mode=block'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'

// Additional Security Headers
'X-DNS-Prefetch-Control': 'off'
'X-Download-Options': 'noopen'
'X-Permitted-Cross-Domain-Policies': 'none'

// HSTS (Production Only)
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
```

### Content Security Policy (CSP)

```typescript
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
```

## 🚨 Request Validation

### Header Validation

- **Suspicious Header Detection**: Blocks dangerous headers
- **Header Sanitization**: Validates and sanitizes incoming headers
- **Security Logging**: Logs suspicious header attempts

### Method Validation

- **HTTP Method Restrictions**: Only allows necessary methods
- **OPTIONS Handling**: Proper CORS preflight support
- **Method Validation**: Validates request methods

## 📊 Security Logging

### Security Events Logged

- **Rate Limit Exceeded**: Tracks rate limit violations
- **Untrusted Hosts**: Logs unauthorized host attempts
- **Suspicious Headers**: Records dangerous header usage
- **Request Logging**: Comprehensive request tracking

### Log Format

```typescript
{
  timestamp: '2024-01-01T00:00:00.000Z',
  event: 'RATE_LIMIT_EXCEEDED',
  method: 'GET',
  url: '/api/weather?city=test',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  details: {
    retryAfter: 300,
    blockRemaining: 180
  }
}
```

## 🔄 Caching Security

### In-Memory Cache

- **TTL-based Expiration**: Automatic cache invalidation
- **Size Limits**: Prevents memory exhaustion
- **LRU Eviction**: Removes oldest entries when full
- **Cache Headers**: Proper HTTP cache headers

### Cache Security Features

- **No Sensitive Data**: Only weather data cached
- **TTL Validation**: Enforces maximum cache age
- **Size Validation**: Prevents cache overflow
- **Cache Headers**: Proper cache control headers

## 🛠️ Error Handling

### Error Classification

- **ValidationError**: Input validation failures
- **NotFoundError**: Resource not found
- **ExternalApiError**: Third-party API failures
- **RateLimitError**: Rate limit exceeded
- **CacheError**: Cache operation failures

### Error Response Format

```typescript
{
  error: {
    message: 'City not found',
    code: 'NOT_FOUND',
    statusCode: 404,
    // Stack trace only in development
    stack: '...' // Development only
  }
}
```

## 🔧 Environment Security

### Environment Variables

- **Required Variables**: Validates essential configuration
- **Type Safety**: Type-safe configuration management
- **Default Values**: Sensible defaults for optional settings
- **Validation**: Runtime validation of configuration

### Security Configuration

```typescript
interface AppConfig {
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

  // Feature Flags
  enableCache: boolean;
  enableRateLimiting: boolean;
  enableRequestLogging: boolean;
}
```

## 🚀 Production Security

### Deployment Security

- **HTTPS Enforcement**: HSTS headers in production
- **Security Headers**: Comprehensive security headers
- **Error Masking**: No sensitive data in error responses
- **Logging Control**: Configurable logging levels

### Monitoring & Alerting

- **Security Event Logging**: All security events logged
- **Rate Limit Monitoring**: Track rate limit violations
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Request timing and performance

## 🔍 Security Testing

### Recommended Security Tests

1. **Input Validation Tests**: Test all input validation rules
2. **Rate Limiting Tests**: Verify rate limiting functionality
3. **CORS Tests**: Test cross-origin request handling
4. **Header Validation Tests**: Test security header enforcement
5. **Error Handling Tests**: Verify error response security

### Security Checklist

- [ ] Input validation implemented
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] Error handling secure
- [ ] Logging enabled
- [ ] Environment variables secure
- [ ] HTTPS enforced in production

## 📚 Security Resources

### OWASP Top 10 Protection

- **A01:2021 – Broken Access Control**: CORS and trusted hosts
- **A02:2021 – Cryptographic Failures**: HTTPS enforcement
- **A03:2021 – Injection**: Input validation and sanitization
- **A05:2021 – Security Misconfiguration**: Security headers
- **A07:2021 – Identification and Authentication Failures**: Rate limiting

### Additional Security Measures

- **Defense in Depth**: Multiple security layers
- **Fail Securely**: Secure error handling
- **Least Privilege**: Minimal required permissions
- **Security by Design**: Security built into architecture

## 🆘 Security Incident Response

### Incident Types

1. **Rate Limit Violations**: Monitor and adjust limits
2. **Suspicious Headers**: Block and log attempts
3. **Untrusted Hosts**: Validate and update trusted hosts
4. **Input Validation Failures**: Review and update validation rules

### Response Procedures

1. **Immediate Response**: Block malicious requests
2. **Investigation**: Review logs and identify patterns
3. **Mitigation**: Update security rules and configurations
4. **Monitoring**: Enhanced monitoring for similar attacks
5. **Documentation**: Document incident and response

---

**Note**: This security documentation should be reviewed and updated regularly to ensure continued protection against emerging threats.
