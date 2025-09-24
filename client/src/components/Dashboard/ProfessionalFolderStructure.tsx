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
  EyeIcon,
  TrashIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface FolderInstance {
  id: string;
  instance_id: string;
  name: string;
  parent_id?: string;
  required: boolean;
  path: string;
  template: boolean;
  allowed_categories: string[];
  min_files: number;
  file_count: number;
  children?: FolderInstance[];
}

interface FileItem {
  id: string;
  name: string;
  category: string;
  uploaded_on: string;
  approval_status: 'Pending' | 'Approved' | 'Rejected';
  s3_key: string;
}

interface ProfessionalFolderStructureProps {
  opportunityId: string;
  loanType: string;
  onFolderSelect?: (folder: FolderInstance) => void;
}

const ProfessionalFolderStructure: React.FC<ProfessionalFolderStructureProps> = ({
  opportunityId,
  loanType,
  onFolderSelect
}) => {
  const [folders, setFolders] = useState<FolderInstance[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<FolderInstance | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);

  useEffect(() => {
    fetchFolderStructure();
  }, [opportunityId, loanType]);

  const fetchFolderStructure = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/folders/opportunities/${opportunityId}?loan_type=${encodeURIComponent(loanType)}`);
      const data = await response.json();
      
      if (data.success) {
        setFolders(data.folders || []);
        // Auto-expand root folders
        const rootFolders = data.folders?.filter((f: FolderInstance) => !f.parent_id) || [];
        setExpandedFolders(new Set(rootFolders.map((f: FolderInstance) => f.id)));
      }
    } catch (error) {
      console.error('Error fetching folder structure:', error);
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

  const selectFolder = async (folder: FolderInstance) => {
    setSelectedFolder(folder);
    onFolderSelect?.(folder);
    await fetchFolderFiles(folder);
  };

  const fetchFolderFiles = async (folder: FolderInstance) => {
    setLoadingFiles(true);
    try {
      const response = await fetch(`/api/folders/instance/${folder.instance_id}/files`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files || []);
      } else {
        console.error('Error fetching files:', data.error);
        setFiles([]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileUpload = async (folder: FolderInstance, file: File) => {
    setUploadingTo(folder.id);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('opportunity_id', opportunityId);
      formData.append('category', 'General');
      formData.append('requirement_name', folder.name);
      formData.append('folder_instance_id', folder.instance_id);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh folder structure to show updated file counts
        await fetchFolderStructure();
        // Refresh files in current folder if it's the same folder
        if (selectedFolder && selectedFolder.id === folder.id) {
          await fetchFolderFiles(selectedFolder);
        }
      } else {
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingTo(null);
    }
  };

  const getStatusColor = (folder: FolderInstance) => {
    if (folder.file_count === 0 && folder.required) return 'text-red-500';
    if (folder.file_count < folder.min_files) return 'text-amber-500';
    return 'text-green-500';
  };

  const getStatusIcon = (folder: FolderInstance) => {
    if (folder.file_count === 0 && folder.required) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
    }
    if (folder.file_count >= folder.min_files) {
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    }
    return <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />;
  };

  const renderFolder = (folder: FolderInstance, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <motion.div
        key={folder.id}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1"
      >
        {/* Folder Header */}
        <div
          className={`
            flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-200
            ${isSelected 
              ? 'bg-blue-100 text-blue-900 font-medium' 
              : 'text-gray-700 hover:bg-gray-100'
            }
          `}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => selectFolder(folder)}
        >
          {/* Expand/Collapse Button - Fixed width for alignment */}
          <div className="w-5 flex justify-center mr-2">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3 text-gray-500" />
                )}
              </button>
            )}
          </div>

          {/* Folder Icon - Fixed width for alignment */}
          <div className="w-5 flex justify-center mr-3">
            {isSelected ? (
              <FolderOpenIcon className="w-4 h-4 text-blue-600" />
            ) : (
              <FolderIcon className="w-4 h-4 text-gray-500" />
            )}
          </div>

          {/* Folder Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{folder.name}</span>
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                {folder.required && (
                  <div className="w-2 h-2 bg-red-500 rounded-full" title="Required" />
                )}
                {getStatusIcon(folder)}
                <span className={`text-xs font-medium ${getStatusColor(folder)}`}>
                  {folder.file_count}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Children Folders */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1"
            >
              {folder.children?.map(child => renderFolder(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading folder structure...</span>
        </div>
      </div>
    );
  }

  const renderFileItem = (file: FileItem) => {
    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'Approved':
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
        case 'Rejected':
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
        default:
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      }
    };

    return (
      <motion.div
        key={file.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
      >
        <div className="flex items-center space-x-3 flex-1">
          <DocumentIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500">{file.category}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {new Date(file.uploaded_on).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusBadge(file.approval_status)}
          <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
            <EyeIcon className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-[800px]">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Document Manager</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload and organize your loan documents by category
            </p>
          </div>
          
          
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex h-full">
        {/* Left Sidebar - Folder Tree */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Folders</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-600">Loading...</span>
                </div>
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center py-12">
                <FolderIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No folders found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {folders
                  .filter(folder => !folder.parent_id)
                  .map(folder => renderFolder(folder))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - File List */}
        <div className="flex-1 flex flex-col">
          {selectedFolder ? (
            <>
              {/* Folder Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FolderOpenIcon className="w-6 h-6 text-blue-500" />
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedFolder.name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-600">
                          {selectedFolder.file_count} files uploaded
                        </p>
                        {selectedFolder.required && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">•</span>
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${
                              selectedFolder.file_count >= selectedFolder.min_files
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              <span>
                                {selectedFolder.file_count >= selectedFolder.min_files ? '✓' : '⚠️'} 
                                {selectedFolder.file_count}/{selectedFolder.min_files} required
                              </span>
                            </div>
                          </div>
                        )}
                        {!selectedFolder.required && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                              Optional folder
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Progress Bar for Required Folders */}
                      {selectedFolder.required && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Upload Progress</span>
                            <span>
                              {Math.min(Math.round((selectedFolder.file_count / selectedFolder.min_files) * 100), 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                selectedFolder.file_count >= selectedFolder.min_files 
                                  ? 'bg-green-500' 
                                  : 'bg-blue-500'
                              }`}
                              style={{ 
                                width: `${Math.min((selectedFolder.file_count / selectedFolder.min_files) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      id={`upload-main-${selectedFolder.id}`}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(selectedFolder, file);
                        }
                      }}
                      disabled={uploadingTo === selectedFolder.id}
                    />
                    <label
                      htmlFor={`upload-main-${selectedFolder.id}`}
                      className={`
                        inline-flex items-center px-4 py-2 rounded-lg cursor-pointer transition-all
                        ${uploadingTo === selectedFolder.id
                          ? 'bg-gray-100 cursor-not-allowed text-gray-500' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md'
                        }
                      `}
                    >
                      {uploadingTo === selectedFolder.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                          Upload Files
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* File List */}
              <div className="flex-1 p-4 overflow-y-auto">
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-600">Loading files...</span>
                    </div>
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 mb-2">No files uploaded</h4>
                    {selectedFolder.required ? (
                      <div className="mb-4">
                        <p className="text-gray-600 mb-2">
                          This folder requires <strong>{selectedFolder.min_files}</strong> file{selectedFolder.min_files > 1 ? 's' : ''}
                        </p>
                        <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          ⚠️ {selectedFolder.min_files} file{selectedFolder.min_files > 1 ? 's' : ''} needed
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600 mb-4">
                        Upload your first document to get started
                      </p>
                    )}
                    <label
                      htmlFor={`upload-empty-${selectedFolder.id}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors"
                    >
                      <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                      Upload Files
                    </label>
                    <input
                      type="file"
                      id={`upload-empty-${selectedFolder.id}`}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(selectedFolder, file);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map(file => renderFileItem(file))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No Folder Selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a folder</h3>
                <p className="text-gray-600">
                  Choose a folder from the sidebar to view and manage files
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalFolderStructure;
