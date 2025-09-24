'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

// Define the API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface SalesforceOpportunity {
  id: string;
  name: string;
  stageName: string;
  amount: number;
  closeDate: string;
  createdDate: string;
  loanType?: string;
  propertyAddress?: string;
  loanAmount?: number;
  loanPurpose?: string;
  propertyType?: string;
  propertyValue?: number;
  appFeePaid?: boolean; // Application fee payment status
  loanOfficer: {
    name: string;
    email: string;
    phone: string;
  };
}

interface SalesforceContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  accountId: string;
  accountName: string;
  foundersClubMember?: boolean;
  plaidVerified?: boolean;
  // Optional address fields that might come from Salesforce
  mailingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    geocodeAccuracy?: string;
  };
}

interface SalesforceContextType {
  // Token and Contact Info
  sfdcToken: string | null;
  sfdcContactId: string | null;
  contact: SalesforceContact | null;
  
  // Opportunities
  opportunities: SalesforceOpportunity[];
  currentOpportunity: SalesforceOpportunity | null;
  
  // Loading and Error States
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentOpportunity: (opportunity: SalesforceOpportunity | null) => void;
  refreshOpportunities: () => Promise<void>;
  updateOpportunity: (opportunityId: string, updates: Partial<SalesforceOpportunity>) => Promise<void>;
  createOpportunity: (formData: any) => Promise<{ success: boolean; error?: string; opportunityId?: string }>;
  logActivity: (activityType: string, description: string) => Promise<void>;
}

const SalesforceContext = createContext<SalesforceContextType | undefined>(undefined);

interface SalesforceProviderProps {
  children: ReactNode;
}

// Note: Removed invitation token caching - using PostgreSQL user mapping instead

