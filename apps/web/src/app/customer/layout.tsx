import { ReactNode } from "react";
import { AuthGate } from "@/components/v2/AuthGate";
import { RoleGate } from "@/components/v2/RoleGate";
import { BottomNav, customerNavItems } from "@/components/ui/BottomNav";
import { RoleFab } from "@/components/ui/RoleFab";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <RoleGate allowedRole="customer">
        <div className="min-h-screen pb-24">
          {children}
          <BottomNav items={customerNavItems} />
          <RoleFab
            role="customer"
            hideOnPaths={["/customer/request-delivery", "/customer/checkout"]}
            className="bottom-24 right-6"
          />
        </div>
      </RoleGate>
    </AuthGate>
  );
}
