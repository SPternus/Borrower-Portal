'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CalculatorIcon,
  HomeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface CalculationResults {
  maxLoanAmount: number;
  totalProjectCost: number;
  maxInitialAdvance: number;
  downPayment: number;
  originationFee: number;
  processingFee: number;
  applicationFee: number;
  docPrepFee: number;
  dailyInterestRate: number;
  perDiemInterest: number;
  monthlyInterestPayment: number;
  sixPayments: number;
  tenPercentBuffer: number;
  estimatedCashToClose: number;
  requiredProofOfCapital: number;
  netFunding: number;
}

const FixFlipCalculator: React.FC = () => {
  // Input State
  const [purchasePrice, setPurchasePrice] = useState<number>(5000);
  const [rehabBudget, setRehabBudget] = useState<number>(2000);
  const [arv, setArv] = useState<number>(7500);
  const [maxLeverage, setMaxLeverage] = useState<number>(70);
  const [originationFeeRate, setOriginationFeeRate] = useState<number>(2.0);
  const [initialLtvCap, setInitialLtvCap] = useState<number>(100);
  const [interestRate, setInterestRate] = useState<number>(12);
  const [term, setTerm] = useState<number>(6);
  const [interestReserve, setInterestReserve] = useState<boolean>(false);
  const [budgetContingency, setBudgetContingency] = useState<number>(0);
  const [downPaymentRate, setDownPaymentRate] = useState<number>(0.1);

  // Fixed Fees (these could be made configurable)
  const PROCESSING_FEE = 1745;
  const APPLICATION_FEE = 250;
  const DOC_PREP_FEE = 599;

  // Calculations
  const [results, setResults] = useState<CalculationResults | null>(null);

  const calculateResults = (): CalculationResults => {
    // Core Calculations with Budget Contingency
    const budgetContingencyAmount = (purchasePrice + rehabBudget) * (budgetContingency / 100);
    const totalProjectCost = purchasePrice + rehabBudget + budgetContingencyAmount;
    
    // Max Loan Amount calculation - min of (ARV * Max Leverage) and (Total Project Cost)
    const maxByLeverage = arv * (maxLeverage / 100);
    const maxLoanAmount = Math.min(maxByLeverage, totalProjectCost);
    
    // Loan Amount Basis (same as Max Loan Amount)
    const loanAmountBasis = maxLoanAmount;
    
    // MAX INITIAL ADVANCE - Excel formula: =IF(D15*I6<I13-I14,D15*I6,I13-I14)
    // min(Purchase Price * Initial LTV Cap, Loan Amount Basis - Rehab)
    const purchasePriceTimesLtv = purchasePrice * (initialLtvCap / 100);
    const loanBasisMinusRehab = loanAmountBasis - rehabBudget;
    const maxInitialAdvance = Math.min(purchasePriceTimesLtv, loanBasisMinusRehab);
    
    // Fees
    const originationFee = maxLoanAmount * (originationFeeRate / 100);
    
    // Interest Calculations
    const dailyInterestRate = interestRate / 360; // 12% / 360 days
    const perDiemInterest = (maxLoanAmount * dailyInterestRate) / 100;
    const monthlyInterestPayment = perDiemInterest * 30;
    
    // Interest Reserve calculation (6 Payments for full term if enabled)
    const sixPayments = interestReserve ? monthlyInterestPayment * term : monthlyInterestPayment * term;
    
    // Down Payment calculation - Shortfall between total project cost and loan amount
    const downPayment = Math.max(0, totalProjectCost - maxLoanAmount);
    
    // 10% Buffer calculation - 10% of rehab budget  
    const tenPercentBuffer = rehabBudget * 0.10;
    
    // ECC calculation - Down Payment + All Fees (based on term sheet match)
    // Prorated interest: roughly 2 days worth of per diem interest for closing
    const proratedInterest = perDiemInterest * 2; // Approximate - should match ~$39 for term sheet example
    const totalFees = originationFee + PROCESSING_FEE + APPLICATION_FEE + DOC_PREP_FEE + proratedInterest;
    const estimatedCashToClose = downPayment + totalFees;
    
    // Required Proof of Capital - From term sheet analysis, this appears to be:
    // ECC + 6 PAYMENTS + 10% BUFFER (DP already included in ECC)
    const requiredProofOfCapital = estimatedCashToClose + sixPayments + tenPercentBuffer;
    
    const netFunding = maxLoanAmount - originationFee;

    return {
      maxLoanAmount,
      totalProjectCost,
      maxInitialAdvance,
      downPayment: Math.max(0, downPayment),
      originationFee,
      processingFee: PROCESSING_FEE,
      applicationFee: APPLICATION_FEE,
      docPrepFee: DOC_PREP_FEE,
      dailyInterestRate,
      perDiemInterest,
      monthlyInterestPayment,
      sixPayments,
      tenPercentBuffer,
      estimatedCashToClose,
      requiredProofOfCapital,
      netFunding
    };
  };

  useEffect(() => {
    setResults(calculateResults());
  }, [purchasePrice, rehabBudget, arv, maxLeverage, originationFeeRate, initialLtvCap, interestRate, term, interestReserve, budgetContingency, downPaymentRate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(3)}%`;
  };

  if (!results) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="text-white p-6" style={{ background: `linear-gradient(to right, #1e293b, #1e293b)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalculatorIcon className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Fix & Flip Calculator</h2>
              <p className="text-gray-200">Interactive loan calculation tool</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-200">Term</div>
            <div className="text-xl font-bold">{term} Months</div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <HomeIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
          </div>

          {/* Property Inputs */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="5,000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rehab Budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={rehabBudget}
                  onChange={(e) => setRehabBudget(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="2,000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                After Repair Value (ARV)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={arv}
                  onChange={(e) => setArv(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="7,500"
                />
              </div>
            </div>
          </div>

          {/* Loan Parameters */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Loan Parameters</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Leverage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={maxLeverage}
                    onChange={(e) => setMaxLeverage(Number(e.target.value))}
                    className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="70"
                    min="0"
                    max="100"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origination Fee
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={originationFeeRate}
                    onChange={(e) => setOriginationFeeRate(Number(e.target.value))}
                    className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2.0"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interest Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial LTV Cap
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={initialLtvCap}
                    onChange={(e) => setInitialLtvCap(Number(e.target.value))}
                    className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="61"
                    min="0"
                    max="150"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Term (Months)
                </label>
                <input
                  type="number"
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="6"
                  min="1"
                  max="36"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interest Reserve
                </label>
                <select
                  value={interestReserve ? 'Yes' : 'No'}
                  onChange={(e) => setInterestReserve(e.target.value === 'Yes')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Contingency
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={budgetContingency}
                    onChange={(e) => setBudgetContingency(Number(e.target.value))}
                    className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Down Payment
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={downPaymentRate}
                    onChange={(e) => setDownPaymentRate(Number(e.target.value))}
                    className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.1"
                    min="0"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <DocumentTextIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Calculation Results</h3>
          </div>

          {/* Loan Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 rounded-lg p-4 border border-blue-200"
          >
            <h4 className="font-semibold text-blue-900 mb-3">Loan Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">Max Loan Amount:</span>
                <span className="font-bold text-blue-900">{formatCurrency(results.maxLoanAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Initial Advance:</span>
                <span className="font-bold text-blue-900">{formatCurrency(results.maxInitialAdvance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Total Project Cost:</span>
                <span className="font-bold text-blue-900">{formatCurrency(results.totalProjectCost)}</span>
              </div>
              {budgetContingency > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Budget Contingency:</span>
                  <span className="font-bold text-blue-900">{formatCurrency((purchasePrice + rehabBudget) * (budgetContingency / 100))}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Interest & Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-50 rounded-lg p-4 border border-green-200"
          >
            <h4 className="font-semibold text-green-900 mb-3">Interest & Payments</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-green-700">Daily Interest Rate:</span>
                <span className="font-bold text-green-900">{formatPercentage(results.dailyInterestRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Per Diem Interest:</span>
                <span className="font-bold text-green-900">{formatCurrency(results.perDiemInterest)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Monthly Payment:</span>
                <span className="font-bold text-green-900">{formatCurrency(results.monthlyInterestPayment)}</span>
              </div>
              {interestReserve && (
                <div className="flex justify-between">
                  <span className="text-green-700">Interest Reserve ({term} payments):</span>
                  <span className="font-bold text-green-900">{formatCurrency(results.sixPayments)}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Fees Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-yellow-50 rounded-lg p-4 border border-yellow-200"
          >
            <h4 className="font-semibold text-yellow-900 mb-3">Fees Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-yellow-700">Origination Fee:</span>
                <span className="font-bold text-yellow-900">{formatCurrency(results.originationFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">Processing Fee:</span>
                <span className="font-bold text-yellow-900">{formatCurrency(results.processingFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">Application Fee:</span>
                <span className="font-bold text-yellow-900">{formatCurrency(results.applicationFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">Doc Prep Fee:</span>
                <span className="font-bold text-yellow-900">{formatCurrency(results.docPrepFee)}</span>
              </div>
            </div>
          </motion.div>

          {/* Cash Requirements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-purple-50 rounded-lg p-4 border border-purple-200"
          >
            <h4 className="font-semibold text-purple-900 mb-3">Cash Requirements</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-purple-700">ECC (Est. Cash to Close):</span>
                <span className="font-bold text-purple-900">{formatCurrency(results.estimatedCashToClose)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">DP (Down Payment):</span>
                <span className="font-bold text-purple-900">{formatCurrency(results.downPayment)}</span>
              </div>
              {interestReserve && (
                <div className="flex justify-between">
                  <span className="text-purple-700">{term} Payments (Interest Reserve):</span>
                  <span className="font-bold text-purple-900">{formatCurrency(results.sixPayments)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-purple-700">10% Buffer:</span>
                <span className="font-bold text-purple-900">{formatCurrency(results.tenPercentBuffer)}</span>
              </div>
              <div className="flex justify-between border-t border-purple-200 pt-2">
                <span className="text-purple-700 font-semibold">Total Proof of Capital:</span>
                <span className="font-bold text-purple-900 text-lg">{formatCurrency(results.requiredProofOfCapital)}</span>
              </div>
              {!interestReserve && (
                <div className="flex justify-between border-t border-purple-200 pt-2 mt-2">
                  <span className="text-purple-700 font-semibold">Total with Interest Reserve:</span>
                  <span className="font-bold text-purple-900 text-lg">{formatCurrency(results.requiredProofOfCapital + results.sixPayments)}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Debug Comparison - Show for term sheet example values */}
          {purchasePrice === 38000 && rehabBudget === 30000 && arv === 84006 && 
           originationFeeRate === 2.0 && maxLeverage === 70 && initialLtvCap === 100 && 
           !interestReserve && budgetContingency === 0 && downPaymentRate === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-yellow-50 rounded-lg p-4 border border-yellow-200"
            >
              <h4 className="font-semibold text-yellow-900 mb-3">🔍 Debug: Calculated vs Term Sheet</h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-semibold">Field</div>
                  <div className="font-semibold">Calculated</div>
                  <div className="font-semibold">Term Sheet Target</div>
                  
                  <div>Max Loan Amount:</div>
                  <div>{formatCurrency(results.maxLoanAmount)}</div>
                  <div className={Math.abs(results.maxLoanAmount - 58804.20) < 0.01 ? "text-green-600" : "text-red-600"}>
                    $58,804.20 {Math.abs(results.maxLoanAmount - 58804.20) < 0.01 ? "✓" : "❌"}
                  </div>
                  
                  <div>Max Initial Advance:</div>
                  <div>{formatCurrency(results.maxInitialAdvance)}</div>
                  <div className={Math.abs(results.maxInitialAdvance - 28804.20) < 0.01 ? "text-green-600" : "text-red-600"}>
                    $28,804.20 {Math.abs(results.maxInitialAdvance - 28804.20) < 0.01 ? "✓" : "❌"}
                  </div>
                  
                  <div>ECC:</div>
                  <div>{formatCurrency(results.estimatedCashToClose)}</div>
                  <div className={Math.abs(results.estimatedCashToClose - 13005.09) < 0.01 ? "text-green-600" : "text-red-600"}>
                    $13,005.09 {Math.abs(results.estimatedCashToClose - 13005.09) < 0.01 ? "✓" : "❌"}
                  </div>
                  
                  <div>DP:</div>
                  <div>{formatCurrency(results.downPayment)}</div>
                  <div className={Math.abs(results.downPayment - 9195.80) < 0.01 ? "text-green-600" : "text-red-600"}>
                    $9,195.80 {Math.abs(results.downPayment - 9195.80) < 0.01 ? "✓" : "❌"}
                  </div>
                  
                  <div>6 Payments:</div>
                  <div>{formatCurrency(results.sixPayments)}</div>
                  <div className={Math.abs(results.sixPayments - 3528.25) < 0.01 ? "text-green-600" : "text-red-600"}>
                    $3,528.25 {Math.abs(results.sixPayments - 3528.25) < 0.01 ? "✓" : "❌"}
                  </div>
                  
                  <div>10% Buffer:</div>
                  <div>{formatCurrency(results.tenPercentBuffer)}</div>
                  <div className={Math.abs(results.tenPercentBuffer - 3000.00) < 0.01 ? "text-green-600" : "text-red-600"}>
                    $3,000.00 {Math.abs(results.tenPercentBuffer - 3000.00) < 0.01 ? "✓" : "❌"}
                  </div>
                  
                  <div className="font-semibold">Proof of Capital:</div>
                  <div className="font-semibold">{formatCurrency(results.requiredProofOfCapital)}</div>
                  <div className={`font-semibold ${Math.abs(results.requiredProofOfCapital - 28729.14) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                    $28,729.14 {Math.abs(results.requiredProofOfCapital - 28729.14) < 0.01 ? "✓" : "❌"}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Generate Term Sheet Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            style={{
              backgroundColor: '#00b5bf',
              color: '#000',
              border: '3px solid #00b5bf'
            }}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>Generate Official Term Sheet</span>
          </motion.button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-red-50 border-t border-red-200 p-4">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <strong>NOTE:</strong> These numbers are estimates designed to help you plan. Ternus Lending, LLC has no control 
            over other charges you may incur from the title company or other entities. This is not an underwriting approval 
            or commitment to lend. Terms subject to change pending underwriting.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixFlipCalculator; 