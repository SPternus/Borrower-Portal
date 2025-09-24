import React, { useState } from 'react';
import { Button } from './Button';
import { cn } from '../../../lib/utils';

interface PlaidVerificationButtonProps {
  onVerify: () => void;
  isLoading?: boolean;
  className?: string;
}

export const PlaidVerificationButton: React.FC<PlaidVerificationButtonProps> = ({
  onVerify,
  isLoading = false,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onVerify}
      disabled={isLoading}
      className={cn(
        "border-2 border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50",
        "transition-all duration-200 hover:shadow-md",
        "relative overflow-hidden group text-xs font-medium",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-center space-x-1.5">
        {isLoading ? (
          <>
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg 
              className="w-3 h-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <span>Verify Myself</span>
          </>
        )}
      </div>
      
      {/* Subtle animated background effect */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-500/10 opacity-0 transition-opacity duration-200",
          isHovered && !isLoading && "opacity-100"
        )}
      />
    </Button>
  );
}; 