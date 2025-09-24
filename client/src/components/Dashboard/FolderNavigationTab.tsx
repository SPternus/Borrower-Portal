"use client";

import React, { useState, useEffect, useRef } from 'react';

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

interface FolderNavigationTabProps {
  opportunityId: string;
  loanType?: string;
  onFolderSelect?: (folder: FolderInstance) => void;
  onFileUpload?: (files: FileList, folderId: string) => void;
}

const FolderNavigationTab: React.FC<FolderNavigationTabProps> = ({
  opportunityId,
  loanType,
  onFolderSelect,
  onFileUpload
}) => {
  const [folders, setFolders] = useState<FolderInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderInstance | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
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

  const debugFolders = async () => {
    try {
      const response = await fetch(`/api/debug/folders/${opportunityId}`);
      const data = await response.json();
      setDebugInfo(data);
      console.log('🔍 Debug Info:', data);
    } catch (error) {
      console.error('Debug error:', error);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedFolder) return;

    setLoading(true);
    const uploadResults = [];
    
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('opportunity_id', opportunityId);
        formData.append('category', selectedFolder.allowed_categories || 'General');
        formData.append('requirement_name', selectedFolder.name);
        formData.append('folder_instance_id', selectedFolder.id);
        formData.append('document_description', `Document uploaded to ${selectedFolder.name}`);
        
        try {
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            uploadResults.push({ file: file.name, success: true, result });
            console.log(`✅ Uploaded ${file.name} to folder ${selectedFolder.name}`);
          } else {
            const error = await response.json();
            uploadResults.push({ file: file.name, success: false, error: error.error });
            console.error(`❌ Failed to upload ${file.name}:`, error.error);
          }
        } catch (uploadError) {
          uploadResults.push({ file: file.name, success: false, error: 'Network error' });
          console.error(`❌ Upload error for ${file.name}:`, uploadError);
        }
      }
      
      // Show results to user
      const successful = uploadResults.filter(r => r.success).length;
      const failed = uploadResults.filter(r => !r.success).length;
      
      if (successful > 0) {
        // Refresh folder hierarchy to update file counts
        await fetchFolderHierarchy();
      }
      
      // You could add a toast notification here
      console.log(`Upload complete: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('Upload process error:', error);
    } finally {
      setLoading(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileDrop = async (files: FileList, folder: FolderInstance) => {
    setLoading(true);
    const uploadResults = [];
    
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('opportunity_id', opportunityId);
        formData.append('category', folder.allowed_categories || 'General');
        formData.append('requirement_name', folder.name);
        formData.append('folder_instance_id', folder.id);
        formData.append('document_description', `Document uploaded to ${folder.name}`);
        
        try {
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            uploadResults.push({ file: file.name, success: true, result });
            console.log(`✅ Uploaded ${file.name} to folder ${folder.name}`);
          } else {
            const error = await response.json();
            uploadResults.push({ file: file.name, success: false, error: error.error });
            console.error(`❌ Failed to upload ${file.name}:`, error.error);
          }
        } catch (uploadError) {
          uploadResults.push({ file: file.name, success: false, error: 'Network error' });
          console.error(`❌ Upload error for ${file.name}:`, uploadError);
        }
      }
      
      // Show results to user
      const successful = uploadResults.filter(r => r.success).length;
      const failed = uploadResults.filter(r => !r.success).length;
      
      if (successful > 0) {
        // Refresh folder hierarchy to update file counts
        await fetchFolderHierarchy();
      }
      
      console.log(`Drag & Drop upload complete: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('Drag & Drop upload process error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFolder = (folder: FolderInstance, level: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;
    const needsMoreFiles = folder.required && folder.file_count < folder.min_files;

    return (
      <div key={folder.id} className="folder-item">
        <div
          className={`folder-row ${isSelected ? 'selected' : ''} ${folder.required ? 'required' : ''} ${needsMoreFiles ? 'needs-files' : ''} ${dragOver === folder.id ? 'drag-over' : ''}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => handleFolderClick(folder)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(folder.id);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              setSelectedFolder(folder);
              handleFileDrop(files, folder);
            }
          }}
        >
          {hasChildren && (
            <button
              className="folder-toggle"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            >
              <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
            </button>
          )}
          
          <div className="folder-icon-container">
            {hasChildren ? (
              <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
            ) : (
              <span className="document-icon">📄</span>
            )}
          </div>
          
          <div className="folder-content">
            <span className="folder-name">{folder.name}</span>
            
            <div className="folder-badges">
              {folder.required && (
                <span className="required-badge">
                  {needsMoreFiles ? `Required (${folder.file_count}/${folder.min_files})` : 'Required ✓'}
                </span>
              )}
              
              <span className={`file-count ${needsMoreFiles ? 'insufficient' : folder.file_count > 0 ? 'has-files' : 'empty'}`}>
                {folder.file_count} {folder.file_count === 1 ? 'file' : 'files'}
              </span>
            </div>
          </div>

          {isSelected && (
            <div className="folder-actions">
              <button
                className="upload-to-folder-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                title="Upload files to this folder"
              >
                📤
              </button>
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="folder-children">
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="folder-navigation-loading">
        <div className="loading-spinner"></div>
        <p>Loading folder structure...</p>
      </div>
    );
  }

  return (
    <div className="folder-navigation-tab">
      <div className="folder-navigation-header">
        <h3>📁 Document Folders</h3>
        
        {folders.length === 0 && !error && (
          <div className="no-folders-message">
            <p>No folder structure found for this opportunity.</p>
            <p>Please check that Folder_instance records exist in Salesforce for this opportunity.</p>
          </div>
        )}
        
        {folders.length > 0 && (
          <div className="folder-actions">
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedFolder}
            >
              📤 Upload to Selected Folder
            </button>
            <button
              className="refresh-btn"
              onClick={fetchFolderHierarchy}
            >
              🔄 Refresh
            </button>
            <button
              className="debug-btn"
              onClick={debugFolders}
            >
              🔍 Debug
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchFolderHierarchy}>Try Again</button>
        </div>
      )}

      {folders.length > 0 && (
        <div className="folder-tree">
          {folders.map(folder => renderFolder(folder))}
        </div>
      )}

      {selectedFolder && (
        <div className="selected-folder-info">
          <h4>Selected Folder</h4>
          <p><strong>Name:</strong> {selectedFolder.name}</p>
          <p><strong>Files:</strong> {selectedFolder.file_count}</p>
          <p><strong>Required:</strong> {selectedFolder.required ? 'Yes' : 'No'}</p>
          <p><strong>Min Files:</strong> {selectedFolder.min_files}</p>
          {selectedFolder.path && (
            <p><strong>Path:</strong> {selectedFolder.path}</p>
          )}
          {selectedFolder.allowed_categories && (
            <p><strong>Allowed Categories:</strong> {selectedFolder.allowed_categories}</p>
          )}
        </div>
      )}

      {debugInfo && (
        <div className="debug-info">
          <h4>🔍 Debug Information</h4>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <style jsx>{`
        .folder-navigation-tab {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .folder-navigation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
        }

        .folder-navigation-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .folder-actions {
          display: flex;
          gap: 10px;
        }

        .upload-btn, .refresh-btn, .debug-btn, .create-structure-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .upload-btn:hover, .refresh-btn:hover, .debug-btn:hover, .create-structure-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .upload-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .create-structure-btn {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .create-structure-btn:hover {
          background: #2563eb;
        }

        .folder-tree {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: #fafafa;
          max-height: 400px;
          overflow-y: auto;
        }

        .folder-row {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #e5e7eb;
          transition: all 0.2s ease;
          border-radius: 6px;
          margin: 2px 0;
        }

        .folder-row:hover {
          background: #f8fafc;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .folder-row.selected {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .folder-row.required {
          border-left: 4px solid #f59e0b;
        }

        .folder-row.needs-files {
          border-left: 4px solid #ef4444;
          background: #fef2f2;
        }

        .folder-row.needs-files:hover {
          background: #fee2e2;
        }

        .folder-row.drag-over {
          background: #dbeafe;
          border: 2px dashed #3b82f6;
          transform: scale(1.02);
        }

        .folder-toggle {
          background: none;
          border: none;
          cursor: pointer;
          margin-right: 12px;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .folder-toggle:hover {
          background: rgba(0,0,0,0.05);
        }

        .toggle-icon {
          display: inline-block;
          transition: transform 0.2s ease;
          color: #6b7280;
          font-size: 0.75rem;
        }

        .toggle-icon.expanded {
          transform: rotate(90deg);
        }

        .folder-icon-container {
          margin-right: 12px;
          font-size: 1.1rem;
        }

        .folder-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .folder-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.95rem;
        }

        .folder-badges {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .required-badge {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          border: 1px solid #f59e0b;
        }

        .file-count {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 500;
          min-width: 20px;
          text-align: center;
        }

        .file-count.empty {
          background: #f3f4f6;
          color: #9ca3af;
        }

        .file-count.has-files {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #22c55e;
        }

        .file-count.insufficient {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #ef4444;
        }

        .folder-actions {
          margin-left: 8px;
        }

        .upload-to-folder-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .upload-to-folder-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .selected-folder-info {
          margin-top: 20px;
          padding: 15px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .selected-folder-info h4 {
          margin: 0 0 10px 0;
          color: #1f2937;
        }

        .selected-folder-info p {
          margin: 5px 0;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .no-folders-message {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .error-message button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }

        .folder-navigation-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .debug-info {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          max-height: 300px;
          overflow-y: auto;
        }

        .debug-info h4 {
          margin: 0 0 10px 0;
          color: #495057;
        }

        .debug-info pre {
          margin: 0;
          font-size: 0.75rem;
          color: #6c757d;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
};

export default FolderNavigationTab;
