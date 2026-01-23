import { UserRole } from "../types/firestore";

export const ROLE_DISPLAY = {
  customer: {
    name: "Order Up",
    shortName: "Order Up",
    icon: "📦",
    color: "#3B82F6",
    gradient: "from-blue-500 to-blue-600",
    tagline: "Order Up, Sit Back",
    description: "Orders & receives items",
  },
  vendor: {
    name: "Market Senderr",
    shortName: "Market Senderr",
    icon: "🏪",
    color: "#8B5CF6",
    gradient: "from-purple-500 to-purple-600",
    tagline: "Your Market. Your Rules.",
    description: "Lists & sells items on marketplace",
  },
  courier: {
    name: "Senderr",
    shortName: "Senderr",
    icon: "⚡",
    color: "#10B981",
    gradient: "from-green-500 to-emerald-600",
    tagline: "Send It. Earn It. Your Way.",
    description: "Delivers locally (foot/bike/scooter/car)",
  },
  package_runner: {
    name: "Shifter",
    shortName: "Shifter",
    icon: "🚚",
    color: "#F59E0B",
    gradient: "from-orange-500 to-orange-600",
    tagline: "Shift Packages. Shift Income.",
    description: "Long-haul interstate transport",
  },
  runner: {
    name: "Shifter",
    shortName: "Shifter",
    icon: "🚚",
    color: "#F59E0B",
    gradient: "from-orange-500 to-orange-600",
    tagline: "Shift Packages. Shift Income.",
    description: "Long-haul interstate transport",
  },
  admin: {
    name: "Admin",
    shortName: "Admin",
    icon: "👨‍💼",
    color: "#6B7280",
    gradient: "from-gray-500 to-gray-600",
    tagline: "Platform Management",
    description: "Manages platform operations",
  },
} as const;

export type RoleDisplayKey = keyof typeof ROLE_DISPLAY;

export function getRoleDisplay(role: UserRole) {
  return ROLE_DISPLAY[role] || ROLE_DISPLAY.customer;
}

export function getRoleName(role: UserRole): string {
  return getRoleDisplay(role).name;
}

export function getRoleIcon(role: UserRole): string {
  return getRoleDisplay(role).icon;
}

export function getRoleColor(role: UserRole): string {
  return getRoleDisplay(role).color;
}

// Terminology mapping for common words
export const TERMINOLOGY = {
  // Delivery/Job → Send
  delivery: "send",
  deliveries: "sends",
  job: "send",
  jobs: "sends",

  // Courier/Driver → Senderr
  courier: "Senderr",
  couriers: "Senderrs",
  driver: "Senderr",
  drivers: "Senderrs",

  // Runner → Shifter
  runner: "Shifter",
  runners: "Shifters",

  // Route → Shift (for Shifters)
  route: "shift",
  routes: "shifts",
} as const;
