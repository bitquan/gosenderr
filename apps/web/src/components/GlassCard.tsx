'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = '', hover = true, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      className={`glass-card p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className = '', lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4"
          style={{
            width: i === 0 ? '33%' : i === lines - 1 ? '83%' : '100%',
          }}
        />
      ))}
    </div>
  );
}
