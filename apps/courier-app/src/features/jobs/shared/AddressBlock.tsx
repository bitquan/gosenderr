
import { GeoPoint } from '../shared/types';
import { getDisplayAddress } from '../shared/privacy';

interface AddressBlockProps {
  label: string;
  location: GeoPoint;
  canSeeExact: boolean;
  icon?: string;
  addressOverride?: string;
}

export function AddressBlock({
  label,
  location,
  canSeeExact,
  icon = '📍',
  addressOverride,
}: AddressBlockProps) {
  const displayAddress = getDisplayAddress(
    addressOverride ?? location.label,
    location.lat,
    location.lng,
    canSeeExact
  );

  return (
    <div style={{ marginBottom: '8px' }}>
      <strong>
        {icon} {label}:
      </strong>
      <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
        {displayAddress}
        {!canSeeExact && (
          <span
            style={{
              display: 'inline-block',
              marginLeft: '8px',
              padding: '2px 6px',
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '11px',
              borderRadius: '3px',
              fontWeight: '600',
            }}
          >
            Approximate
          </span>
        )}
      </div>
    </div>
  );
}
