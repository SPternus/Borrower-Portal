'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '../ui/modern/Badge';
import { Button } from '../ui/modern/Button';
import { cn } from '../../lib/utils';

interface ReferralBadgeProps {
  contactId: string;
  userEmail: string;
}

interface ReferralToken {
  id: string;
  token: string;
  contact_id: string;
  created_at: string;
  expires_at: string;
  uses_count: number;
  max_uses: number;
  is_active: boolean;
}

const ReferralBadge: React.FC<ReferralBadgeProps> = ({ 
  contactId, 
  userEmail 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [referralToken, setReferralToken] = useState<ReferralToken | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Load existing referral token when modal opens
  useEffect(() => {
    if (isModalOpen && !referralToken) {
      loadExistingToken();
    }
  }, [isModalOpen, contactId]);

  const loadExistingToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/token?contact_id=${contactId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          setReferralToken(data.token);
        }
      }
    } catch (error) {
      console.error('Error loading existing token:', error);
    }
  };

  const generateReferralToken = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/referrals/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: contactId,
          user_email: userEmail,
          max_uses: 999999  // Unlimited referrals
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReferralToken(data.token);
      } else {
        setError(data.message || 'Failed to generate referral token');
      }
    } catch (error) {
      setError('Network error occurred while generating token');
      console.error('Error generating referral token:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReferralLink = async () => {
    if (!referralToken) return;

    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/lead-form?referral_token=${referralToken.token}`;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const shareReferralLink = () => {
    if (!referralToken) return;

    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/lead-form?referral_token=${referralToken.token}`;
    const shareText = `Join me on Ternus! I'm using their platform for my lending needs and thought you might be interested. Use my referral link to get started: ${referralLink}`;

    if (navigator.share) {
      navigator.share({
        title: 'Join Ternus Lending',
        text: shareText,
        url: referralLink,
      });
    } else {
      // Fallback to copying
      copyReferralLink();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
    setCopySuccess(false);
  };

  return (
    <>
      {/* Referral Badge */}
      <Badge 
        variant="secondary" 
        size="sm"
        className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors"
        onClick={() => setIsModalOpen(true)}
      >
        🤝 Refer Friends
        {referralToken && referralToken.uses_count > 0 && (
          <span className="ml-1 text-xs opacity-75">
            ({referralToken.uses_count})
          </span>
        )}
      </Badge>

      {/* Modal Overlay */}
      {isModalOpen && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">🤝</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Refer Friends</h2>
                  <p className="text-sm text-gray-600">Share Ternus with your network</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-white">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {!referralToken ? (
                // Generate Token Section
                <div className="text-center py-6">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Your Referral Link</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Create a unique link to invite unlimited friends to Ternus. You'll both benefit when they join!
                  </p>
                  <Button
                    onClick={generateReferralToken}
                    disabled={isGenerating}
                    className="min-w-[150px] bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Link'}
                  </Button>
                </div>
              ) : (
                // Token Management Section
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">Your Referral Link</h3>
                      <Badge 
                        variant={referralToken.is_active ? "success" : "secondary"}
                        size="sm"
                      >
                        {referralToken.uses_count} referral{referralToken.uses_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-3 font-mono text-sm text-gray-700 break-all mb-3">
                      {`${window.location.origin}/lead-form?referral_token=${referralToken.token}`}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyReferralLink}
                        className="w-full"
                      >
                        {copySuccess ? '✅ Copied!' : '📋 Copy'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={shareReferralLink}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        📤 Share
                      </Button>
                    </div>
                  </div>

                  {/* Token Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Created</div>
                      <div className="font-medium">{formatDate(referralToken.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Expires</div>
                      <div className="font-medium">{formatDate(referralToken.expires_at)}</div>
                    </div>
                  </div>

                  {/* Referral Benefits */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Referral Benefits</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Unlimited referrals with your unique link</li>
                      <li>• Your friends get priority application review</li>
                      <li>• You receive referral bonus on their first loan</li>
                      <li>• Both get access to exclusive rates</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ReferralBadge; 