'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/modern/Card';
import { Button } from '../ui/modern/Button';
import { Badge } from '../ui/modern/Badge';
import { Avatar } from '../ui/modern/Avatar';
import { cn, formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils';
import ModernDocumentGrid from './ModernDocumentGrid';
import ProfessionalFolderStructure from './ProfessionalFolderStructure';
import DrawManagement from './DrawManagement';
import TaskManagement from './TaskManagement';
// Debug components removed
import FinixPaymentButton from './FinixPaymentButton';
import { useAuth0 } from '@auth0/auth0-react';
import { usePlaidLink } from 'react-plaid-link';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  completed: boolean;
  assignedTo?: string;
  category: 'documentation' | 'verification' | 'approval' | 'other';
}

interface Document {
  id: string;
  name: string;
  category: string;
  status: 'required' | 'uploaded' | 'approved' | 'rejected';
  uploadedDate?: string;
  dueDate?: string;
  description?: string;
  fileSize?: string;
  fileType?: string;
}

interface ApplicationDetail {
  id: string;
  name: string;
  amount: number;
  type: string;
  status: string;
  progress: number;
  submittedDate: string;
  property: string;
  nextStep: string;
  dueDate: string;
  appFeePaid?: boolean; // Application fee payment status
  loanOfficer: {
    name: string;
    phone: string;
    email: string;
    avatar?: string;
  };
  propertyDetails?: {
    address: string;
    propertyType: string;
    purchasePrice?: number;
    asIsValue?: number;
    downPayment?: number;
  };
  loanDetails?: {
    desiredAmount: number;
    loanToValue?: number;
    interestRate?: number;
    term?: number;
    product?: string;
  };
  timeline: Array<{
    date: string;
    event: string;
    status: 'completed' | 'current' | 'pending';
    description?: string;
  }>;
  tasks: Task[];
  documents: Document[];
}

interface ApplicationDetailViewProps {
  application: ApplicationDetail;
  onBack: () => void;
  onEditApplication?: () => void;
  onContactLoanOfficer?: () => void;
}

