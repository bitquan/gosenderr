import { UserRole, getRoleDisplay } from "@gosenderr/shared";

interface RoleBadgeProps {
  role: UserRole;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function RoleBadge({
  role,
  size = "md",
  showIcon = true,
  className = "",
}: RoleBadgeProps) {
  const display = getRoleDisplay(role);

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 bg-gradient-to-r ${display.gradient} text-white font-semibold rounded-full ${sizeClasses[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${display.color}, ${display.color}dd)`,
      }}
    >
      {showIcon && <span className="text-lg">{display.icon}</span>}
      <span>{display.name}</span>
    </div>
  );
}
