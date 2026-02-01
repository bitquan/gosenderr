
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { CustomerJobCreateForm } from '@/features/jobs/customer/CustomerJobCreateForm';

export default function NewJob() {
  const { uid } = useAuthUser();

  if (!uid) {
    return <div>Loading...</div>;
  }

  return <CustomerJobCreateForm uid={uid} />;
}