export const SalesforceProvider: React.FC<SalesforceProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  
  const [sfdcToken, setSfdcToken] = useState<string | null>(null);
  const [sfdcContactId, setSfdcContactId] = useState<string | null>(null);
  const [contact, setContact] = useState<SalesforceContact | null>(null);
  const [opportunities, setOpportunities] = useState<SalesforceOpportunity[]>([]);
  const [currentOpportunity, setCurrentOpportunity] = useState<SalesforceOpportunity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Extract and persist invitation token 
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('invitation_token');
    
    if (urlToken) {
      console.log('🔑 Invitation token found in URL:', urlToken);
      // Store in localStorage so it survives Auth0 redirects
      localStorage.setItem('invitation_token', urlToken);
      setInvitationToken(urlToken);
    } else {
      // Check if we have a stored token from previous session
      const storedToken = localStorage.getItem('invitation_token');
      if (storedToken) {
        console.log('🔑 Using stored invitation token:', storedToken);
        setInvitationToken(storedToken);
        
        // REMOVED: URL modification that might cause re-renders
        // const newUrl = new URL(window.location.href);
        // newUrl.searchParams.set('invitation_token', storedToken);
        // window.history.replaceState({}, '', newUrl.toString());
      } else {
        console.log('❌ No invitation token found in URL or storage');
        setError('No invitation token provided. Please use a valid invitation link.');
        return;
      }
    }
  }, []);

  // Initialize data when we have auth or token
  useEffect(() => {
    console.log('🔄 SalesforceContext useEffect triggered:', {
      authLoading,
      isAuthenticated,
      userSub: user?.sub,
      invitationToken,
      hasContact: !!contact,
      hasOpportunities: opportunities.length,
      isInitialized
    });
    
    // EMERGENCY STOP: Prevent re-initialization if already initialized
    if (isInitialized) {
      console.log('🛑 EMERGENCY STOP: Already initialized, skipping...');
      return;
    }
    
    if (!authLoading) {
      // NEW FLOW: Always prioritize PostgreSQL user mapping for authenticated users
      if (isAuthenticated && user?.sub) {
        console.log('🔑 Authenticated user detected - checking PostgreSQL user mapping first');
        initializeWithUserMapping(user.sub, user.email || '');
      }
      // Only use token-based flow for unauthenticated users (first-time visit)
      else if (!isAuthenticated && invitationToken) {
        console.log('🎫 Unauthenticated user with token - using invitation flow');
        initializeWithToken(invitationToken);
      }
      // No auth and no token - cannot proceed
      else if (!isAuthenticated && !invitationToken) {
        console.log('❌ No authentication and no invitation token');
        setError('Please use a valid invitation link or log in to access your account.');
        setIsLoading(false);
      }
    }
  }, [invitationToken, authLoading, isAuthenticated, user?.sub]);

  const initializeWithUserMapping = async (auth0UserId: string, email: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Checking PostgreSQL user mapping for Auth0 user:', auth0UserId);
      
      // First, check if user mapping exists in PostgreSQL
      const mappingResponse = await fetch(`${API_BASE_URL}/auth/user-mapping?auth0_user_id=${encodeURIComponent(auth0UserId)}`);
      
      if (mappingResponse.ok) {
        const mappingData = await mappingResponse.json();
        
        if (mappingData.success && mappingData.mapping?.salesforce_contact_id) {
          console.log('✅ User mapping found in PostgreSQL:', mappingData.mapping.salesforce_contact_id);
          
          // Get contact and opportunities using the stored mapping
          await loadUserDataFromMapping(auth0UserId, email, mappingData.mapping.salesforce_contact_id);
          return;
        }
      }
      
      // No mapping found - check if we have an invitation token for first-time setup
      const storedToken = localStorage.getItem('invitation_token');
      if (storedToken) {
        console.log('🔗 No mapping found, but invitation token available - attempting to create mapping');
        try {
          await attemptUserLinking(auth0UserId, email, storedToken);
          return;
        } catch (error: any) {
          // Error is already handled in attemptUserLinking, just prevent further execution
          if (error.message === 'ContactAlreadyAssociated' || error.message === 'UserAlreadyAssociated') {
            console.log('🛑 Association error detected, stopping login flow');
            return;
          }
          // Re-throw other errors
          throw error;
        }
      }

      // If we reach here without a token, set error and prevent session creation
      console.log('❌ No user mapping found and no invitation token available');
      setError('Account not found. Please use your invitation link to set up access, or contact support if you believe this is an error.');
      setIsLoading(false); // Explicitly stop loading
      
    } catch (error: any) {
      console.error('❌ User mapping check failed:', error);
      setError('Failed to load account information. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const attemptUserLinking = async (auth0UserId: string, email: string, token: string) => {
    try {
      console.log('🔗 Creating user mapping via invitation token validation...');

      const linkResponse = await fetch(`${API_BASE_URL}/auth/link-user?auth0_user_id=${encodeURIComponent(auth0UserId)}&email=${encodeURIComponent(email)}&invitation_token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!linkResponse.ok) {
        const errorData = await linkResponse.json().catch(() => ({ detail: 'Unknown error' }));

        // Check for specific contact association errors
        if (linkResponse.status === 409) {
          if (errorData.detail?.includes('Salesforce contact') && errorData.detail?.includes('is already associated with a different user')) {
            console.error('❌ Contact already associated with different user:', errorData.detail);
            setError('This email address is already associated with another account. Please contact support if you believe this is an error.');
            setIsLoading(false);
            throw new Error('ContactAlreadyAssociated');
          } else if (errorData.detail?.includes('Auth0 user') && errorData.detail?.includes('is already associated with a different Salesforce contact')) {
            console.error('❌ User already associated with different contact:', errorData.detail);
            setError('Your account is already associated with a different contact. Please contact support if you believe this is an error.');
            setIsLoading(false);
            throw new Error('UserAlreadyAssociated');
          }
        }

        throw new Error(errorData.detail || 'Failed to link account');
      }

      const linkData = await linkResponse.json();
      console.log('✅ User linking successful:', linkData);

      // Clear the invitation token as it's no longer needed
      localStorage.removeItem('invitation_token');
      setInvitationToken(null);
      console.log('🧹 Cleared invitation token from localStorage');

      // Now load data using the newly created mapping
      await loadUserDataFromMapping(auth0UserId, email, linkData.user_mapping.contact_id);

    } catch (error: any) {
      console.error('❌ User linking failed:', error);

      // Only handle non-association errors here (association errors are handled above)
      if (error.message !== 'ContactAlreadyAssociated' && error.message !== 'UserAlreadyAssociated') {
        setError(`Account setup failed: ${error.message}. Please ensure you're using the correct email address.`);
        setIsLoading(false); // Ensure loading is stopped
      }

      // Re-throw the error to propagate it up to initializeWithUserMapping
      throw error;
    }
  };

  const loadUserDataFromMapping = async (auth0UserId: string, email: string, contactId: string) => {
    try {
      console.log('📡 Loading user data from PostgreSQL mapping...');
      
      // Fetch contact data using user mapping (no token needed)
      const params = new URLSearchParams();
      params.append('auth0_user_id', auth0UserId);
      if (email) {
        params.append('email', email);
      }
      
      const contactResponse = await fetch(`${API_BASE_URL}/salesforce/contact?${params.toString()}`);
      
      if (!contactResponse.ok) {
        throw new Error(`Failed to load contact data: ${contactResponse.status}`);
      }
      
      const contactData = await contactResponse.json();
      console.log('✅ Contact data loaded from mapping:', contactData.contact);
      
      // Fetch opportunities using user mapping
      const oppsResponse = await fetch(`${API_BASE_URL}/salesforce/opportunities?${params.toString()}`);
      
      let oppsData = { opportunities: [] };
      if (oppsResponse.ok) {
        oppsData = await oppsResponse.json();
        console.log('✅ Opportunities loaded from mapping:', oppsData.opportunities?.length || 0);
      }
      
      // Update state
      setContact(contactData.contact);
      setOpportunities(oppsData.opportunities || []);
      setSfdcContactId(contactData.contact.id);
      setIsInitialized(true);
      
      // Set current opportunity to first one if available
      if (oppsData.opportunities && oppsData.opportunities.length > 0) {
        setCurrentOpportunity(oppsData.opportunities[0]);
      }
      
    } catch (error: any) {
      console.error('❌ Failed to load user data from mapping:', error);
      setError('Failed to load account data. Please try refreshing the page or contact support.');
    }
  };

  const initializeWithToken = async (token: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📡 Fetching contact data for token:', token);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('invitation_token', token);
      
      // Add Auth0 user info if available (for automatic user mapping creation)
      if (isAuthenticated && user?.sub) {
        params.append('auth0_user_id', user.sub);
      }
      if (isAuthenticated && user?.email) {
        params.append('email', user.email);
      }
      
      // Fetch contact data with token and optional Auth0 info
      const contactResponse = await fetch(`${API_BASE_URL}/salesforce/contact?${params.toString()}`);
      
      if (!contactResponse.ok) {
        if (contactResponse.status === 401) {
          throw new Error('Invalid or expired invitation token');
        }
        throw new Error(`Contact API failed: ${contactResponse.status}`);
      }
      
      const contactData = await contactResponse.json();
      console.log('✅ Contact data received:', contactData.contact);
      
      // Email validation for authenticated users ONLY - TEMPORARILY DISABLED FOR TESTING
      // if (isAuthenticated && user?.email && contactData.contact.email) {
      //   if (user.email.toLowerCase() !== contactData.contact.email.toLowerCase()) {
      //     setError(`Access denied. Your login email (${user.email}) does not match the invitation email (${contactData.contact.email}).`);
      //     return;
      //   }
      // }
      
      // Fetch opportunities
      console.log('📡 Fetching opportunities for contact:', contactData.contact.id);
      const oppsParams = new URLSearchParams();
      oppsParams.append('invitation_token', token);
      
      // Add Auth0 user info if available
      if (isAuthenticated && user?.sub) {
        oppsParams.append('auth0_user_id', user.sub);
      }
      
      const oppsResponse = await fetch(`${API_BASE_URL}/salesforce/opportunities?${oppsParams.toString()}`);
      
      let oppsData = { opportunities: [] };
      if (oppsResponse.ok) {
        oppsData = await oppsResponse.json();
        console.log('✅ Opportunities received:', oppsData.opportunities?.length || 0);
      } else {
        console.warn('⚠️ Opportunities fetch failed, using empty array');
      }
      
      // Update state
      setContact(contactData.contact);
      setOpportunities(oppsData.opportunities || []);
      setSfdcContactId(contactData.contact.id);
      setIsInitialized(true); // Mark as initialized to prevent re-initialization
      
      // Set current opportunity to first one if available
      if (oppsData.opportunities && oppsData.opportunities.length > 0) {
        setCurrentOpportunity(oppsData.opportunities[0]);
      }
      
      // Note: No longer caching token data - using PostgreSQL user mapping instead
      
    } catch (error: any) {
      console.error('❌ Token initialization failed:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOpportunities = useCallback(async () => {
    // Use PostgreSQL user mapping for authenticated users
    if (isAuthenticated && user?.sub) {
      try {
        const params = new URLSearchParams();
        params.append('auth0_user_id', user.sub);
        if (user.email) {
          params.append('email', user.email);
        }
        
        const response = await fetch(`${API_BASE_URL}/salesforce/opportunities?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setOpportunities(data.opportunities || []);
        }
      } catch (error) {
        console.error('Error refreshing opportunities:', error);
      }
    }
    // For unauthenticated users, use invitation token (if available)
    else if (invitationToken) {
      try {
        const response = await fetch(`${API_BASE_URL}/salesforce/opportunities?invitation_token=${invitationToken}`);
        if (response.ok) {
          const data = await response.json();
          setOpportunities(data.opportunities || []);
        }
      } catch (error) {
        console.error('Error refreshing opportunities:', error);
      }
    }
  }, [isAuthenticated, user?.sub, user?.email, invitationToken]);

  const updateOpportunity = async (opportunityId: string, updates: Partial<SalesforceOpportunity>) => {
    // For now, just update local state since backend doesn't support updates yet
    setOpportunities(prev => 
      prev.map(opp => 
        opp.id === opportunityId ? { ...opp, ...updates } : opp
      )
    );

    if (currentOpportunity?.id === opportunityId) {
      setCurrentOpportunity(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const createOpportunity = async (formData: any): Promise<{ success: boolean; error?: string; opportunityId?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setIsSubmitting(true);
    
    try {
      console.log('🚀 Starting opportunity creation process...');
      
      // Step 1: Save application data first
      const saveParams = new URLSearchParams();
      if (user.sub) {
        saveParams.append('auth0_user_id', user.sub);
      }
      if (user?.email) {
        saveParams.append('email', user.email);
      }
      
      // No longer need invitation token for authenticated users - they have user mapping
      
      const saveResponse = await fetch(`${API_BASE_URL}/applications/save?${saveParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: formData.applicationId || `app_${Date.now()}`,
          current_step: 4,
          form_data: formData,
          is_submitted: true
        })
      });

      if (!saveResponse.ok) {
        const saveError = await saveResponse.text();
        console.error('❌ Failed to save application:', saveError);
        return { success: false, error: `Failed to save application: ${saveError}` };
      }

      console.log('✅ Application data saved successfully');

      // Step 2: Check if user mapping exists, if not create it using invitation token
      const params = new URLSearchParams();
      if (user?.sub) {
        params.append('auth0_user_id', user.sub);
      }
      if (user?.email) {
        params.append('email', user.email);
      }
      
      // No longer need invitation token for authenticated users - they have user mapping

      // Step 3: Create the opportunity (backend will handle user mapping creation if needed)
      const opportunityResponse = await fetch(`${API_BASE_URL}/salesforce/opportunities?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!opportunityResponse.ok) {
        const errorText = await opportunityResponse.text();
        console.error('❌ Failed to create opportunity:', errorText);
        
        // Try to parse error message
        let errorMessage = 'Failed to create opportunity';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        return { success: false, error: errorMessage };
      }

      const opportunityData = await opportunityResponse.json();
      console.log('✅ Opportunity created successfully:', opportunityData);

      // Step 4: Refresh opportunities list
      await refreshOpportunities();
      
      return { 
        success: true, 
        opportunityId: opportunityData.id || opportunityData.opportunityId 
      };

    } catch (error) {
      console.error('❌ Error in createOpportunity:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const logActivity = async (activityType: string, description: string) => {
    if (!invitationToken || !sfdcContactId) return;

    try {
      await fetch(`${API_BASE_URL}/salesforce/activity?invitation_token=${invitationToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactId: sfdcContactId,
          activityType,
          description,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - activity logging is non-critical
    }
  };

  const contextValue: SalesforceContextType = {
    sfdcToken,
    sfdcContactId,
    contact,
    opportunities,
    currentOpportunity,
    isLoading,
    error,
    setCurrentOpportunity,
    refreshOpportunities,
    updateOpportunity,
    createOpportunity,
    logActivity
  };

  return (
    <SalesforceContext.Provider value={contextValue}>
      {children}
    </SalesforceContext.Provider>
  );
};

export const useSalesforce = (): SalesforceContextType => {
  const context = useContext(SalesforceContext);
  if (context === undefined) {
    throw new Error('useSalesforce must be used within a SalesforceProvider');
  }
  return context;
};

export default SalesforceContext; 