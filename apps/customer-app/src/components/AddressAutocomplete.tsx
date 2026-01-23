import { useState, useEffect, useRef } from "react";
import { geocodeAddress, GeocodedAddress } from "../lib/mapbox";

interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  onSelect: (result: { address: string; lat: number; lng: number }) => void;
  required?: boolean;
  value?: string;
}

export function AddressAutocomplete({
  label,
  placeholder = "Enter address...",
  onSelect,
  required = false,
  value = "",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
    setSelectedAddress(value);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced geocoding
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      const results = await geocodeAddress(query);
      setSuggestions(results);
      setLoading(false);
      setShowSuggestions(true);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleSelect = (suggestion: GeocodedAddress) => {
    setQuery(suggestion.address);
    setSelectedAddress(suggestion.address);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelect({
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value !== selectedAddress) {
      setSelectedAddress("");
    }
  };

  return (
    <div ref={wrapperRef} className="relative mb-4">
      <label className="block mb-1.5 text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>

      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
      />

      {loading && (
        <div className="absolute right-3 top-9 text-xs text-gray-500">
          Searching...
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg border-b last:border-b-0 border-gray-100"
            >
              <div className="font-medium text-gray-900">
                {suggestion.place_name}
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && query.length >= 3 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm text-gray-500">
          No addresses found
        </div>
      )}
    </div>
  );
}
