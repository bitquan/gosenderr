
import { PackageSize, PackageFlags } from '../shared/types';

interface PackageBadgesProps {
  size?: PackageSize;
  flags?: PackageFlags;
  notes?: string;
  showNotes?: boolean;
}

const SIZE_LABELS: Record<PackageSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xl: 'Extra Large',
};

const SIZE_COLORS: Record<PackageSize, string> = {
  small: '#16a34a',
  medium: '#2563eb',
  large: '#ea580c',
  xl: '#dc2626',
};

export function PackageBadges({ size, flags, notes, showNotes = false }: PackageBadgesProps) {
  // Early return if nothing to show
  if (!size && (!flags || Object.keys(flags).length === 0)) {
    return null;
  }

  return (
    <div>
      {/* Size Badge */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: notes && showNotes ? '8px' : 0 }}>
        {size && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: SIZE_COLORS[size],
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            📦 {SIZE_LABELS[size]}
          </span>
        )}

        {/* Flag Badges */}
        {flags?.needsSuvVan && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: '#f59e0b',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            🚐 SUV/Van
          </span>
        )}

        {flags?.fragile && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: '#8b5cf6',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            📦 Fragile
          </span>
        )}

        {flags?.heavyTwoPerson && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: '#dc2626',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            💪 2-Person
          </span>
        )}

        {flags?.oversized && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: '#db2777',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            📏 Oversized
          </span>
        )}

        {flags?.stairs && (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: '#6366f1',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            🪜 Stairs
          </span>
        )}
      </div>

      {/* Notes Section */}
      {notes && showNotes && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#666',
          }}
        >
          <strong style={{ color: '#333' }}>Notes:</strong> {notes}
        </div>
      )}
    </div>
  );
}
