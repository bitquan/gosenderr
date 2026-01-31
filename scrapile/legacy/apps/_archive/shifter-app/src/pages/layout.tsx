import { ReactNode } from "react";
import { BottomNav, runnerNavItems } from "@/components/ui/BottomNav";
import { RoleFab } from "@/components/ui/RoleFab";

export default function RunnerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-24">
      {children}
      <BottomNav items={runnerNavItems} />
      <RoleFab role="runner" />
    </div>
  );
}
