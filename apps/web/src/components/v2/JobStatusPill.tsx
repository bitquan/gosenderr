import { JobStatus } from '@/lib/v2/types';

interface JobStatusPillProps {
  status: JobStatus;
}

const statusColors: Record<JobStatus, string> = {
  open: '#808080',
  assigned: '#2563eb',
  enroute_pickup: '#7c3aed',
  picked_up: '#ea580c',
  enroute_dropoff: '#dc2626',
  delivered: '#16a34a',
  cancelled: '#52525b',
};

const statusLabels: Record<JobStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  enroute_pickup: 'En Route to Pickup',
  picked_up: 'Picked Up',
  enroute_dropoff: 'En Route to Dropoff',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
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
