import Image from 'next/image';
import { WeatherData } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  MapPin,
  Eye,
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Snowflake,
} from 'lucide-react';

interface WeatherDisplayProps {
  data: WeatherData;
}

export default function WeatherDisplay({ data }: WeatherDisplayProps) {
  const weather = data.weather[0];

  const getWeatherIcon = (iconCode: string) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const getWeatherColor = (main: string) => {
    switch (main.toLowerCase()) {
      case 'clear':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'clouds':
        return 'bg-muted text-muted-foreground border-muted';
      case 'rain':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'snow':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'thunderstorm':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'drizzle':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'mist':
      case 'fog':
        return 'bg-muted text-muted-foreground border-muted';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getWeatherIconComponent = (main: string) => {
    switch (main.toLowerCase()) {
      case 'clear':
        return <Sun className="w-8 h-8 text-primary" />;
      case 'clouds':
        return <Cloud className="w-8 h-8 text-muted-foreground" />;
      case 'rain':
        return <CloudRain className="w-8 h-8 text-primary" />;
      case 'snow':
        return <Snowflake className="w-8 h-8 text-primary" />;
      case 'thunderstorm':
        return <CloudLightning className="w-8 h-8 text-destructive" />;
      case 'drizzle':
        return <CloudRain className="w-8 h-8 text-primary" />;
      case 'mist':
      case 'fog':
        return <Cloud className="w-8 h-8 text-muted-foreground" />;
      default:
        return <Cloud className="w-8 h-8 text-primary" />;
    }
  };

  return (
    <div className="premium-space-xl">
      {/* Main Weather Card */}
      <div className="premium-weather-card premium-p-lg premium-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-primary" />
            <div>
              <h2 className="premium-text-xl font-bold text-foreground">
                {data.name}
              </h2>
              <p className="premium-text-sm text-muted-foreground">
                {data.sys.country}
              </p>
            </div>
          </div>
          <Badge className={`premium-text-xs ${getWeatherColor(weather.main)}`}>
            {weather.main}
          </Badge>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Image
              src={getWeatherIcon(weather.icon)}
              alt={weather.description}
              width={80}
              height={80}
              className="w-20 h-20"
            />
            <div>
              <div className="premium-text-3xl font-bold text-foreground">
                {Math.round(data.main.temp)}°C
              </div>
              <div className="premium-text-base text-foreground capitalize">
                {weather.description}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="premium-text-sm text-muted-foreground">
              Feels like
            </div>
            <div className="premium-text-xl font-semibold text-foreground">
              {Math.round(data.main.feels_like)}°C
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="premium-weather-card text-center p-4">
            <div className="flex items-center justify-center mb-2">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div className="premium-text-xs text-muted-foreground mb-1">
              Humidity
            </div>
            <div className="premium-text-lg font-semibold text-foreground">
              {data.main.humidity}%
            </div>
          </div>

          <div className="premium-weather-card text-center p-4">
            <div className="flex items-center justify-center mb-2">
              <Wind className="w-6 h-6 text-primary" />
            </div>
            <div className="premium-text-xs text-muted-foreground mb-1">
              Wind
            </div>
            <div className="premium-text-lg font-semibold text-foreground">
              {data.wind.speed} m/s
            </div>
          </div>

          <div className="premium-weather-card text-center p-4">
            <div className="flex items-center justify-center mb-2">
              <Gauge className="w-6 h-6 text-primary" />
            </div>
            <div className="premium-text-xs text-muted-foreground mb-1">
              Pressure
            </div>
            <div className="premium-text-lg font-semibold text-foreground">
              {data.main.pressure} hPa
            </div>
          </div>

          <div className="premium-weather-card text-center p-4">
            <div className="flex items-center justify-center mb-2">
              <Thermometer className="w-6 h-6 text-primary" />
            </div>
            <div className="premium-text-xs text-muted-foreground mb-1">
              Temp
            </div>
            <div className="premium-text-lg font-semibold text-foreground">
              {Math.round(data.main.temp)}°C
            </div>
          </div>
        </div>
      </div>

      {/* Weather Details */}
      <div className="premium-weather-card premium-p-lg premium-scale-in">
        <div className="flex items-center gap-3 mb-4">
          {getWeatherIconComponent(weather.main)}
          <div>
            <h3 className="premium-text-lg font-semibold text-foreground">
              Weather Details
            </h3>
            <p className="premium-text-sm text-muted-foreground">
              Current conditions and information
            </p>
          </div>
        </div>

        <div className="premium-space-md">
          <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-muted-foreground" />
              <span className="premium-text-sm text-foreground">Condition</span>
            </div>
            <Badge
              className={`premium-text-xs ${getWeatherColor(weather.main)}`}
            >
              {weather.main}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <span className="premium-text-sm text-foreground">
                Description
              </span>
            </div>
            <span className="premium-text-sm font-medium text-foreground capitalize">
              {weather.description}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="premium-text-sm text-foreground">Location</span>
            </div>
            <span className="premium-text-sm font-medium text-foreground">
              {data.name}, {data.sys.country}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Thermometer className="w-5 h-5 text-muted-foreground" />
              <span className="premium-text-sm text-foreground">
                Feels Like
              </span>
            </div>
            <span className="premium-text-sm font-medium text-foreground">
              {Math.round(data.main.feels_like)}°C
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Droplets className="w-5 h-5 text-muted-foreground" />
              <span className="premium-text-sm text-foreground">Humidity</span>
            </div>
            <span className="premium-text-sm font-medium text-foreground">
              {data.main.humidity}%
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Wind className="w-5 h-5 text-muted-foreground" />
              <span className="premium-text-sm text-foreground">
                Wind Speed
              </span>
            </div>
            <span className="premium-text-sm font-medium text-foreground">
              {data.wind.speed} m/s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
