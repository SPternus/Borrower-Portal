'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderIcon, 
  DocumentIcon, 
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PhotoIcon,
  ArchiveBoxIcon,
  PaperClipIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import DocumentViewer from './DocumentViewer';
import { useAuth0 } from '@auth0/auth0-react';

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

interface ModernDocumentGridProps {
  opportunityId: string;
}

const ModernDocumentGrid: React.FC<ModernDocumentGridProps> = ({ opportunityId }) => {
  const [documentData, setDocumentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Documents');
  const [selectedRequirement, setSelectedRequirement] = useState<DocumentNeed | null>(null);
  const [navigationLevel, setNavigationLevel] = useState<'categories' | 'requirements'>('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [viewerDocument, setViewerDocument] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  
  // Quick Note Creation State
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteDocument, setQuickNoteDocument] = useState<any>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isSubmittingQuickNote, setIsSubmittingQuickNote] = useState(false);

  // File Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [uploadRequirement, setUploadRequirement] = useState<string>('');
  const [uploadRequirementId, setUploadRequirementId] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { user } = useAuth0();

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
      
      const data = await response.json();
      
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
      const transformedData = {
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
      console.log('📄 Document data loaded:', transformedData);
    } catch (err) {
      console.error('Error fetching document data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch document data');
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) {
      return { icon: 'PDF', color: 'text-white', bg: 'bg-red-600', label: 'PDF' };
    } else if (type.includes('word') || type.includes('doc')) {
      return { icon: 'DOC', color: 'text-white', bg: 'bg-blue-600', label: 'DOC' };
    } else if (type.includes('excel') || type.includes('spreadsheet') || type.includes('xls')) {
      return { icon: 'XLS', color: 'text-white', bg: 'bg-green-600', label: 'XLS' };
    } else if (type.includes('image')) {
      return { icon: 'IMG', color: 'text-white', bg: 'bg-purple-600', label: 'IMG' };
    } else if (type.includes('archive') || type.includes('zip')) {
      return { icon: 'ZIP', color: 'text-white', bg: 'bg-orange-600', label: 'ZIP' };
    } else {
      return { icon: 'FILE', color: 'text-white', bg: 'bg-gray-600', label: 'FILE' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircleIconSolid className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'pending':
      case 'pending review':
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const cleanFileName = (filename: string): string => {
    if (!filename) return filename;
    
    // Remove S3 timestamp suffix
    const timestampPattern = /_\d{8}_\d{6}(\.[^.]+)$/;
    const match = filename.match(timestampPattern);
    
    if (match) {
      return filename.replace(timestampPattern, match[1]);
    }
    
    return filename;
  };

  // Calculate actual file counts for a category
  const getCategoryFileCounts = (category: DocumentCategory) => {
    let totalFiles = 0;
    let approvedFiles = 0;
    let pendingFiles = 0;
    let rejectedFiles = 0;
    const seenDocIds = new Set<string>();

    // First, count files from required documents (primary source)
    category.required_documents?.forEach((req: DocumentNeed) => {
      req.uploaded_files?.forEach((file: UploadedDocument) => {
        if (!seenDocIds.has(file.id)) {
          seenDocIds.add(file.id);
          totalFiles++;
          const status = file.status.toLowerCase();
          if (status === 'approved') approvedFiles++;
          else if (status === 'rejected') rejectedFiles++;
          else pendingFiles++;
        }
      });
    });

    // Then count any general uploaded documents that aren't already included
    category.uploaded_documents?.forEach((doc: UploadedDocument) => {
      if (!seenDocIds.has(doc.id)) {
        seenDocIds.add(doc.id);
        totalFiles++;
        const status = doc.status.toLowerCase();
        if (status === 'approved') approvedFiles++;
        else if (status === 'rejected') rejectedFiles++;
        else pendingFiles++;
      }
    });

    return {
      total: totalFiles,
      approved: approvedFiles,
      pending: pendingFiles,
      rejected: rejectedFiles,
      requirements: category.required_documents?.length || 0
    };
  };

  const getCategoryProgress = (category: DocumentCategory) => {
    const counts = getCategoryFileCounts(category);
    return counts.total > 0 ? Math.round((counts.approved / counts.total) * 100) : 0;
  };

  const getRequirementProgress = (requirement: DocumentNeed) => {
    const totalFiles = requirement.uploaded_files?.length || 0;
    const approvedFiles = requirement.uploaded_files?.filter(file => file.status.toLowerCase() === 'approved').length || 0;
    return totalFiles > 0 ? Math.round((approvedFiles / totalFiles) * 100) : 0;
  };

  // Calculate total counts for "All Documents"
  const getAllDocumentsCounts = () => {
    let totalFiles = 0;
    let approvedFiles = 0;
    let pendingFiles = 0;
    let rejectedFiles = 0;

    documentData?.categories?.forEach((category: DocumentCategory) => {
      const counts = getCategoryFileCounts(category);
      totalFiles += counts.total;
      approvedFiles += counts.approved;
      pendingFiles += counts.pending;
      rejectedFiles += counts.rejected;
    });

    return {
      total: totalFiles,
      approved: approvedFiles,
      pending: pendingFiles,
      rejected: rejectedFiles
    };
  };

  const getCurrentCategory = () => {
    if (selectedCategory === 'All Documents') return null;
    return documentData?.categories?.find((cat: DocumentCategory) => cat.category_display === selectedCategory);
  };

  // Get documents based on current navigation level
  const getFilteredDocuments = () => {
    if (!documentData?.categories) return [];
    
    if (navigationLevel === 'requirements' && selectedRequirement) {
      // Show only files for the selected requirement
      return selectedRequirement.uploaded_files?.map(file => ({
        ...file,
        category: selectedCategory,
        requirement: selectedRequirement.name
      })) || [];
    }
    
    if (selectedCategory === 'All Documents') {
      // Show all documents from all categories, but deduplicate by document ID
      const allDocs: any[] = [];
      const seenDocIds = new Set<string>();
      
      documentData.categories.forEach((category: DocumentCategory) => {
        // First, add documents from requirements (these are the primary source)
        category.required_documents?.forEach((req: DocumentNeed) => {
          req.uploaded_files?.forEach((file: UploadedDocument) => {
            if (!seenDocIds.has(file.id)) {
              seenDocIds.add(file.id);
              allDocs.push({
                ...file,
                category: category.category_display,
                requirement: req.name
              });
            }
          });
        });
        
        // Then add any general uploaded documents that aren't already included
        category.uploaded_documents?.forEach((doc: UploadedDocument) => {
          if (!seenDocIds.has(doc.id)) {
            seenDocIds.add(doc.id);
            allDocs.push({
              ...doc,
              category: category.category_display,
              requirement: 'General'
            });
          }
        });
      });
      
      return allDocs;
    } else {
      // Show all documents for the selected category, also deduplicate
      const currentCategory = getCurrentCategory();
      if (!currentCategory) return [];
      
      const categoryDocs: any[] = [];
      const seenDocIds = new Set<string>();
      
      // First, add documents from requirements (these are the primary source)
      currentCategory.required_documents?.forEach((req: DocumentNeed) => {
        req.uploaded_files?.forEach((file: UploadedDocument) => {
          if (!seenDocIds.has(file.id)) {
            seenDocIds.add(file.id);
            categoryDocs.push({
              ...file,
              category: currentCategory.category_display,
              requirement: req.name
            });
          }
        });
      });
      
      // Then add any general uploaded documents that aren't already included
      currentCategory.uploaded_documents?.forEach((doc: UploadedDocument) => {
        if (!seenDocIds.has(doc.id)) {
          seenDocIds.add(doc.id);
          categoryDocs.push({
            ...doc,
            category: currentCategory.category_display,
            requirement: 'General'
          });
        }
      });
      
      return categoryDocs;
    }
  };

  const filteredDocuments = getFilteredDocuments().filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.requirement.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || doc.status.toLowerCase().includes(statusFilter.toLowerCase());
    
    return matchesSearch && matchesStatus;
  });

  const handleCategoryClick = (categoryName: string) => {
    if (categoryName === 'All Documents') {
      setSelectedCategory(categoryName);
      setNavigationLevel('categories');
      setSelectedRequirement(null);
    } else {
      setSelectedCategory(categoryName);
      setNavigationLevel('requirements'); // Navigate to requirements level to show second level
      setSelectedRequirement(null);
    }
  };

  const handleRequirementClick = (requirement: DocumentNeed) => {
    setSelectedRequirement(requirement);
    setNavigationLevel('requirements');
  };

  const handleBackToCategories = () => {
    setNavigationLevel('categories');
    setSelectedRequirement(null);
  };

  const handleBackToAllCategories = () => {
    setSelectedCategory('All Documents');
    setNavigationLevel('categories');
    setSelectedRequirement(null);
  };

  const handleViewDocument = (doc: any) => {
    setViewerDocument(doc);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setViewerDocument(null);
  };

  // Quick Note Creation Functions
  const handleAddQuickNote = (doc: any) => {
    setQuickNoteDocument(doc);
    setQuickNoteText('');
    setShowQuickNoteModal(true);
  };

  const handleCloseQuickNoteModal = () => {
    setShowQuickNoteModal(false);
    setQuickNoteDocument(null);
    setQuickNoteText('');
    setIsSubmittingQuickNote(false);
  };

  const handleSubmitQuickNote = async () => {
    if (!quickNoteText.trim() || !quickNoteDocument || !user) return;
    
    try {
      setIsSubmittingQuickNote(true);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      // Get user info from Auth0
      const auth0UserId = user?.sub || '';
      const userEmail = user?.email || '';
      
      console.log('📝 Creating quick note with user info:', { auth0UserId, userEmail });
      
      const response = await fetch(`${baseUrl}/documents/${quickNoteDocument.id}/notes?opportunity_id=${opportunityId}&auth0_user_id=${encodeURIComponent(auth0UserId)}&email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: quickNoteText,
          is_public: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create note: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Quick note created successfully:', result);
      
      // Refresh document data to update note counts
      await fetchDocumentData();
      
      // Close modal
      handleCloseQuickNoteModal();
      
    } catch (err) {
      console.error('Error creating quick note:', err);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsSubmittingQuickNote(false);
    }
  };

  // Upload Handler Functions
  const handleUploadClick = () => {
    setShowUploadModal(true);
    
    // Auto-select based on current navigation level
    if (navigationLevel === 'requirements' && selectedRequirement) {
      // We're viewing a specific requirement - auto-select both category and requirement
      console.log('🎯 Auto-selecting requirement:', selectedRequirement.name, 'with ID:', selectedRequirement.id);
      setUploadCategory(selectedRequirement.category);
      setUploadRequirement(selectedRequirement.name);
      setUploadRequirementId(selectedRequirement.id);
    } else if (selectedCategory !== 'All Documents' && documentData?.categories) {
      // We're viewing a category - auto-select category only
      const category = documentData.categories.find((cat: DocumentCategory) => 
        cat.category_display === selectedCategory
      );
      if (category) {
        console.log('📁 Auto-selecting category:', category.category_display);
        setUploadCategory(category.category);
        // Clear requirement selection since we're only at category level
        setUploadRequirement('');
        setUploadRequirementId('');
      }
    } else {
      // We're at top level - clear all selections
      setUploadCategory('');
      setUploadRequirement('');
      setUploadRequirementId('');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0 || !uploadCategory) {
      alert('Please select files and category');
      return;
    }

    setIsUploading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    
    try {
      // Upload each file
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('opportunity_id', opportunityId);
        formData.append('category', uploadCategory);
        formData.append('requirement_name', uploadRequirement || 'General');
        
        // Add requirement_id if we have one
        if (uploadRequirementId) {
          formData.append('requirement_id', uploadRequirementId);
          console.log('📋 Adding requirement_id to upload:', uploadRequirementId, 'for requirement:', uploadRequirement);
        }
        
        formData.append('document_description', `Document uploaded: ${file.name}`);

        // Track progress for this file
        const fileKey = `${file.name}-${index}`;
        setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));

        const response = await fetch(`${baseUrl}/documents/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to upload ${file.name}`);
        }

        // Update progress to 100% for this file
        setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
        
        return await response.json();
      });

      const results = await Promise.all(uploadPromises);
      console.log('✅ All files uploaded successfully:', results);
      
      // Refresh document data
      await fetchDocumentData();
      
      // Reset upload state
      setSelectedFiles([]);
      setUploadCategory('');
      setUploadRequirement('');
      setUploadRequirementId('');
      setUploadProgress({});
      setShowUploadModal(false);
      
      // Show success message
      alert(`Successfully uploaded ${results.length} file(s)!`);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Loading Modern Document Grid...</p>
          <p className="text-sm text-gray-500">Opportunity ID: {opportunityId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Documents</h3>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Opportunity ID: {opportunityId}</p>
        </div>
      </div>
    );
  }

  console.log('🎨 ModernDocumentGrid rendering with data:', documentData);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="text-white p-6" style={{ background: `linear-gradient(to right, #1e293b, #1e293b)` }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">📄 My Document Management ✨</h2>
            <div className="flex items-center mt-2 text-blue-100">
              <span className="text-sm">🏠 123 Main st, Los Angeles, Ca 90015 • {documentData?.opportunity_id}</span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>{getAllDocumentsCounts().approved} of {getAllDocumentsCounts().total} files approved</span>
            <span className="text-2xl font-bold">
              {getAllDocumentsCounts().total > 0 
                ? Math.round((getAllDocumentsCounts().approved / getAllDocumentsCounts().total) * 100)
                : 0
              }%
            </span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <motion.div 
              className="bg-white rounded-full h-2"
              initial={{ width: 0 }}
              animate={{ 
                width: `${getAllDocumentsCounts().total > 0 
                  ? Math.round((getAllDocumentsCounts().approved / getAllDocumentsCounts().total) * 100)
                  : 0
                }%` 
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-gray-50">
          <div className="p-4">
            {/* Breadcrumb Navigation */}
            <div className="mb-4">
              <AnimatePresence mode="wait">
                {navigationLevel === 'categories' ? (
                  <motion.div
                    key="categories-breadcrumb"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-900">Document Categories</h3>
                  </motion.div>
                ) : (
                  <motion.div
                    key="requirements-breadcrumb"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <button
                      onClick={handleBackToCategories}
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4 mr-1" />
                      Back to Categories
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedCategory}</h3>
                    <p className="text-sm text-gray-500">Document Requirements</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Navigation Content */}
            <AnimatePresence mode="wait">
              {navigationLevel === 'categories' ? (
                <motion.div
                  key="categories-view"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  {/* All Documents */}
                  <motion.div
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selectedCategory === 'All Documents' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => handleCategoryClick('All Documents')}
                    whileHover={{ y: -1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="flex items-center mr-3">
                          <FolderIcon className="w-5 h-5 text-gray-600 mr-1" />
                          <DocumentIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">All Documents</p>
                          <p className="text-xs text-gray-500">{getAllDocumentsCounts().total} total files</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress indicators for All Documents */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <CheckCircleIconSolid className="w-3 h-3 text-green-500" />
                        </div>
                        <p className="text-xs font-medium text-gray-900">{getAllDocumentsCounts().approved}</p>
                        <p className="text-xs text-gray-500">Approved</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <ClockIcon className="w-3 h-3 text-yellow-500" />
                        </div>
                        <p className="text-xs font-medium text-gray-900">{getAllDocumentsCounts().pending}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <DocumentIcon className="w-3 h-3 text-gray-400" />
                        </div>
                        <p className="text-xs font-medium text-gray-900">{getAllDocumentsCounts().total}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Category List */}
                  {documentData?.categories?.map((category: DocumentCategory, index: number) => {
                    const progress = getCategoryProgress(category);
                    const counts = getCategoryFileCounts(category);
                    const isSelected = selectedCategory === category.category_display;
                    
                    return (
                      <motion.div
                        key={category.category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => handleCategoryClick(category.category_display)}
                        whileHover={{ y: -1 }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1 mr-2">
                            <h4 className="font-medium text-gray-900 text-sm leading-tight truncate">{category.category_display}</h4>
                            <p className="text-xs text-gray-500 mt-1">{counts.requirements} requirements • {counts.total} files</p>
                          </div>
                          <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        </div>
                        
                        {/* Progress indicators - Actual File Counts */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <CheckCircleIconSolid className="w-3 h-3 text-green-500" />
                            </div>
                            <p className="text-xs font-medium text-gray-900">{counts.approved}</p>
                            <p className="text-xs text-gray-500">Approved</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <ClockIcon className="w-3 h-3 text-yellow-500" />
                            </div>
                            <p className="text-xs font-medium text-gray-900">{counts.pending}</p>
                            <p className="text-xs text-gray-500">Pending</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <DocumentIcon className="w-3 h-3 text-gray-400" />
                            </div>
                            <p className="text-xs font-medium text-gray-900">{counts.total}</p>
                            <p className="text-xs text-gray-500">Total</p>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <motion.div 
                            className="bg-green-500 rounded-full h-1.5"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{progress}% Complete</p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="requirements-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  {getCurrentCategory()?.required_documents?.map((requirement: DocumentNeed, index: number) => {
                    const progress = getRequirementProgress(requirement);
                    const fileCount = requirement.uploaded_files?.length || 0;
                    const isSelected = selectedRequirement?.id === requirement.id;
                    
                    return (
                      <motion.div
                        key={requirement.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => handleRequirementClick(requirement)}
                        whileHover={{ y: -1 }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1 mr-2">
                            <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">{requirement.name}</h4>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className="text-xs text-gray-500">{fileCount} files</span>
                              {requirement.required && (
                                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-medium">Required</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {requirement.description && (
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">{requirement.description}</p>
                        )}
                        
                        {/* File status indicators */}
                        {fileCount > 0 && (
                          <div className="flex items-center space-x-2 mb-2">
                            {requirement.uploaded_files?.slice(0, 3).map((file, idx) => (
                              <div key={idx} className="flex items-center">
                                {getStatusIcon(file.status)}
                              </div>
                            ))}
                            {fileCount > 3 && (
                              <span className="text-xs text-gray-500">+{fileCount - 3} more</span>
                            )}
                          </div>
                        )}
                        
                        {/* Progress bar */}
                        {fileCount > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <motion.div 
                              className="bg-green-500 rounded-full h-1.5"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {fileCount === 0 ? 'No files uploaded' : `${progress}% Complete`}
                        </p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by document name..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <select
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option>All Status</option>
                    <option>Approved</option>
                    <option>Pending</option>
                    <option>Rejected</option>
                  </select>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold ${viewMode === 'grid' ? '' : 'bg-gray-100 text-gray-600'}`}
                  style={viewMode === 'grid' ? {
                    backgroundColor: '#1e293b',
                    color: '#fff',
                    border: '3px solid #1e293b'
                  } : {}}
                  onClick={() => setViewMode('grid')}
                >
                  Grid View
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold ${viewMode === 'list' ? '' : 'bg-gray-100 text-gray-600'}`}
                  style={viewMode === 'list' ? {
                    backgroundColor: '#1e293b',
                    color: '#fff',
                    border: '3px solid #1e293b'
                  } : {}}
                  onClick={() => setViewMode('list')}
                >
                  List View
                </button>
              </div>
            </div>
            
            {/* Dynamic Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${navigationLevel}-${selectedCategory}-${selectedRequirement?.id}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <DocumentIcon className="w-5 h-5 text-gray-600 mr-2" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {navigationLevel === 'requirements' && selectedRequirement
                        ? selectedRequirement.name
                        : selectedCategory === 'All Documents' 
                          ? 'All Documents' 
                          : selectedCategory
                      }
                    </h3>
                    {navigationLevel === 'requirements' && selectedRequirement && (
                      <p className="text-sm text-gray-500">{selectedCategory}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Showing {filteredDocuments.length} documents
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Compact Upload Section */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <CloudArrowUpIcon className="w-5 h-5" style={{ color: '#3b82f6' }} />
                  <span className="text-sm font-medium text-gray-900">Upload Documents</span>
                </div>
                
                {/* Show current auto-selection context */}
                {navigationLevel === 'requirements' && selectedRequirement ? (
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-gray-500">→ Auto-uploading to:</span>
                    <span className="px-2 py-1 rounded-md font-medium" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
                      {selectedCategory}
                    </span>
                    <span>→</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md font-medium">
                      {selectedRequirement.name}
                    </span>
                    <CheckCircleIconSolid className="w-4 h-4 text-green-500" />
                  </div>
                ) : uploadCategory && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>→</span>
                    <span className="px-2 py-1 rounded-md font-medium" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
                      {documentData?.categories?.find((cat: DocumentCategory) => cat.category === uploadCategory)?.category_display || uploadCategory}
                    </span>
                    {uploadRequirement && (
                      <>
                        <span>→</span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md font-medium">
                          {uploadRequirement}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2"
                style={{
                  backgroundColor: '#00b5bf',
                  color: '#000',
                  border: '3px solid #00b5bf'
                }}
              >
                <PlusIcon className="w-4 h-4" />
                <span>
                  {navigationLevel === 'requirements' && selectedRequirement 
                    ? `Add to ${selectedRequirement.name}` 
                    : 'Add Files'
                  }
                </span>
              </button>
            </div>
            
            {/* Quick Category Selection - Only show when NOT in requirement level */}
            {!showUploadModal && navigationLevel !== 'requirements' && (
              <div className="mt-3 flex items-center space-x-3">
                <span className="text-xs text-gray-500 font-medium">Quick Upload to:</span>
                <div className="flex items-center space-x-2">
                  {documentData?.categories?.slice(0, 3).map((category: DocumentCategory) => (
                    <button
                      key={category.category}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadCategory(category.category);
                        setUploadRequirement('');
                        setUploadRequirementId('');
                        setShowUploadModal(true);
                      }}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-lg transition-colors text-xs font-medium text-gray-700"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#93c5fd';
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                        e.currentTarget.style.color = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.color = '#374151';
                      }}
                    >
                      {category.category_display}
                    </button>
                  ))}
                  <button
                    onClick={handleUploadClick}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                  >
                    More...
                  </button>
                </div>
              </div>
            )}
            
            {/* Requirement Level Info */}
            {navigationLevel === 'requirements' && selectedRequirement && (
              <div className="mt-3 flex items-center space-x-2 text-xs text-gray-600 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircleIconSolid className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>
                  Files uploaded here will be automatically organized under <strong>{selectedRequirement.name}</strong> 
                  and linked with requirement ID <code className="bg-gray-100 px-1 rounded text-xs">{selectedRequirement.id}</code>
                </span>
              </div>
            )}
          </div>

          {/* Document Grid */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${navigationLevel}-${selectedCategory}-${selectedRequirement?.id}-grid`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No documents found</p>
                    {navigationLevel === 'requirements' && selectedRequirement && (
                      <button
                        onClick={handleBackToCategories}
                        className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        ← Back to view all requirements
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6' : 'space-y-0'}>
                    {viewMode === 'list' ? (
                      // Modern Table-Style List View
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                          <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            <div className="col-span-4">Document</div>
                            <div className="col-span-2">Folder</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-3">Uploaded</div>
                            <div className="col-span-1">Actions</div>
                          </div>
                        </div>
                        
                        {/* Table Body */}
                        <div className="divide-y divide-gray-100">
                          {filteredDocuments.map((doc, index) => {
                            const fileTypeInfo = getFileTypeIcon(doc.file_type);
                            // Create unique key to avoid duplicates
                            const uniqueKey = `${doc.id}-${doc.category}-${doc.requirement}-${index}`;
                            
                            return (
                              <motion.div
                                key={uniqueKey}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                              >
                                <div className="grid grid-cols-12 gap-4 items-center">
                                  {/* Document Column */}
                                  <div className="col-span-4 flex items-center space-x-3">
                                    {/* File Type Badge */}
                                    <div className={`${fileTypeInfo.bg} ${fileTypeInfo.color} px-2 py-1 rounded text-xs font-bold flex-shrink-0`}>
                                      {fileTypeInfo.label}
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-medium text-gray-900 truncate">
                                        {cleanFileName(doc.name)}
                                      </h4>
                                      <p className="text-sm text-gray-500 truncate">
                                        {doc.file_type}
                                      </p>
                                    </div>
                                    
                                    {/* Status Badge for approved docs */}
                                    {doc.status.toLowerCase() === 'approved' && (
                                      <CheckCircleIconSolid className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    )}
                                  </div>
                                  
                                  {/* Folder Column */}
                                  <div className="col-span-2">
                                    <div>
                                      <p className="font-medium text-gray-900 text-sm">
                                        {doc.category}
                                      </p>
                                      {navigationLevel !== 'requirements' && (
                                        <p className="text-xs mt-1" style={{ color: '#3b82f6' }}>
                                          {doc.requirement}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Status Column */}
                                  <div className="col-span-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      doc.status.toLowerCase() === 'approved' 
                                        ? 'bg-green-100 text-green-800'
                                        : doc.status.toLowerCase() === 'rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {doc.status.toLowerCase() === 'approved' && (
                                        <CheckCircleIconSolid className="w-3 h-3 mr-1" />
                                      )}
                                      {doc.status.toLowerCase() === 'rejected' && (
                                        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                      )}
                                      {doc.status.toLowerCase() === 'pending' && (
                                        <ClockIcon className="w-3 h-3 mr-1" />
                                      )}
                                      {doc.status.toLowerCase() === 'approved' ? 'Approved' : 
                                       doc.status.toLowerCase() === 'rejected' ? 'Rejected' : 'Pending Review'}
                                    </span>
                                  </div>
                                  
                                  {/* Uploaded Column */}
                                  <div className="col-span-3">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {new Date(doc.upload_date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        by {doc.status.toLowerCase() === 'approved' ? 'Sanjay Prajapati' : 
                                            doc.review_notes ? 'You' : 'Sanjay Prajapati'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Actions Column */}
                                  <div className="col-span-1">
                                    <div className="flex items-center space-x-1">
                                      {/* Notes indicator */}
                                      {doc.public_notes && doc.public_notes.length > 0 && (
                                        <div className="flex items-center justify-center w-6 h-6 bg-blue-50 rounded-md" title={`${doc.public_notes.length} note${doc.public_notes.length > 1 ? 's' : ''}`}>
                                          <ChatBubbleLeftRightIcon className="w-3 h-3 text-blue-600" />
                                        </div>
                                      )}
                                      
                                      <button 
                                        className="p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Add Note"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddQuickNote(doc);
                                        }}
                                      >
                                        <PencilSquareIcon className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                                      </button>
                                      <button 
                                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                                        title="View Document"
                                        onClick={() => {
                                          console.log('🔍 List view - Viewing document:', doc);
                                          handleViewDocument(doc);
                                        }}
                                      >
                                        <EyeIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                      </button>
                                      <button 
                                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                                        title="Download Document"
                                      >
                                        <ArrowDownTrayIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Clean Apple-Style Grid View
                      filteredDocuments.map((doc, index) => {
                        const fileTypeInfo = getFileTypeIcon(doc.file_type);
                        // Create unique key to avoid duplicates
                        const uniqueKey = `grid-${doc.id}-${doc.category}-${doc.requirement}-${index}`;
                        
                        return (
                          <motion.div
                            key={uniqueKey}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
                            whileHover={{ y: -2 }}
                            onClick={() => {
                              console.log('🔍 Grid view - Viewing document:', doc);
                              handleViewDocument(doc);
                            }}
                          >
                            {/* Status Badge - Clean Design */}
                            <div className="absolute top-4 right-4 flex items-center space-x-2">
                              {/* Notes indicator */}
                              {doc.public_notes && doc.public_notes.length > 0 && (
                                <div className="relative flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full" title={`${doc.public_notes.length} note${doc.public_notes.length > 1 ? 's' : ''}`}>
                                  <ChatBubbleLeftRightIcon className="w-3 h-3 text-blue-600" />
                                  {doc.public_notes.length > 1 && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                      {doc.public_notes.length > 9 ? '9+' : doc.public_notes.length}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Status badge */}
                              {doc.status.toLowerCase() === 'approved' ? (
                                <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                                  <CheckCircleIconSolid className="w-4 h-4 text-green-600" />
                                </div>
                              ) : doc.status.toLowerCase() === 'rejected' ? (
                                <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                                  <ClockIcon className="w-4 h-4 text-gray-500" />
                                </div>
                              )}
                            </div>
                            
                            {/* File Type Icon - Clean Design */}
                            <div className="mb-4">
                              <div className={`w-12 h-12 ${fileTypeInfo.bg} rounded-lg flex items-center justify-center`}>
                                <span className={`${fileTypeInfo.color} text-xs font-semibold`}>
                                  {fileTypeInfo.label}
                                </span>
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="space-y-3">
                              {/* File Name */}
                              <h4 className="font-medium text-gray-900 text-sm leading-5 line-clamp-2 pr-8">
                                {cleanFileName(doc.name)}
                              </h4>
                              
                              {/* Category and Requirement */}
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                                  {doc.category}
                                </span>
                                {navigationLevel !== 'requirements' && doc.requirement && (
                                  <div>
                                    <span className="inline-block px-2 py-1 text-xs rounded-md font-medium truncate max-w-full" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
                                      {doc.requirement}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* File Info */}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="truncate">{doc.file_type}</span>
                                <span>
                                  {new Date(doc.upload_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                              
                              {/* Status */}
                              <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                doc.status.toLowerCase() === 'approved' 
                                  ? 'bg-green-50 text-green-700'
                                  : doc.status.toLowerCase() === 'rejected'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-gray-50 text-gray-700'
                              }`}>
                                {doc.status.toLowerCase() === 'approved' ? 'Approved' : 
                                 doc.status.toLowerCase() === 'rejected' ? 'Rejected' : 'Pending Review'}
                              </div>
                              
                              {/* Actions - Clean Design */}
                              <div className="flex items-center space-x-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button 
                                  className="flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-150"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddQuickNote(doc);
                                  }}
                                  title="Add Note"
                                >
                                  <PencilSquareIcon className="w-4 h-4 text-blue-600" />
                                </button>
                                <button 
                                  className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-150"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    console.log('🔍 Grid view - Viewing document:', doc);
                                    handleViewDocument(doc);
                                  }}
                                  title="View Document"
                                >
                                  <EyeIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <button 
                                  className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-150"
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  title="Download Document"
                                >
                                  <ArrowDownTrayIcon className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Quick Note Modal */}
      <AnimatePresence>
        {showQuickNoteModal && quickNoteDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseQuickNoteModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <PencilSquareIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Add Note
                </h3>
                <button
                  onClick={handleCloseQuickNoteModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{cleanFileName(quickNoteDocument.name)}</p>
                    <p className="text-sm text-gray-500">{quickNoteDocument.category}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Content
                  </label>
                  <textarea
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    placeholder="Enter your note here..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    disabled={isSubmittingQuickNote}
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={handleCloseQuickNoteModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={isSubmittingQuickNote}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitQuickNote}
                    disabled={!quickNoteText.trim() || isSubmittingQuickNote}
                    className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    style={{
                      backgroundColor: '#00b5bf',
                      color: '#000',
                      border: '3px solid #00b5bf'
                    }}
                  >
                    {isSubmittingQuickNote ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <PencilSquareIcon className="w-4 h-4" />
                        <span>Save Note</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <CloudArrowUpIcon className="w-6 h-6 mr-2" style={{ color: '#3b82f6' }} />
                    Upload Documents
                  </h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Category *
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isUploading}
                    >
                      <option value="">Select a category...</option>
                      {documentData?.categories?.map((category: DocumentCategory) => (
                        <option key={category.category} value={category.category}>
                          {category.category_display}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Requirement Selection (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specific Requirement (Optional)
                    </label>
                    <select
                      value={uploadRequirement}
                      onChange={(e) => {
                        const selectedRequirementName = e.target.value;
                        setUploadRequirement(selectedRequirementName);
                        
                        // Find and set the requirement ID
                        if (selectedRequirementName && uploadCategory) {
                          const category = documentData?.categories?.find((cat: DocumentCategory) => 
                            cat.category === uploadCategory
                          );
                          if (category) {
                            const requirement = category.required_documents?.find((req: DocumentNeed) => 
                              req.name === selectedRequirementName
                            );
                            if (requirement) {
                              setUploadRequirementId(requirement.id);
                              console.log('🔗 Selected requirement:', selectedRequirementName, 'ID:', requirement.id);
                            } else {
                              setUploadRequirementId('');
                            }
                          }
                        } else {
                          setUploadRequirementId('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isUploading || !uploadCategory}
                    >
                      <option value="">General documents</option>
                      {uploadCategory && documentData?.categories
                        ?.find((cat: DocumentCategory) => cat.category === uploadCategory)
                        ?.required_documents?.map((req: DocumentNeed) => (
                          <option key={req.id} value={req.name}>
                            {req.name}
                          </option>
                        ))}
                    </select>
                    {uploadRequirement && uploadRequirementId && (
                      <p className="text-xs text-blue-600 mt-1">
                        ✓ Will be linked to requirement: {uploadRequirement}
                      </p>
                    )}
                  </div>

                  {/* File Drop Zone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Files *
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                        isDragOver
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isUploading}
                      />
                      
                      <div className="space-y-2">
                        <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400" />
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            Drop files here or click to browse
                          </p>
                          <p className="text-sm text-gray-500">
                            Supports: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (max 10MB each)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selected Files ({selectedFiles.length})
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedFiles.map((file, index) => {
                          const fileKey = `${file.name}-${index}`;
                          const progress = uploadProgress[fileKey] || 0;
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  <DocumentIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(file.size)}
                                  </p>
                                  {isUploading && progress > 0 && (
                                    <div className="mt-1">
                                      <div className="w-full bg-gray-200 rounded-full h-1">
                                        <div 
                                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                      <p className="text-xs text-blue-600 mt-1">{progress}%</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!isUploading && (
                                <button
                                  onClick={() => removeFile(index)}
                                  className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors p-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Upload Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      {selectedFiles.length > 0 && (
                        <span>
                          {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setShowUploadModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        disabled={isUploading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUploadSubmit}
                        disabled={selectedFiles.length === 0 || !uploadCategory || isUploading}
                        className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                        style={{
                          backgroundColor: '#00b5bf',
                          color: '#000',
                          border: '3px solid #00b5bf'
                        }}
                      >
                        {isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <CloudArrowUpIcon className="w-4 h-4" />
                            <span>Upload Files</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      {viewerDocument && (
        <DocumentViewer
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
          document={viewerDocument}
          opportunityId={opportunityId}
        />
      )}
    </div>
  );
};

export default ModernDocumentGrid; 