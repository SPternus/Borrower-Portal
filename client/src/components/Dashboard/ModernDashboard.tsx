'use client';

import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSalesforce } from '../../contexts/SalesforceContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import Footer from '../ui/Footer';
import ApplicationForm from '../ApplicationForm';
import toast from 'react-hot-toast';

// Modern Components
import ModernWelcomeSection from './ModernWelcomeSection';
import TernusFounderClubBanner from './TernusFounderClubBanner';
import DebtFundInvestorBanner from './DebtFundInvestorBanner';
import ModernApplicationsGrid from './ModernApplicationsGrid';
import ModernTopNavigation from './ModernTopNavigation';
import ApplicationDetailView from './ApplicationDetailView';

// Legacy Components (for other tabs)
import MessagesTab from './MessagesTab';
import ProfileTab from './ProfileTab';
import FixFlipCalculator from './FixFlipCalculator';
import HierarchicalDocuments from './HierarchicalDocuments';

import { Application, Opportunity, Contact, LoanData } from '../../types/dashboard';
import { usePlaidLink } from 'react-plaid-link';

const ModernDashboard: React.FC = () => {
  const { user, logout, isLoading } = useAuth0();
  const { 
    opportunities, 
    currentOpportunity, 
    contact, 
    isLoading: sfdcLoading, 
    error: sfdcError,
    setCurrentOpportunity,
    refreshOpportunities
  } = useSalesforce();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'form'>('list');
  const [editingApplication, setEditingApplication] = useState<any>(null);
  const [resumingApplicationId, setResumingApplicationId] = useState<string | null>(null);
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // Plaid Link success handler
  const onPlaidSuccess = async (public_token: string, metadata: any) => {
    console.log('✅ Plaid Link success:', { public_token, metadata });
    
    try {
      // Get invitation token from URL if available
      const urlParams = new URLSearchParams(window.location.search);
      const invitationToken = urlParams.get('invitation_token');
      
      // Build API URL for token exchange
      const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/plaid/exchange-public-token`);
      apiUrl.searchParams.append('auth0_user_id', user?.sub || '');
      if (invitationToken) {
        apiUrl.searchParams.append('invitation_token', invitationToken);
      }
      
      console.log('🔄 Exchanging public token...');
      
      // Exchange public token for access token
      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token,
          metadata
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Bank account connected successfully:', data);
      
      // Show success message with account details
      const accountNames = data.accounts?.map((acc: any) => acc.name).join(', ') || 'your accounts';
      const institutionName = data.institution?.name || 'your bank';
      
      alert(`🎉 Successfully connected ${accountNames} from ${institutionName}! Your bank account information has been securely stored.`);
      
      // Refresh the page to update status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error exchanging public token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to complete bank connection: ${errorMessage}`);
    } finally {
      setIsConnectingBank(false);
      setLinkToken(null);
    }
  };

  // Plaid Link error handler
  const onPlaidExit = (err: any, metadata: any) => {
    console.log('🚪 Plaid Link exit:', { err, metadata });
    setIsConnectingBank(false);
    setLinkToken(null);
    
    if (err) {
      console.error('❌ Plaid Link error:', err);
      alert(`Bank connection cancelled: ${err.error_message || 'Unknown error'}`);
    }
  };

  // Configure Plaid Link - ensure token is always a string or null
  const plaidConfig = {
    token: linkToken || null,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  };

  const { open, ready } = usePlaidLink(plaidConfig);

  // Auto-open Plaid Link when token is ready
  useEffect(() => {
    if (linkToken && ready && isConnectingBank) {
      console.log('🚀 Opening Plaid Link...');
      open();
    }
  }, [linkToken, ready, open, isConnectingBank]);

  // Check for referral attempt message and show toast
  useEffect(() => {
    const referralMessage = sessionStorage.getItem('referral_attempt_message');
    if (referralMessage) {
      toast.error(referralMessage, {
        duration: 6000,
        icon: '🔗',
      });
      sessionStorage.removeItem('referral_attempt_message');
    }
  }, []);

  // Custom tab change handler to reset view mode when switching tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Reset to list view when switching to overview or applications
    if (tab === 'overview' || tab === 'applications') {
      setViewMode('list');
      setSelectedApplication(null);
      setEditingApplication(null);
      setResumingApplicationId(null);
    }
  };

  // Helper functions for SFDC to application mapping
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

  const getProgressFromStage = (stageName: string): number => {
    const progressMap: { [key: string]: number } = {
      'Above the Funnel': 10,
      'Quote': 20,
      'Application': 35,
      'Processing': 50,
      'Underwriting': 80,
      'Perception Analysis': 70,
      'Proposal/Price Quote': 80,
      'Suspense': 0,
      'Closed Won': 100,
      'Closed Lost': 0
    };
    return progressMap[stageName] || 10;
  };

  const getNextStepFromStage = (stageName: string): string => {
    const nextStepMap: { [key: string]: string } = {
      'Prospecting': 'Initial qualification review',
      'Qualification': 'Complete needs analysis',
      'Needs Analysis': 'Prepare value proposition',
      'Value Proposition': 'Identify decision makers',
      'Id. Decision Makers': 'Conduct perception analysis',
      'Perception Analysis': 'Prepare proposal and pricing',
      'Proposal/Price Quote': 'Enter negotiation phase',
      'Negotiation/Review': 'Await final decision',
      'Closed Won': 'Process loan documentation',
      'Closed Lost': 'Review for future opportunities'
    };
    return nextStepMap[stageName] || 'Continue application process';
  };

  // Convert SFDC opportunity to detailed application with tasks and documents
  const convertToDetailedApplication = (opportunity: any) => {
    // Generate mock tasks based on application stage
    const generateTasks = (stageName: string) => {
      const baseTasks = [
        {
          id: 1,
          title: 'Submit Income Documentation',
          description: 'Upload recent pay stubs, tax returns, and bank statements',
          priority: 'high' as const,
          dueDate: '2024-01-15',
          completed: ['Processing', 'Underwriting', 'Closed Won'].includes(stageName),
          assignedTo: 'Borrower',
          category: 'documentation' as const
        },
        {
          id: 2,
          title: 'Property Appraisal',
          description: 'Schedule and complete property appraisal with certified appraiser',
          priority: 'high' as const,
          dueDate: '2024-01-20',
          completed: ['Underwriting', 'Closed Won'].includes(stageName),
          assignedTo: 'Loan Officer',
          category: 'verification' as const
        },
        {
          id: 3,
          title: 'Credit Report Review',
          description: 'Review credit report and address any discrepancies',
          priority: 'medium' as const,
          dueDate: '2024-01-10',
          completed: ['Application', 'Processing', 'Underwriting', 'Closed Won'].includes(stageName),
          assignedTo: 'Underwriter',
          category: 'verification' as const
        },
        {
          id: 4,
          title: 'Title Search & Insurance',
          description: 'Complete title search and secure title insurance',
          priority: 'medium' as const,
          dueDate: '2024-01-25',
          completed: ['Closed Won'].includes(stageName),
          assignedTo: 'Title Company',
          category: 'verification' as const
        },
        {
          id: 5,
          title: 'Final Loan Approval',
          description: 'Obtain final underwriting approval and loan commitment',
          priority: 'high' as const,
          dueDate: '2024-01-30',
          completed: stageName === 'Closed Won',
          assignedTo: 'Underwriter',
          category: 'approval' as const
        }
      ];

      return baseTasks;
    };

    // Generate mock documents based on loan type
    const generateDocuments = (loanType: string, stageName: string) => {
      const baseDocuments = [
        {
          id: 'doc-1',
          name: 'W-2 Tax Forms (2 years)',
          category: 'Income Documentation',
          status: ['Processing', 'Underwriting', 'Closed Won'].includes(stageName) ? 'approved' as const : 'required' as const,
          uploadedDate: ['Processing', 'Underwriting', 'Closed Won'].includes(stageName) ? '2024-01-05' : undefined,
          description: 'Most recent 2 years of W-2 tax forms',
          fileSize: '2.4 MB',
          fileType: 'PDF'
        },
        {
          id: 'doc-2',
          name: 'Bank Statements (3 months)',
          category: 'Financial Documentation',
          status: ['Underwriting', 'Closed Won'].includes(stageName) ? 'approved' as const : 
                  ['Processing'].includes(stageName) ? 'uploaded' as const : 'required' as const,
          uploadedDate: ['Processing', 'Underwriting', 'Closed Won'].includes(stageName) ? '2024-01-08' : undefined,
          description: 'Last 3 months of bank statements for all accounts',
          fileSize: '1.8 MB',
          fileType: 'PDF'
        },
        {
          id: 'doc-3',
          name: 'Pay Stubs (Recent)',
          category: 'Income Documentation',
          status: ['Closed Won'].includes(stageName) ? 'approved' as const :
                  ['Processing', 'Underwriting'].includes(stageName) ? 'uploaded' as const : 'required' as const,
          uploadedDate: ['Processing', 'Underwriting', 'Closed Won'].includes(stageName) ? '2024-01-03' : undefined,
          description: 'Most recent pay stubs (last 30 days)',
          fileSize: '0.9 MB',
          fileType: 'PDF'
        },
        {
          id: 'doc-4',
          name: 'Property Purchase Agreement',
          category: 'Property Documentation',
          status: stageName === 'Closed Won' ? 'approved' as const : 'uploaded' as const,
          uploadedDate: '2024-01-01',
          description: 'Signed purchase agreement for the property',
          fileSize: '3.2 MB',
          fileType: 'PDF'
        },
        {
          id: 'doc-5',
          name: 'Property Appraisal Report',
          category: 'Property Documentation',
          status: ['Underwriting', 'Closed Won'].includes(stageName) ? 'approved' as const : 'required' as const,
          uploadedDate: ['Underwriting', 'Closed Won'].includes(stageName) ? '2024-01-18' : undefined,
          description: 'Professional property appraisal report',
          fileSize: '5.1 MB',
          fileType: 'PDF'
        }
      ];

      return baseDocuments;
    };

    // Generate timeline based on stage
    const generateTimeline = (stageName: string, createdDate: string) => {
      const timeline = [
        {
          date: createdDate,
          event: 'Application Submitted',
          status: 'completed' as const,
          description: 'Initial loan application submitted and received'
        },
        {
          date: '2024-01-02',
          event: 'Initial Review',
          status: ['Quote', 'Application', 'Processing', 'Underwriting', 'Closed Won'].includes(stageName) ? 'completed' as const : 'pending' as const,
          description: 'Application reviewed for completeness and initial qualification'
        },
        {
          date: '2024-01-05',
          event: 'Documentation Collection',
          status: ['Application', 'Processing', 'Underwriting', 'Closed Won'].includes(stageName) ? 'completed' as const : 
                  stageName === 'Quote' ? 'current' as const : 'pending' as const,
          description: 'Required documents collected and verified'
        },
        {
          date: '2024-01-10',
          event: 'Credit & Income Verification',
          status: ['Processing', 'Underwriting', 'Closed Won'].includes(stageName) ? 'completed' as const :
                  stageName === 'Application' ? 'current' as const : 'pending' as const,
          description: 'Credit report pulled and income verification completed'
        },
        {
          date: '2024-01-15',
          event: 'Property Appraisal',
          status: ['Underwriting', 'Closed Won'].includes(stageName) ? 'completed' as const :
                  stageName === 'Processing' ? 'current' as const : 'pending' as const,
          description: 'Property appraisal ordered and completed'
        },
        {
          date: '2024-01-20',
          event: 'Underwriting Review',
          status: stageName === 'Closed Won' ? 'completed' as const :
                  stageName === 'Underwriting' ? 'current' as const : 'pending' as const,
          description: 'Complete underwriting review and loan decision'
        },
        {
          date: '2024-01-25',
          event: 'Final Approval',
          status: stageName === 'Closed Won' ? 'completed' as const : 'pending' as const,
          description: 'Final loan approval and closing preparation'
        }
      ];

      return timeline;
    };

    return {
      id: opportunity.id,
      name: opportunity.name,
      amount: opportunity.amount || 0,
      type: opportunity.loanType || 'Unknown',
      status: getApplicationStatusFromStage(opportunity.stageName),
      progress: getProgressFromStage(opportunity.stageName),
      submittedDate: opportunity.createdDate ? opportunity.createdDate.split('T')[0] : new Date().toISOString().split('T')[0],
      property: formatPropertyAddress(opportunity.propertyAddress),
      nextStep: getNextStepFromStage(opportunity.stageName),
      dueDate: opportunity.closeDate || '',
      loanOfficer: {
        name: opportunity.loanOfficer?.name || 'Cody Sento',
        phone: opportunity.loanOfficer?.phone || '(555) 123-4567',
        email: opportunity.loanOfficer?.email || 'cody.sento@ternus.com',
        avatar: opportunity.loanOfficer?.avatar
      },
      propertyDetails: {
        address: (opportunity.propertyAddress && typeof opportunity.propertyAddress === 'object') ? 
          `${opportunity.propertyAddress.street || ''} ${opportunity.propertyAddress.city || ''} ${opportunity.propertyAddress.state || ''}`.trim() :
          (opportunity.propertyAddress || 'Address pending...'),
        propertyType: opportunity.propertyType || 'Single Family Home',
        purchasePrice: opportunity.purchasePrice,
        asIsValue: opportunity.asIsValue,
        downPayment: opportunity.downPayment
      },
      loanDetails: {
        desiredAmount: opportunity.desiredLoanAmount || opportunity.amount || 0,
        loanToValue: opportunity.loanToValue,
        interestRate: opportunity.interestRate,
        term: opportunity.loanTerm,
        product: opportunity.product
      },
      timeline: generateTimeline(opportunity.stageName, opportunity.createdDate),
      tasks: generateTasks(opportunity.stageName),
      documents: generateDocuments(opportunity.loanType, opportunity.stageName)
    };
  };

  // Helper function to format property address
  const formatPropertyAddress = (propertyAddress: any): string => {
    if (!propertyAddress) {
      return 'Property address pending...';
    }
    
    if (typeof propertyAddress === 'string') {
      return propertyAddress;
    }
    
    if (typeof propertyAddress === 'object') {
      const { street, city, state, postalCode, country } = propertyAddress;
      const parts = [];
      
      if (street) parts.push(street);
      if (city) parts.push(city);
      if (state) parts.push(state);
      if (postalCode) parts.push(postalCode);
      
      return parts.length > 0 ? parts.join(', ') : 'Property address pending...';
    }
    
    return 'Property address pending...';
  };

  // Convert SFDC opportunities to application format
  const sfdcApplications = React.useMemo(() => 
    opportunities.map(opp => ({
      id: opp.id,
      amount: opp.amount || 0,
      type: opp.loanType || 'Unknown',
      name: opp.name || 'Unknown',
      status: getApplicationStatusFromStage(opp.stageName),
      progress: getProgressFromStage(opp.stageName),
      submittedDate: opp.createdDate ? opp.createdDate.split('T')[0] : new Date().toISOString().split('T')[0],
      property: formatPropertyAddress(opp.propertyAddress),
      nextStep: getNextStepFromStage(opp.stageName),
      dueDate: opp.closeDate || '',
      isDraft: false,
      appFeePaid: opp.appFeePaid || false,  // Add application fee payment status
      loanOfficer: {
        name: opp.loanOfficer?.name || 'Cody Sento',
        phone: opp.loanOfficer?.phone || '(555) 123-4567',
        email: opp.loanOfficer?.email || 'cody.sento@ternus.com'
      }
    }))
  , [opportunities]);

  // Use SFDC applications
  const applications = sfdcApplications;

  // Mock loan data for other tabs
  const loanData: LoanData = {
    currentLoan: applications[0],
    recentActivity: [
      { date: '2024-06-03', action: 'Document uploaded: W-2 Form', status: 'completed' },
      { date: '2024-06-02', action: 'Credit report reviewed', status: 'completed' },
      { date: '2024-06-01', action: 'Application submitted', status: 'completed' },
      { date: '2024-05-30', action: 'Income verification required', status: 'pending' }
    ],
    tasks: [
      { id: 1, title: 'Upload recent pay stubs', priority: 'high', dueDate: '2024-06-08', completed: false },
      { id: 2, title: 'Complete employment verification', priority: 'high', dueDate: '2024-06-10', completed: false },
      { id: 3, title: 'Review and sign disclosure documents', priority: 'medium', dueDate: '2024-06-12', completed: false },
      { id: 4, title: 'Schedule appraisal appointment', priority: 'low', dueDate: '2024-06-15', completed: true }
    ],
    documents: [
      { name: 'W-2 Tax Form 2023', uploaded: '2024-06-03', status: 'approved', type: 'tax' },
      { name: 'Bank Statement - March 2024', uploaded: '2024-06-02', status: 'approved', type: 'bank' },
      { name: 'Employment Letter', uploaded: '2024-06-01', status: 'pending', type: 'employment' },
      { name: 'Purchase Agreement', uploaded: '2024-05-30', status: 'approved', type: 'property' }
    ]
  };

  // Early return after all hooks are called
  if (isLoading || sfdcLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Check for authentication errors (email mismatch or contact association)
  if (sfdcError && (sfdcError.includes('Access denied') || sfdcError.includes('email does not match') || sfdcError.includes('already associated with another account') || sfdcError.includes('already associated with a different contact'))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {sfdcError.includes('already associated with another account') ? 'Account Already Linked' :
               sfdcError.includes('already associated with a different contact') ? 'Account Already Linked' :
               sfdcError.includes('Access denied') ? 'Access Denied' : 'Authentication Error'}
            </h2>
            <p className="text-gray-600 mb-6">
              {sfdcError.includes('already associated with another account')
                ? 'This email address is already associated with another account. Please contact support if you believe this is an error.'
                : sfdcError.includes('already associated with a different contact')
                ? 'Your account is already associated with a different contact. Please contact support if you believe this is an error.'
                : sfdcError.includes('email does not match')
                ? 'Your login email does not match the invitation. Please contact your loan officer for assistance.'
                : 'Access denied. Please contact support for assistance.'
              }
            </p>
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
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {sfdcError.includes('already associated') ? 'Logout and Contact Support' : 'Logout and Try Different Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleViewApplication = (applicationId: string) => {
    setSelectedApplication(applicationId);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedApplication(null);
    setEditingApplication(null);
  };

  const handleStartNewApplication = () => {
    setEditingApplication(null);
    setViewMode('form');
  };

  const handleEditApplication = (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    setEditingApplication(app);
    setViewMode('form');
  };

  const handleResumeApplication = (applicationId: string) => {
    setResumingApplicationId(applicationId);
    setEditingApplication(null);
    setViewMode('form');
  };

  const handleSaveApplication = (formData: any, isDraft: boolean) => {
    const newId = editingApplication?.id || `TL-2024-${String(applications.length + 1).padStart(3, '0')}`;
    
    if (!isDraft) {
      if (formData.salesforce?.opportunityId) {
        console.log('✅ New opportunity created, refreshing opportunities list');
      }
      handleBackToList();
    }
  };

  const handleContactLoanOfficer = () => {
    // Open email client or phone dialer
    window.location.href = 'mailto:cody.sento@ternus.com?subject=Loan Application Inquiry';
  };

  // Plaid Assets & Income (Connect Bank) handler
  const handleConnectBank = async () => {
    if (!user?.sub) {
      console.error('No Auth0 user ID available');
      alert('Authentication error. Please try logging in again.');
      return;
    }

    setIsConnectingBank(true);
    
    try {
      // Get invitation token from URL if available
      const urlParams = new URLSearchParams(window.location.search);
      const invitationToken = urlParams.get('invitation_token');
      
      // Build API URL for Assets & Income verification
      const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/plaid/assets-income-verification`);
      apiUrl.searchParams.append('auth0_user_id', user.sub);
      if (invitationToken) {
        apiUrl.searchParams.append('invitation_token', invitationToken);
      }
      
      console.log('🏦 Creating Plaid Link token:', apiUrl.toString());
      
      // Call backend API to get Link token
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
      console.log('✅ Plaid Link token created:', data);
      
      if (data.success && data.link_token) {
        // Set the link token and open Plaid Link
        setLinkToken(data.link_token);
        
        // Open Plaid Link after a short delay to ensure state is updated
        setTimeout(() => {
          if (ready) {
            open();
          } else {
            console.log('⏳ Plaid Link not ready yet, will open when ready');
          }
        }, 100);
      } else {
        throw new Error('Invalid response from Assets & Income verification API');
      }
      
    } catch (error) {
      console.error('❌ Error creating Plaid Link token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to initialize bank connection: ${errorMessage}`);
      setIsConnectingBank(false);
    }
  };

  const renderMainContent = () => {
    if (activeTab === 'overview' && viewMode === 'list') {
      return (
        <div className="space-y-8">
          <ModernWelcomeSection user={user} contact={contact} opportunities={opportunities} />
          
          {/* Plaid Fast Track Banner - Compact Version */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-l-4 border-l-emerald-500 rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">⚡ Accelerate Your Loan Process with Plaid</h3>
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                        FAST TRACK
                      </span>
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
                  <button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleConnectBank}
                    disabled={isConnectingBank}
                  >
                    <div className="flex items-center gap-2">
                      {isConnectingBank ? (
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
          </div>
          
          {/* Conditional Banner based on Founders Club membership */}
          {contact?.foundersClubMember ? (
            <DebtFundInvestorBanner />
          ) : (
            <TernusFounderClubBanner />
          )}

          {/* Applications Section */}
          { /*
          {contact && (
            <ModernApplicationsGrid 
              applications={applications}
              onViewApplication={handleViewApplication}
              onStartNewApplication={handleStartNewApplication}
              onResumeApplication={handleResumeApplication}
            />
          )}
            
          {/* Generic content for users without valid contact */}
          {!contact && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🏦</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Ternus Lending</h3>
              <p className="text-gray-600 mb-6">
                Please contact your loan officer to access your personalized dashboard.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  If you have been invited to this portal, please ensure you are logged in with the correct email address.
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'overview' && viewMode === 'detail') {
      const selectedOpportunity = opportunities.find(opp => opp.id === selectedApplication);
      if (selectedOpportunity) {
        const detailedApplication = convertToDetailedApplication(selectedOpportunity);
        return (
          <ApplicationDetailView
            application={detailedApplication}
            onBack={handleBackToList}
            onEditApplication={() => handleEditApplication(selectedApplication!)}
            onContactLoanOfficer={handleContactLoanOfficer}
          />
        );
      }
      return <div>Application not found</div>;
    }

    if (activeTab === 'overview' && viewMode === 'form') {
      return (
        <ApplicationForm
          applicationId={resumingApplicationId || editingApplication?.id}
          onSave={handleSaveApplication}
          onCancel={handleBackToList}
          existingData={editingApplication?.formData}
        />
      );
    }

    if (activeTab === 'applications') {
      if (viewMode === 'detail') {
        const selectedOpportunity = opportunities.find(opp => opp.id === selectedApplication);
        if (selectedOpportunity) {
          const detailedApplication = convertToDetailedApplication(selectedOpportunity);
          return (
            <ApplicationDetailView
              application={detailedApplication}
              onBack={handleBackToList}
              onEditApplication={() => handleEditApplication(selectedApplication!)}
              onContactLoanOfficer={handleContactLoanOfficer}
            />
          );
        }
        return <div>Application not found</div>;
      }

      if (viewMode === 'form') {
        return (
          <ApplicationForm
            applicationId={resumingApplicationId || editingApplication?.id}
            onSave={handleSaveApplication}
            onCancel={handleBackToList}
            existingData={editingApplication?.formData}
          />
        );
      }

      return (
        <ModernApplicationsGrid 
          applications={applications}
          onViewApplication={handleViewApplication}
          onStartNewApplication={handleStartNewApplication}
          onResumeApplication={handleResumeApplication}
        />
      );
    }

    if (activeTab === 'messages') {
      return <MessagesTab />;
    }

    if (activeTab === 'calculator') {
      return <FixFlipCalculator />;
    }

    if (activeTab === 'profile') {
      return <ProfileTab contact={contact} />;
    }

    if (activeTab === 'documents') {
      return <HierarchicalDocuments opportunityId={currentOpportunity?.id || ''} loanType="fix-and-flip" />;
    }

    // Default fallback for other tabs
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h3>
        <p className="text-gray-600">This section is coming soon!</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Top Navigation */}
      <ModernTopNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        user={user}
        contact={contact}
        opportunities={opportunities}
        messageCount={0} // TODO: Add real message count when messages are implemented
      />
      
      {/* Main Content */}
      <main className="w-[95%] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderMainContent()}
      </main>
      
      <Footer />
    </div>
  );
};

export default ModernDashboard; 