'use client';

import React, { useState } from 'react';
import { User } from '@auth0/auth0-react';
import { Card, CardContent } from '../ui/modern/Card';
import { Avatar } from '../ui/modern/Avatar';
import { Badge } from '../ui/modern/Badge';
import { PlaidVerificationButton } from '../ui/modern/PlaidVerificationButton';
import { cn, formatRelativeTime, getInitials } from '../../lib/utils';
import ReferralBadge from './ReferralBadge';

interface ModernWelcomeSectionProps {
  user?: User;
  contact?: any;
  opportunities?: any[];
}

const ModernWelcomeSection: React.FC<ModernWelcomeSectionProps> = ({ user, contact, opportunities = [] }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  
  const displayName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : user?.name || 'Welcome';
  const displayEmail = contact?.email || user?.email || '';
  const initials = getInitials(displayName);
  
  const currentTime = new Date();
  const greeting = currentTime.getHours() < 12 ? 'Good morning' : 
                  currentTime.getHours() < 17 ? 'Good afternoon' : 'Good evening';

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

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  const handlePlaidVerification = async () => {
    if (!user?.sub) {
      console.error('No Auth0 user ID available');
      return;
    }

    setIsVerifying(true);
    
    try {
      // Get invitation token from URL if available
      const urlParams = new URLSearchParams(window.location.search);
      const invitationToken = urlParams.get('invitation_token');
      
      // Build API URL
      const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/plaid/identity-verification`);
      apiUrl.searchParams.append('auth0_user_id', user.sub);
      if (invitationToken) {
        apiUrl.searchParams.append('invitation_token', invitationToken);
      }
      
      console.log('🔗 Calling Plaid verification API:', apiUrl.toString());
      
      // Call backend API
      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Plaid verification response:', data);
      
      if (data.success && data.shareable_url) {
        // Open Plaid verification in new tab
        window.open(data.shareable_url, '_blank', 'noopener,noreferrer');
        
        // Show success message
        console.log('🎉 Plaid verification session created successfully!');
        
        // Optionally refresh the page after a delay to update the verification status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('Invalid response from Plaid verification API');
      }
      
    } catch (error) {
      console.error('❌ Error creating Plaid verification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start verification: ${errorMessage}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card variant="glass" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-400/20 to-transparent rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary-400/20 to-transparent rounded-full blur-xl" />
      
      <CardContent className="relative p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar
              src={user?.picture}
              alt={displayName}
              name={displayName}
              size="lg"
              className="ring-2 ring-white/20 shadow-lg"
            />
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {greeting}, {displayName.split(' ')[0] || 'there'}!
                </h1>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </div>
              
              {/* User Status Badges Row - Mobile Only */}
              <div className="flex items-center space-x-2 mb-3 md:hidden">
                {contact?.foundersClubMember && (
                  <Badge 
                    variant="gradient" 
                    size="sm"
                    className="font-semibold"
                  >
                    🏆 Founders Club
                  </Badge>
                )}
                {contact?.plaidVerified && (
                  <Badge variant="verified" size="sm">
                    ✅ Verified
                  </Badge>
                )}
                {contact && (
                  <ReferralBadge 
                    contactId={contact.id}
                    userEmail={contact.email || user?.email || ''}
                  />
                )}
              </div>
              
              <p className="text-gray-600 mb-1">{displayEmail}</p>
              <p className="text-sm text-gray-500">
                Last login: {formatRelativeTime(new Date())}
              </p>
            </div>
          </div>
          
          {/* Right Side - Desktop Badges and Verification */}
          <div className="text-right">
            {/* Desktop Badges - Hidden on Mobile */}
            <div className="hidden md:flex md:flex-col md:items-end md:space-y-2 mb-4">
              {contact?.foundersClubMember && (
                <Badge 
                  variant="gradient" 
                  size="sm"
                  className="font-semibold"
                >
                  🏆 Founders Club
                </Badge>
              )}
              {contact?.plaidVerified && (
                <Badge variant="verified" size="sm">
                  ✅ Verified
                </Badge>
              )}
              {contact && (
                <ReferralBadge 
                  contactId={contact.id}
                  userEmail={contact.email || user?.email || ''}
                />
              )}
            </div>
            
            {/* Verification Section for Unverified Users */}
            {!contact?.plaidVerified && (
              <div>
                <div className="text-sm text-gray-500 mb-2">Verification</div>
                <div className="space-y-2">
                  <Badge variant="warning" size="lg">
                    ⏳ Verification Pending
                  </Badge>
                  <div>
                    <PlaidVerificationButton 
                      onVerify={handlePlaidVerification}
                      isLoading={isVerifying}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-primary-600">{stats.activeApplications}</div>
            <div className="text-sm text-gray-600">Active Applications</div>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-success-600">{formatCurrency(stats.totalLoanValue)}</div>
            <div className="text-sm text-gray-600">Total Loan Value</div>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-warning-600">{stats.pendingReviews}</div>
            <div className="text-sm text-gray-600">Pending Reviews</div>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-info-600">{stats.avgProcessDays}</div>
            <div className="text-sm text-gray-600">Days Avg Process</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModernWelcomeSection; 