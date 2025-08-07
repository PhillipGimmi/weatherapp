import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import {
  ValidationError,
  NotFoundError,
  ExternalApiError,
  handleError,
  createErrorResponse,
  logError,
} from '@/lib/errors';

// Weather data interface
interface WeatherData {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  coord: {
    lat: number;
    lon: number;
  };
}

// Simple in-memory cache (for production, use Redis or similar)
const cache = new Map<string, { data: WeatherData; timestamp: number }>();

function validateCity(city: string): void {
  if (!city || typeof city !== 'string') {
    throw new ValidationError(
      'City parameter is required and must be a string'
    );
  }

  if (city.trim().length === 0) {
    throw new ValidationError('City parameter cannot be empty');
  }

  if (city.length > 100) {
    throw new ValidationError('City name is too long (max 100 characters)');
  }

  // Basic sanitization - only allow letters, spaces, hyphens, and apostrophes
  const sanitizedCity = city.replace(/[^a-zA-Z\s\-']/g, '');
  if (sanitizedCity !== city) {
    throw new ValidationError('City name contains invalid characters');
  }
}

function getCachedData(cacheKey: string): WeatherData | null {
  const config = getConfig();

  if (!config.enableCache) {
    return null;
  }

  const cached = cache.get(cacheKey);
  if (!cached) {
    return null;
  }

  const now = Date.now();
  const cacheAge = now - cached.timestamp;
  const maxAge = config.cacheTtlSeconds * 1000;

  if (cacheAge > maxAge) {
    cache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function setCachedData(cacheKey: string, data: WeatherData): void {
  const config = getConfig();

  if (!config.enableCache) {
    return;
  }

  // Implement cache size limit
  if (cache.size >= config.cacheMaxSize) {
    // Remove oldest entries
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = Math.ceil(config.cacheMaxSize * 0.1); // Remove 10% of cache
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }

  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

async function fetchWeatherData(city: string): Promise<WeatherData> {
  const config = getConfig();

  const url = `${config.openWeatherBaseUrl}/weather?q=${encodeURIComponent(city)}&appid=${config.openWeatherApiKey}&units=metric`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WeatherApp/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError(`City "${city}" not found`);
      }

      if (response.status === 401) {
        throw new ExternalApiError(
          'Invalid API key for OpenWeather service',
          'OpenWeather API',
          response.status
        );
      }

      if (response.status === 429) {
        throw new ExternalApiError(
          'OpenWeather API rate limit exceeded',
          'OpenWeather API',
          response.status
        );
      }

      throw new ExternalApiError(
        `OpenWeather API returned status ${response.status}`,
        'OpenWeather API',
        response.status
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new ExternalApiError(
        'Invalid response format from OpenWeather API',
        'OpenWeather API'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ExternalApiError(
        'Request timeout while fetching weather data',
        'OpenWeather API'
      );
    }

    throw error;
  }
}

export async function GET(request: NextRequest) {
  const config = getConfig();

  try {
    // Validate request method
    if (request.method !== 'GET') {
      return NextResponse.json(
        createErrorResponse(new ValidationError('Method not allowed')),
        { status: 405 }
      );
    }

    // Get and validate city parameter
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    try {
      validateCity(city || '');
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(createErrorResponse(error), {
          status: error.statusCode,
        });
      }
      throw error;
    }

    // Check cache first
    const cacheKey = `weather:${city!.toLowerCase()}`;
    const cachedData = getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${config.cacheTtlSeconds}`,
        },
      });
    }

    // Fetch fresh data
    const weatherData = await fetchWeatherData(city!);

    // Cache the response
    setCachedData(cacheKey, weatherData);

    // Return successful response
    return NextResponse.json(weatherData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${config.cacheTtlSeconds}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Handle and log the error
    const apiError = handleError(error);
    logError(error, {
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Return error response
    return NextResponse.json(createErrorResponse(apiError), {
      status: apiError.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
