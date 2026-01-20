'use client';

import { useState, useEffect, useRef } from 'react';
import { geocodeAddress, GeocodedAddress } from '@/lib/mapbox/geocode';

interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  onSelect: (result: { address: string; lat: number; lng: number }) => void;
  required?: boolean;
}

export function AddressAutocomplete({ 
  label, 
  placeholder = 'Enter address...', 
  onSelect,
  required = false 
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      setSelectedAddress('');
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
        {label}
        {required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      
      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
      />

      {loading && (
        <div style={{ 
          position: 'absolute', 
          right: '12px', 
          top: '38px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          Searching...
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000,
        }}>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSelect(suggestion)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                fontSize: '14px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                {suggestion.address.split(',')[0]}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {suggestion.address}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAddress && (
        <div style={{ 
          marginTop: '6px', 
          fontSize: '12px', 
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          ✓ Address selected
        </div>
      )}
    </div>
  );
}
