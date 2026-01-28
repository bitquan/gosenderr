import { useEffect, useState, useRef } from 'react';
import type { Job } from '@/lib/v2/types';

interface JobThumbnailProps {
  job: Job;
  isSelected: boolean;
  onClick: () => void;
  map: any;
}

export function JobThumbnail({ job, isSelected, onClick, map }: JobThumbnailProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!map) return;

    const updatePosition = () => {
      // Cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use requestAnimationFrame for smooth 60fps updates
      rafRef.current = requestAnimationFrame(() => {
        const point = map.project([job.pickup.lng, job.pickup.lat]);
        setPosition({ x: point.x, y: point.y });
      });
    };

    // Initial position
    updatePosition();

    // Update on map events - these fire frequently so RAF throttles them
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);
    map.on('rotate', updatePosition);
    map.on('pitch', updatePosition);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
      map.off('rotate', updatePosition);
      map.off('pitch', updatePosition);
    };
  }, [map, job.pickup.lat, job.pickup.lng]);

  if (!position) return null;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: isSelected ? 30 : 20,
        willChange: 'transform', // Optimize for animations
      }}
      className={`cursor-pointer transition-all duration-200 ${
        isSelected ? 'scale-110' : 'hover:scale-105'
      }`}
    >
      <div
        className={`px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm ${
          isSelected
            ? 'bg-emerald-500 text-white border-2 border-white'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
          <span>📦</span>
          <span>${(job as any).fee?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="text-xs mt-0.5 opacity-90">
          {(job as any).deliverySize || 'Package'}
        </div>
      </div>
      {/* Arrow pointing down to marker */}
      <div
        className={`w-0 h-0 mx-auto ${
          isSelected
            ? 'border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-emerald-500'
            : 'border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white'
        }`}
      />
    </div>
  );
}
