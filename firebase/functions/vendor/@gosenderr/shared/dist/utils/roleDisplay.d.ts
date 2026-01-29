import { UserRole } from "../types/firestore";
export declare const ROLE_DISPLAY: {
    readonly customer: {
        readonly name: "Order Up";
        readonly shortName: "Order Up";
        readonly icon: "📦";
        readonly color: "#3B82F6";
        readonly gradient: "from-blue-500 to-blue-600";
        readonly tagline: "Order Up, Sit Back";
        readonly description: "Orders & receives items";
    };
    readonly vendor: {
        readonly name: "Market Senderr";
        readonly shortName: "Market Senderr";
        readonly icon: "🏪";
        readonly color: "#8B5CF6";
        readonly gradient: "from-purple-500 to-purple-600";
        readonly tagline: "Your Market. Your Rules.";
        readonly description: "Lists & sells items on marketplace";
    };
    readonly courier: {
        readonly name: "Senderr";
        readonly shortName: "Senderr";
        readonly icon: "⚡";
        readonly color: "#10B981";
        readonly gradient: "from-green-500 to-emerald-600";
        readonly tagline: "Send It. Earn It. Your Way.";
        readonly description: "Delivers locally (foot/bike/scooter/car)";
    };
    readonly package_runner: {
        readonly name: "Shifter";
        readonly shortName: "Shifter";
        readonly icon: "🚚";
        readonly color: "#F59E0B";
        readonly gradient: "from-orange-500 to-orange-600";
        readonly tagline: "Shift Packages. Shift Income.";
        readonly description: "Long-haul interstate transport";
    };
    readonly runner: {
        readonly name: "Shifter";
        readonly shortName: "Shifter";
        readonly icon: "🚚";
        readonly color: "#F59E0B";
        readonly gradient: "from-orange-500 to-orange-600";
        readonly tagline: "Shift Packages. Shift Income.";
        readonly description: "Long-haul interstate transport";
    };
    readonly admin: {
        readonly name: "Admin";
        readonly shortName: "Admin";
        readonly icon: "👨‍💼";
        readonly color: "#6B7280";
        readonly gradient: "from-gray-500 to-gray-600";
        readonly tagline: "Platform Management";
        readonly description: "Manages platform operations";
    };
};
export type RoleDisplayKey = keyof typeof ROLE_DISPLAY;
export declare function getRoleDisplay(role: UserRole | string): {
    readonly name: "Order Up";
    readonly shortName: "Order Up";
    readonly icon: "📦";
    readonly color: "#3B82F6";
    readonly gradient: "from-blue-500 to-blue-600";
    readonly tagline: "Order Up, Sit Back";
    readonly description: "Orders & receives items";
} | {
    readonly name: "Market Senderr";
    readonly shortName: "Market Senderr";
    readonly icon: "🏪";
    readonly color: "#8B5CF6";
    readonly gradient: "from-purple-500 to-purple-600";
    readonly tagline: "Your Market. Your Rules.";
    readonly description: "Lists & sells items on marketplace";
} | {
    readonly name: "Senderr";
    readonly shortName: "Senderr";
    readonly icon: "⚡";
    readonly color: "#10B981";
    readonly gradient: "from-green-500 to-emerald-600";
    readonly tagline: "Send It. Earn It. Your Way.";
    readonly description: "Delivers locally (foot/bike/scooter/car)";
} | {
    readonly name: "Shifter";
    readonly shortName: "Shifter";
    readonly icon: "🚚";
    readonly color: "#F59E0B";
    readonly gradient: "from-orange-500 to-orange-600";
    readonly tagline: "Shift Packages. Shift Income.";
    readonly description: "Long-haul interstate transport";
} | {
    readonly name: "Shifter";
    readonly shortName: "Shifter";
    readonly icon: "🚚";
    readonly color: "#F59E0B";
    readonly gradient: "from-orange-500 to-orange-600";
    readonly tagline: "Shift Packages. Shift Income.";
    readonly description: "Long-haul interstate transport";
} | {
    readonly name: "Admin";
    readonly shortName: "Admin";
    readonly icon: "👨‍💼";
    readonly color: "#6B7280";
    readonly gradient: "from-gray-500 to-gray-600";
    readonly tagline: "Platform Management";
    readonly description: "Manages platform operations";
};
export declare function getRoleName(role: UserRole | string): string;
export declare function getRoleIcon(role: UserRole | string): string;
export declare function getRoleColor(role: UserRole | string): string;
export declare const TERMINOLOGY: {
    readonly delivery: "send";
    readonly deliveries: "sends";
    readonly job: "send";
    readonly jobs: "sends";
    readonly courier: "Senderr";
    readonly couriers: "Senderrs";
    readonly driver: "Senderr";
    readonly drivers: "Senderrs";
    readonly runner: "Shifter";
    readonly runners: "Shifters";
    readonly route: "shift";
    readonly routes: "shifts";
};
