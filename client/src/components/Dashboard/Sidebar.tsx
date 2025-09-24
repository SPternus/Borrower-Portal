import React from 'react';

interface NavItem {
  id: string;
  name: string;
  icon: string;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems: NavItem[] = [
    { id: 'overview', name: 'My Applications', icon: '🏠' },
    { id: 'application', name: 'Application', icon: '📋' },
    { id: 'documents', name: 'Documents', icon: '📁' },
    { id: 'tasks', name: 'Tasks', icon: '✅' },
    { id: 'messages', name: 'Messages', icon: '💬' },
    { id: 'profile', name: 'Profile', icon: '👤' }
  ];

  return (
    <div className="lg:w-64 flex-shrink-0">
      <nav className="bg-white rounded-lg shadow-sm p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-3">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar; 