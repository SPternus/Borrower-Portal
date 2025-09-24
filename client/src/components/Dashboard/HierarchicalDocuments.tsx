'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderIcon, 
  FolderOpenIcon, 
  DocumentIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

// Document sub-folder structure
interface DocumentSubFolder {
  id: string;
  name: string;
  icon: string;
  documents: DocumentRequirement[];
  uploadedCount: number;
  totalCount: number;
  completionPercentage: number;
}

interface DocumentRequirement {
  id: string;
  name: string;
  required: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'missing' | 'uploaded' | 'approved' | 'rejected';
  uploadedFiles: UploadedFile[];
}

interface UploadedFile {
  id: string;
  name: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  fileSize: number;
  fileType: string;
}

interface DocumentCategory {
  id: string;
  name: string;
  icon: string;
  subFolders: DocumentSubFolder[];
  totalFiles: number;
  approvedFiles: number;
  pendingFiles: number;
  completionPercentage: number;
}

interface HierarchicalDocumentsProps {
  opportunityId: string;
  loanType?: string;
}

const HierarchicalDocuments: React.FC<HierarchicalDocumentsProps> = ({ 
  opportunityId, 
  loanType = 'fix-and-flip' 
}) => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['income-verification']);
  const [expandedSubFolders, setExpandedSubFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data structure - replace with API call
  useEffect(() => {
    const mockCategories: DocumentCategory[] = [
      {
        id: 'all-documents',
        name: 'All Documents',
        icon: '📁',
        subFolders: [],
        totalFiles: 21,
        approvedFiles: 2,
        pendingFiles: 19,
        completionPercentage: 10
      },
      {
        id: 'income-verification',
        name: 'Income Verification',
        icon: '💰',
        totalFiles: 11,
        approvedFiles: 1,
        pendingFiles: 10,
        completionPercentage: 9,
        subFolders: [
          {
            id: 'pay-stubs',
            name: 'Pay Stubs',
            icon: '💵',
            uploadedCount: 2,
            totalCount: 3,
            completionPercentage: 67,
            documents: [
              {
                id: 'recent-pay-stub-1',
                name: 'Most Recent Pay Stub',
                required: true,
                priority: 'high',
                status: 'approved',
                uploadedFiles: [{
                  id: 'file1',
                  name: 'PayStub_March_2024.pdf',
                  uploadDate: '2024-03-15',
                  status: 'approved',
                  fileSize: 245000,
                  fileType: 'pdf'
                }]
              },
              {
                id: 'recent-pay-stub-2',
                name: 'Second Most Recent Pay Stub',
                required: true,
                priority: 'high',
                status: 'uploaded',
                uploadedFiles: [{
                  id: 'file2',
                  name: 'PayStub_February_2024.pdf',
                  uploadDate: '2024-03-14',
                  status: 'pending',
                  fileSize: 238000,
                  fileType: 'pdf'
                }]
              },
              {
                id: 'ytd-earnings',
                name: 'Year-to-Date Earnings Statement',
                required: false,
                priority: 'medium',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          },
          {
            id: 'bank-statements',
            name: 'Bank Statements',
            icon: '🏦',
            uploadedCount: 1,
            totalCount: 4,
            completionPercentage: 25,
            documents: [
              {
                id: 'bank-stmt-1',
                name: 'Primary Account - Last 3 Months',
                required: true,
                priority: 'high',
                status: 'uploaded',
                uploadedFiles: [{
                  id: 'file3',
                  name: 'BankStatement_Q1_2024.pdf',
                  uploadDate: '2024-03-10',
                  status: 'pending',
                  fileSize: 1200000,
                  fileType: 'pdf'
                }]
              },
              {
                id: 'bank-stmt-2',
                name: 'Business Account - Last 3 Months',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              },
              {
                id: 'bank-stmt-3',
                name: 'Savings Account Statement',
                required: false,
                priority: 'medium',
                status: 'missing',
                uploadedFiles: []
              },
              {
                id: 'bank-stmt-4',
                name: 'Investment Account Statement',
                required: false,
                priority: 'low',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          },
          {
            id: 'tax-returns',
            name: 'Tax Returns',
            icon: '📋',
            uploadedCount: 0,
            totalCount: 2,
            completionPercentage: 0,
            documents: [
              {
                id: 'tax-2023',
                name: '2023 Tax Return (Complete)',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              },
              {
                id: 'tax-2022',
                name: '2022 Tax Return (Complete)',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          },
          {
            id: 'employment-verification',
            name: 'Employment Verification',
            icon: '👔',
            uploadedCount: 0,
            totalCount: 2,
            completionPercentage: 0,
            documents: [
              {
                id: 'employment-letter',
                name: 'Employment Verification Letter',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              },
              {
                id: 'salary-verification',
                name: 'Salary Verification Form',
                required: false,
                priority: 'medium',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          }
        ]
      },
      {
        id: 'asset-documentation',
        name: 'Asset Documentation',
        icon: '💎',
        totalFiles: 6,
        approvedFiles: 1,
        pendingFiles: 5,
        completionPercentage: 17,
        subFolders: [
          {
            id: 'down-payment-funds',
            name: 'Down Payment Funds',
            icon: '💰',
            uploadedCount: 1,
            totalCount: 2,
            completionPercentage: 50,
            documents: [
              {
                id: 'proof-of-funds',
                name: 'Proof of Down Payment Funds',
                required: true,
                priority: 'high',
                status: 'approved',
                uploadedFiles: [{
                  id: 'file4',
                  name: 'ProofOfFunds_March2024.pdf',
                  uploadDate: '2024-03-12',
                  status: 'approved',
                  fileSize: 890000,
                  fileType: 'pdf'
                }]
              },
              {
                id: 'source-of-funds',
                name: 'Source of Funds Documentation',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          },
          {
            id: 'construction-budget',
            name: 'Construction Budget',
            icon: '🔨',
            uploadedCount: 0,
            totalCount: 3,
            completionPercentage: 0,
            documents: [
              {
                id: 'detailed-budget',
                name: 'Detailed Construction Budget',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              },
              {
                id: 'contractor-estimates',
                name: 'Contractor Estimates',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              },
              {
                id: 'scope-of-work',
                name: 'Scope of Work Document',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          },
          {
            id: 'other-assets',
            name: 'Other Assets',
            icon: '📊',
            uploadedCount: 0,
            totalCount: 1,
            completionPercentage: 0,
            documents: [
              {
                id: 'asset-verification',
                name: 'Additional Asset Verification',
                required: false,
                priority: 'medium',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          }
        ]
      },
      {
        id: 'property-information',
        name: 'Property Information',
        icon: '🏠',
        totalFiles: 0,
        approvedFiles: 0,
        pendingFiles: 0,
        completionPercentage: 0,
        subFolders: [
          {
            id: 'purchase-contract',
            name: 'Purchase Contract',
            icon: '📄',
            uploadedCount: 0,
            totalCount: 1,
            completionPercentage: 0,
            documents: [
              {
                id: 'purchase-agreement',
                name: 'Signed Purchase Agreement',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          },
          {
            id: 'appraisals',
            name: 'Appraisals',
            icon: '📈',
            uploadedCount: 0,
            totalCount: 2,
            completionPercentage: 0,
            documents: [
              {
                id: 'as-is-appraisal',
                name: 'As-Is Property Appraisal',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              },
              {
                id: 'arv-appraisal',
                name: 'After Repair Value (ARV) Appraisal',
                required: true,
                priority: 'high',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          },
          {
            id: 'insurance-taxes',
            name: 'Insurance & Taxes',
            icon: '🛡️',
            uploadedCount: 0,
            totalCount: 2,
            completionPercentage: 0,
            documents: [
              {
                id: 'property-insurance',
                name: 'Property Insurance Quote',
                required: true,
                priority: 'medium',
                status: 'missing',
                uploadedFiles: []
              },
              {
                id: 'property-taxes',
                name: 'Property Tax Assessment',
                required: false,
                priority: 'low',
                status: 'missing',
                uploadedFiles: []
              }
            ]
          }
        ]
      }
    ];

    setCategories(mockCategories);
    setLoading(false);
  }, [opportunityId, loanType]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSubFolder = (subFolderId: string) => {
    setExpandedSubFolders(prev => 
      prev.includes(subFolderId) 
        ? prev.filter(id => id !== subFolderId)
        : [...prev, subFolderId]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIconSolid className="w-5 h-5 text-green-500" />;
      case 'uploaded':
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
      uploaded: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
      missing: { label: 'Required', color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.missing;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Categories</h2>
        <p className="text-gray-600">Organize and upload your loan documents by category</p>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((category, index) => {
          const isExpanded = expandedCategories.includes(category.id);
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Category Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <FolderOpenIcon className="w-6 h-6 text-blue-600" />
                      ) : (
                        <FolderIcon className="w-6 h-6 text-gray-500" />
                      )}
                      <span className="text-lg font-semibold text-gray-900">
                        {category.name}
                      </span>
                    </div>
                    
                    {category.id !== 'all-documents' && (
                      <div className="text-sm text-gray-500">
                        {category.subFolders?.length || 0} folders • {category.totalFiles} files
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Status Summary */}
                    {category.id !== 'all-documents' && (
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-gray-900">{category.approvedFiles}</span>
                          <span className="text-sm text-gray-500">Approved</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-900">{category.pendingFiles}</span>
                          <span className="text-sm text-gray-500">Pending</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DocumentIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{category.totalFiles}</span>
                          <span className="text-sm text-gray-500">Total</span>
                        </div>
                      </div>
                    )}

                    {/* All Documents Summary */}
                    {category.id === 'all-documents' && (
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          <span className="text-lg font-bold text-gray-900">{category.approvedFiles}</span>
                          <span className="text-sm text-gray-500">Approved</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-4 h-4 text-yellow-500" />
                          <span className="text-lg font-bold text-gray-900">{category.pendingFiles}</span>
                          <span className="text-sm text-gray-500">Pending</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DocumentIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-lg font-bold text-gray-900">{category.totalFiles}</span>
                          <span className="text-sm text-gray-500">Total</span>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {category.id !== 'all-documents' && (
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${category.completionPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {category.completionPercentage}% Complete
                        </span>
                      </div>
                    )}

                    <ChevronRightIcon 
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>
                </div>
              </div>

              {/* Sub-folders */}
              <AnimatePresence>
                {isExpanded && category.subFolders && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-200 bg-gray-50"
                  >
                    <div className="p-4 space-y-3">
                      {category.subFolders.map((subFolder) => {
                        const isSubExpanded = expandedSubFolders.includes(subFolder.id);
                        
                        return (
                          <div key={subFolder.id} className="bg-white rounded-lg border border-gray-200">
                            {/* Sub-folder Header */}
                            <div
                              className="p-3 cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => toggleSubFolder(subFolder.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">{subFolder.icon}</span>
                                  <span className="font-medium text-gray-900">{subFolder.name}</span>
                                  <span className="text-sm text-gray-500">
                                    {subFolder.uploadedCount} of {subFolder.totalCount} files
                                  </span>
                                </div>

                                <div className="flex items-center space-x-3">
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${subFolder.completionPercentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {subFolder.completionPercentage}%
                                  </span>
                                  <ChevronRightIcon 
                                    className={`w-4 h-4 text-gray-400 transition-transform ${
                                      isSubExpanded ? 'rotate-90' : ''
                                    }`} 
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Documents in Sub-folder */}
                            <AnimatePresence>
                              {isSubExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="border-t border-gray-100 bg-gray-50"
                                >
                                  <div className="p-3 space-y-2">
                                    {subFolder.documents.map((doc) => (
                                      <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                        <div className="flex items-center space-x-3">
                                          {getStatusIcon(doc.status)}
                                          <div>
                                            <div className="font-medium text-sm text-gray-900">{doc.name}</div>
                                            {doc.uploadedFiles.length > 0 && (
                                              <div className="text-xs text-gray-500">
                                                {doc.uploadedFiles[0].name} • {Math.round(doc.uploadedFiles[0].fileSize / 1024)}KB
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                          {getStatusBadge(doc.status)}
                                          {doc.required && (
                                            <span className="text-xs text-red-600 font-medium">Required</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default HierarchicalDocuments;

