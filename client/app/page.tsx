'use client';

import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import LoadingSpinner from '../src/components/ui/LoadingSpinner';
import LandingPage from '../src/components/LandingPage';
import Dashboard from '../src/components/Dashboard';
import { isAuth0Configured } from '../src/lib/auth0';
import { clearAuth0State, clearAuth0StateOnError } from '../src/lib/clearAuth0State';

export default function HomePage() {
  // For demo purposes, let's show the landing page when Auth0 has issues
  const forceDemo = false; // Auth0 is now configured!
  
  // Clear Auth0 state on mount if there's an error
  useEffect(() => {
    clearAuth0StateOnError();
    
    // Handle Auth0 callback and restore invitation token
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthCode = urlParams.has('code') && urlParams.has('state');
    
    if (hasAuthCode) {
      // This is an Auth0 callback - check for stored invitation token
      const storedToken = localStorage.getItem('ternus_invitation_token');
      if (storedToken && !urlParams.has('invitation_token')) {
        console.log('🔄 Auth0 callback detected - restoring invitation token:', storedToken);
        // Add the invitation token back to the URL
        urlParams.set('invitation_token', storedToken);
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);
  
  // Check if Auth0 is configured
  if (!isAuth0Configured() || forceDemo) {
    return (
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Ternus Borrower Profile</h1>
            <p className="text-gray-600 mb-6">
              Auth0 tenant setup in progress...
            </p>
            <div className="bg-blue-50 p-4 rounded-lg text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Current Status:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✅ Domain: dev-ymgg3mramteweox8.us.auth0.com</li>
                <li>✅ Client ID: W4oVxbOtGtWuVGHewbCtBtGZMpEOp29D</li>
                <li>⏳ Waiting for Auth0 tenant activation</li>
                <li>🔧 Configure Application URIs in Auth0 dashboard</li>
              </ul>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <p>Add these URLs to your Auth0 Application Settings:</p>
              <p className="font-mono bg-gray-100 p-1 rounded mt-1">http://localhost:3000</p>
            </div>
          </div>
        </div>
    );
  }

  const { isLoading, isAuthenticated, error, logout, loginWithRedirect, user } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    const handleClearState = () => {
      clearAuth0State();
      window.location.reload();
    };

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <div className="bg-red-50 p-4 rounded-lg text-left max-w-md mx-auto mb-4">
            <h3 className="font-semibold text-red-900 mb-2">Common Solutions:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Check your Auth0 domain and client ID</li>
              <li>• Verify callback URLs in Auth0 dashboard</li>
              <li>• Ensure <code className="bg-red-100 px-1 rounded">http://localhost:3000</code> is allowed</li>
            </ul>
          </div>
          <button
            onClick={handleClearState}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear Auth State & Retry
          </button>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Dashboard />
      </div>
    );
  }

  return <LandingPage />;
} 