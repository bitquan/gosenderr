'use client';

import { motion } from 'framer-motion';
import type { RouteDoc } from '@gosenderr/shared';
import { GlassCard } from './GlassCard';

interface RouteCardProps {
  route: RouteDoc;
  onViewDetails: () => void;
  onAccept: () => void;
}

export function RouteCard({ route, onViewDetails, onAccept }: RouteCardProps) {
  const previewStops = route.optimizedStops.slice(0, 3);
  const remainingStops = route.totalJobs - previewStops.length;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-4">
        {/* Header with Area and Stats */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold">{route.area.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {route.totalJobs} stops • {route.totalDistance.toFixed(1)} mi • {Math.round(route.estimatedDuration / 60)} min
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${route.pricing.courierEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">earnings</p>
          </div>
        </div>

        {/* Required Equipment */}
        {route.requiredEquipment.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {route.requiredEquipment.map((equipment) => (
              <span
                key={equipment}
                className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
              >
                {equipment.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Preview Stops */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Route Preview:</p>
          {previewStops.map((stop, index) => (
            <div key={stop.jobId} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
                {index + 1}
              </span>
              <span className="text-gray-600 dark:text-gray-400 truncate">{stop.location.address}</span>
            </div>
          ))}
          {remainingStops > 0 && (
            <p className="text-sm text-gray-500 pl-8">... + {remainingStops} more stops</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onViewDetails}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            View Details
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Accept Route
          </motion.button>
        </div>
      </div>
    </GlassCard>
  );
}
