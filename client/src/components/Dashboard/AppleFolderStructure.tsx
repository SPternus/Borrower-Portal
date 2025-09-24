'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderIcon, 
  DocumentIcon, 
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, FolderIcon as FolderIconSolid } from '@heroicons/react/24/solid';

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

interface AppleFolderStructureProps {
  opportunityId: string;
  loanType?: string;
  onFolderSelect?: (folder: FolderInstance) => void;
}

const AppleFolderStructure: React.FC<AppleFolderStructureProps> = ({
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
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
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

  const getStatusInfo = (folder: FolderInstance) => {
    const needsMoreFiles = folder.required && folder.file_count < folder.min_files;
    const isComplete = folder.required && folder.file_count >= folder.min_files;
    const hasFiles = folder.file_count > 0;
    
    if (isComplete) {
      return {
        status: 'complete',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: CheckCircleIconSolid,
        text: 'Complete'
      };
    } else if (needsMoreFiles) {
      return {
        status: 'insufficient',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: ExclamationTriangleIcon,
        text: `Need ${folder.min_files - folder.file_count} more`
      };
    } else if (hasFiles) {
      return {
        status: 'partial',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: DocumentIcon,
        text: `${folder.file_count} files`
      };
    } else {
      return {
        status: 'empty',
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: FolderIcon,
        text: 'Empty'
      };
    }
  };

  const renderFolder = (folder: FolderInstance, level: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;
    const isUploading = uploading.has(folder.id);
    const isDragOver = dragOver === folder.id;
    const statusInfo = getStatusInfo(folder);

    return (
      <motion.div
        key={folder.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-3"
        style={{ marginLeft: `${level * 24}px` }}
      >
        <motion.div
          className={`
            relative group rounded-xl border-2 transition-all duration-300 cursor-pointer
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50 shadow-lg scale-[1.02]' 
              : isSelected 
                ? 'border-blue-300 bg-blue-50 shadow-md' 
                : `${statusInfo.borderColor} ${statusInfo.bgColor} hover:shadow-md hover:border-gray-300`
            }
            backdrop-blur-sm
          `}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
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
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Expand/Collapse Button */}
                {hasChildren && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(folder.id);
                    }}
                    className="p-1 rounded-full hover:bg-white/50 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                    </motion.div>
                  </motion.button>
                )}

                {/* Folder Icon */}
                <div className="flex-shrink-0">
                  {hasChildren ? (
                    <FolderIconSolid className={`w-8 h-8 ${isExpanded ? 'text-blue-500' : 'text-gray-400'}`} />
                  ) : (
                    <DocumentIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                {/* Folder Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {folder.name}
                    </h3>
                    
                    {folder.required && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Required
                      </span>
                    )}
                  </div>

                  {/* Progress Bar for Required Folders */}
                  {folder.required && folder.min_files > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{Math.min(folder.file_count, folder.min_files)}/{folder.min_files} files</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            folder.file_count >= folder.min_files 
                              ? 'bg-gradient-to-r from-green-400 to-green-500' 
                              : 'bg-gradient-to-r from-blue-400 to-blue-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${Math.min((folder.file_count / folder.min_files) * 100, 100)}%` 
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center space-x-3">
                {/* Status Indicator */}
                <div className={`flex items-center space-x-1 ${statusInfo.color}`}>
                  <statusInfo.icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{statusInfo.text}</span>
                </div>

                {/* Upload Button */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploading}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isUploading ? (
                        <>
                          <motion.div
                            className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="w-3 h-3 mr-1" />
                          Upload
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Drag Overlay */}
          <AnimatePresence>
            {isDragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-xl border-2 border-dashed border-blue-400 flex items-center justify-center backdrop-blur-sm"
              >
                <div className="text-blue-600 font-semibold text-sm">Drop files here</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="mt-3 overflow-hidden"
            >
              {folder.children!.map(child => renderFolder(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          className="flex items-center space-x-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span className="text-gray-600 font-medium">Loading folder structure...</span>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-red-50 border border-red-200 p-6"
      >
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-red-800">Error loading folders</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <motion.button
                onClick={fetchFolderHierarchy}
                className="bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium text-red-800 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowPathIcon className="w-4 h-4 inline mr-2" />
                Try again
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Document Folders</h2>
          <p className="text-sm text-gray-500 mt-1">Organize and upload your documents</p>
        </div>
        <motion.button
          onClick={fetchFolderHierarchy}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Refresh
        </motion.button>
      </div>

      {/* Folder Tree */}
      <div className="space-y-3">
        <AnimatePresence>
          {folders.map(folder => renderFolder(folder))}
        </AnimatePresence>
      </div>

      {/* Selected Folder Details */}
      <AnimatePresence>
        {selectedFolder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Folder</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900 font-semibold">{selectedFolder.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Files</dt>
                <dd className="text-sm text-gray-900 font-semibold">{selectedFolder.file_count}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Required</dt>
                <dd className="text-sm text-gray-900 font-semibold">{selectedFolder.required ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Minimum Files</dt>
                <dd className="text-sm text-gray-900 font-semibold">{selectedFolder.min_files}</dd>
              </div>
            </div>
            
            {selectedFolder.required && selectedFolder.min_files > 0 && (
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Completion Status</span>
                  <span className={`font-semibold ${
                    selectedFolder.file_count >= selectedFolder.min_files ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedFolder.file_count >= selectedFolder.min_files ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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

export default AppleFolderStructure;




