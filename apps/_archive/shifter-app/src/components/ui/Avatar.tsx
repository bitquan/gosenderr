
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const sizeStyles = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const gradients = [
    "from-purple-400 to-pink-400",
    "from-blue-400 to-teal-400",
    "from-green-400 to-emerald-400",
    "from-orange-400 to-yellow-400",
    "from-red-400 to-pink-400",
  ];

  const getGradient = (text: string) => {
    const index = text.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  if (src) {
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center",
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        <img
          src={src}
          alt={alt || "Avatar"}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const displayText = fallback || alt || "?";
  const initials = getInitials(displayText);
  const gradient = getGradient(displayText);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center font-semibold text-white",
        `bg-gradient-to-br ${gradient}`,
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    alt?: string;
    fallback?: string;
  }>;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 3,
  size = "sm",
  className,
}: AvatarGroupProps) {
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {displayAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...avatar}
          size={size}
          className="border-2 border-white"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 font-medium",
            size === "xs" && "w-6 h-6 text-xs",
            size === "sm" && "w-8 h-8 text-sm",
            size === "md" && "w-10 h-10 text-base",
            size === "lg" && "w-12 h-12 text-lg",
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
