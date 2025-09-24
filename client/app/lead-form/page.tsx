'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import LeadForm from '../../src/components/LeadForm';
import Logo from '../../src/components/ui/Logo';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import { CheckCircle, ArrowRight, LogIn, User } from 'lucide-react';

const LeadFormPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, loginWithRedirect } = useAuth0();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState<any>(null);

  // Get referral token from URL parameters
  const referralToken = searchParams?.get('referral_token') || searchParams?.get('token');

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Store a message about the referral attempt
      if (referralToken) {
        sessionStorage.setItem('referral_attempt_message', 'You are already logged in. Referral links are only for new users.');
      }
      router.push('/');
    }
  }, [isAuthenticated, isLoading, referralToken, router]);

  const handleSubmit = (leadData: any) => {
    console.log('✅ Lead form submitted:', leadData);
    setSubmissionData(leadData);
    setIsSubmitted(true);
  };

  const handleCancel = () => {
    router.push('/');
  };

  const handleContactUs = () => {
    // You can redirect to a contact page or open a modal
    window.location.href = 'mailto:info@ternus.com';
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleLoginRedirect = () => {
    loginWithRedirect({
      appState: {
        returnTo: '/'
      }
    });
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Show message for authenticated users
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <Logo size="large" variant="full" className="mx-auto mb-6" />
          
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Already Logged In
          </h1>
          
          <p className="text-gray-600 mb-6">
            You're already logged in as <strong>{user?.email}</strong>. 
            Referral links are designed for new users who haven't created an account yet.
          </p>
          
          {referralToken && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> This referral link is intended for new users. 
                Since you're already a member, please share this link with others who might be interested in Ternus.
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={handleBackToHome}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <p className="text-xs text-gray-500">
              Want to refer someone? Generate your own referral link from the dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <Logo size="large" variant="full" className="mx-auto mb-6" />
          
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Thank You for Your Interest!
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            We've received your information and our team will be in touch with you shortly to discuss your real estate investment needs.
          </p>
          
          {submissionData?.referrerContactId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Referral Tracked:</strong> Your submission has been linked to your referrer. 
                Thank you for joining the Ternus community through a referral!
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">What's Next?</h3>
              <ul className="text-sm text-gray-600 space-y-1 text-left">
                <li>• Our team will review your information within 24 hours</li>
                <li>• You'll receive a follow-up call or email to discuss your needs</li>
                <li>• We'll provide personalized loan options based on your requirements</li>
                <li>• If needed, we'll schedule a consultation to explore opportunities</li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleBackToHome}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Back to Home
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleContactUs}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Contact Us Directly
              </button>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="medium" variant="full" />
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Real Estate Investment Loans
              </div>
              <button
                onClick={handleLoginRedirect}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Already have an account? Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {referralToken && (
            <div className="mb-8 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                🤝 You've been referred to Ternus
              </div>
              <p className="mt-2 text-gray-600">
                Complete the form below to get started with personalized loan options
              </p>
            </div>
          )}
          
          <LeadForm
            referralToken={referralToken || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 Ternus. All rights reserved.</p>
            <p className="mt-1">
              Questions? Contact us at{' '}
              <a href="mailto:info@ternus.com" className="text-blue-600 hover:text-blue-700">
                info@ternus.com
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LeadFormPage; 