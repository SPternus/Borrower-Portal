import React, { useState, useEffect } from 'react';
import { ChevronRightIcon, CalculatorIcon, SaveAsIcon, RefreshIcon } from '@heroicons/react/24/outline';

interface PricingRequest {
  purchase_price: number;
  arv: number;
  rehab_costs: number;
  as_is_value: number;
  current_balance: number;
  loan_purpose: string;
  product_type: string;
  loan_to_cost_ratio: number;
  loan_to_arv_ratio: number;
  interest_rate: number;
  term_months: number;
  origination_fee_rate?: number;
  inspection_fee?: number;
  processing_fee?: number;
  appraisal_fee?: number;
  title_insurance?: number;
  attorney_fee?: number;
  interest_reserve_required?: boolean;
  interest_reserve_months?: number;
}

interface PricingResult {
  loan_amount: number;
  max_loan_amount: number;
  funds_to_borrower: number;
  daily_interest_rate: number;
  monthly_interest_payment: number;
  total_interest: number;
  origination_fee: number;
  inspection_fee: number;
  processing_fee: number;
  appraisal_fee: number;
  title_insurance: number;
  attorney_fee: number;
  interest_reserve: number;
  extension_fee: number;
  total_fees: number;
  total_closing_costs: number;
  total_amount_due_at_maturity: number;
  net_funding_amount: number;
  is_valid: boolean;
  warnings: string[];
  errors: string[];
  product_type: string;
  calculated_at: string;
}

interface PricingCalculatorProps {
  opportunityId?: string;
  invitationToken?: string;
  onSave?: (result: PricingResult) => void;
}

const PRODUCT_TYPES = [
  { value: 'FnF', label: 'Fix & Flip', description: 'Short-term rehab financing' },
  { value: 'WholeTail', label: 'Whole Tail', description: 'Quick sale financing' },
  { value: 'Bridge-Purchase', label: 'Bridge Purchase', description: 'Bridge acquisition financing' },
  { value: 'Bridge-Refi', label: 'Bridge Refinance', description: 'Bridge refinancing' }
];

