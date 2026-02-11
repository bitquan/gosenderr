
import { useLocation } from 'react-router-dom';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { CustomerJobCreateForm } from '@/features/jobs/customer/CustomerJobCreateForm';

interface NewJobLocationState {
  initialPickup?: {
    lat: number;
    lng: number;
    label?: string;
  };
  initialPickupLabel?: string;
  initialRestaurantName?: string;
  initialRestaurantId?: string;
}

export default function NewJob() {
  const { uid } = useAuthUser();
  const location = useLocation();
  const state = (location.state || {}) as NewJobLocationState;

  if (!uid) {
    return <div>Loading...</div>;
  }

  return (
    <CustomerJobCreateForm
      uid={uid}
      initialPickup={state.initialPickup ?? null}
      initialPickupLabel={state.initialPickupLabel ?? ''}
      initialRestaurantName={state.initialRestaurantName ?? ''}
      initialRestaurantId={state.initialRestaurantId ?? ''}
    />
  );
}
