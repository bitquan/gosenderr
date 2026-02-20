import { Navigate, useParams } from "react-router-dom";

export default function CourierJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const redirectTo = jobId ? `/jobs/${jobId}` : "/dashboard";
  return <Navigate to={redirectTo} replace />;
}
