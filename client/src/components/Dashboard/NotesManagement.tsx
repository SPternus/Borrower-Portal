'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface PublicNote {
  id: string;
  note: string;
  created_date: string;
  created_by: string;
  created_by_type: string;
  document_approval_id: string;
  document_name?: string;
  category?: string;
}

interface NotesManagementProps {
  opportunityId: string;
}

const NotesManagement: React.FC<NotesManagementProps> = ({ opportunityId }) => {
  const { user } = useAuth0();
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my-notes' | 'system-notes'>('all');

  useEffect(() => {
    fetchAllNotes();
    fetchDocuments();
  }, [opportunityId]);

  const fetchAllNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      console.log('🔧 NotesManagement - Fetching all notes for opportunity:', opportunityId);
      
      // First get all documents for this opportunity
      const documentsResponse = await fetch(`${baseUrl}/config/opportunities/${opportunityId}/interactive-documents`);
      if (!documentsResponse.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const documentsData = await documentsResponse.json();
      const allNotes: PublicNote[] = [];
      
      // Extract notes from all documents
      if (documentsData.categories) {
        for (const category of documentsData.categories) {
          // From required documents
          if (category.required_documents) {
            for (const req of category.required_documents) {
              if (req.uploaded_files) {
                for (const file of req.uploaded_files) {
                  if (file.public_notes && file.public_notes.length > 0) {
                    file.public_notes.forEach((note: any) => {
                      allNotes.push({
                        ...note,
                        document_approval_id: file.id,
                        document_name: file.name,
                        category: category.category_display
                      });
                    });
                  }
                }
              }
            }
          }
          
          // From uploaded documents
          if (category.uploaded_documents) {
            for (const doc of category.uploaded_documents) {
              if (doc.public_notes && doc.public_notes.length > 0) {
                doc.public_notes.forEach((note: any) => {
                  allNotes.push({
                    ...note,
                    document_approval_id: doc.id,
                    document_name: doc.name,
                    category: category.category_display
                  });
                });
              }
            }
          }
        }
      }
      
      // Sort notes by date (newest first)
      allNotes.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      
      setNotes(allNotes);
      console.log('✅ NotesManagement - Loaded', allNotes.length, 'notes');
      
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}/config/opportunities/${opportunityId}/interactive-documents`);
      
      if (!response.ok) return;
      
      const data = await response.json();
      const allDocs: any[] = [];
      
      if (data.categories) {
        data.categories.forEach((category: any) => {
          // From required documents
          category.required_documents?.forEach((req: any) => {
            req.uploaded_files?.forEach((file: any) => {
              allDocs.push({
                id: file.id,
                name: file.name,
                category: category.category_display
              });
            });
          });
          
          // From uploaded documents
          category.uploaded_documents?.forEach((doc: any) => {
            allDocs.push({
              id: doc.id,
              name: doc.name,
              category: category.category_display
            });
          });
        });
      }
      
      setDocuments(allDocs);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const handleSubmitNote = async () => {
    if (!newNote.trim() || !selectedDocument) return;
    
    try {
      setSubmitting(true);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      // Get user info from Auth0
      const auth0UserId = user?.sub || '';
      const userEmail = user?.email || '';
      
      console.log('📝 Creating note with user info:', { auth0UserId, userEmail });
      
      const response = await fetch(`${baseUrl}/documents/${selectedDocument}/notes?opportunity_id=${opportunityId}&auth0_user_id=${encodeURIComponent(auth0UserId)}&email=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: newNote.trim(),
          opportunity_id: opportunityId,
          is_public: true
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create note');
      }
      
      const result = await response.json();
      console.log('✅ Note created successfully:', result);
      
      // Reset form
      setNewNote('');
      setSelectedDocument('');
      setShowNewNoteForm(false);
      
      // Refresh notes
      await fetchAllNotes();
      
    } catch (err) {
      console.error('Error creating note:', err);
      setError(err instanceof Error ? err.message : 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredNotes = () => {
    switch (filter) {
      case 'my-notes':
        return notes.filter(note => note.created_by_type === 'User');
      case 'system-notes':
        return notes.filter(note => note.created_by_type === 'System');
      default:
        return notes;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuthorIcon = (createdByType: string) => {
    return createdByType === 'User' ? (
      <UserIcon className="w-5 h-5 text-blue-600" />
    ) : (
      <DocumentTextIcon className="w-5 h-5 text-gray-600" />
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading notes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Error Loading Notes</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchAllNotes}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const filteredNotes = getFilteredNotes();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Notes Management</h2>
              <p className="text-blue-100">View and manage all document notes</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewNoteForm(true)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All Notes', count: notes.length },
                { key: 'my-notes', label: 'My Notes', count: notes.filter(n => n.created_by_type === 'User').length },
                { key: 'system-notes', label: 'System Notes', count: notes.filter(n => n.created_by_type === 'System').length }
              ].map((filterOption) => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === filterOption.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filterOption.label} ({filterOption.count})
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Showing {filteredNotes.length} of {notes.length} notes
          </div>
        </div>
      </div>

      {/* New Note Form */}
      <AnimatePresence>
        {showNewNoteForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <PencilSquareIcon className="w-5 h-5 mr-2 text-blue-600" />
                Add New Note
              </h3>
              <button
                onClick={() => setShowNewNoteForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Document
                </label>
                <select
                  value={selectedDocument}
                  onChange={(e) => setSelectedDocument(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a document...</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.category} - {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Content
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter your note here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowNewNoteForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitNote}
                  disabled={!newNote.trim() || !selectedDocument || submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span>Save Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notes Found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'No notes have been created yet.' 
                : `No ${filter.replace('-', ' ')} found.`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowNewNoteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Note
              </button>
            )}
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getAuthorIcon(note.created_by_type)}
                  <div>
                    <div className="font-medium text-gray-900">{note.created_by}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(note.created_date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    note.created_by_type === 'User' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {note.created_by_type === 'User' ? 'User Note' : 'System Note'}
                  </span>
                  <EyeIcon className="w-4 h-4 text-green-500" title="Public Note" />
                </div>
              </div>
              
              {note.document_name && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Document:</span> {note.document_name}
                  </div>
                  {note.category && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Category:</span> {note.category}
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {note.note}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesManagement; 