
import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "gradient";
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  variant = "default",
  hover = false,
  padding = "md",
  className,
  ...props
}: CardProps) {
  const baseStyles =
    "rounded-[20px] border border-white/20 bg-black/10 backdrop-blur-lg transition-all duration-300 text-slate-100 shadow-[0_25px_75px_rgba(10,8,38,0.45)]";

  const variantStyles = {
    default:
      "bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-indigo-950/80 border-white/30 text-white shadow-[0_35px_90px_rgba(10,8,38,0.5)]",
    elevated:
      "bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 text-slate-900 border-violet-200/80 shadow-[0_30px_70px_rgba(37,25,84,0.22)] hover:border-violet-300",
    gradient:
      "bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-[0_8px_32px_rgba(107,78,255,0.2)]",
  };

  const hoverStyles = hover
    ? "hover:shadow-[0_8px_32px_rgba(107,78,255,0.12)] hover:-translate-y-1 cursor-pointer"
    : "";

  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        hoverStyles,
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  action?: ReactNode;
}

export function CardHeader({
  children,
  action,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn("flex items-center justify-between mb-4", className)}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold text-current", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-sm opacity-80", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-4 border-t border-current/20 pt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}
