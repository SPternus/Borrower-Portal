import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { Button } from './Button';
import { Avatar } from './Avatar';

export interface NavigationItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface NavigationProps {
  items: NavigationItem[];
  logo?: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onUserMenuClick?: () => void;
  onLogout?: () => void;
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({
  items,
  logo,
  user,
  onUserMenuClick,
  onLogout,
  className
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const MobileMenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  const renderNavigationItem = (item: NavigationItem, isMobile = false) => {
    const baseClasses = cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
      'hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
      item.active && 'bg-blue-50 text-blue-700 border border-blue-200',
      isMobile ? 'text-base' : 'text-sm font-medium'
    );

    const content = (
      <>
        {item.icon && (
          <span className="flex-shrink-0 w-5 h-5">
            {item.icon}
          </span>
        )}
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {item.badge}
          </span>
        )}
        {item.children && (
          <ChevronDownIcon />
        )}
      </>
    );

    if (item.href) {
      return (
        <a
          key={item.label}
          href={item.href}
          className={baseClasses}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        key={item.label}
        onClick={item.onClick}
        className={baseClasses}
      >
        {content}
      </button>
    );
  };

  return (
    <nav className={cn('bg-white border-b border-gray-200 sticky top-0 z-50', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {logo}
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {items.map(item => renderNavigationItem(item))}
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Avatar
                      src={user.avatar}
                      name={user.name}
                      size="sm"
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <ChevronDownIcon />
                  </button>

                  {/* User Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={onUserMenuClick}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Profile Settings
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={onLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MobileMenuIcon />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {items.map(item => renderNavigationItem(item, true))}
            
            {/* Mobile User Section */}
            {user && (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-3">
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    size="md"
                  />
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <button
                    onClick={onUserMenuClick}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={onLogout}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export { Navigation }; 