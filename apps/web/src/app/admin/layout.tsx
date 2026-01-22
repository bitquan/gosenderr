import { ReactNode } from "react";
import { BottomNav, adminNavItems } from "@/components/ui/BottomNav";
import { RoleFab } from "@/components/ui/RoleFab";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-24">
      {children}
      <BottomNav items={adminNavItems} />
      <RoleFab role="admin" />
    </div>
  );
}
