"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMINOLOGY = exports.ROLE_DISPLAY = void 0;
exports.getRoleDisplay = getRoleDisplay;
exports.getRoleName = getRoleName;
exports.getRoleIcon = getRoleIcon;
exports.getRoleColor = getRoleColor;
exports.ROLE_DISPLAY = {
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
};
function getRoleDisplay(role) {
    // Map legacy/alternate role names
    const roleMap = {
        buyer: "customer",
        seller: "vendor",
        customer: "customer",
        vendor: "vendor",
        courier: "courier",
        package_runner: "package_runner",
        runner: "runner",
        admin: "admin",
    };
    const mappedRole = roleMap[role] || "customer";
    return exports.ROLE_DISPLAY[mappedRole] || exports.ROLE_DISPLAY.customer;
}
function getRoleName(role) {
    return getRoleDisplay(role).name;
}
function getRoleIcon(role) {
    return getRoleDisplay(role).icon;
}
function getRoleColor(role) {
    return getRoleDisplay(role).color;
}
// Terminology mapping for common words
exports.TERMINOLOGY = {
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
};
