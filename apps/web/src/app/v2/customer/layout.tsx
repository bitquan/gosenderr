import { ReactNode } from 'react';
import { AuthGate } from '@/components/v2/AuthGate';
import { RoleGate } from '@/components/v2/RoleGate';
import { Navbar } from '@/components/v2/Navbar';

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <RoleGate allowedRole="customer">
        <Navbar>
          {children}
        </Navbar>
      </RoleGate>
    </AuthGate>
  );
}
