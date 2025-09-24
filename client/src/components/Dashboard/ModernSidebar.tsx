'use client';

import React from 'react';
import { Card } from '../ui/modern/Card';
import { Badge } from '../ui/modern/Badge';
import { cn } from '../../lib/utils';

interface ModernSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  opportunities?: any[];
  messageCount?: number;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({ activeTab, onTabChange, opportunities = [], messageCount = 0 }) => {
  // Calculate dynamic badge values
  const activeApplicationsCount = opportunities.filter(opp => !['Closed Won', 'Closed Lost'].includes(opp.stageName)).length;
  const pendingTasks = 3; // TODO: Calculate from actual task data

  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '🏠',
      description: 'Dashboard home',
      badge: null
    },
    {
      id: 'applications',
      label: 'Applications',
      icon: '📋',
      description: 'Loan applications',
      badge: activeApplicationsCount > 0 ? activeApplicationsCount.toString() : null
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: '✅',
      description: 'Action items',
      badge: pendingTasks > 0 ? pendingTasks.toString() : null
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: '📄',
      description: 'Upload & manage',
      badge: null
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: '💬',
      description: 'Communication',
      badge: messageCount > 0 ? messageCount.toString() : null
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
      description: 'Account settings',
      badge: null
    }
  ];

  return (
    <Card variant="glass" className="sticky top-8">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Navigation</h3>
        
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group",
                "hover:bg-primary-50 hover:shadow-sm",
                activeTab === item.id
                  ? "bg-primary-100 text-primary-700 shadow-sm border border-primary-200"
                  : "text-gray-600 hover:text-primary-600"
              )}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{item.icon}</span>
                <div className="text-left">
                  <div className={cn(
                    "font-medium transition-colors",
                    activeTab === item.id ? "text-primary-700" : "text-gray-900"
                  )}>
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.description}
                  </div>
                </div>
              </div>
              
              {item.badge && (
                <Badge 
                  variant={activeTab === item.id ? "primary" : "secondary"} 
                  size="sm"
                  className="ml-auto"
                >
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full flex items-center space-x-3 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <span>📞</span>
              <span>Contact Loan Officer</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <span>📊</span>
              <span>View Credit Report</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <span>💰</span>
              <span>Calculate Payments</span>
            </button>
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 p-4 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg border border-primary-100">
          <div className="text-sm font-medium text-gray-900 mb-1">Need Help?</div>
          <div className="text-xs text-gray-600 mb-3">
            Our team is here to assist you with your loan application.
          </div>
          <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
            Get Support →
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ModernSidebar; 