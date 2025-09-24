"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, DocumentIcon, CloudArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface FolderInstance {
  id: string;
  name: string;
  parent_id?: string;
  opportunity_id: string;
  required: boolean;
  path: string;
  template: string;
  allowed_categories: string;
  min_files: number;
  created_date?: string;
  active: boolean;
  file_count: number;
  children?: FolderInstance[];
}

interface ModernFolderStructureProps {
  opportunityId: string;
  loanType?: string;
  onFolderSelect?: (folder: FolderInstance) => void;
}

const ModernFolderStructure: React.FC<ModernFolderStructureProps> = ({
  opportunityId,
  loanType,
  onFolderSelect
}) => {
  const [folders, setFolders] = useState<FolderInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderInstance | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFolderHierarchy();
  }, [opportunityId, loanType]);

  const fetchFolderHierarchy = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (loanType) {
        queryParams.append('loan_type', loanType);
      }
      
      const url = `/api/folders/opportunities/${opportunityId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch folder hierarchy');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFolders(data.folders || []);
        
        // Auto-expand root folders
        const rootFolderIds = data.folders
          .filter((folder: FolderInstance) => !folder.parent_id)
          .map((folder: FolderInstance) => folder.id);
        setExpandedFolders(new Set(rootFolderIds));
      } else {
        throw new Error(data.error || 'Failed to load folders');
      }
    } catch (err) {
      console.error('Error fetching folder hierarchy:', err);
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderClick = (folder: FolderInstance) => {
    setSelectedFolder(folder);
    onFolderSelect?.(folder);
  };

  const handleFileUpload = async (files: FileList, folder: FolderInstance) => {
    setUploading(prev => new Set(prev).add(folder.id));
    
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('opportunity_id', opportunityId);
        formData.append('category', folder.allowed_categories || 'General');
        formData.append('requirement_name', folder.name);
        formData.append('folder_instance_id', folder.id);
        formData.append('document_description', `Document uploaded to ${folder.name}`);
        
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to upload ${file.name}`);
        }
      }
      
      // Refresh folder hierarchy to update file counts
      await fetchFolderHierarchy();
      
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(prev => {
        const newSet = new Set(prev);
        newSet.delete(folder.id);
        return newSet;
      });
    }
  };

  const getStatusIcon = (folder: FolderInstance) => {
    const needsMoreFiles = folder.required && folder.file_count < folder.min_files;
    const isComplete = folder.required && folder.file_count >= folder.min_files;
    
    if (isComplete) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else if (needsMoreFiles) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    }
    return null;
  };

  const getStatusColor = (folder: FolderInstance) => {
    const needsMoreFiles = folder.required && folder.file_count < folder.min_files;
    const isComplete = folder.required && folder.file_count >= folder.min_files;
    
    if (isComplete) return 'border-green-200 bg-green-50';
    if (needsMoreFiles) return 'border-red-200 bg-red-50';
    return 'border-gray-200 bg-white';
  };

  const renderFolder = (folder: FolderInstance, level: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;
    const needsMoreFiles = folder.required && folder.file_count < folder.min_files;
    const isUploading = uploading.has(folder.id);
    const isDragOver = dragOver === folder.id;

    return (
      <div key={folder.id} className="mb-2">
        <div
          className={`
            relative rounded-lg border-2 transition-all duration-200 cursor-pointer
            ${isDragOver ? 'border-blue-400 bg-blue-50 scale-[1.02]' : getStatusColor(folder)}
            ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
            hover:shadow-md hover:border-gray-300
          `}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => handleFolderClick(folder)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(folder.id);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragOver(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              handleFileUpload(files, folder);
            }
          }}
        >
          <div className="flex items-center p-4">
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="mr-3 p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}

            {/* Folder Icon */}
            <div className="mr-3">
              {hasChildren ? (
                <FolderIcon className={`w-6 h-6 ${isExpanded ? 'text-blue-500' : 'text-gray-400'}`} />
              ) : (
                <DocumentIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>

            {/* Folder Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {folder.name}
                  </h3>
                  
                  {folder.required && (
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${needsMoreFiles 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                      }
                    `}>
                      {needsMoreFiles 
                        ? `Required (${folder.file_count}/${folder.min_files})`
                        : 'Required ✓'
                      }
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {/* Status Icon */}
                  {getStatusIcon(folder)}
                  
                  {/* File Count */}
                  <span className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${folder.file_count > 0 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {folder.file_count} {folder.file_count === 1 ? 'file' : 'files'}
                  </span>

                  {/* Upload Button */}
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploading}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin -ml-1 mr-2 h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="w-3 h-3 mr-1" />
                          Upload
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress indicator for required folders */}
              {folder.required && folder.min_files > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.min(folder.file_count, folder.min_files)}/{folder.min_files}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        folder.file_count >= folder.min_files ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${Math.min((folder.file_count / folder.min_files) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center">
              <div className="text-blue-600 font-medium">Drop files here</div>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading folder structure...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading folders</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={fetchFolderHierarchy}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Document Folders</h2>
        <button
          onClick={fetchFolderHierarchy}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      {/* Folder Tree */}
      <div className="space-y-2">
        {folders.map(folder => renderFolder(folder))}
      </div>

      {/* Selected Folder Details */}
      {selectedFolder && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Selected Folder Details</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-gray-500">Name</dt>
              <dd className="text-sm text-gray-900">{selectedFolder.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Files</dt>
              <dd className="text-sm text-gray-900">{selectedFolder.file_count}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Required</dt>
              <dd className="text-sm text-gray-900">{selectedFolder.required ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Min Files</dt>
              <dd className="text-sm text-gray-900">{selectedFolder.min_files}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && selectedFolder) {
            handleFileUpload(e.target.files, selectedFolder);
          }
        }}
      />
    </div>
  );
};

export default ModernFolderStructure;




