import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show as full-page centered */
  fullPage?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Whether to show spinner icon */
  showSpinner?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  fullPage = false,
  className = '',
  showSpinner = true,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'text-sm py-4',
    md: 'text-base py-8',
    lg: 'text-lg py-12',
  };

  const spinnerSize = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const containerClasses = fullPage
    ? 'flex items-center justify-center min-h-screen'
    : `text-center ${sizeClasses[size]} ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3">
        {showSpinner && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className={`${spinnerSize[size]} border-2 border-gray-300 border-t-emerald-500 rounded-full`}
          />
        )}
        <p className="text-gray-600 animate-pulse">{message}</p>
      </div>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const spinnerSize = {
    sm: 'h-4 w-4 border',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-2',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${spinnerSize[size]} border-gray-300 border-t-emerald-500 rounded-full inline-block ${className}`}
    />
  );
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className = '' }: LoadingDotsProps) {
  return (
    <span className={`inline-flex gap-1 ${className}`}>
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
        className="inline-block"
      >
        .
      </motion.span>
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
        className="inline-block"
      >
        .
      </motion.span>
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
        className="inline-block"
      >
        .
      </motion.span>
    </span>
  );
}

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  children?: ReactNode;
}

export function LoadingOverlay({ show, message = 'Loading...', children }: LoadingOverlayProps) {
  if (!show) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
      >
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 font-medium">{message}</p>
        </div>
      </motion.div>
    </div>
  );
}
