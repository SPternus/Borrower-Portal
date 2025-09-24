import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'nav';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  variant = 'full',
  className = '' 
}) => {
  const sizeClasses = {
    small: { width: 80, height: 80, text: 'text-lg' },
    medium: { width: 120, height: 120, text: 'text-xl' },
    large: { width: 200, height: 200, text: 'text-2xl' },
    nav: { width: 100, height: 100, text: 'text-lg' }
  };

  const currentSize = sizeClasses[size];

  // Try to use uploaded logo first, fallback to designed logo
  const useUploadedLogo = true; // Logo is now available!

  if (useUploadedLogo && variant !== 'text') {
    return (
      <div className={`flex items-center ${className}`}>
        {variant === 'full' && (
          <Image
            src="/assets/images/ternus-logo.png"
            alt="Ternus Logo"
            width={currentSize.width}
            height={currentSize.height}
            className="object-contain"
            priority
          />
        )}
        {variant === 'icon' && (
          <Image
            src="/assets/images/ternus-logo.png"
            alt="Ternus Logo"
            width={currentSize.width}
            height={currentSize.height}
            className="object-contain"
            priority
          />
        )}
      </div>
    );
  }

  // Fallback to current gradient design
  return (
    <div className={`flex items-center ${className}`}>
      {variant !== 'text' && (
        <div 
          className={`bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center`}
          style={{ 
            width: currentSize.width, 
            height: currentSize.height 
          }}
        >
          <span className={`text-white font-bold ${currentSize.text}`}>T</span>
        </div>
      )}
      {variant === 'text' && (
        <span className={`font-bold text-gray-900 ${currentSize.text}`}>
          TERNUS
        </span>
      )}
    </div>
  );
};

export default Logo; 