const LOAN_PURPOSES = [
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Refinance', label: 'Refinance' }
];

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  opportunityId,
  invitationToken,
  onSave
}) => {
  const [formData, setFormData] = useState<PricingRequest>({
    purchase_price: 400000,
    arv: 650000,
    rehab_costs: 80000,
    as_is_value: 0,
    current_balance: 0,
    loan_purpose: 'Purchase',
    product_type: 'FnF',
    loan_to_cost_ratio: 0.80,
    loan_to_arv_ratio: 0.70,
    interest_rate: 0.12,
    term_months: 12,
    origination_fee_rate: 0.02,
    inspection_fee: 750,
    processing_fee: 995,
    appraisal_fee: 650,
    title_insurance: 2500,
    attorney_fee: 1500,
    interest_reserve_required: true,
    interest_reserve_months: 6
  });

  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [scenarioName, setScenarioName] = useState('');

  useEffect(() => {
    // Load saved scenarios on mount
    loadSavedScenarios();
  }, []);

  const handleInputChange = (field: keyof PricingRequest, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculatePricing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Pricing calculation failed: ${response.status}`);
      }

      const pricingResult: PricingResult = await response.json();
      setResult(pricingResult);
      
      if (onSave && pricingResult.is_valid) {
        onSave(pricingResult);
      }
    } catch (error) {
      console.error('❌ Pricing calculation error:', error);
      alert('Failed to calculate pricing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveScenario = async () => {
    if (!result || !scenarioName.trim()) {
      alert('Please calculate pricing and enter a scenario name first.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/pricing/save-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario_name: scenarioName,
          pricing_request: formData,
          opportunity_id: opportunityId,
          contact_id: 'current_contact' // This would come from context
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save scenario: ${response.status}`);
      }

      const saveResult = await response.json();
      alert(`Scenario "${scenarioName}" saved successfully!`);
      setScenarioName('');
      loadSavedScenarios();
    } catch (error) {
      console.error('❌ Error saving scenario:', error);
      alert('Failed to save scenario. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const loadSavedScenarios = async () => {
    try {
      const params = new URLSearchParams();
      if (opportunityId) params.append('opportunity_id', opportunityId);
      
      const response = await fetch(`/api/pricing/scenarios?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSavedScenarios(data.scenarios || []);
      }
    } catch (error) {
      console.error('❌ Error loading scenarios:', error);
    }
  };

  const loadScenario = (scenario: any) => {
    const inputs = scenario.inputs;
    setFormData({
      purchase_price: inputs.purchase_price,
      arv: inputs.arv,
      rehab_costs: inputs.rehab_costs,
      as_is_value: inputs.as_is_value,
      current_balance: inputs.current_balance,
      loan_purpose: inputs.loan_purpose,
      product_type: inputs.product_type,
      loan_to_cost_ratio: inputs.loan_to_cost_ratio,
      loan_to_arv_ratio: inputs.loan_to_arv_ratio,
      interest_rate: inputs.interest_rate,
      term_months: inputs.term_months,
      origination_fee_rate: inputs.origination_fee_rate,
      inspection_fee: inputs.inspection_fee,
      processing_fee: inputs.processing_fee,
      appraisal_fee: inputs.appraisal_fee,
      title_insurance: inputs.title_insurance,
      attorney_fee: inputs.attorney_fee,
      interest_reserve_required: inputs.interest_reserve_required,
      interest_reserve_months: inputs.interest_reserve_months
    });
    
    // Parse the result and set it
    const savedResult = scenario.results;
    setResult(savedResult);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center">
            <CalculatorIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Loan Pricing Calculator
            </h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Calculate precise loan terms using our Excel-based pricing engine
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      value={formData.purchase_price}
                      onChange={(e) => handleInputChange('purchase_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      After Repair Value (ARV)
                    </label>
                    <input
                      type="number"
                      value={formData.arv}
                      onChange={(e) => handleInputChange('arv', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rehab Costs
                    </label>
                    <input
                      type="number"
                      value={formData.rehab_costs}
                      onChange={(e) => handleInputChange('rehab_costs', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      As-Is Value
                    </label>
                    <input
                      type="number"
                      value={formData.as_is_value}
                      onChange={(e) => handleInputChange('as_is_value', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Parameters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type
                    </label>
                    <select
                      value={formData.product_type}
                      onChange={(e) => handleInputChange('product_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PRODUCT_TYPES.map(product => (
                        <option key={product.value} value={product.value}>
                          {product.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loan Purpose
                    </label>
                    <select
                      value={formData.loan_purpose}
                      onChange={(e) => handleInputChange('loan_purpose', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {LOAN_PURPOSES.map(purpose => (
                        <option key={purpose.value} value={purpose.value}>
                          {purpose.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LTC Ratio
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.loan_to_cost_ratio}
                      onChange={(e) => handleInputChange('loan_to_cost_ratio', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LTV Ratio
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.loan_to_arv_ratio}
                      onChange={(e) => handleInputChange('loan_to_arv_ratio', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interest Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.interest_rate}
                      onChange={(e) => handleInputChange('interest_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Term (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.term_months}
                      onChange={(e) => handleInputChange('term_months', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={calculatePricing}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <RefreshIcon className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <CalculatorIcon className="h-5 w-5 mr-2" />
                  )}
                  Calculate Pricing
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
              {result && (
                <>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing Results</h3>
                    
                    {result.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                        <h4 className="text-red-800 font-medium">Errors:</h4>
                        <ul className="text-red-700 text-sm mt-1">
                          {result.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {result.warnings.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                        <h4 className="text-yellow-800 font-medium">Warnings:</h4>
                        <ul className="text-yellow-700 text-sm mt-1">
                          {result.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Loan Amount</span>
                          <div className="text-xl font-semibold text-green-600">
                            {formatCurrency(result.loan_amount)}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-600">Monthly Interest</span>
                          <div className="text-xl font-semibold text-blue-600">
                            {formatCurrency(result.monthly_interest_payment)}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-600">Total Fees</span>
                          <div className="text-lg font-medium text-gray-900">
                            {formatCurrency(result.total_fees)}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-600">Net Funding</span>
                          <div className="text-lg font-medium text-gray-900">
                            {formatCurrency(result.net_funding_amount)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Origination Fee:</span>
                            <span className="float-right">{formatCurrency(result.origination_fee)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Interest Reserve:</span>
                            <span className="float-right">{formatCurrency(result.interest_reserve)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Processing Fee:</span>
                            <span className="float-right">{formatCurrency(result.processing_fee)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Appraisal Fee:</span>
                            <span className="float-right">{formatCurrency(result.appraisal_fee)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <div className="flex justify-between font-semibold">
                          <span>Total Due at Maturity:</span>
                          <span className="text-lg text-red-600">
                            {formatCurrency(result.total_amount_due_at_maturity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Scenario */}
                  <div className="border-t pt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Save This Scenario</h4>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        placeholder="Scenario name..."
                        value={scenarioName}
                        onChange={(e) => setScenarioName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={saveScenario}
                        disabled={saving || !scenarioName.trim()}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <SaveAsIcon className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Saved Scenarios */}
              {savedScenarios.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Saved Scenarios</h4>
                  <div className="space-y-2">
                    {savedScenarios.slice(0, 5).map((scenario) => (
                      <div
                        key={scenario.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
                        onClick={() => loadScenario(scenario)}
                      >
                        <div>
                          <div className="font-medium text-sm">{scenario.scenario_name}</div>
                          <div className="text-xs text-gray-600">
                            {scenario.product_type} • {new Date(scenario.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 