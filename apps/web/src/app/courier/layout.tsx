import { ReactNode } from 'react';
import { AuthGate } from '@/components/v2/AuthGate';
import { RoleGate } from '@/components/v2/RoleGate';

export default function CourierLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <RoleGate allowedRole="courier">
        {children}
      </RoleGate>
    </AuthGate>
  );
}
