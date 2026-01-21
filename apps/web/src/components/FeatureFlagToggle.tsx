'use client';

import React from 'react';

interface FeatureFlagToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export default function FeatureFlagToggle({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
}: FeatureFlagToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/10">
      <div className="flex-1">
        <label className="text-sm font-medium text-white cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-white/60 mt-1">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${enabled ? 'bg-blue-600' : 'bg-gray-600'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-lg
            transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
