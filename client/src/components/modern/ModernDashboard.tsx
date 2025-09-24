'use client';

import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSalesforce } from '../../contexts/SalesforceContext';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Button,
  Badge,
  Avatar,
  Navigation,
  type NavigationItem
} from '../ui/modern';
import { formatCurrency, formatDate } from '../../lib/utils';
import LoadingSpinner from '../ui/LoadingSpinner';
import Footer from '../ui/Footer';

// Icons
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const TaskIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const MessageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 20l1.98-5.874A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ModernDashboard: React.FC = () => {
  const { user, logout, isLoading } = useAuth0();
  const { 
    opportunities, 
    contact, 
    isLoading: sfdcLoading, 
    error: sfdcError
  } = useSalesforce();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate dynamic badge values
  const activeApplicationsCount = opportunities.filter(opp => !['Closed Won', 'Closed Lost'].includes(opp.stageName)).length;
  const pendingDocuments = 3; // TODO: Calculate from actual document requirements
  const pendingTasks = 2; // TODO: Calculate from actual task data

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      label: 'Overview',
      icon: <HomeIcon />,
      active: activeTab === 'overview',
      onClick: () => setActiveTab('overview')
    },
    {
      label: 'Documents',
      icon: <DocumentIcon />,
      active: activeTab === 'documents',
      onClick: () => setActiveTab('documents'),
      badge: pendingDocuments > 0 ? pendingDocuments.toString() : undefined
    },
    {
      label: 'Tasks',
      icon: <TaskIcon />,
      active: activeTab === 'tasks',
      onClick: () => setActiveTab('tasks'),
      badge: pendingTasks > 0 ? pendingTasks.toString() : undefined
    },
    {
      label: 'Messages',
      icon: <MessageIcon />,
      active: activeTab === 'messages',
      onClick: () => setActiveTab('messages')
    },
    {
      label: 'Profile',
      icon: <UserIcon />,
      active: activeTab === 'profile',
      onClick: () => setActiveTab('profile')
    }
  ];

  // Logo component
  const Logo = () => (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">T</span>
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Ternus
      </span>
    </div>
  );

  // Helper functions
  const getApplicationStatusFromStage = (stageName: string): string => {
    const stageMap: { [key: string]: string } = {
      'Above the Funnel': 'Under Review',
      'Quote': 'Quote', 
      'Application': 'Application',
      'Processing': 'Processing',
      'Underwriting': 'Underwriting',
      'Suspense': 'Under Review',
      'Proposal/Price Quote': 'Under Review',
      'Negotiation/Review': 'Final Review',
      'Closed Won': 'Approved',
      'Closed Lost': 'Rejected'
    };
    return stageMap[stageName] || 'Under Review';
  };

  const getStatusVariant = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'Final Review': return 'warning';
      case 'Processing': case 'Underwriting': return 'primary';
      default: return 'default';
    }
  };

  // Calculate dynamic stats
  const calculateStats = () => {
    const activeApplications = opportunities.filter(opp => !['Closed Won', 'Closed Lost'].includes(opp.stageName)).length;
    const totalLoanValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    
    // Pending Reviews: applications in review stages
    const pendingReviews = opportunities.filter(opp => 
      ['Above the Funnel', 'Suspense', 'Proposal/Price Quote', 'Negotiation/Review'].includes(opp.stageName)
    ).length;
    
    // Days Average Process: calculate average days from creation to current date for active applications
    const activeOpportunities = opportunities.filter(opp => !['Closed Won', 'Closed Lost'].includes(opp.stageName));
    let avgProcessDays = 0;
    
    if (activeOpportunities.length > 0) {
      const totalDays = activeOpportunities.reduce((sum, opp) => {
        if (opp.createdDate) {
          const createdDate = new Date(opp.createdDate);
          const currentDate = new Date();
          const daysDiff = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysDiff;
        }
        return sum;
      }, 0);
      avgProcessDays = Math.round(totalDays / activeOpportunities.length);
    }
    
    return {
      activeApplications,
      totalLoanValue,
      pendingReviews,
      avgProcessDays
    };
  };

  const stats = calculateStats();

  // Early return for loading states
  if (isLoading || sfdcLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Check for authentication errors (email mismatch or contact association)
  if (sfdcError && (sfdcError.includes('Access denied') || sfdcError.includes('email does not match') || sfdcError.includes('already associated with another account') || sfdcError.includes('already associated with a different contact'))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full" padding="lg">
          <CardContent className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <CardTitle className="mb-4">
              {sfdcError.includes('already associated with another account') ? 'Account Already Linked' :
               sfdcError.includes('already associated with a different contact') ? 'Account Already Linked' :
               sfdcError.includes('Access denied') ? 'Access Denied' : 'Authentication Error'}
            </CardTitle>
            <CardDescription className="mb-6">
              {sfdcError.includes('already associated with another account')
                ? 'This email address is already associated with another account. Please contact support if you believe this is an error.'
                : sfdcError.includes('already associated with a different contact')
                ? 'Your account is already associated with a different contact. Please contact support if you believe this is an error.'
                : sfdcError.includes('email does not match')
                ? 'Your login email does not match the invitation. Please contact your loan officer for assistance.'
                : 'Access denied. Please contact support for assistance.'
              }
            </CardDescription>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Logged in as:</strong> {user?.email || 'Unknown'}
                </p>
                {contact && !sfdcError.includes('already been used by another account') && (
                  <p className="text-sm text-gray-700">
                    <strong>Expected email:</strong> {contact.email}
                  </p>
                )}
                {sfdcError.includes('already been used by another account') && (
                  <p className="text-sm text-gray-700">
                    <strong>Support Contact:</strong> support@ternus.com
                  </p>
                )}
              </div>
              <Button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                variant="primary"
                fullWidth
              >
                {sfdcError.includes('already associated') ? 'Logout and Contact Support' : 'Logout and Try Different Account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderOverviewContent = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <Card variant="gradient" className="relative overflow-hidden">
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back, {contact?.firstName || user?.name || 'Borrower'}! 👋
              </h1>
              <p className="text-gray-600">
                Here's an overview of your loan applications and recent activity.
              </p>
            </div>
            <Button
              leftIcon={<PlusIcon />}
              variant="primary"
              size="lg"
            >
              New Application
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="elevated">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Applications</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeApplications}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DocumentIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Loan Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.totalLoanValue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <span className="text-emerald-600 font-bold">$</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingReviews}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <TaskIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Days Avg Process</p>
                <p className="text-3xl font-bold text-gray-900">{stats.avgProcessDays}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plaid Fast Track Banner - Compact Version */}
      <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-blue-50">
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">⚡ Accelerate Your Loan Process with Plaid</h3>
                </div>
                <p className="text-sm text-gray-700">
                  Connect your bank account for instant verification and streamlined underwriting
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-600">Fast Track</div>
                <div className="text-xs text-gray-500 font-medium">PROCESSING</div>
              </div>
              <Button 
                variant="primary" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2 shadow-md hover:shadow-lg transition-all"
                onClick={() => {
                  // Add Plaid integration logic here
                  console.log('Connect with Plaid - Main Dashboard');
                }}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Connect Bank</span>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Applications List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Your Applications</CardTitle>
          <CardDescription>
            Track the progress of your loan applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <DocumentIcon />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first loan application.</p>
              <Button variant="primary">
                Create Application
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={opportunity.name}
                      size="md"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{opportunity.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(opportunity.amount || 0)} • Created {formatDate(opportunity.createdDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={getStatusVariant(getApplicationStatusFromStage(opportunity.stageName))}
                    >
                      {getApplicationStatusFromStage(opportunity.stageName)}
                    </Badge>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewContent();
      case 'documents':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Manage your loan documents</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Documents section coming soon...</p>
            </CardContent>
          </Card>
        );
      case 'tasks':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Your pending tasks and action items</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Tasks section coming soon...</p>
            </CardContent>
          </Card>
        );
      case 'messages':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Communication with your loan officer</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Messages section coming soon...</p>
            </CardContent>
          </Card>
        );
      case 'profile':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Profile section coming soon...</p>
            </CardContent>
          </Card>
        );
      default:
        return renderOverviewContent();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation
        logo={<Logo />}
        items={navigationItems}
        user={user ? {
          name: user.name || 'User',
          email: user.email || '',
          avatar: user.picture
        } : undefined}
        onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ModernDashboard; 