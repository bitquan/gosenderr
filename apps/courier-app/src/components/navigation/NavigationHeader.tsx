import { formatDistance, formatDuration } from '@/utils/format';
import type { RouteStep } from '@/lib/navigation/types';

interface NavigationHeaderProps {
  currentStep: RouteStep | null;
  distanceToTurn: number; // meters
  timeRemaining: number; // seconds
  totalDistance: number; // meters
  onExit: () => void;
}

export function NavigationHeader({
  currentStep,
  distanceToTurn,
  timeRemaining,
  totalDistance,
  onExit,
}: NavigationHeaderProps) {
  if (!currentStep) {
    return (
      <div className="bg-white shadow-lg p-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">No active navigation</p>
          <button
            onClick={onExit}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Exit
          </button>
        </div>
      </div>
    );
  }

  const instruction = currentStep.maneuver.instruction;
  const nextInstruction = currentStep.instruction;

  return (
    <div className="bg-white shadow-lg safe-top">
      {/* Main Instruction Card */}
      <div className="p-3 sm:p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            {/* Distance to Turn - Large and prominent */}
            <div className="text-3xl sm:text-5xl font-bold text-gray-900 mb-1 sm:mb-2">
              {formatDistance(distanceToTurn)}
            </div>
            
            {/* Current Instruction */}
            <div className="text-base sm:text-xl font-medium text-gray-800 line-clamp-2">
              {instruction}
            </div>
            
            {/* Next Instruction Preview (if available) */}
            {nextInstruction && nextInstruction !== instruction && (
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-1">
                Then: {nextInstruction}
              </div>
            )}
          </div>

          {/* Exit Button */}
          <button
            onClick={onExit}
            className="ml-2 sm:ml-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ETA and Distance Info Bar */}
      <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gray-50 flex justify-between items-center text-xs sm:text-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <div>
            <span className="text-gray-500">ETA:</span>
            <span className="ml-1 sm:ml-2 font-semibold text-gray-900">
              {formatDuration(timeRemaining)}
            </span>
          </div>
          <div className="h-3 sm:h-4 w-px bg-gray-300" />
          <div>
            <span className="text-gray-500">Distance:</span>
            <span className="ml-1 sm:ml-2 font-semibold text-gray-900">
              {formatDistance(totalDistance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
