
import { useState } from 'react';
import { TransportMode } from '@/lib/v2/types';
import { calcFee, calcMiles } from '@/lib/v2/pricing';

interface RateCard {
  baseFee: number;
  perMile: number;
  minimumFee?: number;
  pickupPerMile?: number;
  perMinute?: number;
  maxPickupMiles?: number;
  maxJobMiles?: number;
  maxRadiusMiles?: number;
}

interface RateCardBuilderProps {
  initialRateCard?: RateCard;
  initialTransportMode?: TransportMode;
  onSave: (rateCard: RateCard, transportMode: TransportMode) => Promise<void>;
  disabled?: boolean;
}

const TRANSPORT_MODES: Array<{ value: TransportMode; label: string; icon: string }> = [
  { value: 'car', label: 'Car', icon: '🚗' },
  { value: 'bike', label: 'Bike', icon: '🚴' },
  { value: 'scooter', label: 'Scooter', icon: '🛴' },
  { value: 'walk', label: 'Walking', icon: '🚶' },
];

export function RateCardBuilder({
  initialRateCard,
  initialTransportMode = 'car',
  onSave,
  disabled = false,
}: RateCardBuilderProps) {
  const [transportMode, setTransportMode] = useState<TransportMode>(initialTransportMode);
  const [baseFee, setBaseFee] = useState(initialRateCard?.baseFee?.toString() || '5');
  const [perMile, setPerMile] = useState(initialRateCard?.perMile?.toString() || '1.5');
  const [minimumFee, setMinimumFee] = useState(initialRateCard?.minimumFee?.toString() || '');
  const [pickupPerMile, setPickupPerMile] = useState(initialRateCard?.pickupPerMile?.toString() || '');
  const [perMinute, setPerMinute] = useState(initialRateCard?.perMinute?.toString() || '');
  const [maxPickupMiles, setMaxPickupMiles] = useState(initialRateCard?.maxPickupMiles?.toString() || '');
  const [maxJobMiles, setMaxJobMiles] = useState(initialRateCard?.maxJobMiles?.toString() || '');
  const [maxRadiusMiles, setMaxRadiusMiles] = useState(initialRateCard?.maxRadiusMiles?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const rateCard: RateCard = {
      baseFee: parseFloat(baseFee) || 0,
      perMile: parseFloat(perMile) || 0,
    };

    if (minimumFee) rateCard.minimumFee = parseFloat(minimumFee);
    if (pickupPerMile) rateCard.pickupPerMile = parseFloat(pickupPerMile);
    if (perMinute) rateCard.perMinute = parseFloat(perMinute);
    if (maxPickupMiles) rateCard.maxPickupMiles = parseFloat(maxPickupMiles);
    if (maxJobMiles) rateCard.maxJobMiles = parseFloat(maxJobMiles);
    if (maxRadiusMiles) rateCard.maxRadiusMiles = parseFloat(maxRadiusMiles);

    try {
      await onSave(rateCard, transportMode);
    } finally {
      setSaving(false);
    }
  };

  // Calculate preview fees
  const getSampleFee = (jobMiles: number, pickupMiles?: number) => {
    const rc: RateCard = {
      baseFee: parseFloat(baseFee) || 0,
      perMile: parseFloat(perMile) || 0,
      minimumFee: parseFloat(minimumFee) || undefined,
      pickupPerMile: parseFloat(pickupPerMile) || undefined,
    };
    return calcFee(rc, jobMiles, pickupMiles);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transport Mode */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Transport Mode *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TRANSPORT_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setTransportMode(mode.value)}
                disabled={disabled}
                className={`p-4 rounded-lg border-2 transition-all ${
                  transportMode === mode.value
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-3xl mb-2">{mode.icon}</div>
                <div className="text-sm font-medium text-gray-900">{mode.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Base Pricing */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Base Pricing</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Fee *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={baseFee}
                  onChange={(e) => setBaseFee(e.target.value)}
                  step="0.01"
                  min="0"
                  required
                  disabled={disabled}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Fixed fee for every delivery</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per Mile *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={perMile}
                  onChange={(e) => setPerMile(e.target.value)}
                  step="0.01"
                  min="0"
                  required
                  disabled={disabled}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Rate per delivery mile</p>
            </div>
          </div>
        </div>

        {/* Optional Pricing */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Optional Pricing</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Fee
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={minimumFee}
                  onChange={(e) => setMinimumFee(e.target.value)}
                  step="0.01"
                  min="0"
                  disabled={disabled}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Per Mile
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={pickupPerMile}
                  onChange={(e) => setPickupPerMile(e.target.value)}
                  step="0.01"
                  min="0"
                  disabled={disabled}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per Minute
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={perMinute}
                  onChange={(e) => setPerMinute(e.target.value)}
                  step="0.01"
                  min="0"
                  disabled={disabled}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Service Limits */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Service Limits</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Pickup Miles
              </label>
              <input
                type="number"
                value={maxPickupMiles}
                onChange={(e) => setMaxPickupMiles(e.target.value)}
                step="0.1"
                min="0"
                disabled={disabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="No limit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Job Miles
              </label>
              <input
                type="number"
                value={maxJobMiles}
                onChange={(e) => setMaxJobMiles(e.target.value)}
                step="0.1"
                min="0"
                disabled={disabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="No limit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Service Radius
              </label>
              <input
                type="number"
                value={maxRadiusMiles}
                onChange={(e) => setMaxRadiusMiles(e.target.value)}
                step="0.1"
                min="0"
                disabled={disabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="No limit"
              />
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Pricing Preview</h3>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">2 mile delivery:</span>
              <span className="font-bold text-lg text-gray-900">${getSampleFee(2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">5 mile delivery:</span>
              <span className="font-bold text-lg text-gray-900">${getSampleFee(5).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">10 mile delivery:</span>
              <span className="font-bold text-lg text-gray-900">${getSampleFee(10).toFixed(2)}</span>
            </div>
            {pickupPerMile && (
              <div className="flex justify-between items-center border-t border-blue-200 pt-3">
                <span className="text-sm text-gray-600">5mi job + 3mi pickup:</span>
                <span className="font-bold text-lg text-gray-900">${getSampleFee(5, 3).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving || disabled}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? 'Saving...' : 'Save Rate Card'}
        </button>
      </form>
    </div>
  );
}
