'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/modern/Card';
import { Button } from '../ui/modern/Button';
import { Badge } from '../ui/modern/Badge';
import { cn, formatDate } from '../../lib/utils';

// Types
interface LoanTypeDocument {
  name: string;
  category: string;
  category_display?: string;
  required: boolean;
  priority: 'high' | 'medium' | 'low';
  description?: string;
  folder_id?: string;
  sort_order?: number;
}

interface UploadedDocument {
  id: string;
  name: string;
  category?: string | null;
  document_name?: string | null; // The specific document requirement this fulfills
  file_type: string;
  file_size: number;
  uploaded_date: string;
  status: 'uploaded' | 'approved' | 'rejected' | 'pending';
}

interface DocumentsTabProps {
  opportunityId: string;
  loanType: string;
  onDocumentUploaded?: () => void;
  onDocumentCountsUpdate?: (counts: {approved: number, total: number}) => void;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({
  opportunityId,
  loanType,
  onDocumentUploaded,
  onDocumentCountsUpdate
}) => {
  const [requiredDocuments, setRequiredDocuments] = useState<LoanTypeDocument[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [documentsPerPage] = useState(6);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [recentlyUploaded, setRecentlyUploaded] = useState<string[]>([]);
  const [previewDocument, setPreviewDocument] = useState<UploadedDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dataSource, setDataSource] = useState<'salesforce' | 'fallback' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch loan type requirements from Salesforce
  useEffect(() => {
    const fetchLoanTypeRequirements = async () => {
      try {
        setLoading(true);
        
        // Try to fetch interactive document structure first (includes both needs and uploads)
        const interactiveResponse = await fetch(`/api/opportunities/${opportunityId}/interactive-documents`);
        
        if (interactiveResponse.ok) {
          const interactiveData = await interactiveResponse.json();
          if (interactiveData.success) {
            console.log('🗂️ Using Salesforce interactive document structure');
            
            // Handle different response formats from the API
            let folderStructure = [];
            
            if (interactiveData.folder_structure) {
              // New format with folder_structure
              folderStructure = interactiveData.folder_structure;
            } else if (interactiveData.categories) {
              // Old format with categories
              folderStructure = interactiveData.categories;
            }
            
            // Convert interactive structure to flat document list for backward compatibility
            const flatDocuments = [];
            for (const folder of folderStructure) {
              for (const docNeed of folder.required_documents) {
                flatDocuments.push({
                  name: docNeed.name,
                  category: docNeed.category,
                  category_display: folder.category_display,
                  required: docNeed.required,
                  priority: docNeed.priority,
                  description: docNeed.description,
                  folder_id: docNeed.id,
                  sort_order: docNeed.sort_order
                });
              }
            }
            
            setRequiredDocuments(flatDocuments);
            setDataSource('salesforce');
            return;
          }
        }
        
        // Try to fetch from Salesforce folder structure
        const salesforceResponse = await fetch(`/api/config/loan-types/${loanType}/salesforce-folders`);
        
        if (salesforceResponse.ok) {
          const salesforceData = await salesforceResponse.json();
          if (salesforceData.success) {
            console.log('📁 Using Salesforce document folder structure:', salesforceData.source);
            setRequiredDocuments(salesforceData.documents || []);
            setDataSource(salesforceData.source === 'salesforce' ? 'salesforce' : 'fallback');
            return;
          }
        }
        
        // Fall back to hardcoded mappings if Salesforce fails
        console.log('📋 Falling back to hardcoded document requirements');
        const fallbackResponse = await fetch(`/api/config/loan-types/${loanType}/documents`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setRequiredDocuments(fallbackData.documents || []);
          setDataSource('fallback');
        }
        
      } catch (error) {
        console.error('Error fetching loan type requirements:', error);
        
        // Final fallback to hardcoded mappings
        try {
          const fallbackResponse = await fetch(`/api/config/loan-types/${loanType}/documents`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            setRequiredDocuments(fallbackData.documents || []);
            setDataSource('fallback');
          }
        } catch (fallbackError) {
          console.error('Error fetching fallback requirements:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    if (loanType && opportunityId) {
      fetchLoanTypeRequirements();
    }
  }, [loanType, opportunityId]);

  // Fetch uploaded documents
  useEffect(() => {
    const fetchUploadedDocuments = async () => {
      try {
        const response = await fetch(`/api/documents/opportunity/${opportunityId}`);
        if (response.ok) {
          const data = await response.json();
          setUploadedDocuments(data.documents || []);
        }
      } catch (error) {
        console.error('Error fetching uploaded documents:', error);
      }
    };

    if (opportunityId) {
      fetchUploadedDocuments();
    }
  }, [opportunityId]);

  // Update document counts whenever required documents or uploaded documents change
  useEffect(() => {
    if (onDocumentCountsUpdate && requiredDocuments.length > 0) {
      const uploadedCount = requiredDocuments.filter(doc => {
        const docs = getUploadedDocuments(doc);
        return docs.length > 0;
      }).length;
      
      const approvedCount = requiredDocuments.filter(doc => {
        const docs = getUploadedDocuments(doc);
        return docs.some(uploadedDoc => uploadedDoc.status === 'approved');
      }).length;
      
      onDocumentCountsUpdate({
        approved: approvedCount,
        total: requiredDocuments.length
      });
    }
  }, [requiredDocuments, uploadedDocuments, onDocumentCountsUpdate]);

  // Handle file upload with progress tracking and animations
  const handleFileUpload = async (file: File, category: string, description?: string) => {
    // Create a specific document identifier
    const docName = description?.replace("Document for:", "").trim() || "";
    const documentKey = `${category}-${docName}`;
    const uploadId = `${documentKey}-${Date.now()}`;
    
    try {
      // Add this specific document to uploading set
      setUploadingDocuments(prev => new Set(prev).add(documentKey));
      setUploadProgress({ [uploadId]: 0 });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('opportunity_id', opportunityId);
      formData.append('document_category', category);
      if (description) {
        formData.append('document_description', description);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[uploadId] || 0;
          if (current < 90) {
            return { [uploadId]: current + 10 };
          }
          return prev;
        });
      }, 200);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      
      if (response.ok) {
        // Complete progress to 100%
        setUploadProgress({ [uploadId]: 100 });
        
        const result = await response.json();
        console.log('Document uploaded successfully:', result);
        
        // Add to recently uploaded for animation
        setRecentlyUploaded(prev => [...prev, result.document_id]);
        
        // Remove from recently uploaded after animation
        setTimeout(() => {
          setRecentlyUploaded(prev => prev.filter(id => id !== result.document_id));
        }, 2000);
        
        // Clear progress and remove from uploading set
        setTimeout(() => {
          setUploadProgress({});
          setUploadingDocuments(prev => {
            const newSet = new Set(prev);
            newSet.delete(documentKey);
            return newSet;
          });
        }, 800);
        
        // Refresh uploaded documents with a slight delay for better UX
        setTimeout(async () => {
          const docsResponse = await fetch(`/api/documents/opportunity/${opportunityId}`);
          if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            setUploadedDocuments(docsData.documents || []);
          }
        }, 500);
        
        onDocumentUploaded?.();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Clear progress and uploading state on error
      setUploadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentKey);
        return newSet;
      });
      setUploadProgress({});
    }
  };

  // Trigger file input
  const triggerFileInput = (requiredDoc: LoanTypeDocument) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-category', requiredDoc.category);
      fileInputRef.current.setAttribute('data-document-name', requiredDoc.name);
      fileInputRef.current.click();
    }
  };

  // Handle file input change (supports multiple files)
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const category = event.target.getAttribute('data-category');
    const documentName = event.target.getAttribute('data-document-name');
    
    if (files && category && documentName) {
      // Upload each file separately
      Array.from(files).forEach(file => {
        handleFileUpload(file, category, `Document for: ${documentName}`);
      });
    }
    
    // Reset input
    event.target.value = '';
  };

  // Handle document preview
  const handlePreviewDocument = (document: UploadedDocument) => {
    setPreviewDocument(document);
    setShowPreview(true);
  };

  // Close preview modal
  const closePreview = () => {
    setShowPreview(false);
    setPreviewDocument(null);
  };

  // Get file preview URL (for images) or show file info
  const getPreviewContent = (document: UploadedDocument) => {
    const isImage = document.file_type.startsWith('image/');
    const isPdf = document.file_type === 'application/pdf';
    
    if (isImage) {
      return (
        <img
          src={`/api/documents/opportunity/${opportunityId}/download/${document.id}`}
          alt={document.name}
          className="max-w-full max-h-96 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    } else if (isPdf) {
      return (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl">📄</div>
          <p className="text-lg font-medium">PDF Document</p>
          <Button
            onClick={() => {
              window.open(`/api/documents/opportunity/${opportunityId}/download/${document.id}`, '_blank');
            }}
            className="mt-4"
          >
            Open PDF in New Tab
          </Button>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl">📄</div>
          <p className="text-lg font-medium">{document.name}</p>
          <p className="text-sm text-gray-600">File type: {document.file_type}</p>
          <Button
            onClick={() => {
              window.open(`/api/documents/opportunity/${opportunityId}/download/${document.id}`, '_blank');
            }}
            className="mt-4"
          >
            Download File
          </Button>
        </div>
      );
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // Check if a required document has been uploaded
  const isDocumentUploaded = (requiredDoc: LoanTypeDocument) => {
    return getDocumentMapping().has(`${requiredDoc.category}-${requiredDoc.name}`);
  };

  // Create mapping of uploaded documents to required documents (supporting multiple files per requirement)
  const getDocumentMapping = () => {
    const mapping = new Map<string, UploadedDocument[]>();
    
    // First pass: exact document name matches within same category
    for (const uploadedDoc of uploadedDocuments) {
      if (!uploadedDoc.category) continue;
      
      for (const requiredDoc of requiredDocuments) {
        if (uploadedDoc.category.toLowerCase().trim() === requiredDoc.category.toLowerCase().trim()) {
          // Check for exact document name match first
          if (uploadedDoc.document_name === requiredDoc.name) {
            const key = `${requiredDoc.category}-${requiredDoc.name}`;
            if (!mapping.has(key)) {
              mapping.set(key, []);
            }
            mapping.get(key)!.push(uploadedDoc);
            break;
          }
        }
      }
    }
    
    // Second pass: file name similarity matches within same category (for remaining docs)
    const usedDocuments = new Set(Array.from(mapping.values()).flat().map(doc => doc.id));
    
    for (const uploadedDoc of uploadedDocuments) {
      if (usedDocuments.has(uploadedDoc.id) || !uploadedDoc.category) continue;
      
      for (const requiredDoc of requiredDocuments) {
        if (uploadedDoc.category.toLowerCase().trim() === requiredDoc.category.toLowerCase().trim()) {
          const key = `${requiredDoc.category}-${requiredDoc.name}`;
          
          // Check file name similarity
          const uploadedName = uploadedDoc.name.toLowerCase();
          const requiredName = requiredDoc.name.toLowerCase();
          const requiredWords = requiredName.split(/\s+/);
          
          if (requiredWords.some(word => word.length > 2 && uploadedName.includes(word))) {
            if (!mapping.has(key)) {
              mapping.set(key, []);
            }
            mapping.get(key)!.push(uploadedDoc);
            usedDocuments.add(uploadedDoc.id);
            break;
          }
        }
      }
    }
    
    // Third pass: category-only matches for remaining documents
    for (const uploadedDoc of uploadedDocuments) {
      if (usedDocuments.has(uploadedDoc.id) || !uploadedDoc.category) continue;
      
      for (const requiredDoc of requiredDocuments) {
        if (uploadedDoc.category.toLowerCase().trim() === requiredDoc.category.toLowerCase().trim()) {
          const key = `${requiredDoc.category}-${requiredDoc.name}`;
          if (!mapping.has(key)) {
            mapping.set(key, []);
          }
          mapping.get(key)!.push(uploadedDoc);
          usedDocuments.add(uploadedDoc.id);
          break;
        }
      }
    }
    
    return mapping;
  };
  
  const documentMapping = getDocumentMapping();
  
  // Get uploaded documents for specific required document (returns array)
  const getUploadedDocuments = (requiredDoc: LoanTypeDocument) => {
    return documentMapping.get(`${requiredDoc.category}-${requiredDoc.name}`) || [];
  };

  // Get first uploaded document for specific required document (backward compatibility)
  const getUploadedDocument = (requiredDoc: LoanTypeDocument) => {
    const docs = getUploadedDocuments(requiredDoc);
    return docs.length > 0 ? docs[0] : null;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(requiredDocuments.map(doc => doc.category)))];

  // Filter documents by category
  const filteredDocuments = selectedCategory === 'all' 
    ? requiredDocuments 
    : requiredDocuments.filter(doc => doc.category === selectedCategory);

  // Pagination logic
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const endIndex = startIndex + documentsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Reset to first page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Document Requirements
            </h3>
            {dataSource && (
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                dataSource === 'salesforce' 
                  ? "bg-green-100 text-green-700 border border-green-200" 
                  : "bg-yellow-100 text-yellow-700 border border-yellow-200"
              )}>
                {dataSource === 'salesforce' ? '📁 Salesforce Folders' : '📋 Default Config'}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {loanType.replace(/[-_]/g, ' ')} loan requirements
            {dataSource === 'salesforce' && ' (from Salesforce folder structure)'}
          </p>
        </div>
        <div className="text-sm text-gray-600">
          {requiredDocuments.filter(doc => getUploadedDocuments(doc).length > 0).length} of {requiredDocuments.length} uploaded
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium transition-colors",
              selectedCategory === category
                ? "bg-primary-100 text-primary-700 border border-primary-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {category === 'all' ? 'All Categories' : category.replace(/[-_]/g, ' ')}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {paginatedDocuments.map((requiredDoc, index) => {
          const uploadedDocs = getUploadedDocuments(requiredDoc);
          const isUploaded = uploadedDocs.length > 0;
          const documentKey = `${requiredDoc.category}-${requiredDoc.name}`;
          const isCurrentlyUploading = uploadingDocuments.has(documentKey);
          const hasRecentlyUploadedDoc = uploadedDocs.some(doc => recentlyUploaded.includes(doc.id));
          
          // Get progress specifically for this document
          const currentProgress = Object.entries(uploadProgress).find(([key]) => 
            key.includes(requiredDoc.category) && key.includes(requiredDoc.name.split(' ')[0])
          )?.[1] || 0;

          return (
            <Card 
              key={index} 
              variant="elevated"
              className={cn(
                "transition-all duration-500 ease-in-out transform",
                hasRecentlyUploadedDoc && "scale-105 ring-2 ring-green-400 ring-opacity-50",
                isCurrentlyUploading && "border-blue-400 bg-blue-50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                      isUploaded ? "bg-success-100 animate-pulse" : "bg-gray-100",
                      isCurrentlyUploading && "bg-blue-100"
                    )}>
                      {isCurrentlyUploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                      ) : isUploaded ? (
                        <span className="text-lg animate-bounce">✅</span>
                      ) : (
                        <span className="text-lg">📄</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{requiredDoc.name}</h4>
                        <Badge 
                          variant={getPriorityColor(requiredDoc.priority)} 
                          size="sm"
                        >
                          {requiredDoc.priority}
                        </Badge>
                        {requiredDoc.required && (
                          <Badge variant="error" size="sm">Required</Badge>
                        )}
                        {hasRecentlyUploadedDoc && (
                          <Badge variant="success" size="sm" className="animate-pulse">
                            Just uploaded!
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        Category: {requiredDoc.category.replace(/[-_]/g, ' ')}
                      </p>
                      {requiredDoc.description && (
                        <p className="text-xs text-gray-500 mt-1">{requiredDoc.description}</p>
                      )}
                      
                      {/* Display multiple uploaded documents */}
                      {uploadedDocs.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {uploadedDocs.map((uploadedDoc, docIndex) => (
                            <div key={uploadedDoc.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                              <span className="text-xs text-gray-500">
                                {uploadedDoc.name} • {formatFileSize(uploadedDoc.file_size)}
                              </span>
                              <span className="text-xs text-gray-500">
                                Uploaded: {formatDate(uploadedDoc.uploaded_date)}
                              </span>
                              <button
                                onClick={() => handlePreviewDocument(uploadedDoc)}
                                className="text-blue-600 hover:text-blue-800 underline text-xs"
                              >
                                Preview
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {isCurrentlyUploading && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${currentProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            Uploading {requiredDoc.name}... {currentProgress}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {uploadedDocs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {uploadedDocs.map((doc) => (
                          <Badge key={doc.id} variant={getStatusColor(doc.status)} size="sm">
                            {doc.status}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {isCurrentlyUploading ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                      </div>
                    ) : (
                      <Button
                        variant={isUploaded ? "outline" : "primary"}
                        size="sm"
                        onClick={() => triggerFileInput(requiredDoc)}
                        className="transition-all duration-200 hover:scale-105"
                      >
                        {isUploaded ? "Add More" : "Upload"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length} documents
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="transition-all duration-200"
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-8 h-8 rounded-md text-sm font-medium transition-all duration-200",
                    currentPage === page
                      ? "bg-primary-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="transition-all duration-200"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Additional Documents */}
      {uploadedDocuments.some(doc => 
        doc.category && !requiredDocuments.some(req => req.category.toLowerCase() === doc.category!.toLowerCase())
      ) && (
        <Card variant="elevated" className="animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📎</span>
              <span>Additional Documents</span>
            </CardTitle>
            <p className="text-sm text-gray-600">Documents uploaded in other categories</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadedDocuments
              .filter(doc => 
                doc.category && !requiredDocuments.some(req => req.category.toLowerCase() === doc.category!.toLowerCase())
              )
              .map((doc, index) => {
                const isRecentlyUploaded = recentlyUploaded.includes(doc.id);
                return (
                  <div 
                    key={doc.id} 
                    className={cn(
                      "flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100",
                      isRecentlyUploaded && "ring-2 ring-green-400 ring-opacity-50 bg-green-50"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                        isRecentlyUploaded ? "bg-green-100" : "bg-gray-100"
                      )}>
                        <span className="text-sm">📄</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{doc.name}</h5>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="font-medium text-blue-600">
                            {doc.category?.replace(/[-_]/g, ' ')}
                          </span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>Uploaded: {formatDate(doc.uploaded_date)}</span>
                          <button
                            onClick={() => handlePreviewDocument(doc)}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isRecentlyUploaded && (
                        <Badge variant="success" size="sm" className="animate-pulse">
                          New!
                        </Badge>
                      )}
                      <Badge variant={getStatusColor(doc.status)} size="sm">
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Uncategorized Documents */}
      {uploadedDocuments.some(doc => !doc.category) && (
        <Card variant="elevated" className="animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>❓</span>
              <span>Uncategorized Documents</span>
            </CardTitle>
            <p className="text-sm text-gray-600">Documents uploaded without specific categories</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadedDocuments
              .filter(doc => !doc.category)
              .map((doc, index) => {
                const isRecentlyUploaded = recentlyUploaded.includes(doc.id);
                return (
                  <div 
                    key={doc.id} 
                    className={cn(
                      "flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100",
                      isRecentlyUploaded && "ring-2 ring-yellow-400 ring-opacity-50 bg-yellow-50"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                        isRecentlyUploaded ? "bg-yellow-100" : "bg-gray-100"
                      )}>
                        <span className="text-sm">📄</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{doc.name}</h5>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="text-orange-600 font-medium">No category assigned</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>Uploaded: {formatDate(doc.uploaded_date)}</span>
                          <button
                            onClick={() => handlePreviewDocument(doc)}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isRecentlyUploaded && (
                        <Badge variant="warning" size="sm" className="animate-pulse">
                          New!
                        </Badge>
                      )}
                      <Badge variant={getStatusColor(doc.status)} size="sm">
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {showPreview && previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{previewDocument.name}</h3>
                <p className="text-sm text-gray-600">
                  {formatFileSize(previewDocument.file_size)} • {previewDocument.file_type}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`/api/documents/opportunity/${opportunityId}/download/${previewDocument.id}`, '_blank');
                  }}
                >
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closePreview}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)] flex items-center justify-center">
              {getPreviewContent(previewDocument)}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.txt"
      />
    </div>
  );
};

export default DocumentsTab; 