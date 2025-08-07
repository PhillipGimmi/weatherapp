'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WeatherDisplay from './WeatherDisplay';
import CityInput, { CityInputRef } from './CityInput';
import SouthAfricaMap from './SouthAfricaMap';
import { City } from '@/data/southAfricaCities';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, AlertCircle, X, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from './ErrorBoundary';
import { WeatherData } from '@/lib/api';
import { ThemeToggle } from './ThemeToggle';

interface WeatherAppClientProps {
  cities: City[];
}

// Helper function for consistent number formatting
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Animation variants for Framer Motion
const weatherSheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

const cityCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

export default function WeatherAppClient({ cities }: WeatherAppClientProps) {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showWeatherSheet, setShowWeatherSheet] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityInputRef = useRef<CityInputRef>(null);

  // Simple fetch function for weather data
  const fetchWeatherData = async (cityName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/weather?city=${encodeURIComponent(cityName)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setWeatherData(data);
      setShowWeatherSheet(true);
      toast.success(`Weather data loaded for ${data.name}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setSearchQuery(city.name);
    fetchWeatherData(city.name);
  };

  const handleCitySearch = (cityName: string) => {
    const foundCity = cities.find(
      (city) => city.name.toLowerCase() === cityName.toLowerCase()
    );
    if (foundCity) {
      setSelectedCity(foundCity);
    }
    setSearchQuery(cityName);
    fetchWeatherData(cityName);
  };

  const handleRetry = () => {
    if (searchQuery) {
      fetchWeatherData(searchQuery);
    }
  };

  const handleMapClick = () => {
    if (showWeatherSheet) {
      setShowWeatherSheet(false);
    }
    // Close search suggestions when clicking on map
    cityInputRef.current?.closeSuggestions();
  };

  return (
    <ErrorBoundary>
      {/* Always Visible Search Bar at Top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 p-4 pt-safe">
          <div className="flex-1">
            <CityInput
              onSearch={handleCitySearch}
              onCitySelect={handleCitySelect}
              ref={cityInputRef}
            />
          </div>
        </div>
      </div>

      {/* Map Container - Below Search Bar */}
      <div className="map-container pt-20" onClick={handleMapClick}>
        <SouthAfricaMap
          cities={cities}
          onCityClick={handleCitySelect}
          selectedCity={selectedCity}
        />
      </div>

      {/* Weather Bottom Sheet with Framer Motion */}
      <AnimatePresence>
        {showWeatherSheet && (
          <motion.div
            className="weather-bottom-sheet"
            variants={weatherSheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ zIndex: 90 }}
          >
            <div className="drag-indicator"></div>

            {/* Close Weather Button */}
            <motion.button
              onClick={() => setShowWeatherSheet(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/20 flex items-center justify-center text-foreground hover:bg-background/30 border border-border"
              aria-label="Close weather"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" />
            </motion.button>

            <div className="premium-p-lg">
              {/* Loading State */}
              {isLoading && (
                <motion.div
                  className="text-center premium-space-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  <div className="premium-text-lg font-semibold text-foreground">
                    Loading weather data...
                  </div>
                  <div className="premium-text-sm text-muted-foreground">
                    Fetching current weather conditions for {searchQuery}
                  </div>
                </motion.div>
              )}

              {/* Error State */}
              {error && (
                <motion.div
                  className="text-center premium-space-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                  <div className="premium-text-lg font-semibold text-destructive">
                    Failed to load weather data
                  </div>
                  <div className="premium-text-sm text-muted-foreground max-w-sm mx-auto">
                    {error}
                  </div>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button onClick={handleRetry} variant="outline">
                      Try Again
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Weather Display */}
              {weatherData && !isLoading && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <WeatherDisplay data={weatherData} />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected City Info - Floating Card */}
      <AnimatePresence>
        {selectedCity && !showWeatherSheet && (
          <motion.div
            className="fixed top-20 left-4 right-4 z-30"
            variants={cityCardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="premium-weather-card premium-p-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="premium-text-base font-semibold text-foreground">
                      {selectedCity.name}
                    </h3>
                    <p className="premium-text-sm text-muted-foreground">
                      {selectedCity.province}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="premium-text-xs text-muted-foreground">
                    Population
                  </div>
                  <div className="premium-text-sm font-semibold text-foreground">
                    {selectedCity.population
                      ? formatNumber(selectedCity.population)
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <motion.button
                onClick={() => setShowWeatherSheet(true)}
                className="w-full mt-3 premium-button flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ChevronUp className="w-4 h-4" />
                View Weather
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Toggle - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Safe Area Bottom */}
      <div className="safe-area-bottom"></div>
    </ErrorBoundary>
  );
}
