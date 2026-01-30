
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/v2/useUserRole';

interface RoleGateProps {
  children: ReactNode;
  allowedRole: 'customer' | 'courier' | 'vendor';
}

/**
 * RoleGate - enforces role, redirects if missing or wrong
 */
export function RoleGate({ children, allowedRole }: RoleGateProps) {
  const { role, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!role) {
      // No role set, go to select-role
      navigate('/select-role');
      return;
    }

    if (role !== allowedRole) {
      // Wrong role, redirect to correct home
      if (role === 'customer') {
        navigate('/customer/jobs');
      } else if (role === 'vendor') {
        navigate('/vendor/dashboard');
      } else {
        navigate('/courier/dashboard');
      }
    }
  }, [role, loading, allowedRole, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!role || role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}
