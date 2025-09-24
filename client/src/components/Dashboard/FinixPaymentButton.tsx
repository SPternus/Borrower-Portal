'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCardIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth0 } from '@auth0/auth0-react';

interface FinixPaymentButtonProps {
  opportunityId: string;
  amount: number;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

const FinixPaymentButton: React.FC<FinixPaymentButtonProps> = ({
  opportunityId,
  amount,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const { user } = useAuth0();

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'cardNumber') {
      value = formatCardNumber(value);
    } else if (field === 'expiryDate') {
      value = formatExpiryDate(value);
    } else if (field === 'cvv') {
      value = value.replace(/[^0-9]/g, '').substring(0, 4);
    }

    if (field.startsWith('billingAddress.')) {
      const addressField = field.split('.')[1];
      setPaymentData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [addressField]: value
        }
      }));
    } else {
      setPaymentData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validatePaymentForm = () => {
    const { cardNumber, expiryDate, cvv, nameOnCard, billingAddress } = paymentData;
    
    if (!cardNumber.replace(/\s/g, '') || cardNumber.replace(/\s/g, '').length < 13) {
      return 'Please enter a valid card number';
    }
    if (!expiryDate || expiryDate.length < 5) {
      return 'Please enter a valid expiry date';
    }
    if (!cvv || cvv.length < 3) {
      return 'Please enter a valid CVV';
    }
    if (!nameOnCard.trim()) {
      return 'Please enter the name on card';
    }
    if (!billingAddress.street || !billingAddress.city || !billingAddress.state || !billingAddress.zipCode) {
      return 'Please fill in all billing address fields';
    }
    
    return null;
  };

  const processPayment = async () => {
    const validationError = validatePaymentForm();
    if (validationError) {
      onPaymentError(validationError);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Prepare payment payload for Finix
      const paymentPayload = {
        opportunityId,
        amount: amount * 100, // Convert to cents for Finix
        currency: 'USD',
        card: {
          number: paymentData.cardNumber.replace(/\s/g, ''),
          exp_month: paymentData.expiryDate.split('/')[0],
          exp_year: '20' + paymentData.expiryDate.split('/')[1],
          security_code: paymentData.cvv,
          name: paymentData.nameOnCard
        },
        billing_address: {
          line1: paymentData.billingAddress.street,
          city: paymentData.billingAddress.city,
          region: paymentData.billingAddress.state,
          postal_code: paymentData.billingAddress.zipCode,
          country: 'US'
        },
        description: `Application fee for loan application ${opportunityId}`,
        metadata: {
          opportunity_id: opportunityId,
          user_email: user?.email || '',
          payment_type: 'application_fee'
        }
      };

      const response = await fetch('/api/finix/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onPaymentSuccess();
        setShowPaymentForm(false);
      } else {
        onPaymentError(result.error || 'Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      onPaymentError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!showPaymentForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6"
      >
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
            <CreditCardIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Complete Your Application
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              A $250 application fee is required to process your loan application. 
              This fee covers underwriting, credit analysis, and initial property evaluation.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="flex items-center space-x-2 mb-1">
                  <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Secure Payment</span>
                </div>
                <p className="text-xs text-gray-600">PCI DSS compliant processing</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="flex items-center space-x-2 mb-1">
                  <ClockIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Fast Processing</span>
                </div>
                <p className="text-xs text-gray-600">Instant payment confirmation</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="flex items-center space-x-2 mb-1">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">One-Time Fee</span>
                </div>
                <p className="text-xs text-gray-600">No recurring charges</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">${amount}</div>
                <div className="text-sm text-gray-600">Application Processing Fee</div>
              </div>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <CreditCardIcon className="w-5 h-5" />
                <span>Pay Application Fee</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Payment Information</h3>
        <button
          onClick={() => setShowPaymentForm(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Card Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number
            </label>
            <input
              type="text"
              value={paymentData.cardNumber}
              onChange={(e) => handleInputChange('cardNumber', e.target.value)}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name on Card
            </label>
            <input
              type="text"
              value={paymentData.nameOnCard}
              onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              value={paymentData.expiryDate}
              onChange={(e) => handleInputChange('expiryDate', e.target.value)}
              placeholder="MM/YY"
              maxLength={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <input
              type="text"
              value={paymentData.cvv}
              onChange={(e) => handleInputChange('cvv', e.target.value)}
              placeholder="123"
              maxLength={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Billing Address */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Address</h4>
          
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={paymentData.billingAddress.street}
                onChange={(e) => handleInputChange('billingAddress.street', e.target.value)}
                placeholder="Street Address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={paymentData.billingAddress.city}
                onChange={(e) => handleInputChange('billingAddress.city', e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                value={paymentData.billingAddress.state}
                onChange={(e) => handleInputChange('billingAddress.state', e.target.value)}
                placeholder="State"
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                value={paymentData.billingAddress.zipCode}
                onChange={(e) => handleInputChange('billingAddress.zipCode', e.target.value)}
                placeholder="ZIP Code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Secure Payment:</strong> Your payment information is encrypted and processed securely through Finix. 
              We never store your card details.
            </p>
          </div>
        </div>

        {/* Payment Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-lg font-bold text-gray-900">
            Total: ${amount}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPaymentForm(false)}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={processPayment}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCardIcon className="w-4 h-4" />
                  <span>Pay ${amount}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FinixPaymentButton; 