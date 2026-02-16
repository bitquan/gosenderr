import { ReactNode } from "react";
import { AuthGate } from "@/components/v2/AuthGate";
import { RoleGate } from "@/components/v2/RoleGate";
import { SenderrplaceShell } from "@/components/layout/SenderrplaceShell";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <RoleGate allowedRole="customer">
        <SenderrplaceShell>{children}</SenderrplaceShell>
      </RoleGate>
    </AuthGate>
  );
}
