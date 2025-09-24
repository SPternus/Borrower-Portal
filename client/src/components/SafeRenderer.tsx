import React from 'react';

interface SafeRendererProps {
  value: any;
  className?: string;
  fallback?: React.ReactNode;
}

const SafeRenderer: React.FC<SafeRendererProps> = ({ value, className, fallback = 'N/A' }) => {
  const renderValue = (): React.ReactNode => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return fallback;
    }

    // Handle primitives (string, number, boolean)
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    // Handle React elements
    if (React.isValidElement(value)) {
      return value;
    }

    // Handle arrays - render as comma-separated values
    if (Array.isArray(value)) {
      const arrayItems = value.map((item, index) => {
        // For array items, render primitives as strings, complex objects simplified
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          return String(item);
        }
        if (typeof item === 'object' && item !== null) {
          // Special handling for address objects
          if (item.street || item.city || item.state || item.country) {
            const addressParts = [
              item.street,
              item.city && item.state ? `${item.city}, ${item.state}` : item.city || item.state,
              item.postalCode,
              item.country
            ].filter(Boolean);
            return addressParts.join(' ');
          }
          return '[Object]';
        }
        return String(item);
      });
      return arrayItems.join(', ');
    }

    // Handle objects (including address objects from Salesforce)
    if (typeof value === 'object') {
      // Special handling for address objects
      if (value.street || value.city || value.state || value.country) {
        const addressParts = [
          value.street,
          value.city && value.state ? `${value.city}, ${value.state}` : value.city || value.state,
          value.postalCode,
          value.country
        ].filter(Boolean);
        
        return addressParts.join(' ');
      }

      // For other objects, don't try to render JSON - just show a placeholder
      return '[Object]';
    }

    // Handle functions
    if (typeof value === 'function') {
      return '[Function]';
    }

    // Final fallback
    return String(value);
  };

  return (
    <span className={className}>
      {renderValue()}
    </span>
  );
};

export default SafeRenderer; 