export interface WeatherData {
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
  };
  sys: {
    country: string;
  };
}

export interface WeatherError {
  message: string;
  status?: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchWeather(city: string): Promise<WeatherData> {
  try {
    const response = await fetch(
      `/api/weather?city=${encodeURIComponent(city)}`
    );

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Failed to parse error response' };
      }

      const errorMessage =
        typeof errorData === 'object' &&
        errorData !== null &&
        'error' in errorData
          ? String(errorData.error)
          : `HTTP ${response.status}: ${response.statusText}`;

      throw new ApiError(errorMessage, response.status, errorData);
    }

    const data = await response.json();

    // Validate the response structure
    if (!data.name || !data.main || !data.weather || !data.wind) {
      throw new ApiError('Invalid weather data format', 500, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0
    );
  }
}
