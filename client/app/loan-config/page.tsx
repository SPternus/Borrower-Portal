'use client';

import React, { useState } from 'react';
import LoanTypeConfig from '../../src/components/Dashboard/LoanTypeConfig';

export default function LoanConfigPage() {
  const [selectedLoanType, setSelectedLoanType] = useState('fix-flip');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Loan Type Configuration</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive document requirements and task workflows for different loan types
          </p>
        </div>

        {/* Loan Type Configuration Component */}
        <LoanTypeConfig 
          loanType={selectedLoanType}
          onLoanTypeChange={setSelectedLoanType}
        />

        {/* Additional Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📋 About Loan Type Configurations
          </h3>
          <p className="text-blue-800 mb-4">
            This system provides detailed breakdowns of document requirements and task workflows 
            for each loan type we offer. Use this information to understand what's needed for 
            your specific loan application and track progress through the approval process.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">Document Categories:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Income verification documents</li>
                <li>Asset and financial statements</li>
                <li>Property documentation</li>
                <li>Identity verification</li>
                <li>Business documentation (if applicable)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Task Categories:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Application submission</li>
                <li>Document collection</li>
                <li>Property evaluation</li>
                <li>Underwriting review</li>
                <li>Approval and closing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 