'use client';

import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Logo from './ui/Logo';

const LandingPage: React.FC = () => {
  const { loginWithRedirect } = useAuth0();

  // Handle login with invitation token preservation
  const handleLogin = () => {
    // Store invitation token before redirect
    const urlParams = new URLSearchParams(window.location.search);
    const invitationToken = urlParams.get('invitation_token');
    
    if (invitationToken) {
      localStorage.setItem('ternus_invitation_token', invitationToken);
      console.log('🔑 Stored invitation token before Auth0 redirect:', invitationToken);
    }
    
    // Redirect to Auth0 login
    loginWithRedirect({
      appState: {
        returnTo: invitationToken ? `/?invitation_token=${invitationToken}` : '/'
      }
    });
  };

  const features = [
    {
      icon: "📋",
      title: "Loan Applications",
      description: "Submit and track your loan applications with guided forms and real-time status updates."
    },
    {
      icon: "📁",
      title: "Document Center",
      description: "Securely upload and manage all your loan documents with drag-and-drop simplicity."
    },
    {
      icon: "📊",
      title: "Progress Tracking",
      description: "Monitor your loan status with detailed timeline views and milestone tracking."
    },
    {
      icon: "💬",
      title: "Direct Communication",
      description: "Message your loan officer directly and receive real-time updates on your application."
    },
    {
      icon: "🔒",
      title: "Bank-Level Security",
      description: "Your data is protected with enterprise-grade security and encryption."
    },
    {
      icon: "📱",
      title: "Mobile Optimized",
      description: "Access your portal anywhere, anytime with our responsive mobile design."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="relative bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Logo size="large" variant="full" />
            </div>
            <div className="space-x-4">
              <button
                onClick={handleLogin}
                className="btn-secondary"
              >
                Sign In
              </button>
              <button
                onClick={handleLogin}
                className="btn-primary"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Your Loan Journey,
              <span className="text-gradient block">Simplified</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Access your secure borrower portal to manage loan applications, 
              upload documents, track progress, and communicate with your lending team—all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleLogin}
                className="btn-primary text-lg px-8 py-4"
              >
                Start Your Application
              </button>
              <button
                onClick={handleLogin}
                className="btn-secondary text-lg px-8 py-4"
              >
                Access My Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need in One Portal
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive borrower portal streamlines the entire loan process, 
              making it easier and faster to get the financing you need.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of borrowers who trust Ternus for their lending needs. 
            Create your account and start your application today.
          </p>
          <button
            onClick={handleLogin}
            className="bg-white text-primary-600 hover:bg-gray-50 font-semibold px-8 py-4 rounded-lg text-lg transition-colors"
          >
            Create Your Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Logo size="medium" variant="full" />
              <span className="ml-4 text-gray-400">
                © 2024 Ternus. All rights reserved.
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              Secure • Compliant • Trusted
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 