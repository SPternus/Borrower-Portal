'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderIcon, 
  FolderOpenIcon, 
  DocumentIcon, 
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronRightIcon,
  SparklesIcon,
  DocumentCheckIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface DocumentNeed {
  id: string;
  name: string;
  category: string;
  required: boolean;
  priority: string;
  description: string;
  type: string;
  sort_order: number;
  uploaded_files: UploadedDocument[];
  has_uploads: boolean;
  latest_status: string | null;
  public_notes: PublicNote[];
}

interface UploadedDocument {
  id: string;
  name: string;
  document_name: string;
  content_document_id: string;
  s3_key: string;
  status: string;
  approved_date: string | null;
  rejected_date: string | null;
  upload_date: string;
  file_size: number;
  file_type: string;
  document_needs_id: string | null;
  review_notes: string;
  public_notes: PublicNote[];
}

interface PublicNote {
  id: string;
  note: string;
  created_date: string;
  created_by: string;
}

interface DocumentCategory {
  category: string;
  category_display: string;
  required_documents: DocumentNeed[];
  uploaded_documents: UploadedDocument[];
  summary: {
    total_required: number;
    total_uploaded: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

interface InteractiveDocumentData {
  success: boolean;
  opportunity_id: string;
  loan_type: string | null;
  loan_type_name: string;
  categories: DocumentCategory[];
  summary: {
    total_categories: number;
    total_required: number;
    total_uploaded: number;
    approved: number;
    pending: number;
    rejected: number;
    completion_percentage: number;
  };
  message?: string;
}

interface InteractiveDocumentsTabProps {
  opportunityId: string;
}

const InteractiveDocumentsTab: React.FC<InteractiveDocumentsTabProps> = ({ opportunityId }) => {
  const [documentData, setDocumentData] = useState<InteractiveDocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  useEffect(() => {
    fetchDocumentData();
  }, [opportunityId]);

  const fetchDocumentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/opportunities/${opportunityId}/interactive-documents`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document data: ${response.status}`);
      }
      
      const data: any = await response.json();
      
      // Handle different response formats from the API
      let categories = [];
      let summary = null;
      
      if (data.folder_structure) {
        // New format with folder_structure
        categories = data.folder_structure;
        summary = data.overall_summary;
      } else if (data.categories) {
        // Old format with categories
        categories = data.categories;
        summary = data.summary;
      }
      
      // Transform to expected format
      const transformedData: InteractiveDocumentData = {
        success: data.success,
        opportunity_id: data.opportunity_id,
        loan_type: data.loan_type,
        loan_type_name: data.loan_type_name || data.loan_type || 'Unknown',
        categories: categories || [],
        summary: summary || {
          total_categories: 0,
          total_required: 0,
          total_uploaded: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          completion_percentage: 0
        },
        message: data.message
      };
      
      setDocumentData(transformedData);
      console.log('📄 Interactive document data loaded:', transformedData);
      
