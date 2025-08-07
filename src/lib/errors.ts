export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalApiError extends ApiError {
  public readonly externalService: string;
  public readonly externalStatusCode?: number;

  constructor(
    message: string,
    externalService: string,
    externalStatusCode?: number
  ) {
    super(message, 502, true, 'EXTERNAL_API_ERROR');
    this.name = 'ExternalApiError';
    this.externalService = externalService;
    this.externalStatusCode = externalStatusCode;
  }
}

export class CacheError extends ApiError {
  constructor(message: string = 'Cache operation failed') {
    super(message, 500, true, 'CACHE_ERROR');
    this.name = 'CacheError';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isOperationalError(error: unknown): boolean {
  return isApiError(error) && error.isOperational;
}

export function handleError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  // Handle different types of errors
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new ExternalApiError(
        'Network error occurred while fetching weather data',
        'OpenWeather API'
      );
    }

    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('abort')) {
      return new ExternalApiError(
        'Request timeout while fetching weather data',
        'OpenWeather API'
      );
    }

    // Generic error
    return new ApiError(error.message, 500, true, 'INTERNAL_ERROR');
  }

  // Unknown error
  return new ApiError(
    'An unexpected error occurred',
    500,
    true,
    'UNKNOWN_ERROR'
  );
}

export function createErrorResponse(error: ApiError) {
  return {
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
  };
}

export async function logError(
  error: unknown,
  context?: Record<string, unknown>
) {
  const { getConfig } = await import('./config');
  const config = getConfig();

  if (config.enableRequestLogging) {
    console.error('Error occurred:', {
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      context,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  }
}
