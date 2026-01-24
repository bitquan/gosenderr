
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/GlassCard';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

type DeliveryType = 'on_demand' | 'route';

interface DeliveryTypeSelectorProps {
  onSelect: (type: DeliveryType) => void;
  onDemandPrice: number;
  routePrice?: number;
  savings?: number;
}

export function DeliveryTypeSelector({
  onSelect,
  onDemandPrice,
  routePrice,
  savings,
}: DeliveryTypeSelectorProps) {
  const { flags, loading } = useFeatureFlags();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-32 w-full rounded-lg" />
        <div className="skeleton h-32 w-full rounded-lg" />
      </div>
    );
  }

  const showRouteOption = flags?.delivery?.routes && routePrice !== undefined;

  return (
    <div className="space-y-4">
      {/* On-Demand Delivery Option */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect('on_demand')}
        className="cursor-pointer"
      >
        <GlassCard hover={false} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🚀</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    On-Demand Delivery
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Delivered today (ASAP)
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${onDemandPrice.toFixed(2)}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Route Delivery Option */}
      {showRouteOption && routePrice !== undefined && (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('route')}
          className="cursor-pointer"
        >
          <GlassCard hover={false} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">📦</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Route Delivery
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Delivered tomorrow by 8 PM
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Grouped with other deliveries in your area
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${routePrice.toFixed(2)}
                </p>
                {savings !== undefined && savings > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="inline-block mt-1 px-2 py-1 text-xs font-bold bg-green-500 text-white rounded-full"
                  >
                    Save ${savings.toFixed(2)}!
                  </motion.span>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
