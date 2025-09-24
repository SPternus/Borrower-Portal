'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import LoadingSpinner from '../../../src/components/ui/LoadingSpinner';
import Logo from '../../../src/components/ui/Logo';

interface TokenValidationData {
  valid: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    salesforceContactId: string;
  };
  tokenExpiry: string;
}

const TokenInvitePage: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithRedirect, isAuthenticated, isLoading: auth0Loading, user } = useAuth0();

  const [validationState, setValidationState] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'error'>('loading');
  const [tokenData, setTokenData] = useState<TokenValidationData | null>(null);
  const [error, setError] = useState<string>('');
  const [isReferralToken, setIsReferralToken] = useState<boolean>(false);
  const [referrerInfo, setReferrerInfo] = useState<any>(null);

  const token = params?.token as string;
  const email = searchParams?.get('email');
  
  // Detect if this is a referral token (starts with "ref_")
  const isReferral = token?.startsWith('ref_') || searchParams?.get('referral_token');
  const actualToken = isReferral ? (searchParams?.get('referral_token') || token) : token;

  useEffect(() => {
    if (actualToken) {
      setIsReferralToken(!!isReferral);
      if (isReferral) {
        validateReferralToken();
      } else if (email) {
        validateToken();
      } else {
        setValidationState('invalid');
        setError('Missing email parameter for invitation');
      }
    } else {
      setValidationState('invalid');
      setError('Missing token parameter');
    }
  }, [actualToken, email, isReferral]);

  useEffect(() => {
    // If user is already authenticated, complete the registration
    if (isAuthenticated && user && tokenData?.valid) {
      completeRegistration();
    }
  }, [isAuthenticated, user, tokenData]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/validate-token?token=${actualToken}&email=${encodeURIComponent(email!)}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setTokenData(data);
        setValidationState('valid');
      } else if (data.error?.includes('expired')) {
        setValidationState('expired');
        setError(data.error);
      } else {
        setValidationState('invalid');
        setError(data.error || 'Invalid invitation link');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setValidationState('error');
      setError('Failed to validate invitation link');
    }
  };

  const validateReferralToken = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/referrals/validate?referral_token=${encodeURIComponent(actualToken!)}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setReferrerInfo(data.referrer);
        setValidationState('valid');
      } else {
        setValidationState('invalid');
        setError(data.message || 'Invalid or expired referral link');
      }
    } catch (error) {
      console.error('Referral token validation error:', error);
      setValidationState('error');
      setError('Failed to validate referral link');
    }
  };

  const completeRegistration = async () => {
    try {
      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          auth0Data: user
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token context for the session
        sessionStorage.setItem('sfdcToken', token);
        sessionStorage.setItem('sfdcContactId', tokenData?.user.salesforceContactId || '');
        
        // Redirect to dashboard
        router.push('/');
      } else {
        setError(data.error || 'Registration completion failed');
      }
    } catch (error) {
      console.error('Registration completion error:', error);
      setError('Failed to complete registration');
    }
  };

  const handleLogin = () => {
    // Store token in sessionStorage for post-login processing
    sessionStorage.setItem('pendingToken', token);
    sessionStorage.setItem('pendingEmail', email!);
    
    loginWithRedirect({
      appState: {
        returnTo: `/invite/${token}?email=${encodeURIComponent(email!)}`,
        sfdcToken: token,
        sfdcEmail: email
      }
    });
  };

  const handleSignup = () => {
    // Store token in sessionStorage for post-signup processing
    sessionStorage.setItem('pendingToken', token);
    sessionStorage.setItem('pendingEmail', email!);
    
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup'
      },
      appState: {
        returnTo: `/invite/${token}?email=${encodeURIComponent(email!)}`,
        sfdcToken: token,
        sfdcEmail: email
      }
    });
  };

  if (auth0Loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (validationState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  if (validationState === 'invalid' || validationState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
          <Logo size="medium" variant="full" className="mx-auto mb-6" />
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="bg-red-50 p-4 rounded-lg text-left">
            <h3 className="font-semibold text-red-900 mb-2">Possible Issues:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• The invitation link has expired</li>
              <li>• The link has already been used</li>
              <li>• The email address doesn't match</li>
              <li>• The link format is incorrect</li>
            </ul>
          </div>
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-4">
              Please contact your loan officer for a new invitation link.
            </p>
            <button
              onClick={() => window.location.href = 'mailto:support@ternus.com'}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (validationState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
          <Logo size="medium" variant="full" className="mx-auto mb-6" />
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-yellow-600 text-2xl">⏰</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Expired</h1>
          <p className="text-gray-600 mb-6">
            This invitation link has expired. Please request a new invitation from your loan officer.
          </p>
          <button
            onClick={() => window.location.href = 'mailto:support@ternus.com'}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Request New Invitation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <Logo size="large" variant="full" className="mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Ternus Portal</h1>
          <p className="text-gray-600">You've been invited to access your loan dashboard</p>
        </div>

        {tokenData && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">📧 Invitation Details</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Name:</strong> {tokenData.user.firstName} {tokenData.user.lastName}</p>
              <p><strong>Email:</strong> {tokenData.user.email}</p>
              <p><strong>Expires:</strong> {new Date(tokenData.tokenExpiry).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 text-center">
            Choose how you'd like to access your portal:
          </h2>

          <button
            onClick={handleLogin}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Sign In with Existing Account
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={handleSignup}
            className="w-full border border-primary-600 text-primary-600 py-3 px-4 rounded-lg hover:bg-primary-50 transition-colors font-medium"
          >
            Create New Account
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to Ternus's Terms of Service and Privacy Policy.
              This secure portal allows you to manage your loan application and communicate with your loan team.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">🔒 Bank-level Security • SOC 2 Compliant</p>
            <p>Need help? Contact your loan officer or email support@ternus.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenInvitePage; 