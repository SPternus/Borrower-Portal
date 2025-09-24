import React, { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2 
      font-medium transition-all duration-200 
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:pointer-events-none disabled:opacity-50
      relative overflow-hidden
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-blue-600 to-blue-700 
        text-white shadow-lg shadow-blue-500/25
        hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/30
        focus-visible:ring-blue-500
        active:scale-[0.98]
      `,
      secondary: `
        bg-gray-100 text-gray-900 
        hover:bg-gray-200 
        focus-visible:ring-gray-500
        border border-gray-200
      `,
      outline: `
        border border-gray-300 bg-transparent text-gray-700
        hover:bg-gray-50 hover:border-gray-400
        focus-visible:ring-gray-500
      `,
      ghost: `
        bg-transparent text-gray-700
        hover:bg-gray-100
        focus-visible:ring-gray-500
      `,
      destructive: `
        bg-gradient-to-r from-red-600 to-red-700 
        text-white shadow-lg shadow-red-500/25
        hover:from-red-700 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/30
        focus-visible:ring-red-500
        active:scale-[0.98]
      `,
      success: `
        bg-gradient-to-r from-emerald-600 to-emerald-700 
        text-white shadow-lg shadow-emerald-500/25
        hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl hover:shadow-emerald-500/30
        focus-visible:ring-emerald-500
        active:scale-[0.98]
      `,
      warning: `
        bg-gradient-to-r from-amber-600 to-amber-700 
        text-white shadow-lg shadow-amber-500/25
        hover:from-amber-700 hover:to-amber-800 hover:shadow-xl hover:shadow-amber-500/30
        focus-visible:ring-amber-500
        active:scale-[0.98]
      `
    };

    const sizes = {
      xs: 'h-7 px-2 text-xs rounded-md',
      sm: 'h-8 px-3 text-sm rounded-md',
      md: 'h-10 px-4 text-sm rounded-lg',
      lg: 'h-11 px-6 text-base rounded-lg',
      xl: 'h-12 px-8 text-lg rounded-xl'
    };

    const LoadingSpinner = () => (
      <svg 
        className="animate-spin h-4 w-4" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {/* Ripple effect overlay */}
        <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
          <span className="absolute inset-0 rounded-[inherit] bg-white/20 opacity-0 transition-opacity hover:opacity-100" />
        </span>
        
        {/* Content */}
        <span className="relative flex items-center gap-2">
          {loading ? (
            <LoadingSpinner />
          ) : leftIcon ? (
            <span className="flex-shrink-0">{leftIcon}</span>
          ) : null}
          
          <span className={loading ? 'opacity-70' : ''}>{children}</span>
          
          {!loading && rightIcon && (
            <span className="flex-shrink-0">{rightIcon}</span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button }; 