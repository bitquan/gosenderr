import { ReactNode } from "react";
import { AuthGate } from "@/components/v2/AuthGate";
import { RoleGate } from "@/components/v2/RoleGate";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import MapShellScreen from "@/screens/MapShellScreen";

export default function CourierLayout({ children }: { children: ReactNode }) {
  const { flags } = useFeatureFlags();
  const mapShellEnabled = flags?.delivery?.mapShell ?? false;

  return (
    <AuthGate>
      <RoleGate allowedRole="courier">
        {mapShellEnabled ? (
          <MapShellScreen>{children}</MapShellScreen>
        ) : (
          children
        )}
      </RoleGate>
    </AuthGate>
  );
}
