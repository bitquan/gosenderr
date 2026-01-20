import { JobStatus } from '@/lib/v2/types';

interface JobStatusPillProps {
  status: JobStatus;
}

const statusColors: Record<JobStatus, string> = {
  open: '#808080',
  assigned: '#2563eb',
  enroute_pickup: '#7c3aed',
  arrived_pickup: '#a855f7',
  picked_up: '#ea580c',
  enroute_dropoff: '#dc2626',
  arrived_dropoff: '#ef4444',
  completed: '#16a34a',
  cancelled: '#52525b',
  disputed: '#f97316',
  expired: '#9ca3af',
  failed: '#dc2626',
};

const statusLabels: Record<JobStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  enroute_pickup: 'En Route to Pickup',
  arrived_pickup: 'Arrived at Pickup',
  picked_up: 'Picked Up',
  enroute_dropoff: 'En Route to Dropoff',
  arrived_dropoff: 'Arrived at Dropoff',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  expired: 'Expired',
  failed: 'Failed',
};

export function JobStatusPill({ status }: JobStatusPillProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        color: 'white',
        background: statusColors[status],
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {statusLabels[status]}
    </span>
  );
}
