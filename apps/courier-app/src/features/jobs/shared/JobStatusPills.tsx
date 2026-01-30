
import { JobStatus } from '../shared/types';

interface JobStatusPillsProps {
  status: JobStatus;
}

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; background: string }> = {
  pending: { label: 'Available', color: '#10b981', background: '#d1fae5' },
  claimed: { label: 'Claimed', color: '#3b82f6', background: '#dbeafe' },
  active: { label: 'In Progress', color: '#f59e0b', background: '#fef3c7' },
  open: { label: 'Open', color: '#059669', background: '#d1fae5' },
  assigned: { label: 'Assigned', color: '#2563eb', background: '#dbeafe' },
  enroute_pickup: { label: 'En Route to Pickup', color: '#7c3aed', background: '#ede9fe' },
  arrived_pickup: { label: 'Arrived at Pickup', color: '#7c3aed', background: '#ede9fe' },
  picked_up: { label: 'Picked Up', color: '#ea580c', background: '#ffedd5' },
  enroute_dropoff: { label: 'En Route to Dropoff', color: '#ea580c', background: '#ffedd5' },
  arrived_dropoff: { label: 'Arrived at Dropoff', color: '#ea580c', background: '#ffedd5' },
  completed: { label: 'Completed', color: '#16a34a', background: '#dcfce7' },
  cancelled: { label: 'Cancelled', color: '#dc2626', background: '#fee2e2' },
  disputed: { label: 'Disputed', color: '#f97316', background: '#ffedd5' },
  expired: { label: 'Expired', color: '#9ca3af', background: '#f3f4f6' },
  failed: { label: 'Failed', color: '#dc2626', background: '#fee2e2' },
};

export function JobStatusPills({ status }: JobStatusPillsProps) {
  const config = STATUS_CONFIG[status];

  // Defensive fallback for unknown statuses
  if (!config) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: '#f3f4f6',
          color: '#6b7280',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '600',
        }}
      >
        {status || 'Unknown'}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        background: config.background,
        color: config.color,
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '600',
      }}
    >
      {config.label}
    </span>
  );
}
