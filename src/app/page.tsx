import { Suspense } from 'react';
import { southAfricaCities } from '@/data/southAfricaCities';
import WeatherAppClient from '@/components/WeatherAppClient';

export default async function Home() {
  return (
    <div className="weather-app min-h-screen">
      <div className="map-container">
        {/* Map rendered by client component */}
      </div>

      <Suspense
        fallback={
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">Loading Weather App...</p>
            </div>
          </div>
        }
      >
        <WeatherAppClient cities={southAfricaCities} />
      </Suspense>
    </div>
  );
}
