'use client';

import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  FolderOpen, 
  FileText, 
  Upload, 
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Info
} from 'lucide-react';
import LoadingSpinner from '../../src/components/ui/LoadingSpinner';
import Navigation from '../../src/components/ui/Navigation';
import Footer from '../../src/components/ui/Footer';
import DocumentCategory from '../../src/components/documents/DocumentCategory';

interface DocumentFolder {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
  required: boolean;
  priority: 'high' | 'medium' | 'low';
}

const DocumentsPage: React.FC = () => {
  const { user, isLoading } = useAuth0();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const documentFolders: DocumentFolder[] = [
    {
      id: 'income',
      name: 'Income Documents',
      description: 'Pay stubs, tax returns, W-2s, 1099s',
      icon: '💰',
      count: 3,
      required: true,
      priority: 'high'
    },
    {
      id: 'assets',
      name: 'Asset Documents',
      description: 'Bank statements, investment accounts, retirement accounts',
      icon: '🏦',
      count: 2,
      required: true,
      priority: 'high'
    },
    {
      id: 'property',
      name: 'Property Documents',
      description: 'Purchase agreement, appraisal, insurance, inspection reports',
      icon: '🏠',
      count: 1,
      required: true,
      priority: 'high'
    },
    {
      id: 'identity',
      name: 'Identity Documents',
      description: 'Driver\'s license, passport, social security card',
      icon: '🆔',
      count: 2,
      required: true,
      priority: 'medium'
    },
    {
      id: 'employment',
      name: 'Employment Documents',
      description: 'Employment letters, business licenses, contracts',
      icon: '💼',
      count: 1,
      required: true,
      priority: 'medium'
    },
    {
      id: 'credit',
      name: 'Credit Documents',
      description: 'Credit reports, letters of explanation, debt documents',
      icon: '📊',
      count: 0,
      required: false,
      priority: 'low'
    },
    {
      id: 'business',
      name: 'Business Documents',
      description: 'Business tax returns, profit & loss, business bank statements',
      icon: '🏢',
      count: 0,
      required: false,
      priority: 'medium'
    },
    {
      id: 'other',
      name: 'Other Documents',
      description: 'Additional supporting documents, correspondence',
      icon: '📁',
      count: 2,
      required: false,
      priority: 'low'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Info className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  if (selectedCategory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Document Categories
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {documentFolders.find(f => f.id === selectedCategory)?.name}
            </h1>
            <p className="text-gray-600 mt-2">
              {documentFolders.find(f => f.id === selectedCategory)?.description}
            </p>
          </div>

          <DocumentCategory 
            categoryId={selectedCategory}
            categoryName={documentFolders.find(f => f.id === selectedCategory)?.name || ''}
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Document Center</h1>
          <p className="text-gray-600 mt-2">
            Organize and upload your loan documents by category. Required documents are marked with high priority.
          </p>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {documentFolders.reduce((acc, folder) => acc + folder.count, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Documents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {documentFolders.filter(f => f.required && f.count > 0).length}
              </div>
              <div className="text-sm text-gray-500">Required Categories Complete</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {documentFolders.filter(f => f.required && f.count === 0).length}
              </div>
              <div className="text-sm text-gray-500">Categories Pending</div>
            </div>
          </div>
        </div>

        {/* Document Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documentFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => setSelectedCategory(folder.id)}
              className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityColor(folder.priority)} p-6 cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{folder.icon}</div>
                <div className="flex items-center space-x-2">
                  {getPriorityIcon(folder.priority)}
                  {folder.required && (
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                      Required
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {folder.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {folder.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-600">
                    {folder.count} document{folder.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center text-primary-600">
                  <span className="text-sm font-medium mr-1">Open</span>
                  <FolderOpen className="h-4 w-4" />
                </div>
              </div>

              {folder.count === 0 && folder.required && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  ⚠️ No documents uploaded
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-primary-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary-900 mb-3">
            Need Help with Document Requirements?
          </h3>
          <p className="text-primary-700 mb-4">
            Not sure what documents you need? Our loan specialists are here to help guide you through the process.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Contact Loan Officer
            </button>
            <button className="border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors">
              View Document Guide
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DocumentsPage; 