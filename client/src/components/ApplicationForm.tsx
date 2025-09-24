'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Save, User, Home, DollarSign, Building, Clock, CheckCircle, FileText, Calculator, MapPin, Send, Search } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSalesforce } from '../contexts/SalesforceContext';

interface ApplicationFormProps {
  applicationId?: string;
  onSave: (applicationData: any, isDraft: boolean) => void;
  onCancel: () => void;
  existingData?: any;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({
  applicationId,
  onSave,
  onCancel,
  existingData
}) => {
  const { user } = useAuth0();
  const { contact, createOpportunity } = useSalesforce();
  const [currentStep, setCurrentStep] = useState(1); // Start from Property Details
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Borrower Information
    borrowerInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      ssn: '',
      dateOfBirth: '',
      maritalStatus: '',
      currentAddress: '',
      city: '',
      state: '',
      zipCode: '',
      yearsAtAddress: '',
      ficoScore: ''
    },
    // Property Information
    propertyInfo: {
      propertyAddress: '',
      propertyCity: '',
      propertyState: '',
      propertyZipCode: '',
      propertyType: '',
      asIsValue: '',
      purchasePrice: '',
      estimatedAfterRepairValue: '',
      estimatedRenovationAmount: '',
      rehabBudget: '',
      propertyInsurance: '',
      propertyTaxes: '',
      expectedRent: '',
      linkToCurrentPictures: '',
      propertyDescription: ''
    },
    // Loan Information
             loanInfo: {
           loanType: '', // Product__c
           desiredLoanAmount: '',
           loanPurpose: '', // Intent__c
           expectedCloseDate: '',
           downPaymentPercentage: '',
           transactionType: '',
           processingFee: ''
         },
    // Financial Information
    financialInfo: {
      annualIncome: '',
      employmentStatus: '',
      employer: '',
      yearsEmployed: '',
      monthlyDebts: '',
      liquidAssets: '',
      propertiesCurrentlyOwned: '',
      propertiesPurchasedLast12Months: '',
      rehabsCompletedIn3Years: '',
      businessWithNonUSEntities: false
    },
    // Escrow Information
    escrowInfo: {
      titleCompanyName: '',
      escrowOfficerName: '',
      escrowOfficerPhone: '',
      escrowOfficerEmail: '',
      escrowAddress: '',
      escrowCity: '',
      escrowState: '',
      escrowZipCode: ''
    },
    // Additional Information
    additionalInfo: {
      leadSource: '',
      contactType: '',
      dueDiligenceDate: '',
      additionalDealInformation: '',
      specialInstructions: ''
    }
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [actualApplicationId, setActualApplicationId] = useState<string>(
    applicationId || `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // Steps configuration (skipping borrower info since we have it from Auth0/SFDC)
  const steps = [
    { number: 1, title: 'Property Details', icon: <Home className="w-5 h-5" />, description: 'Property information and valuation' },
    { number: 2, title: 'Loan Information', icon: <DollarSign className="w-5 h-5" />, description: 'Loan type and requirements' },
    { number: 3, title: 'Financial Information', icon: <Calculator className="w-5 h-5" />, description: 'Income and asset details' },
    { number: 4, title: 'Escrow & Title', icon: <Building className="w-5 h-5" />, description: 'Title company and escrow details' },
    { number: 5, title: 'Additional Information', icon: <FileText className="w-5 h-5" />, description: 'Additional details and review' },
    { number: 6, title: 'Review & Submit', icon: <CheckCircle className="w-5 h-5" />, description: 'Review and submit application' }
  ];

  // Pre-populate borrower information from Auth0 and SFDC contact
  useEffect(() => {
    if (user && contact) {
      setFormData(prev => ({
        ...prev,
        borrowerInfo: {
          ...prev.borrowerInfo,
          firstName: contact.firstName || user.given_name || '',
          lastName: contact.lastName || user.family_name || '',
          email: contact.email || user.email || '',
          phone: contact.phone || '',
          // Keep other fields as they are for now
        }
      }));
    }
  }, [user, contact]);

  // Load existing application progress on mount
  useEffect(() => {
    if (applicationId && user?.sub) {
      loadApplicationProgress();
    } else if (existingData) {
      setFormData(existingData.formData || formData);
      setCurrentStep(existingData.currentStep || 1);
    }
  }, [applicationId, user?.sub]);

  const loadApplicationProgress = async () => {
    try {
      const response = await fetch(`/api/applications/${applicationId}?auth0_user_id=${encodeURIComponent(user?.sub || '')}`);
      
      if (response.ok) {
        const data = await response.json();
        setFormData(data.form_data || formData);
        setCurrentStep(data.current_step || 1);
        console.log('✅ Application progress loaded:', data.application_id);
      } else if (response.status === 404) {
        console.log('📝 New application - no previous progress found');
      }
    } catch (error) {
      console.error('❌ Failed to load application progress:', error);
    }
  };

  const handleInputChange = (section: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value
      }
    }));
  };

  const handleManualSave = async () => {
    if (!user?.sub) return;

    try {
      const searchParams = new URLSearchParams({
        auth0_user_id: user.sub
      });

      const response = await fetch(`/api/applications/save?${searchParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: actualApplicationId,
          current_step: currentStep,
          form_data: formData,
          is_submitted: false
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        console.log('💾 Manually saved application progress');
      }
    } catch (error) {
      console.error('❌ Manual save failed:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Transform form data to match SFDC opportunity structure
      const opportunityData = {
        application_id: actualApplicationId,
        personalInfo: {
          firstName: formData.borrowerInfo.firstName,
          lastName: formData.borrowerInfo.lastName,
          email: formData.borrowerInfo.email,
          phone: formData.borrowerInfo.phone,
          dateOfBirth: formData.borrowerInfo.dateOfBirth,
          maritalStatus: formData.borrowerInfo.maritalStatus
        },
        propertyInfo: {
          propertyAddress: `${formData.propertyInfo.propertyAddress}, ${formData.propertyInfo.propertyCity}, ${formData.propertyInfo.propertyState} ${formData.propertyInfo.propertyZipCode}`.trim(),
          propertyType: formData.propertyInfo.propertyType,
          propertyValue: formData.propertyInfo.asIsValue,
          purchasePrice: formData.propertyInfo.purchasePrice,
          downPayment: formData.loanInfo.downPaymentPercentage,
          arvValue: formData.propertyInfo.estimatedAfterRepairValue,
          renovationAmount: formData.propertyInfo.estimatedRenovationAmount,
          rehabBudget: formData.propertyInfo.rehabBudget,
          propertyInsurance: formData.propertyInfo.propertyInsurance,
          propertyTaxes: formData.propertyInfo.propertyTaxes,
          expectedRent: formData.propertyInfo.expectedRent
        },
        loanInfo: {
          loanType: formData.loanInfo.loanType,
          loanAmount: formData.loanInfo.desiredLoanAmount,
          loanPurpose: formData.loanInfo.loanPurpose,
          expectedCloseDate: formData.loanInfo.expectedCloseDate,
          transactionType: formData.loanInfo.transactionType
        },
        financialInfo: {
          annualIncome: formData.financialInfo.annualIncome,
          employmentStatus: formData.financialInfo.employmentStatus,
          employer: formData.financialInfo.employer,
          yearsEmployed: formData.financialInfo.yearsEmployed,
          monthlyDebts: formData.financialInfo.monthlyDebts,
          liquidAssets: formData.financialInfo.liquidAssets,
          propertiesOwned: formData.financialInfo.propertiesCurrentlyOwned,
          recentPurchases: formData.financialInfo.propertiesPurchasedLast12Months,
          rehabExperience: formData.financialInfo.rehabsCompletedIn3Years,
          ficoScore: formData.borrowerInfo.ficoScore
        },
        escrowInfo: {
          titleCompany: formData.escrowInfo.titleCompanyName,
          escrowOfficer: formData.escrowInfo.escrowOfficerName,
          escrowPhone: formData.escrowInfo.escrowOfficerPhone,
          escrowEmail: formData.escrowInfo.escrowOfficerEmail,
          escrowAddress: `${formData.escrowInfo.escrowAddress}, ${formData.escrowInfo.escrowCity}, ${formData.escrowInfo.escrowState} ${formData.escrowInfo.escrowZipCode}`.trim()
        },
        additionalInfo: {
          leadSource: formData.additionalInfo.leadSource,
          contactType: formData.additionalInfo.contactType,
          dueDiligence: formData.additionalInfo.dueDiligenceDate,
          additionalInformation: formData.additionalInfo.additionalDealInformation
        }
      };

      // First save the application data
      if (user?.sub) {
        const searchParams = new URLSearchParams({
          auth0_user_id: user.sub
        });

        const saveResponse = await fetch(`/api/applications/save?${searchParams}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            application_id: actualApplicationId,
            current_step: currentStep,
            form_data: formData,
            is_submitted: true
          }),
        });

        if (!saveResponse.ok) {
          throw new Error(`Failed to save application: ${await saveResponse.text()}`);
        }
      }

      // Create opportunity in Salesforce
      const opportunity = await createOpportunity(opportunityData);
      
      if (!opportunity.success) {
        throw new Error(opportunity.error || 'Failed to create opportunity in Salesforce');
      }

      console.log('✅ Application submitted successfully:', {
        applicationId: actualApplicationId,
        opportunityId: opportunity.opportunityId
      });

      // Call parent save handler
      onSave({
        ...opportunityData,
        salesforce: {
          opportunityId: opportunity.opportunityId
        }
      }, false);

    } catch (error) {
      console.error('❌ Failed to submit application:', error);
      // Show error to user
      alert(`Failed to submit application: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Still save as draft if submission fails
      onSave(formData, true);
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
    console.log('🔍 Checking canProceedToNext for step:', currentStep);
    console.log('📋 Current form data:', formData);
    
    switch (currentStep) {
      case 1:
        const step1Valid = formData.propertyInfo.propertyAddress && 
               formData.propertyInfo.propertyCity && 
               formData.propertyInfo.propertyState && 
               formData.propertyInfo.propertyZipCode && 
               formData.propertyInfo.propertyType && 
               formData.propertyInfo.asIsValue;
        console.log('✅ Step 1 validation:', {
          propertyAddress: !!formData.propertyInfo.propertyAddress,
          propertyCity: !!formData.propertyInfo.propertyCity,
          propertyState: !!formData.propertyInfo.propertyState,
          propertyZipCode: !!formData.propertyInfo.propertyZipCode,
          propertyType: !!formData.propertyInfo.propertyType,
          asIsValue: !!formData.propertyInfo.asIsValue,
          result: step1Valid
        });
        return step1Valid;
      case 2:
        const step2Valid = formData.loanInfo.loanType && 
               formData.loanInfo.desiredLoanAmount && 
               formData.loanInfo.loanPurpose;
        console.log('✅ Step 2 validation:', {
          loanType: !!formData.loanInfo.loanType,
          desiredLoanAmount: !!formData.loanInfo.desiredLoanAmount,
          loanPurpose: !!formData.loanInfo.loanPurpose,
          result: step2Valid
        });
        return step2Valid;
      case 3:
        const step3Valid = formData.financialInfo.annualIncome && 
               formData.financialInfo.employmentStatus;
        console.log('✅ Step 3 validation:', {
          annualIncome: !!formData.financialInfo.annualIncome,
          employmentStatus: !!formData.financialInfo.employmentStatus,
          result: step3Valid
        });
        return step3Valid;
      case 4:
        const step4Valid = formData.escrowInfo.titleCompanyName && 
               formData.escrowInfo.escrowOfficerName && 
               formData.escrowInfo.escrowOfficerPhone && 
               formData.escrowInfo.escrowOfficerEmail;
        console.log('✅ Step 4 validation:', {
          titleCompanyName: !!formData.escrowInfo.titleCompanyName,
          escrowOfficerName: !!formData.escrowInfo.escrowOfficerName,
          escrowOfficerPhone: !!formData.escrowInfo.escrowOfficerPhone,
          escrowOfficerEmail: !!formData.escrowInfo.escrowOfficerEmail,
          result: step4Valid
        });
        return step4Valid;
      case 5:
        console.log('✅ Step 5 validation: true (optional)');
        return true; // Additional info is optional
      case 6:
        console.log('✅ Step 6 validation: true (review)');
        return true; // Review step is always enabled
      default:
        console.log('✅ Default validation: true');
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Address *</label>
              <input
                type="text"
                value={formData.propertyInfo.propertyAddress}
                onChange={(e) => handleInputChange('propertyInfo', 'propertyAddress', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Enter property address"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  value={formData.propertyInfo.propertyCity}
                  onChange={(e) => handleInputChange('propertyInfo', 'propertyCity', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                <input
                  type="text"
                  value={formData.propertyInfo.propertyState}
                  onChange={(e) => handleInputChange('propertyInfo', 'propertyState', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code *</label>
                <input
                  type="text"
                  value={formData.propertyInfo.propertyZipCode}
                  onChange={(e) => handleInputChange('propertyInfo', 'propertyZipCode', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                <select
                  value={formData.propertyInfo.propertyType}
                  onChange={(e) => handleInputChange('propertyInfo', 'propertyType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select type</option>
                  <option value="single-family">Single Family Residence (SFR)</option>
                  <option value="multi-family">Multi-Family (2-4 units)</option>
                  <option value="multi-family-5plus">Multi-Family (5+ units)</option>
                  <option value="manufactured">Manufactured Home</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">As-Is Value *</label>
                <input
                  type="number"
                  value={formData.propertyInfo.asIsValue}
                  onChange={(e) => handleInputChange('propertyInfo', 'asIsValue', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price</label>
                <input
                  type="number"
                  value={formData.propertyInfo.purchasePrice}
                  onChange={(e) => handleInputChange('propertyInfo', 'purchasePrice', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Est. After Repair Value (ARV)</label>
                <input
                  type="number"
                  value={formData.propertyInfo.estimatedAfterRepairValue}
                  onChange={(e) => handleInputChange('propertyInfo', 'estimatedAfterRepairValue', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Renovation Amount</label>
                <input
                  type="number"
                  value={formData.propertyInfo.estimatedRenovationAmount}
                  onChange={(e) => handleInputChange('propertyInfo', 'estimatedRenovationAmount', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Monthly Rent</label>
                <input
                  type="number"
                  value={formData.propertyInfo.expectedRent}
                  onChange={(e) => handleInputChange('propertyInfo', 'expectedRent', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
                <select
                  value={formData.loanInfo.loanType}
                  onChange={(e) => handleInputChange('loanInfo', 'loanType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select type</option>
                  <option value="fix-flip">Fix and Flip Loan</option>
                  <option value="dscr">Long-term Rental Loans (DSCR)</option>
                  <option value="bridge">Bridge Loan</option>
                  <option value="wholetail">Wholetail Loan</option>
                  <option value="construction">Ground Up Construction Loan</option>
                  <option value="portfolio">Portfolio Rental Loan</option>
                  <option value="transactional">Transactional Funding</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Desired Loan Amount *</label>
                <input
                  type="number"
                  value={formData.loanInfo.desiredLoanAmount}
                  onChange={(e) => handleInputChange('loanInfo', 'desiredLoanAmount', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Purpose *</label>
                <select
                  value={formData.loanInfo.loanPurpose}
                  onChange={(e) => handleInputChange('loanInfo', 'loanPurpose', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select purpose</option>
                  <option value="investment">Max Proceeds</option>
                  <option value="refinance">Low Rate</option>
                  <option value="leverage">Max Leverage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment %</label>
                <input
                  type="number"
                  value={formData.loanInfo.downPaymentPercentage}
                  onChange={(e) => handleInputChange('loanInfo', 'downPaymentPercentage', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="20"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Close Date</label>
                <input
                  type="date"
                  value={formData.loanInfo.expectedCloseDate}
                  onChange={(e) => handleInputChange('loanInfo', 'expectedCloseDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                <select
                  value={formData.loanInfo.transactionType}
                  onChange={(e) => handleInputChange('loanInfo', 'transactionType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select type</option>
                  <option value="purchase">Purchase</option>
                  <option value="refinance">Refinance</option>
                  <option value="cash-out-refinance">Cash-Out Refinance</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income *</label>
                <input
                  type="number"
                  value={formData.financialInfo.annualIncome}
                  onChange={(e) => handleInputChange('financialInfo', 'annualIncome', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status *</label>
                <select
                  value={formData.financialInfo.employmentStatus}
                  onChange={(e) => handleInputChange('financialInfo', 'employmentStatus', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select status</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="business-owner">Business Owner</option>
                  <option value="retired">Retired</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employer/Business Name</label>
                <input
                  type="text"
                  value={formData.financialInfo.employer}
                  onChange={(e) => handleInputChange('financialInfo', 'employer', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Years in Current Position</label>
                <input
                  type="number"
                  value={formData.financialInfo.yearsEmployed}
                  onChange={(e) => handleInputChange('financialInfo', 'yearsEmployed', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Properties Currently Owned</label>
                <input
                  type="number"
                  value={formData.financialInfo.propertiesCurrentlyOwned}
                  onChange={(e) => handleInputChange('financialInfo', 'propertiesCurrentlyOwned', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Properties Purchased (Last 12 Months)</label>
                <input
                  type="number"
                  value={formData.financialInfo.propertiesPurchasedLast12Months}
                  onChange={(e) => handleInputChange('financialInfo', 'propertiesPurchasedLast12Months', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rehabs Completed (Last 3 Years)</label>
                <input
                  type="number"
                  value={formData.financialInfo.rehabsCompletedIn3Years}
                  onChange={(e) => handleInputChange('financialInfo', 'rehabsCompletedIn3Years', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Liquid Assets</label>
                <input
                  type="number"
                  value={formData.financialInfo.liquidAssets}
                  onChange={(e) => handleInputChange('financialInfo', 'liquidAssets', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title Company Name</label>
                <input
                  type="text"
                  value={formData.escrowInfo.titleCompanyName}
                  onChange={(e) => handleInputChange('escrowInfo', 'titleCompanyName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Escrow Officer Name</label>
                <input
                  type="text"
                  value={formData.escrowInfo.escrowOfficerName}
                  onChange={(e) => handleInputChange('escrowInfo', 'escrowOfficerName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Escrow Officer Phone</label>
                <input
                  type="tel"
                  value={formData.escrowInfo.escrowOfficerPhone}
                  onChange={(e) => handleInputChange('escrowInfo', 'escrowOfficerPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Escrow Officer Email</label>
                <input
                  type="email"
                  value={formData.escrowInfo.escrowOfficerEmail}
                  onChange={(e) => handleInputChange('escrowInfo', 'escrowOfficerEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lead Source</label>
                <select
                  value={formData.additionalInfo.leadSource}
                  onChange={(e) => handleInputChange('additionalInfo', 'leadSource', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select source</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social-media">Social Media</option>
                  <option value="advertising">Advertising</option>
                  <option value="partner">Partner</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Diligence Date</label>
                <input
                  type="date"
                  value={formData.additionalInfo.dueDiligenceDate}
                  onChange={(e) => handleInputChange('additionalInfo', 'dueDiligenceDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Deal Information</label>
              <textarea
                rows={4}
                value={formData.additionalInfo.additionalDealInformation}
                onChange={(e) => handleInputChange('additionalInfo', 'additionalDealInformation', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Please provide any additional information about the deal..."
              />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Review Your Application</h3>
              <p className="text-gray-600">Please review your information before submitting</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Borrower Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {formData.borrowerInfo.firstName} {formData.borrowerInfo.lastName}</p>
                  <p><span className="font-medium">Email:</span> {formData.borrowerInfo.email}</p>
                  <p><span className="font-medium">Phone:</span> {formData.borrowerInfo.phone}</p>
                  {formData.borrowerInfo.ficoScore && (
                    <p><span className="font-medium">FICO Score:</span> {formData.borrowerInfo.ficoScore}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Property Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Address:</span> {formData.propertyInfo.propertyAddress}</p>
                  <p><span className="font-medium">Type:</span> {formData.propertyInfo.propertyType}</p>
                  <p><span className="font-medium">As-Is Value:</span> ${Number(formData.propertyInfo.asIsValue).toLocaleString()}</p>
                  {formData.propertyInfo.purchasePrice && (
                    <p><span className="font-medium">Purchase Price:</span> ${Number(formData.propertyInfo.purchasePrice).toLocaleString()}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Loan Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Loan Type:</span> {formData.loanInfo.loanType}</p>
                  <p><span className="font-medium">Loan Amount:</span> ${Number(formData.loanInfo.desiredLoanAmount).toLocaleString()}</p>
                  <p><span className="font-medium">Purpose:</span> {formData.loanInfo.loanPurpose}</p>
                  {formData.loanInfo.expectedCloseDate && (
                    <p><span className="font-medium">Expected Close:</span> {formData.loanInfo.expectedCloseDate}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Financial Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Annual Income:</span> ${Number(formData.financialInfo.annualIncome).toLocaleString()}</p>
                  <p><span className="font-medium">Employment:</span> {formData.financialInfo.employmentStatus}</p>
                  {formData.financialInfo.propertiesCurrentlyOwned && (
                    <p><span className="font-medium">Properties Owned:</span> {formData.financialInfo.propertiesCurrentlyOwned}</p>
                  )}
                  {formData.financialInfo.liquidAssets && (
                    <p><span className="font-medium">Liquid Assets:</span> ${Number(formData.financialInfo.liquidAssets).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
      {/* Header with Progress */}
      <div className="px-8 py-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Loan Application</h2>
          <div className="flex items-center space-x-4">
            {lastSaved && (
              <div className="flex items-center text-sm text-gray-500">
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Step Progress */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
          
          {/* Current Step Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-600 text-white"
              >
                {steps[currentStep - 1]?.icon}
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-primary-600">
                  Step {currentStep} of {steps.length}
                </div>
                <div className="text-xs text-gray-600">
                  {steps[currentStep - 1]?.title}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {Math.round((currentStep / steps.length) * 100)}% Complete
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="px-8 py-6">
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {steps[currentStep - 1]?.title}
          </h3>
          <p className="text-gray-600">
            Step {currentStep} of {steps.length} - Complete the information below
          </p>
        </div>

        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`px-4 py-2 rounded-lg ${
            currentStep === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Previous
        </button>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceedToNext()}
              className={`px-4 py-2 rounded-lg ${
                !canProceedToNext()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceedToNext() || isSubmitting}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                !canProceedToNext() || isSubmitting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationForm;