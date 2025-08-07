'use client';

import { useEffect, useRef, useState } from 'react';
import { City } from '@/data/southAfricaCities';
import { useTheme } from '@/lib/use-theme';

interface SouthAfricaMapProps {
  cities: City[];
  onCityClick: (city: City) => void;
  selectedCity?: City | null;
}

// Helper function for consistent number formatting
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function SouthAfricaMap({
  cities,
  onCityClick,
  selectedCity,
}: SouthAfricaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const hoverCircleRef = useRef<unknown>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');

      // Default marker icon
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Initialize map centered on South Africa
      const map = L.map(mapRef.current!).setView([-28.4793, 24.6727], 6);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles with theme-aware selection
      const tileLayer =
        resolvedTheme === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileLayer, {
        attribution: '© CARTO © OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Create custom tooltip element with theme-aware styling
      const tooltipElement = document.createElement('div');
      tooltipElement.className = 'custom-tooltip';
      const tooltipStyles =
        resolvedTheme === 'dark'
          ? `
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          font-family: 'Sato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          pointer-events: none;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          max-width: 200px;
        `
          : `
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          color: hsl(var(--foreground));
          font-family: 'Sato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          pointer-events: none;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          max-width: 200px;
        `;
      tooltipElement.style.cssText = tooltipStyles;
      document.body.appendChild(tooltipElement);
      tooltipRef.current = tooltipElement;

      // Add city markers
      cities.forEach((city) => {
        const marker = L.marker([city.lat, city.lng], { icon: defaultIcon })
          .addTo(map)
          .bindPopup(
            `
            <div class="p-3 bg-card text-card-foreground border border-border rounded-lg shadow-lg">
              <div class="font-semibold text-base mb-2 text-foreground">${city.name}</div>
              <div class="text-sm text-muted-foreground mb-2">${city.province}</div>
              ${city.population ? `<div class="text-xs text-muted-foreground mb-3">Population: ${formatNumber(city.population)}</div>` : ''}
              <button 
                class="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors touch-button"
                onclick="window.selectCity('${city.name}')"
              >
                Get Weather
              </button>
            </div>
          `,
            {
              maxWidth: 200,
              className: 'mobile-popup',
            }
          );

        // Add hover effects
        marker.on('mouseover', (e) => {
          // Remove existing hover circle
          if (
            hoverCircleRef.current &&
            typeof hoverCircleRef.current === 'object' &&
            'remove' in hoverCircleRef.current
          ) {
            (hoverCircleRef.current as { remove: () => void }).remove();
          }

          // Calculate city radius based on population (rough estimate)
          const radius = city.population
            ? Math.min(Math.max(city.population / 10000, 2), 15)
            : 5;

          // Create hover circle
          const hoverCircle = L.circle([city.lat, city.lng], {
            radius: radius * 1000, // Convert to meters
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.2,
            weight: 2,
            opacity: 0.8,
          }).addTo(map);

          hoverCircleRef.current = hoverCircle;

          // Show custom tooltip
          if (tooltipRef.current) {
            const tooltip = tooltipRef.current as HTMLDivElement;
            const textColor =
              resolvedTheme === 'dark'
                ? 'rgba(255, 255, 255, 0.7)'
                : 'rgba(0, 0, 0, 0.7)';
            const subTextColor =
              resolvedTheme === 'dark'
                ? 'rgba(255, 255, 255, 0.6)'
                : 'rgba(0, 0, 0, 0.6)';
            tooltip.innerHTML = `
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${city.name}</div>
              <div style="color: ${textColor}; font-size: 12px; margin-bottom: 2px;">${city.province}</div>
              ${city.population ? `<div style="color: ${subTextColor}; font-size: 11px;">Population: ${formatNumber(city.population)}</div>` : ''}
            `;

            // Position tooltip
            const rect = (
              e.originalEvent?.target as HTMLElement
            )?.getBoundingClientRect();
            if (rect) {
              tooltip.style.left = `${rect.left + rect.width / 2}px`;
              tooltip.style.top = `${rect.top - 10}px`;
              tooltip.style.transform = 'translate(-50%, -100%)';
            }

            tooltip.style.opacity = '1';
            tooltip.style.transform =
              'translate(-50%, -100%) translateY(-10px)';
          }
        });

        marker.on('mouseout', () => {
          // Remove hover circle
          if (
            hoverCircleRef.current &&
            typeof hoverCircleRef.current === 'object' &&
            'remove' in hoverCircleRef.current
          ) {
            (hoverCircleRef.current as { remove: () => void }).remove();
            hoverCircleRef.current = null;
          }

          // Hide custom tooltip
          if (tooltipRef.current) {
            const tooltip = tooltipRef.current as HTMLDivElement;
            tooltip.style.opacity = '0';
            tooltip.style.transform =
              'translate(-50%, -100%) translateY(-10px)';
          }
        });

        marker.on('click', () => {
          onCityClick(city);
        });

        markersRef.current.push(marker);
      });

      // Add global function for popup buttons
      (window as unknown as Record<string, unknown>).selectCity = (
        cityName: string
      ) => {
        const city = cities.find((c) => c.name === cityName);
        if (city) {
          onCityClick(city);
        }
      };
    };

    initMap();

    return () => {
      if (
        mapInstanceRef.current &&
        typeof mapInstanceRef.current === 'object' &&
        mapInstanceRef.current !== null
      ) {
        const map = mapInstanceRef.current as { remove: () => void };
        map.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
      hoverCircleRef.current = null;

      // Clean up tooltip
      if (tooltipRef.current) {
        document.body.removeChild(tooltipRef.current);
        tooltipRef.current = null;
      }
    };
  }, [cities, onCityClick, isClient, resolvedTheme]);

  // Update selected city marker and zoom
  useEffect(() => {
    if (!isClient || !mapInstanceRef.current) return;

    const updateSelectedCity = async () => {
      const L = await import('leaflet');

      // Default marker icon
      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Selected city marker icon (blue with larger size)
      const selectedIcon = L.icon({
        iconUrl:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEM1LjU5NiAwIDAgNS41OTYgMCAxMi41QzAgMTkuNDA0IDUuNTk2IDI1IDEyLjUgMjVDMTkuNDA0IDI1IDI1IDE5LjQwNCAyNSAxMi41QzI1IDUuNTk2IDE5LjQwNCAwIDEyLjUgMFoiIGZpbGw9IiMzQjgyRjYiLz4KPHBhdGggZD0iTTEyLjUgMkM2LjE0OCAyIDEgOC4xNDggMSAxNS41QzEgMjIuODUyIDYuMTQ4IDI5IDEyLjUgMjlDMTguODUyIDI5IDI0IDIyLjg1MiAyNCAxNS41QzI0IDguMTQ4IDE4Ljg1MiAyIDEyLjUgMloiIGZpbGw9IndoaXRlIi8+CjxjaXJjbGUgY3g9IjEyLjUiIGN5PSIxMi41IiByPSI0IiBmaWxsPSIjM0I4MkY2Ii8+Cjwvc3ZnPgo=',
        iconSize: [45, 75], // Larger size for selected
        iconAnchor: [22, 75],
        popupAnchor: [1, -34],
        shadowSize: [75, 75],
      });

      // Reset all markers to default
      markersRef.current.forEach((marker) => {
        if (marker && typeof marker === 'object' && 'setIcon' in marker) {
          (marker as { setIcon: (icon: unknown) => void }).setIcon(defaultIcon);
        }
      });

      // Highlight selected city and zoom
      if (selectedCity && mapInstanceRef.current) {
        const selectedMarker = markersRef.current.find((marker) => {
          if (marker && typeof marker === 'object' && 'getLatLng' in marker) {
            const latlng = (
              marker as { getLatLng: () => { lat: number; lng: number } }
            ).getLatLng();
            return (
              latlng.lat === selectedCity.lat && latlng.lng === selectedCity.lng
            );
          }
          return false;
        });

        if (selectedMarker) {
          if (
            typeof selectedMarker === 'object' &&
            selectedMarker !== null &&
            'setIcon' in selectedMarker
          ) {
            (selectedMarker as { setIcon: (icon: unknown) => void }).setIcon(
              selectedIcon
            );
          }

          // Center and zoom map on selected city with smooth animation
          if (
            typeof mapInstanceRef.current === 'object' &&
            mapInstanceRef.current !== null &&
            'flyTo' in mapInstanceRef.current
          ) {
            const map = mapInstanceRef.current as {
              flyTo: (
                latlng: [number, number],
                zoom: number,
                options?: { duration: number; easeLinearity: number }
              ) => void;
            };
            map.flyTo([selectedCity.lat, selectedCity.lng], 12, {
              duration: 1.5,
              easeLinearity: 0.25,
            });
          } else if (
            typeof mapInstanceRef.current === 'object' &&
            mapInstanceRef.current !== null &&
            'setView' in mapInstanceRef.current
          ) {
            const map = mapInstanceRef.current as {
              setView: (latlng: [number, number], zoom: number) => void;
            };
            map.setView([selectedCity.lat, selectedCity.lng], 12);
          }
        }
      } else {
        // If no city is selected, zoom out to show all of South Africa
        if (
          typeof mapInstanceRef.current === 'object' &&
          mapInstanceRef.current !== null &&
          'setView' in mapInstanceRef.current
        ) {
          const map = mapInstanceRef.current as {
            setView: (latlng: [number, number], zoom: number) => void;
          };
          map.setView([-28.4793, 24.6727], 6);
        }
      }
    };

    updateSelectedCity();
  }, [selectedCity, isClient]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-background">
        <div className="text-center space-y-4">
          <div className="text-base text-muted-foreground">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