const ApplicationDetailView: React.FC<ApplicationDetailViewProps> = ({
  application,
  onBack,
  onEditApplication,
  onContactLoanOfficer
}) => {
  const { user } = useAuth0();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents' | 'folders' | 'timeline'>('overview');
  const [appFeePaid, setAppFeePaid] = useState(application.appFeePaid || false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isPlaidVerifying, setIsPlaidVerifying] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'success';
      case 'under review': return 'warning';
      case 'processing': return 'info';
      case 'rejected': return 'error';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'uploaded': return 'info';
      case 'rejected': return 'error';
      case 'required': return 'warning';
      default: return 'secondary';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-success-500';
    if (progress >= 50) return 'bg-info-500';
    if (progress >= 25) return 'bg-warning-500';
    return 'bg-gray-400';
  };

  const completedTasks = application.tasks.filter(task => task.completed).length;
  const totalTasks = application.tasks.length;

  // Payment handlers
  const handlePaymentSuccess = () => {
    setAppFeePaid(true);
    setPaymentSuccess(true);
    setPaymentError(null);
    setTimeout(() => setPaymentSuccess(false), 5000); // Hide success message after 5 seconds
  };

  const handlePaymentError = (error: string) => {
    setPaymentError(error);
    setTimeout(() => setPaymentError(null), 8000); // Hide error message after 8 seconds
  };

  // Plaid verification handler
  const handlePlaidVerification = async () => {
    if (!user?.sub) {
      console.error('No Auth0 user ID available');
      alert('Authentication error. Please try logging in again.');
      return;
    }

    setIsPlaidVerifying(true);
    
    try {
      // Get invitation token from URL if available
      const urlParams = new URLSearchParams(window.location.search);
      const invitationToken = urlParams.get('invitation_token');
      
      // Build API URL for Assets & Income (Connect Bank)
      const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/plaid/assets-income-verification`);
      apiUrl.searchParams.append('auth0_user_id', user.sub);
      if (invitationToken) {
        apiUrl.searchParams.append('invitation_token', invitationToken);
      }
      
      console.log('🏦 Starting Plaid Assets & Income verification from Application Detail View:', apiUrl.toString());
      
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
      console.log('✅ Plaid Assets & Income response:', data);
      
      if (data.success && data.link_token) {
        // For now, show success message with link token
        alert('🎉 Bank connection ready! Link token created successfully. Integration with Plaid Link UI coming soon.');
        
        // TODO: Implement Plaid Link frontend integration
        console.log('Link Token:', data.link_token);
        
        // Optionally refresh the page after a delay to update the status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('Invalid response from Assets & Income verification API');
      }
      
    } catch (error) {
      console.error('❌ Error connecting bank account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to connect bank account: ${errorMessage}`);
    } finally {
      setIsPlaidVerifying(false);
    }
  };
  
  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'tasks', label: 'Tasks', count: null },
    { id: 'draws', label: 'Draw Management', count: null },
    { id: 'folders', label: 'Document Management', count: null },
    { id: 'timeline', label: 'Timeline', count: null }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Application Summary */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Application Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Loan Amount</label>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(application.amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Loan Type</label>
              <p className="text-lg font-semibold text-gray-900">{application.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Application Status</label>
              <div className="mt-1">
                <Badge variant={getStatusColor(application.status)} size="lg">
                  {application.status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Progress</label>
              <div className="mt-2">
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className={cn("h-3 rounded-full transition-all duration-500", getProgressColor(application.progress))}
                      style={{ width: `${application.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">{application.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-Side Action Banners - Desktop: Side by side, Mobile: Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plaid Fast Track Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl shadow-sm">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-start space-x-4 flex-1">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-lg font-bold text-gray-900">⚡ Fast Track</h3>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse whitespace-nowrap">
                    FAST TRACK PROCESSING
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  Connect your bank account for instant verification and streamlined underwriting
                </p>
                <div className="grid grid-cols-1 gap-1 text-xs text-gray-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Instant Income Verification</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Skip Documentation</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Bank-Level Security</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-emerald-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">⚡</div>
                <div className="text-xs text-gray-500 font-medium">FAST</div>
              </div>
              <button 
                className="font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none disabled:cursor-not-allowed text-sm"
                style={{
                  backgroundColor: isPlaidVerifying ? '#80d9dd' : '#00b5bf',
                  color: '#000',
                  border: `3px solid ${isPlaidVerifying ? '#80d9dd' : '#00b5bf'}`
                }}
                onClick={handlePlaidVerification}
                disabled={isPlaidVerifying}
              >
                <div className="flex items-center gap-2">
                  {isPlaidVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>Connect Bank</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="space-y-4">
          {/* Payment Status Messages */}
          {paymentSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-800">Payment Successful!</h3>
                <p className="text-sm text-green-700">Your application fee has been processed successfully.</p>
              </div>
            </div>
          )}

          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
                <p className="text-sm text-red-700">{paymentError}</p>
              </div>
            </div>
          )}

          {/* Application Fee Payment */}
          {!appFeePaid && (
            <FinixPaymentButton
              opportunityId={application.id}
              amount={250}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          )}

          {appFeePaid && !paymentSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Application Fee Paid
                  </h3>
                  <p className="text-gray-700 text-sm mb-4">
                    Your $250 application fee has been successfully processed. Your loan application is now being reviewed by our underwriting team.
                  </p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Payment Complete
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Details */}
      {application.propertyDetails && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Property Address</label>
                <p className="text-gray-900">{application.propertyDetails.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Property Type</label>
                <p className="text-gray-900">{application.propertyDetails.propertyType}</p>
              </div>
              {application.propertyDetails.purchasePrice && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Purchase Price</label>
                  <p className="text-gray-900">{formatCurrency(application.propertyDetails.purchasePrice)}</p>
                </div>
              )}
              {application.propertyDetails.asIsValue && (
                <div>
                  <label className="text-sm font-medium text-gray-600">As-Is Value</label>
                  <p className="text-gray-900">{formatCurrency(application.propertyDetails.asIsValue)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meet Your Team from Ternus */}
      <Card variant="elevated" className="border-l-4 border-l-blue-600">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-b border-gray-100">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              Your Ternus Lending Team
            </CardTitle>
            <p className="text-gray-600 text-sm mt-1">Expert professionals dedicated to your loan success</p>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Loan Officer - Cody Sento */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar
                      src="/images/team/Cody-Sento_square.jpeg"
                      name="Cody Sento"
                      size="2xl"
                      className="shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Cody Sento</h3>
                    <p className="text-blue-600 font-semibold text-sm">Senior Loan Officer</p>
                    <p className="text-gray-500 text-xs font-medium">NMLS #123456 | 12+ Years Experience</p>
                  </div>
                </div>
                <Badge variant="primary" size="sm" className="bg-blue-100 text-blue-800 font-semibold">
                  Lead Officer
                </Badge>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Direct Email</p>
                    <p className="text-gray-900 font-medium">{application.loanOfficer.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Direct Line</p>
                    <p className="text-gray-900 font-medium">{application.loanOfficer.phone}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4 mb-6">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong>Specializes in:</strong> Fix & Flip Loans, Bridge Financing, Commercial Real Estate
                </p>
              </div>
              
                             <div className="flex gap-3">
                 <Button
                   variant="primary"
                   size="sm"
                   className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 font-medium"
                   onClick={onContactLoanOfficer}
                 >
                   <div className="flex items-center justify-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                     </svg>
                     <span>Message</span>
                   </div>
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   className="flex-1 h-10 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 font-medium transition-all"
                   onClick={() => window.location.href = `mailto:${application.loanOfficer.email}`}
                 >
                   <div className="flex items-center justify-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                     <span>Email</span>
                   </div>
                 </Button>
               </div>
            </div>

            {/* Processor - Dana Blake */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar
                      src="/images/team/Dana-Blake_square.jpg"
                      name="Dana Blake"
                      size="2xl"
                      className="shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Dana Blake</h3>
                                         <p className="text-blue-600 font-semibold text-sm">Senior Loan Processor</p>
                     <p className="text-gray-500 text-xs font-medium">CLP Certified | 8+ Years Experience</p>
                  </div>
                </div>
                                 <Badge variant="primary" size="sm" className="bg-blue-100 text-blue-800 font-semibold">
                   Processor
                 </Badge>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Direct Email</p>
                    <p className="text-gray-900 font-medium">dana.blake@ternus.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Direct Line</p>
                    <p className="text-gray-900 font-medium">(555) 123-4568</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4 mb-6">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong>Specializes in:</strong> Document Review, Underwriting Coordination, Compliance
                </p>
              </div>
              
                             <div className="flex gap-3">
                 <Button
                   variant="primary"
                   size="sm"
                   className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 font-medium"
                   onClick={() => {
                     // You can integrate this with your messaging system
                     if (onContactLoanOfficer) {
                       onContactLoanOfficer();
                     } else {
                       window.location.href = 'mailto:dana.blake@ternus.com?subject=Loan Processing Inquiry';
                     }
                   }}
                 >
                   <div className="flex items-center justify-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                     </svg>
                     <span>Message</span>
                   </div>
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   className="flex-1 h-10 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 font-medium transition-all"
                   onClick={() => window.location.href = 'mailto:dana.blake@ternus.com'}
                 >
                   <div className="flex items-center justify-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                     <span>Email</span>
                   </div>
                 </Button>
               </div>
            </div>
          </div>
          
          {/* Professional Service Commitment */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 mb-2">Ternus Lending Excellence</h4>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  Your dedicated team brings decades of combined experience in commercial and investment property lending. 
                  We're committed to providing transparent communication, expert guidance, and exceptional service throughout your loan process.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">24hr</div>
                    <div className="text-xs text-gray-600 font-medium">Response Time</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">98%</div>
                    <div className="text-xs text-gray-600 font-medium">Client Satisfaction</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">15+</div>
                    <div className="text-xs text-gray-600 font-medium">Years Experience</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTasks = () => (
    <TaskManagement
      opportunityId={application.id}
    />
  );

  const renderDraws = () => (
    <DrawManagement 
      opportunityId={application.id}
    />
  );

  const renderFolders = () => (
    <div className="space-y-6">
      <ProfessionalFolderStructure 
        opportunityId={application.id}
        loanType={application.type}
        onFolderSelect={(folder) => {
          console.log('Selected folder:', folder);
        }}
      />
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Application Timeline</h3>
      
      <div className="relative">
        {application.timeline.map((event, index) => (
          <div key={index} className="relative flex items-start space-x-3 pb-6">
            {/* Timeline line */}
            {index < application.timeline.length - 1 && (
              <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200" />
            )}
            
            {/* Timeline dot */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white",
              event.status === 'completed' && "border-success-500 bg-success-50",
              event.status === 'current' && "border-info-500 bg-info-50",
              event.status === 'pending' && "border-gray-300 bg-gray-50"
            )}>
              {event.status === 'completed' && (
                <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {event.status === 'current' && (
                <div className="w-3 h-3 bg-info-500 rounded-full" />
              )}
              {event.status === 'pending' && (
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
              )}
            </div>
            
            {/* Timeline content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  "font-medium",
                  event.status === 'completed' && "text-gray-900",
                  event.status === 'current' && "text-info-700",
                  event.status === 'pending' && "text-gray-500"
                )}>
                  {event.event}
                </h4>
                <span className="text-sm text-gray-500">{formatDate(event.date)}</span>
              </div>
              {event.description && (
                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'tasks': return renderTasks();
      case 'draws': return renderDraws();
      case 'folders': return renderFolders();
      case 'timeline': return renderTimeline();
      default: return renderOverview();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            ← Back to Applications
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{application.name}</h1>
            <p className="text-gray-600">Application ID: {application.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={getStatusColor(application.status)} size="lg">
            {application.status}
          </Badge>
          {onEditApplication && (
            <Button variant="outline" onClick={onEditApplication}>
              Edit Application
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card variant="elevated">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Overall Progress</span>
            <span className="text-sm font-medium text-gray-900">{application.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={cn("h-3 rounded-full transition-all duration-500", getProgressColor(application.progress))}
              style={{ width: `${application.progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">Next Step: {application.nextStep}</p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.id
                  ? "border-transparent"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
              style={activeTab === tab.id ? {
                                    borderBottomColor: '#1e293b',
                    color: '#1e293b'
              } : {}}
            >
              {tab.label}
              {tab.count && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ApplicationDetailView; 