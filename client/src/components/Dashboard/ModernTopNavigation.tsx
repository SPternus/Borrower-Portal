'use client';

import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface ModernTopNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user?: any;
  contact?: any;
}

const ModernTopNavigation: React.FC<ModernTopNavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  user, 
  contact 
}) => {
  const { logout } = useAuth0();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setShowUserMenu(false);
      setShowMobileMenu(false);
    };

    if (showUserMenu || showMobileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu, showMobileMenu]);

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'applications', label: 'Applications', icon: '📋' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'calculator', label: 'Calculator', icon: '🧮' }
  ];

  const handleLogout = () => {
    logout({ 
      logoutParams: { 
        returnTo: window.location.origin 
      } 
    });
  };

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="w-[95%] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/assets/images/ternus-logo.png" 
              alt="Ternus Logo" 
              className="h-8 w-auto"
            />
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-teal-50 text-teal-700 shadow-sm'
                    : 'text-gray-600 hover:text-ternus-800 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-2 bg-teal-100 text-teal-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {activeTab === item.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* User Menu */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-ternus-500 to-teal-500 rounded-full flex items-center justify-center">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {(contact?.firstName || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-gray-900">
                  {contact?.firstName ? `${contact.firstName} ${contact.lastName}` : (user?.name || user?.email || 'User')}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    {contact?.firstName ? `${contact.firstName} ${contact.lastName}` : (user?.name || user?.email || 'User')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {user?.email || 'user@example.com'}
                  </div>
                  {contact?.foundersClubMember && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gold-100 text-gold-800">
                        ⭐ Founders Club
                      </span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => onTabChange('profile')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>👤</span>
                  Profile Settings
                </button>
                
                <button
                  onClick={() => window.location.href = 'mailto:support@ternus.com'}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>💬</span>
                  Contact Support
                </button>
                
                <hr className="my-1" />
                
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                >
                  <span>🚪</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setShowMobileMenu(false); // Close menu after selection
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
              
              {/* Mobile User Options */}
              <div className="pt-3 border-t border-gray-200 mt-3">
                <div className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      {user?.picture ? (
                        <img 
                          src={user.picture} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-semibold">
                          {(contact?.firstName || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {contact?.firstName ? `${contact.firstName} ${contact.lastName}` : (user?.name || user?.email || 'User')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user?.email || 'user@example.com'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    onTabChange('profile');
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>👤</span>
                  Profile Settings
                </button>
                
                <button
                  onClick={() => {
                    window.location.href = 'mailto:support@ternus.com';
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>💬</span>
                  Contact Support
                </button>
                
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                >
                  <span>🚪</span>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default ModernTopNavigation; 