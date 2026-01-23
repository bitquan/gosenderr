"use client";

import { useRouter, usePathname } from "next/navigation";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { cn } from "@/lib/utils";

type RoleFabRole = "customer" | "runner" | "admin";

const roleConfig: Record<
  RoleFabRole,
  { icon: string; href: string; label: string }
> = {
  customer: {
    icon: "➕",
    href: "/customer/ship",
    label: "Ship",
  },
  runner: {
    icon: "🗺️",
    href: "/runner/available-routes",
    label: "Shifts",
  },
  admin: {
    icon: "➕",
    href: "/admin/packages",
    label: "Packages",
  },
};

interface RoleFabProps {
  role: RoleFabRole;
  className?: string;
  hideOnPaths?: string[];
}

export function RoleFab({ role, className, hideOnPaths }: RoleFabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const config = roleConfig[role];

  if (!config) return null;
  if (hideOnPaths?.some((path) => pathname.startsWith(path))) return null;

  return (
    <FloatingButton
      icon={config.icon}
      aria-label={config.label}
      onClick={() => router.push(config.href)}
      className={cn("shadow-xl", className)}
    />
  );
}
