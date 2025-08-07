'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import Fuse from 'fuse.js';
import { City, southAfricaCities } from '@/data/southAfricaCities';

import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Users, ChevronDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CityInputProps {
  onSearch: (city: string) => void;
  onCitySelect?: (city: City) => void;
  onCloseSuggestions?: () => void;
}

export interface CityInputRef {
  closeSuggestions: () => void;
}

// Configure Fuse.js for fuzzy search
const fuse = new Fuse(southAfricaCities, {
  keys: ['name', 'province'],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2,
});

// Helper function for consistent number formatting
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Input validation and sanitization
const validateAndSanitizeInput = (
  input: string
): { isValid: boolean; sanitized: string; error?: string } => {
  // Remove leading/trailing whitespace
  const trimmed = input.trim();

  // Check if empty
  if (!trimmed) {
    return {
      isValid: false,
      sanitized: '',
      error: 'City name cannot be empty',
    };
  }

  // Check length limits
  if (trimmed.length < 2) {
    return {
      isValid: false,
      sanitized: '',
      error: 'City name must be at least 2 characters',
    };
  }

  if (trimmed.length > 50) {
    return {
      isValid: false,
      sanitized: '',
      error: 'City name is too long (max 50 characters)',
    };
  }

  // Sanitize input - only allow letters, spaces, hyphens, apostrophes, and periods
  const sanitized = trimmed.replace(/[^a-zA-Z\s\-'\.]/g, '');

  // Check if sanitization removed too much
  if (sanitized.length < 2) {
    return {
      isValid: false,
      sanitized: '',
      error: 'City name contains invalid characters',
    };
  }

  // Prevent XSS by ensuring no script tags or dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i,
    /expression\(/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return { isValid: false, sanitized: '', error: 'Invalid input detected' };
    }
  }

  // Normalize whitespace (multiple spaces to single space)
  const normalized = sanitized.replace(/\s+/g, ' ');

  // Additional security: prevent SQL injection patterns
  const sqlPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
    /alter\s+table/i,
    /create\s+table/i,
    /exec\s*\(/i,
    /execute\s*\(/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(normalized)) {
      return { isValid: false, sanitized: '', error: 'Invalid input detected' };
    }
  }

  return { isValid: true, sanitized: normalized };
};

// Real-time input filtering
const filterInput = (input: string): string => {
  // Only allow letters, spaces, hyphens, apostrophes, and periods
  return input.replace(/[^a-zA-Z\s\-'\.]/g, '');
};

// Rate limiting for search requests
const searchRateLimit = {
  lastSearch: 0,
  minInterval: 500, // Minimum 500ms between searches
};

const CityInput = forwardRef<CityInputRef, CityInputProps>(
  ({ onSearch, onCitySelect }, ref) => {
    const [city, setCity] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [inputError, setInputError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [showPopularCities, setShowPopularCities] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Expose closeSuggestions method to parent
    useImperativeHandle(ref, () => ({
      closeSuggestions: () => {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        if (inputRef.current) {
          inputRef.current.blur();
        }
      },
    }));

    // Get popular cities for recommendations
    const popularCities = [
      // Specifically include Cape Town and Somerset West for the reviewer
      ...southAfricaCities.filter(
        (city) => city.name === 'Cape Town' || city.name === 'Somerset West'
      ),
      // Then add other major cities
      ...southAfricaCities
        .filter(
          (city) =>
            city.population &&
            city.population > 100000 &&
            city.name !== 'Cape Town' &&
            city.name !== 'Somerset West'
        )
        .sort((a, b) => (b.population || 0) - (a.population || 0))
        .slice(0, 4), // Reduced to 4 since we added 2 specific cities
    ];

    // Handle input changes with real-time filtering
    const handleInputChange = useCallback((value: string) => {
      // Apply real-time filtering
      const filteredValue = filterInput(value);
      setCity(filteredValue);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Validate input
      const validation = validateAndSanitizeInput(filteredValue);
      setInputError(validation.error || null);
      setIsValidating(true);

      // Debounced search
      if (filteredValue.length >= 2 && validation.isValid) {
        searchTimeoutRef.current = setTimeout(() => {
          const results = fuse.search(filteredValue);
          setSuggestions(
            results.slice(0, 5).map((result: { item: City }) => result.item)
          );
          setShowSuggestions(true);
          setSelectedIndex(-1);
          setIsValidating(false);
        }, 300);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsValidating(false);
      }
    }, []);

    // Handle form submission with validation
    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLoading) return;

        const validation = validateAndSanitizeInput(city);

        if (!validation.isValid) {
          setInputError(validation.error || 'Invalid input');
          toast.error(validation.error || 'Please enter a valid city name');
          return;
        }

        // Rate limiting for form submission
        const now = Date.now();
        if (now - searchRateLimit.lastSearch < searchRateLimit.minInterval) {
          toast.error('Please wait before searching again');
          return;
        }

        setIsLoading(true);
        try {
          onSearch(validation.sanitized);
          setShowSuggestions(false);
          searchRateLimit.lastSearch = now;
          toast.success(`Searching for weather in ${validation.sanitized}`);
        } catch {
          toast.error('Failed to search for city');
        } finally {
          setIsLoading(false);
        }
      },
      [city, isLoading, onSearch]
    );

    // Handle city selection with validation
    const handleCitySelect = useCallback(
      (selectedCity: City) => {
        const validation = validateAndSanitizeInput(selectedCity.name);

        if (!validation.isValid) {
          toast.error('Invalid city selection');
          return;
        }

        setCity(validation.sanitized);
        setShowSuggestions(false);
        setInputError(null);
        onSearch(validation.sanitized);

        if (onCitySelect) {
          onCitySelect(selectedCity);
        }

        toast.success(
          `Selected ${selectedCity.name}, ${selectedCity.province}`
        );
      },
      [onSearch, onCitySelect]
    );

    // Handle keyboard navigation with security
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!showSuggestions) return;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < suggestions.length - 1 ? prev + 1 : prev
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
            break;
          case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
              handleCitySelect(suggestions[selectedIndex]);
            } else if (city.trim()) {
              handleSubmit(e);
            }
            break;
          case 'Escape':
            setShowSuggestions(false);
            setSelectedIndex(-1);
            break;
        }
      },
      [
        showSuggestions,
        suggestions,
        selectedIndex,
        city,
        handleCitySelect,
        handleSubmit,
      ]
    );

    // Click outside handler
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          suggestionsRef.current &&
          !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(event.target as Node)
        ) {
          setShowSuggestions(false);
          setSelectedIndex(-1);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="premium-space-xl">
        {/* Search Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={city}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter city name..."
            pattern="[a-zA-Z\s\-'\.]+"
            title="Only letters, spaces, hyphens, apostrophes, and periods are allowed"
            className={`premium-search w-full pr-12 ${
              inputError ? 'border-red-500 focus:border-red-500' : ''
            } ${isValidating ? 'opacity-75' : ''}`}
            disabled={isLoading}
            maxLength={50}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            aria-describedby={inputError ? 'input-error' : undefined}
          />

          {/* Error indicator */}
          {inputError && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
          )}

          {/* Search button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="absolute right-3 w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-border"
            style={{ top: '8px' }}
            disabled={isLoading || !city.trim() || !!inputError}
            aria-label="Search for weather"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {inputError && (
          <div
            id="input-error"
            className="mt-2 text-red-400 text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {inputError}
          </div>
        )}

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="premium-suggestions"
            role="listbox"
            aria-label="City suggestions"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.name}-${suggestion.province}`}
                type="button"
                onClick={() => handleCitySelect(suggestion)}
                className={`premium-suggestion-item w-full text-left ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="premium-text-base font-semibold text-foreground">
                      {suggestion.name}
                    </div>
                    <div className="premium-text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4" />
                      {suggestion.province}
                      {suggestion.population && (
                        <>
                          <span>•</span>
                          <Users className="w-4 h-4" />
                          {formatNumber(suggestion.population)}
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Popular Cities */}
        <div className="premium-space-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="premium-text-lg font-semibold text-foreground">
              Popular Cities
            </h3>
            <button
              type="button"
              onClick={() => setShowPopularCities(!showPopularCities)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={
                showPopularCities
                  ? 'Collapse popular cities'
                  : 'Expand popular cities'
              }
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform ${showPopularCities ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {showPopularCities && (
            <div className="grid grid-cols-2 gap-3">
              {popularCities.map((city) => (
                <button
                  key={`${city.name}-${city.province}`}
                  onClick={() => handleCitySelect(city)}
                  className="premium-weather-card text-left flex flex-col items-start gap-2 p-3 hover:bg-accent/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10 group"
                  type="button"
                  aria-label={`Select ${city.name}, ${city.province}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <MapPin className="w-4 h-4 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                    <div className="flex-1">
                      <div className="premium-text-sm font-semibold text-foreground truncate">
                        {city.name}
                      </div>
                      <div className="premium-text-xs text-muted-foreground truncate">
                        {city.province}
                      </div>
                    </div>
                  </div>
                  {city.population && (
                    <Badge
                      variant="secondary"
                      className="premium-text-xs transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/20"
                    >
                      <Users className="w-3 h-3 mr-1 transition-transform duration-300 group-hover:scale-110" />
                      {formatNumber(city.population)}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

CityInput.displayName = 'CityInput';

export default CityInput;
