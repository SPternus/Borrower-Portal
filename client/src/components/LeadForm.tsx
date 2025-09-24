'use client';

import React, { useState, useEffect } from 'react';
import { User, Building2, MapPin, Phone, Mail, Globe, DollarSign, Users, MessageSquare, CheckCircle, AlertCircle, Heart, ArrowRight, ArrowLeft } from 'lucide-react';

interface LeadFormProps {
  referralToken?: string;
  onSubmit: (leadData: any) => void;
  onCancel?: () => void;
}

interface ReferrerInfo {
  contact_id: string;
  user_email: string;
  token: string;
  uses_count: number;
  max_uses: number;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

const LeadForm: React.FC<LeadFormProps> = ({
  referralToken,
  onSubmit,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<'loading' | 'valid' | 'invalid' | null>(null);
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Professional Information
    company: '',
    
    // Property Details
    propertyAddress: '',
    rent: '',
    propertyInsurance: '',
    linkToCurrentPictures: '',
    asIsValue: '',
    propertyTaxes: '',
    
    // Interests & Notes
    interests: '',
    notes: '',
    
    // Real Estate Investment Details
    expressedInterest: '',
    intent: '',
    expectedCloseDate: '',
    currentPropertiesOwned: '',
    propertiesPurchasedLast12Months: '',
    desiredLoanAmount: '',
    purchasePrice: '',
    estimatedRenovationAmount: '',
    estimatedAfterRepairedValue: '',
    rehabsCompletedIn3Years: '',
    
    // Hidden field
    referralToken: referralToken || ''
  });

  const steps = [
    { 
      number: 1, 
      title: 'Personal Information', 
      icon: <User className="w-5 h-5" />, 
      description: 'Let us know how to reach you' 
    },
    { 
      number: 2, 
      title: 'Company & Property', 
      icon: <Building2 className="w-5 h-5" />, 
      description: 'Tell us about your business and property' 
    },
    { 
      number: 3, 
      title: 'Investment Goals', 
      icon: <DollarSign className="w-5 h-5" />, 
      description: 'Share your investment experience and loan needs' 
    },
    { 
      number: 4, 
      title: 'Final Details', 
      icon: <MessageSquare className="w-5 h-5" />, 
      description: 'Any additional information to help us serve you better' 
    }
  ];

  // Validate referral token on component mount
  useEffect(() => {
    if (referralToken) {
      validateReferralToken();
    }
  }, [referralToken]);

