'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PlusIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface PublicNote {
  id: string;
  note: string;
  created_date: string;
  created_by: string;
  created_by_type: string;
  last_modified_by_id: string;
}

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    name: string;
    s3_key: string;
    file_type: string;
    file_size?: number;
    upload_date: string;
    status: string;
    category: string;
    requirement: string;
    document_approval_id?: string;
  };
  opportunityId: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  isOpen, 
  onClose, 
  document, 
  opportunityId 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicNotes, setPublicNotes] = useState<PublicNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  
  // Note creation state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  
  const { user } = useAuth0();

  useEffect(() => {
    if (isOpen && document) {
      fetchDocumentViewer();
      fetchPublicNotes();
    }
  }, [isOpen, document]);

  const fetchDocumentViewer = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use document_approval_id if available, otherwise fall back to id
      const documentId = document.document_approval_id || document.id;
      console.log('🔍 DocumentViewer - Using document ID:', documentId);
      console.log('🔍 DocumentViewer - Document object:', document);
      
      // Use full backend URL to avoid Next.js API route conflicts
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      console.log('🔧 DocumentViewer - Using baseUrl:', baseUrl);
      console.log('🔧 DocumentViewer - Environment variable NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
      
      // For now, we'll use a placeholder or direct S3 URL
      // In production, you'd want to implement a secure document viewing service
      const fileType = document.file_type.toLowerCase();
      
      if (fileType.includes('pdf')) {
        // For PDF, we can use browser's built-in viewer
        setViewerUrl(`${baseUrl}/documents/view/${documentId}?type=pdf`);
      } else if (fileType.includes('image')) {
        // For images, direct display
        setViewerUrl(`${baseUrl}/documents/view/${documentId}?type=image`);
      } else {
        // For other files (DOCX, XLSX), we'll show a preview message
        setViewerUrl(null);
      }
      
    } catch (err) {
      console.error('Error loading document viewer:', err);
      setError('Failed to load document viewer');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicNotes = async () => {
    try {
      setNotesLoading(true);
      
      // Use document_approval_id if available, otherwise fall back to id
      const documentId = document.document_approval_id || document.id;
      console.log('🔍 DocumentViewer - Fetching notes for document ID:', documentId);
      
      // Use full backend URL to avoid Next.js API route conflicts
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(
        `${baseUrl}/documents/${documentId}/public-notes?opportunity_id=${opportunityId}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }
      
      const data = await response.json();
      setPublicNotes(data.notes || []);
      
    } catch (err) {
      console.error('Error fetching public notes:', err);
      // Don't show error for notes, just log it
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !user) return;
    
    try {
      setIsSubmittingNote(true);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const documentId = document.document_approval_id || document.id;
      
      // Get user info from Auth0
      const auth0UserId = user?.sub || '';
      const userEmail = user?.email || '';
      
      console.log('📝 DocumentViewer - Creating note with user info:', { auth0UserId, userEmail });
      
      const response = await fetch(`${baseUrl}/documents/${documentId}/notes?opportunity_id=${opportunityId}&auth0_user_id=${encodeURIComponent(auth0UserId)}&email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: newNoteText,
          is_public: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create note: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ DocumentViewer - Note created successfully:', result);
      
      // Clear form and hide it
      setNewNoteText('');
      setShowNoteForm(false);
      
      // Refresh notes
      await fetchPublicNotes();
      
    } catch (err) {
      console.error('Error creating note:', err);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleCancelNote = () => {
    setNewNoteText('');
    setShowNoteForm(false);
  };

  const handleDownload = async () => {
    try {
      // Use document_approval_id if available, otherwise fall back to id
      const documentId = document.document_approval_id || document.id;
      console.log('🔍 DocumentViewer - Downloading document ID:', documentId);
      
      // Use full backend URL to avoid Next.js API route conflicts
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${baseUrl}/documents/download/${documentId}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('xls')) return '📊';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  const renderViewer = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading document...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load document</p>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </div>
        </div>
      );
    }

    const fileType = document.file_type.toLowerCase();

    if (fileType.includes('pdf') && viewerUrl) {
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-full border border-gray-200 rounded-lg"
          title={document.name}
        />
      );
    }

    if (fileType.includes('image') && viewerUrl) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <img
            src={viewerUrl}
            alt={document.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      );
    }

    // For DOCX, XLSX and other files
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-6xl mb-4">{getFileTypeIcon(document.file_type)}</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview not available</h3>
          <p className="text-gray-600 mb-4">
            {fileType.includes('word') || fileType.includes('doc') ? 'Word documents' :
             fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('xls') ? 'Excel spreadsheets' :
             'This file type'} cannot be previewed in the browser.
          </p>
          <button
            onClick={handleDownload}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Download to view
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-white p-6" style={{ background: `linear-gradient(to right, #1e293b, #1e293b)` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getFileTypeIcon(document.file_type)}</div>
                <div>
                  <h2 className="text-xl font-bold truncate">{document.name}</h2>
                  <div className="flex items-center space-x-4 text-blue-100 text-sm">
                    <span>{document.category}</span>
                    <span>•</span>
                    <span>{document.requirement}</span>
                    {document.file_size && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(document.file_size)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg transition-colors font-semibold"
                  style={{
                    backgroundColor: '#00b5bf',
                    color: '#000',
                    border: '3px solid #00b5bf'
                  }}
                  title="Download"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors font-semibold"
                  style={{
                    backgroundColor: '#00b5bf',
                    color: '#000',
                    border: '3px solid #00b5bf'
                  }}
                  title="Close"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(90vh-120px)]">
            {/* Document Viewer */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex-1">
                {renderViewer()}
              </div>
            </div>

            {/* Notes Sidebar */}
            <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Public Notes</h3>
                    {publicNotes.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {publicNotes.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNoteForm(!showNoteForm)}
                    className="p-2 rounded-lg transition-colors font-semibold"
                    style={{
                      backgroundColor: '#00b5bf',
                      color: '#000',
                      border: '3px solid #00b5bf'
                    }}
                    title="Add Note"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note Creation Form */}
              <AnimatePresence>
                {showNoteForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-gray-200 bg-white"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <PencilSquareIcon className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-gray-900">Add Note</h4>
                      </div>
                      <textarea
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Enter your note here..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                        disabled={isSubmittingNote}
                      />
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={handleCancelNote}
                          className="px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                          disabled={isSubmittingNote}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddNote}
                          disabled={!newNoteText.trim() || isSubmittingNote}
                          className="px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1 text-sm"
                          style={{
                            backgroundColor: '#00b5bf',
                            color: '#000',
                            border: '3px solid #00b5bf'
                          }}
                        >
                          {isSubmittingNote ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <CheckIcon className="w-3 h-3" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto p-4">
                {notesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500 text-sm">Loading notes...</p>
                  </div>
                ) : publicNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No public notes available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {publicNotes.map((note, index) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {note.created_by || 'System'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(note.created_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {note.note}
                            </p>
                            {note.created_by_type && (
                              <p className="text-xs text-gray-400 mt-1">
                                via {note.created_by_type}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentViewer; 