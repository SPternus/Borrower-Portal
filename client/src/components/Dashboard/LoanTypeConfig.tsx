import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText, CheckCircle, Clock, AlertTriangle, DollarSign, Calendar, Users } from 'lucide-react';

interface DocumentRequirement {
  required: boolean;
  priority: 'high' | 'medium' | 'low';
  documents: string[];
  category_display_name: string;
}

interface TaskWorkflow {
  id: string;
  order: number;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  estimated_days: number;
  dependencies: string[];
  required_documents: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

interface LoanTypeConfig {
  success: boolean;
  loan_type: string;
  loan_type_display_name: string;
  document_requirements: Record<string, DocumentRequirement>;
  task_workflow: TaskWorkflow[];
  summary: {
    total_document_categories: number;
    total_required_documents: number;
    high_priority_categories: number;
    total_tasks: number;
    estimated_total_days: number;
  };
}

interface LoanTypeConfigProps {
  loanType?: string;
  onLoanTypeChange?: (loanType: string) => void;
}

const LoanTypeConfig: React.FC<LoanTypeConfigProps> = ({ loanType = 'fix-flip', onLoanTypeChange }) => {
  const [config, setConfig] = useState<LoanTypeConfig | null>(null);
  const [availableLoanTypes, setAvailableLoanTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'tasks' | 'summary'>('summary');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAvailableLoanTypes();
  }, []);

  useEffect(() => {
    if (loanType) {
      fetchLoanTypeConfig(loanType);
    }
  }, [loanType]);

  const fetchAvailableLoanTypes = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/config/loan-types');
      const data = await response.json();
      if (data.success) {
        setAvailableLoanTypes(data.loan_types);
      }
    } catch (err) {
      console.error('Error fetching loan types:', err);
    }
  };

  const fetchLoanTypeConfig = async (selectedLoanType: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/config/loan-types/${selectedLoanType}/complete`);
      const data = await response.json();
      if (data.success) {
        setConfig(data);
      } else {
        setError('Failed to load loan type configuration');
      }
    } catch (err) {
      setError('Error loading configuration');
      console.error('Error fetching loan type config:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'income': return <DollarSign className="w-5 h-5" />;
      case 'assets': return <FileText className="w-5 h-5" />;
      case 'property': return <FileText className="w-5 h-5" />;
      case 'identity': return <Users className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getTaskCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'application': return <FileText className="w-4 h-4" />;
      case 'documentation': return <FileText className="w-4 h-4" />;
      case 'underwriting': return <AlertTriangle className="w-4 h-4" />;
      case 'property_evaluation': return <FileText className="w-4 h-4" />;
      case 'approval': return <CheckCircle className="w-4 h-4" />;
      case 'closing': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading loan type configuration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {config.loan_type_display_name} Configuration
            </h2>
            <p className="text-gray-600 mt-1">
              Document requirements and task workflow for {config.loan_type_display_name} loans
            </p>
          </div>
          
          {onLoanTypeChange && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Loan Type:</label>
              <select
                value={loanType}
                onChange={(e) => onLoanTypeChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableLoanTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{config.summary.total_document_categories}</div>
            <div className="text-sm text-blue-800">Document Categories</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{config.summary.total_required_documents}</div>
            <div className="text-sm text-green-800">Required Documents</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{config.summary.high_priority_categories}</div>
            <div className="text-sm text-red-800">High Priority Categories</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{config.summary.total_tasks}</div>
            <div className="text-sm text-purple-800">Total Tasks</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{config.summary.estimated_total_days}</div>
            <div className="text-sm text-orange-800">Estimated Days</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'summary', name: 'Summary', icon: FileText },
            { id: 'documents', name: 'Documents', icon: FileText },
            { id: 'tasks', name: 'Tasks', icon: CheckCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Process Overview</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  This {config.loan_type_display_name} loan requires <strong>{config.summary.total_required_documents}</strong> documents 
                  across <strong>{config.summary.total_document_categories}</strong> categories, with <strong>{config.summary.high_priority_categories}</strong> high-priority 
                  categories. The process involves <strong>{config.summary.total_tasks}</strong> tasks and is estimated to take 
                  approximately <strong>{config.summary.estimated_total_days}</strong> days to complete.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Document Requirements</h3>
            {Object.entries(config.document_requirements).map(([category, details]) => (
              <div key={category} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    {getCategoryIcon(category)}
                    <div>
                      <div className="font-medium text-gray-900">{details.category_display_name}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(details.priority)}`}>
                          {details.priority.toUpperCase()}
                        </span>
                        {details.required && (
                          <span className="text-xs text-red-600 font-medium">REQUIRED</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {details.documents.length} documents
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                    <ul className="space-y-2">
                      {details.documents.map((doc, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Workflow</h3>
            {config.task_workflow.map((task, index) => (
              <div key={task.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{task.order}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{task.title}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{task.estimated_days} days</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          {getTaskCategoryIcon(task.category)}
                          <span>{task.category.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {expandedTasks.has(task.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedTasks.has(task.id) && (
                  <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                    <p className="text-sm text-gray-700 mb-3">{task.description}</p>
                    
                    {task.dependencies.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-medium text-gray-900 mb-1">Dependencies:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {task.dependencies.map((dep, depIndex) => (
                            <li key={depIndex}>• {dep}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {task.required_documents.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-900 mb-1">Required Documents:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {task.required_documents.map((doc, docIndex) => (
                            <li key={docIndex} className="flex items-center space-x-1">
                              <FileText className="w-3 h-3" />
                              <span>{doc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanTypeConfig; 