import { ReactNode } from 'react';
import { AuthGate } from '@/components/v2/AuthGate';
import { RoleGate } from '@/components/v2/RoleGate';

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <RoleGate allowedRole="customer">
        {children}
      </RoleGate>
    </AuthGate>
  );
}