  const validateReferralToken = async () => {
    if (!referralToken) return;

    setTokenValidation('loading');
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/referrals/validate?referral_token=${encodeURIComponent(referralToken)}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (response.ok && data.valid) {
        setReferrerInfo(data.referrer);
        setTokenValidation('valid');
      } else {
        setTokenValidation('invalid');
        setError(data.message || 'Invalid or expired referral link');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValidation('invalid');
      setError('Failed to validate referral link');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/leads/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Lead created successfully:', data);
        onSubmit({
          ...data,
          formData
        });
      } else {
        // Handle different error formats
        let errorMessage = 'Failed to submit lead information';
        
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Handle FastAPI validation errors
          errorMessage = data.detail.map((err: any) => {
            if (err.msg) return err.msg;
            if (err.message) return err.message;
            return 'Validation error';
          }).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('❌ Failed to submit lead:', error);
      setError('Network error occurred while submitting form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    console.log('🔍 LeadForm - Checking canProceedToNext for step:', currentStep);
    console.log('📋 LeadForm - Current form data:', formData);
    
    switch (currentStep) {
      case 1:
        const step1Valid = formData.firstName && formData.lastName && formData.email && formData.phone;
        console.log('✅ LeadForm - Step 1 validation:', {
          firstName: !!formData.firstName,
          lastName: !!formData.lastName,
          email: !!formData.email,
          phone: !!formData.phone,
          result: step1Valid
        });
        return step1Valid;
      case 2:
        const step2Valid = formData.company;
        console.log('✅ LeadForm - Step 2 validation:', {
          company: !!formData.company,
          companyValue: formData.company,
          result: step2Valid
        });
        return step2Valid;
      case 3:
        console.log('✅ LeadForm - Step 3 validation: true (optional)');
        return true; // Investment details are optional
      case 4:
        console.log('✅ LeadForm - Step 4 validation: true (optional)');
        return true; // Interests are optional
      default:
        console.log('✅ LeadForm - Default validation: true');
        return true;
    }
  };

  const renderTernusBanner = () => {
    return (
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-white">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-1">Welcome to Ternus</h3>
            <p className="text-primary-100">Your trusted real estate investment partner</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-1">Fast 7-Day Closings</h4>
            <p className="text-sm text-primary-100">Quick approvals for time-sensitive deals</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-1">Competitive Rates</h4>
            <p className="text-sm text-primary-100">Best-in-market pricing for investors</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-1">Flexible Terms</h4>
            <p className="text-sm text-primary-100">Customized solutions for your needs</p>
          </div>
        </div>
      </div>
    );
  };

  const renderTokenValidation = () => {
    if (!referralToken) return null;

    return (
      <div className="mx-8 mt-8 mb-6 p-6 rounded-xl border">
        {tokenValidation === 'loading' && (
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span className="text-gray-600">Validating your referral...</span>
          </div>
        )}
        
        {tokenValidation === 'valid' && referrerInfo && (
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">🎉 You've Been Personally Referred!</h3>
              <p className="text-green-700 text-sm mb-3">
                Excellent! You've been referred by one of our valued clients who knows the quality of our service. This referral gives you special advantages in our application process.
              </p>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-green-800 font-semibold">
                    Your Referral Benefits
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="text-green-700 text-sm">
                    <div className="font-medium">⚡ Priority Review</div>
                    <div className="text-xs">Fast-tracked application</div>
                  </div>
                  <div className="text-green-700 text-sm">
                    <div className="font-medium">💰 Rate Discounts</div>
                    <div className="text-xs">Potential savings on rates</div>
                  </div>
                  <div className="text-green-700 text-sm">
                    <div className="font-medium">👥 Direct Access</div>
                    <div className="text-xs">Senior loan officers</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-green-600">
                  Referral ID: {referralToken.substring(0, 8)}...
                </div>
                <div className="text-xs text-green-600 font-medium">
                  ✨ VIP Application Status
                </div>
              </div>
            </div>
          </div>
        )}
        
        {tokenValidation === 'invalid' && (
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Referral Link Issue</h3>
              <p className="text-red-700 text-sm">{error}</p>
              <p className="text-red-600 text-xs mt-1">
                Don't worry! You can still submit your application and we'll review it promptly.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2 text-primary-600" />
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2 text-primary-600" />
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Mail className="w-4 h-4 mr-2 text-primary-600" />
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                placeholder="Enter your email address"
                required
              />
            </div>
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Phone className="w-4 h-4 mr-2 text-primary-600" />
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                placeholder="(555) 123-4567"
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-primary-600" />
                Company Name *
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                placeholder="Enter your company name"
                required
              />
            </div>

            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-6 rounded-xl border border-primary-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                Property Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Property Address
                  </label>
                  <input
                    type="text"
                    value={formData.propertyAddress}
                    onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                    placeholder="123 Property Street, City, State"
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Monthly Rent
                  </label>
                  <input
                    type="text"
                    value={formData.rent}
                    onChange={(e) => handleInputChange('rent', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                    placeholder="$2,500"
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Property Insurance (Annual)
                  </label>
                  <input
                    type="text"
                    value={formData.propertyInsurance}
                    onChange={(e) => handleInputChange('propertyInsurance', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                    placeholder="$1,200"
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Property Taxes (Annual)
                  </label>
                  <input
                    type="text"
                    value={formData.propertyTaxes}
                    onChange={(e) => handleInputChange('propertyTaxes', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                    placeholder="$3,500"
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    As-Is Value
                  </label>
                  <input
                    type="text"
                    value={formData.asIsValue}
                    onChange={(e) => handleInputChange('asIsValue', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                    placeholder="$450,000"
                  />
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Link to Current Pictures
                  </label>
                  <input
                    type="url"
                    value={formData.linkToCurrentPictures}
                    onChange={(e) => handleInputChange('linkToCurrentPictures', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                    placeholder="https://photos.example.com"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-6 rounded-xl border border-primary-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-primary-600" />
                Investment Experience & Loan Requirements
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Expressed Interest
                  </label>
                  <select
                    value={formData.expressedInterest}
                    onChange={(e) => handleInputChange('expressedInterest', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select loan type</option>
                    <option value="Bridge Loan">Bridge Loan</option>
                    <option value="Fix and Flip Loan">Fix and Flip Loan</option>
                    <option value="Ground Up Construction Loan">Ground Up Construction Loan</option>
                    <option value="Portfolio Rental Loan">Portfolio Rental Loan</option>
                    <option value="Transactional Funding">Transactional Funding</option>
                    <option value="Wholetail Loan">Wholetail Loan</option>
                    <option value="Long-term Rental Loan (DSCR)">Long-term Rental Loan (DSCR)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Intent
                  </label>
                  <select
                    value={formData.intent}
                    onChange={(e) => handleInputChange('intent', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select intent</option>
                    <option value="Max Proceeds">Max Proceeds</option>
                    <option value="Low Rate">Low Rate</option>
                    <option value="Max Leverage">Max Leverage</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => handleInputChange('expectedCloseDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Properties Currently Owned
                  </label>
                  <select
                    value={formData.currentPropertiesOwned}
                    onChange={(e) => handleInputChange('currentPropertiesOwned', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select count</option>
                    <option value="0">0 (First-time investor)</option>
                    <option value="1">1</option>
                    <option value="2-3">2-3</option>
                    <option value="4-5">4-5</option>
                    <option value="6-10">6-10</option>
                    <option value="11-20">11-20</option>
                    <option value="20+">20+</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Properties Purchased Last 12 Months
                  </label>
                  <select
                    value={formData.propertiesPurchasedLast12Months}
                    onChange={(e) => handleInputChange('propertiesPurchasedLast12Months', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select count</option>
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3-5">3-5</option>
                    <option value="6-10">6-10</option>
                    <option value="10+">10+</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Desired Loan Amount
                  </label>
                  <select
                    value={formData.desiredLoanAmount}
                    onChange={(e) => handleInputChange('desiredLoanAmount', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select amount</option>
                    <option value="Under $100K">Under $100K</option>
                    <option value="$100K - $250K">$100K - $250K</option>
                    <option value="$250K - $500K">$250K - $500K</option>
                    <option value="$500K - $1M">$500K - $1M</option>
                    <option value="$1M - $2M">$1M - $2M</option>
                    <option value="$2M+">$2M+</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Purchase Price
                  </label>
                  <select
                    value={formData.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select price</option>
                    <option value="Under $100K">Under $100K</option>
                    <option value="$100K - $250K">$100K - $250K</option>
                    <option value="$250K - $400K">$250K - $400K</option>
                    <option value="$400K - $600K">$400K - $600K</option>
                    <option value="$600K - $1M">$600K - $1M</option>
                    <option value="$1M - $2M">$1M - $2M</option>
                    <option value="$2M+">$2M+</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Estimated Renovation Amount
                  </label>
                  <select
                    value={formData.estimatedRenovationAmount}
                    onChange={(e) => handleInputChange('estimatedRenovationAmount', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select amount</option>
                    <option value="$0">$0 (No renovation needed)</option>
                    <option value="Under $25K">Under $25K</option>
                    <option value="$25K - $50K">$25K - $50K</option>
                    <option value="$50K - $100K">$50K - $100K</option>
                    <option value="$100K - $200K">$100K - $200K</option>
                    <option value="$200K+">$200K+</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Estimated After Repaired Value (ARV)
                  </label>
                  <select
                    value={formData.estimatedAfterRepairedValue}
                    onChange={(e) => handleInputChange('estimatedAfterRepairedValue', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select ARV</option>
                    <option value="Under $150K">Under $150K</option>
                    <option value="$150K - $250K">$150K - $250K</option>
                    <option value="$250K - $400K">$250K - $400K</option>
                    <option value="$400K - $600K">$400K - $600K</option>
                    <option value="$600K - $1M">$600K - $1M</option>
                    <option value="$1M - $2M">$1M - $2M</option>
                    <option value="$2M+">$2M+</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    How Many Rehabs Completed in 3 Years?
                  </label>
                  <select
                    value={formData.rehabsCompletedIn3Years}
                    onChange={(e) => handleInputChange('rehabsCompletedIn3Years', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="">Select count</option>
                    <option value="0">0 (No rehab experience)</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3-5">3-5</option>
                    <option value="6-10">6-10</option>
                    <option value="11-20">11-20</option>
                    <option value="20+">20+</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-6 rounded-xl border border-primary-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
                Tell Us More About Your Goals
              </h3>
              
              <div className="group mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Tell us about your investment goals
                </label>
                <textarea
                  rows={4}
                  value={formData.interests}
                  onChange={(e) => handleInputChange('interests', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                  placeholder="Share your real estate investment goals, specific projects you're working on, types of properties you're interested in, or any particular loan needs you have..."
                />
              </div>
              
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Anything else we should know?
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white resize-none"
                  placeholder="Timeline expectations, special circumstances, questions for our team, or any other details that would help us serve you better..."
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full mb-6 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-primary-800 to-primary-900 bg-clip-text text-transparent mb-4">
            Start Your Investment Journey
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Join thousands of successful real estate investors who trust us with their financing needs
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Ternus Benefits Banner */}
          {renderTernusBanner()}

          {/* Token Validation */}
          {renderTokenValidation()}

          <div className="p-8 md:p-12">
            {/* Progress Steps */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-8">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      currentStep >= step.number
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 border-primary-600 text-white shadow-lg'
                        : 'border-gray-300 text-gray-400 bg-white'
                    }`}>
                      {currentStep > step.number ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        step.icon
                      )}
                      {currentStep === step.number && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full opacity-30 animate-pulse"></div>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-500 ${
                        currentStep > step.number 
                          ? 'bg-gradient-to-r from-primary-600 to-primary-700' 
                          : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {steps[currentStep - 1]?.title}
                </h3>
                <p className="text-gray-600 text-lg">
                  Step {currentStep} of {steps.length} - {steps[currentStep - 1]?.description}
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                  <span className="text-red-700 font-medium">
                    {typeof error === 'string' ? error : 'An error occurred while processing your request'}
                  </span>
                </div>
              </div>
            )}

            {/* Form Content */}
            <div className="mb-10">
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              <div className="flex gap-4">
                {/* Validation helper text */}
                {!canProceedToNext() && (
                  <div className="flex items-center text-sm text-gray-500 mr-4">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {currentStep === 1 && "Please fill in all required fields"}
                    {currentStep === 2 && "Please enter your company name"}
                  </div>
                )}
                
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md transition-all duration-200"
                  >
                    Cancel
                  </button>
                )}
                
                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceedToNext()}
                    className={`flex items-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      !canProceedToNext()
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 hover:shadow-lg transform hover:scale-105'
                    }`}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canProceedToNext() || isSubmitting}
                    className={`flex items-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      !canProceedToNext() || isSubmitting
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 hover:shadow-lg transform hover:scale-105'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadForm; 