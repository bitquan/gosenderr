'use client';

import { AuthGate } from '@/components/AuthGate';
import { RoleGate } from '@/components/RoleGate';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <RoleGate allowedRoles={['customer']}>
        {children}
      </RoleGate>
    </AuthGate>
  );
}
