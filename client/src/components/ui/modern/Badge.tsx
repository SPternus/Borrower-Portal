import React, { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'gradient' | 'verified';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  children: React.ReactNode;
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md',
    dot = false,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = `
      inline-flex items-center gap-1.5 font-medium 
      transition-all duration-200 
      border
    `;

    const variants = {
      default: `
        bg-gray-100 text-gray-800 border-gray-200
        hover:bg-gray-200
      `,
      primary: `
        bg-blue-100 text-blue-800 border-blue-200
        hover:bg-blue-200
      `,
      secondary: `
        bg-purple-100 text-purple-800 border-purple-200
        hover:bg-purple-200
      `,
      success: `
        bg-emerald-100 text-emerald-800 border-emerald-200
        hover:bg-emerald-200
      `,
      warning: `
        bg-amber-100 text-amber-800 border-amber-200
        hover:bg-amber-200
      `,
      error: `
        bg-red-100 text-red-800 border-red-200
        hover:bg-red-200
      `,
      info: `
        bg-sky-100 text-sky-800 border-sky-200
        hover:bg-sky-200
      `,
      outline: `
        bg-transparent text-gray-700 border-gray-300
        hover:bg-gray-50
      `,
      gradient: `
        bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent
        hover:from-amber-600 hover:to-orange-700 shadow-lg
      `,
      verified: `
        bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105 animate-pulse
      `
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs rounded-md',
      md: 'px-2.5 py-1 text-sm rounded-lg',
      lg: 'px-3 py-1.5 text-base rounded-lg'
    };

    const dotColors = {
      default: 'bg-gray-500',
      primary: 'bg-blue-500',
      secondary: 'bg-purple-500',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
      info: 'bg-sky-500',
      outline: 'bg-gray-500',
      gradient: 'bg-amber-500',
      verified: 'bg-emerald-500'
    };

    const dotSizes = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5'
    };

    return (
      <div
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {dot && (
          <div 
            className={cn(
              'rounded-full',
              dotColors[variant],
              dotSizes[size]
            )}
          />
        )}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge }; 