      // Auto-expand categories with uploads or pending requirements
      const autoExpandCategories: string[] = [];
      if (transformedData.categories && Array.isArray(transformedData.categories)) {
        transformedData.categories.forEach(category => {
          if (category.summary && (category.summary.total_uploaded > 0 || category.summary.pending > 0)) {
            autoExpandCategories.push(category.category);
          }
        });
      }
      setExpandedCategories(autoExpandCategories);
      
    } catch (err) {
      console.error('Error fetching document data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch document data');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    if (expandedCategories.includes(categoryName)) {
      setExpandedCategories(expandedCategories.filter(cat => cat !== categoryName));
    } else {
      setExpandedCategories([...expandedCategories, categoryName]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIconSolid className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'pending':
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    }
  };

  const cleanFileName = (filename: string): string => {
    // Remove S3 timestamp suffix (e.g., "_20250627_212133" from "FnF (4) (2)_20250627_212133.pdf")
    if (!filename) return filename;
    
    // Pattern to match: _YYYYMMDD_HHMMSS before file extension
    const timestampPattern = /_\d{8}_\d{6}(\.[^.]+)$/;
    const match = filename.match(timestampPattern);
    
    if (match) {
      // Replace the timestamp with just the file extension
      return filename.replace(timestampPattern, match[1]);
    }
    
    return filename;
  };

  const getFileTypeIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) {
      return '📄';
    } else if (type.includes('word') || type.includes('doc')) {
      return '📝';
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return '📊';
    } else if (type.includes('image')) {
      return '🖼️';
    } else if (type.includes('archive') || type.includes('zip')) {
      return '📦';
    } else {
      return '📎';
    }
  };

  const getCategoryProgress = (category: DocumentCategory) => {
    if (!category.summary || category.summary.total_required === 0) return 100;
    if (!category.required_documents || !Array.isArray(category.required_documents)) return 0;
    
    const completed = category.required_documents.filter(doc => 
      doc && doc.has_uploads && doc.latest_status === 'approved'
    ).length;
    return Math.round((completed / category.summary.total_required) * 100);
  };

  const handleFileUpload = async (
    documentId: string, 
    files: FileList, 
    category: string, 
    requirementName: string
  ) => {
    console.log('Uploading files to S3:', { documentId, category, requirementName, fileCount: files.length });
    setUploadingFiles([...uploadingFiles, documentId]);
    
    try {
      // Upload each file to S3
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('opportunity_id', opportunityId);
        formData.append('category', category);
        formData.append('requirement_name', requirementName);
        formData.append('requirement_id', documentId);
        formData.append('document_description', `Document for: ${requirementName}`);
        
        // Use full backend URL to avoid Next.js API route conflicts
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        
        const response = await fetch(`${baseUrl}/documents/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }
        
        return await response.json();
      });
      
      const results = await Promise.all(uploadPromises);
      console.log('✅ All files uploaded successfully:', results);
      
      // Show success message
      const fileNames = results.map(r => r.filename).join(', ');
      // You could add a toast notification here
      console.log(`Successfully uploaded: ${fileNames}`);
      
      // Refresh document data to show new uploads
      await fetchDocumentData();
      
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      // You could add an error toast notification here
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingFiles(uploadingFiles.filter(id => id !== documentId));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>, 
    documentId: string, 
    category: string, 
    requirementName: string
  ) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(documentId, files, category, requirementName);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-gray-600">Loading document structure...</span>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-200 rounded-xl p-6"
      >
        <div className="flex items-center">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Documents</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!documentData) {
    return (
      <div className="text-center py-12">
        <DocumentIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No document data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <SparklesIcon className="w-8 h-8 text-blue-600 mr-3" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Document Center</h2>
              <p className="text-gray-600">{documentData.loan_type_name}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {documentData.summary.completion_percentage}%
            </div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${documentData.summary.completion_percentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Approved', value: documentData.summary.approved, color: 'text-green-600' },
            { label: 'Pending', value: documentData.summary.pending, color: 'text-yellow-600' },
            { label: 'Uploaded', value: documentData.summary.total_uploaded, color: 'text-blue-600' },
            { label: 'Required', value: documentData.summary.total_required, color: 'text-gray-600' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-lg p-3 text-center shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Document Categories */}
      <div className="space-y-4">
        {documentData.categories && Array.isArray(documentData.categories) && documentData.categories.map((category, categoryIndex) => {
          const isExpanded = expandedCategories.includes(category.category);
          const progress = getCategoryProgress(category);
          
          return (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Category Header */}
              <motion.div
                className="p-4 cursor-pointer bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 transition-all duration-300"
                onClick={() => toggleCategory(category.category)}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronRightIcon className="w-5 h-5 text-gray-500 mr-2" />
                    </motion.div>
                    {isExpanded ? (
                      <FolderOpenIcon className="w-6 h-6 text-blue-600 mr-3" />
                    ) : (
                      <FolderIcon className="w-6 h-6 text-gray-600 mr-3" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {category.category_display}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {category.summary?.total_required || 0} required • {category.summary?.total_uploaded || 0} uploaded
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Progress Circle */}
                    <div className="relative w-12 h-12">
                      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-gray-200"
                        />
                        <motion.circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          className={progress === 100 ? "text-green-500" : "text-blue-500"}
                          initial={{ strokeDasharray: "0 125.6" }}
                          animate={{ strokeDasharray: `${(progress / 100) * 125.6} 125.6` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-700">{progress}%</span>
                      </div>
                    </div>
                    
                    {/* Status Badges */}
                    <div className="flex space-x-1">
                      {category.summary?.approved > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {category.summary.approved} ✓
                        </span>
                      )}
                      {category.summary?.pending > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {category.summary.pending} ⏳
                        </span>
                      )}
                      {category.summary?.rejected > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {category.summary.rejected} ✗
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Category Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-4 space-y-3">
                      {/* Required Documents */}
                      {category.required_documents && Array.isArray(category.required_documents) && category.required_documents.map((document, docIndex) => (
                        <motion.div
                          key={document.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: docIndex * 0.05 }}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              {document.has_uploads ? (
                                <DocumentCheckIcon className="w-5 h-5 text-green-600 mr-2" />
                              ) : (
                                <DocumentIcon className="w-5 h-5 text-gray-400 mr-2" />
                              )}
                              <div>
                                <h4 className="font-medium text-gray-900">{document.name}</h4>
                                {document.description && (
                                  <p className="text-sm text-gray-500">{document.description}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {document.required && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Required
                                </span>
                              )}
                              {document.latest_status && getStatusIcon(document.latest_status)}
                            </div>
                          </div>

                          {/* Uploaded Files */}
                          {document.uploaded_files && document.uploaded_files.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {document.uploaded_files.map((file, fileIndex) => (
                                <motion.div
                                  key={file.id}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: fileIndex * 0.05 }}
                                  className={`p-3 rounded-lg border ${getStatusColor(file.status)}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      {getStatusIcon(file.status)}
                                      <div className="ml-2">
                                        <p className="font-medium">{cleanFileName(file.name)}</p>
                                        <div className="flex items-center space-x-2 text-xs opacity-75">
                                          <span>{getFileTypeIcon(file.file_type)}</span>
                                          <span>Uploaded {new Date(file.upload_date).toLocaleDateString()}</span>
                                          {file.file_size > 0 && (
                                            <>
                                              <span>•</span>
                                              <span>{(file.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex space-x-1">
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-1 rounded-full hover:bg-white/50"
                                        title="View Document"
                                      >
                                        <EyeIcon className="w-4 h-4" />
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-1 rounded-full hover:bg-white/50"
                                        title="Download"
                                      >
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                      </motion.button>
                                    </div>
                                  </div>
                                  
                                  {file.review_notes && (
                                    <div className="mt-2 p-2 bg-white/50 rounded text-sm">
                                      <strong>Review Notes:</strong> {file.review_notes}
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          )}

                          {/* Upload Area */}
                          <motion.div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onDragOver={handleDragOver}
                            onDrop={(e: React.DragEvent<HTMLDivElement>) => handleDrop(e, document.id, category.category, document.name)}
                          >
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              id={`upload-${document.id}`}
                              onChange={(e) => {
                                if (e.target.files) {
                                  handleFileUpload(document.id, e.target.files, category.category, document.name);
                                }
                              }}
                            />
                            <label htmlFor={`upload-${document.id}`} className="cursor-pointer">
                              {uploadingFiles.includes(document.id) ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                                />
                              ) : (
                                <CloudArrowUpIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              )}
                              <p className="text-sm text-gray-600">
                                {uploadingFiles.includes(document.id) 
                                  ? 'Uploading...' 
                                  : (document.uploaded_files && document.uploaded_files.length > 0)
                                    ? 'Upload additional files' 
                                    : 'Click or drag files to upload'
                                }
                              </p>
                            </label>
                          </motion.div>
                        </motion.div>
                      ))}

                      {/* Standalone Uploaded Documents */}
                      {category.uploaded_documents && Array.isArray(category.uploaded_documents) && category.uploaded_documents.filter(doc => 
                        !category.required_documents?.some(req => 
                          req.uploaded_files?.some(file => file.id === doc.id)
                        )
                      ).map((document, docIndex) => (
                        <motion.div
                          key={document.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: docIndex * 0.05 }}
                          className={`p-4 rounded-lg border ${getStatusColor(document.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {getStatusIcon(document.status)}
                              <div className="ml-2">
                                <p className="font-medium">{cleanFileName(document.name)}</p>
                                <div className="flex items-center space-x-2 text-xs opacity-75">
                                  <span>{getFileTypeIcon(document.file_type)}</span>
                                  <span>Uploaded {new Date(document.upload_date).toLocaleDateString()}</span>
                                  {document.file_size > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{(document.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded-full hover:bg-white/50"
                                title="View Document"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded-full hover:bg-white/50"
                                title="Download"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </div>
                          
                          {document.review_notes && (
                            <div className="mt-2 p-2 bg-white/50 rounded text-sm">
                              <strong>Review Notes:</strong> {document.review_notes}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {(!documentData.categories || documentData.categories.length === 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 bg-gray-50 rounded-xl"
        >
          <DocumentIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Required</h3>
          <p className="text-gray-600">
            {documentData.message || "No document requirements found for this loan type."}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default InteractiveDocumentsTab; 