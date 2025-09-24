'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Plus
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'approved' | 'pending' | 'rejected' | 'requires_attention';
  url?: string;
  notes?: string;
}

interface DocumentCategoryProps {
  categoryId: string;
  categoryName: string;
}

const DocumentCategory: React.FC<DocumentCategoryProps> = ({ categoryId, categoryName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>(() => {
    // Mock data based on category - in real app this would come from API
    const mockDocuments: Record<string, Document[]> = {
      income: [
        {
          id: '1',
          name: 'W-2 Tax Form 2023.pdf',
          type: 'application/pdf',
          size: '1.2 MB',
          uploadDate: '2024-06-03',
          status: 'approved',
          url: '#'
        },
        {
          id: '2',
          name: 'Pay Stub March 2024.pdf',
          type: 'application/pdf',
          size: '856 KB',
          uploadDate: '2024-06-02',
          status: 'pending',
          notes: 'Under review by underwriter'
        },
        {
          id: '3',
          name: 'Tax Return 2023.pdf',
          type: 'application/pdf',
          size: '2.1 MB',
          uploadDate: '2024-06-01',
          status: 'approved'
        }
      ],
      assets: [
        {
          id: '4',
          name: 'Bank Statement March 2024.pdf',
          type: 'application/pdf',
          size: '1.5 MB',
          uploadDate: '2024-06-02',
          status: 'approved'
        },
        {
          id: '5',
          name: 'Investment Account Statement.pdf',
          type: 'application/pdf',
          size: '980 KB',
          uploadDate: '2024-05-30',
          status: 'requires_attention',
          notes: 'Please provide more recent statement'
        }
      ],
      property: [
        {
          id: '6',
          name: 'Purchase Agreement.pdf',
          type: 'application/pdf',
          size: '3.2 MB',
          uploadDate: '2024-05-28',
          status: 'approved'
        }
      ],
      identity: [
        {
          id: '7',
          name: 'Drivers License.pdf',
          type: 'application/pdf',
          size: '650 KB',
          uploadDate: '2024-06-01',
          status: 'approved'
        },
        {
          id: '8',
          name: 'Social Security Card.pdf',
          type: 'application/pdf',
          size: '420 KB',
          uploadDate: '2024-06-01',
          status: 'approved'
        }
      ],
      employment: [
        {
          id: '9',
          name: 'Employment Letter.pdf',
          type: 'application/pdf',
          size: '780 KB',
          uploadDate: '2024-05-29',
          status: 'pending'
        }
      ],
      other: [
        {
          id: '10',
          name: 'Additional Documentation.pdf',
          type: 'application/pdf',
          size: '1.1 MB',
          uploadDate: '2024-05-25',
          status: 'approved'
        },
        {
          id: '11',
          name: 'Correspondence.pdf',
          type: 'application/pdf',
          size: '540 KB',
          uploadDate: '2024-05-20',
          status: 'approved'
        }
      ]
    };
    return mockDocuments[categoryId] || [];
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'requires_attention':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-700 bg-green-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'rejected':
        return 'text-red-700 bg-red-100';
      case 'requires_attention':
        return 'text-orange-700 bg-orange-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    
    // Simulate upload process
    for (const file of files) {
      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size),
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'pending'
      };

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDocuments(prev => [...prev, newDocument]);
    }
    
    setIsUploading(false);
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const requiredDocuments = {
    income: [
      'Most recent 2 pay stubs',
      'W-2 forms for the last 2 years',
      'Tax returns for the last 2 years',
      '1099 forms (if applicable)'
    ],
    assets: [
      'Bank statements for the last 2 months',
      'Investment account statements',
      'Retirement account statements',
      'Gift letter (if applicable)'
    ],
    property: [
      'Purchase agreement',
      'Property appraisal',
      'Property insurance quote',
      'Inspection report'
    ],
    identity: [
      'Valid driver\'s license or passport',
      'Social Security card'
    ],
    employment: [
      'Employment verification letter',
      'Business license (if self-employed)',
      'Employment contract'
    ],
    credit: [
      'Credit report',
      'Letters of explanation for credit issues'
    ],
    business: [
      'Business tax returns (2 years)',
      'Profit & Loss statements',
      'Business bank statements'
    ],
    other: [
      'Additional documentation as requested',
      'Correspondence with lender'
    ]
  };

  const categoryRequirements = requiredDocuments[categoryId as keyof typeof requiredDocuments] || [];

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload New Documents</h3>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="text-4xl mb-4">
            {isUploading ? '⏳' : '📁'}
          </div>
          
          {isUploading ? (
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">Uploading...</p>
              <div className="w-32 h-2 bg-gray-200 rounded-full mx-auto">
                <div className="h-2 bg-primary-600 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop files here or click to upload
              </p>
              <p className="text-gray-500">
                Supports: PDF, JPG, PNG, DOC up to 10MB each
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Required Documents Checklist */}
      {categoryRequirements.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            📋 Required Documents for {categoryName}
          </h3>
          <ul className="space-y-2">
            {categoryRequirements.map((requirement, index) => {
              const isProvided = documents.some(doc => 
                doc.name.toLowerCase().includes(requirement.toLowerCase().split(' ')[0])
              );
              return (
                <li key={index} className="flex items-center">
                  <div className={`w-4 h-4 rounded mr-3 flex items-center justify-center ${
                    isProvided ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {isProvided && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={isProvided ? 'text-green-700 line-through' : 'text-blue-700'}>
                    {requirement}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Uploaded Documents ({documents.length})
          </h3>
          
          {documents.length > 0 && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600">
                  {documents.filter(d => d.status === 'approved').length} Approved
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-yellow-600">
                  {documents.filter(d => d.status === 'pending').length} Pending
                </span>
              </div>
            </div>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No documents uploaded yet</p>
            <p className="text-gray-400">Start by uploading your required documents above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(document.status)}
                    <div>
                      <p className="font-medium text-gray-900">{document.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{document.size}</span>
                        <span>•</span>
                        <span>Uploaded: {document.uploadDate}</span>
                        {document.notes && (
                          <>
                            <span>•</span>
                            <span className="text-orange-600">{document.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(document.status)}`}>
                      {document.status.replace('_', ' ')}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                        <Download className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDocument(document.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
            <div className="text-sm text-gray-500">Total Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-500">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {documents.filter(d => d.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {documents.filter(d => d.status === 'requires_attention').length}
            </div>
            <div className="text-sm text-gray-500">Needs Attention</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCategory; 