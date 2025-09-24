import React, { forwardRef, useState } from 'react';
import { cn, getInitials } from '../../../lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'circular' | 'rounded' | 'square';
  status?: 'online' | 'offline' | 'away' | 'busy';
  showStatus?: boolean;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ 
    className, 
    src,
    alt,
    name = '',
    size = 'md',
    variant = 'circular',
    status,
    showStatus = false,
    ...props 
  }, ref) => {
    const [imageError, setImageError] = useState(false);

    const sizes = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
      '2xl': 'w-20 h-20 text-2xl'
    };

    const variants = {
      circular: 'rounded-full',
      rounded: 'rounded-lg',
      square: 'rounded-md'
    };

    const statusColors = {
      online: 'bg-emerald-500',
      offline: 'bg-gray-400',
      away: 'bg-amber-500',
      busy: 'bg-red-500'
    };

    const statusSizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-3.5 h-3.5',
      '2xl': 'w-4 h-4'
    };

    const initials = getInitials(name);

    return (
      <div
        className={cn(
          'relative inline-flex items-center justify-center',
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || name}
            className={cn(
              'w-full h-full object-cover',
              variants[variant]
            )}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center font-medium',
              'bg-gradient-to-br from-blue-500 to-purple-600 text-white',
              variants[variant]
            )}
          >
            {initials}
          </div>
        )}

        {/* Status indicator */}
        {showStatus && status && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white',
              statusColors[status],
              statusSizes[size]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar Group component for showing multiple avatars
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max = 5, size = 'md', ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const visibleChildren = childrenArray.slice(0, max);
    const remainingCount = childrenArray.length - max;

    const sizes = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
      '2xl': 'w-20 h-20 text-2xl'
    };

    return (
      <div
        className={cn('flex -space-x-2', className)}
        ref={ref}
        {...props}
      >
        {visibleChildren.map((child, index) => (
          <div key={index} className="ring-2 ring-white rounded-full">
            {React.isValidElement(child) && React.cloneElement(child, { size } as any)}
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div
            className={cn(
              'flex items-center justify-center font-medium',
              'bg-gray-100 text-gray-600 rounded-full ring-2 ring-white',
              sizes[size]
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup }; 