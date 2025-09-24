'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  BanknotesIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface DrawRequest {
  id: string;
  drawNumber: number;
  requestedAmount: number;
  approvedAmount?: number;
  releasedAmount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  requestDate: string;
  disbursementDate?: string;
  purpose: string;
  description: string;
  documents: DrawDocument[];
  inspectionRequired: boolean;
  inspectionCompleted: boolean;
  inspectionDate?: string;
  notes?: string;
  fee?: number;
  verifiedBy?: string;
  authorizedBy?: string;
  releasedBy?: string;
  requestedBy?: string;
  rejectionReason?: string;
}

interface DrawDocument {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  status: 'uploaded' | 'approved' | 'rejected';
  url?: string;
}

interface DrawManagementProps {
  opportunityId: string;
}

const DrawManagement: React.FC<DrawManagementProps> = ({ opportunityId }) => {
  const { user } = useAuth0();
  const [drawRequests, setDrawRequests] = useState<DrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraw, setSelectedDraw] = useState<DrawRequest | null>(null);
  const [showNewDrawModal, setShowNewDrawModal] = useState(false);
  const [newDrawAmount, setNewDrawAmount] = useState('');
  const [newDrawDescription, setNewDrawDescription] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Show 5 draws per page

  // Pagination calculations
  const totalPages = Math.ceil(drawRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDraws = drawRequests.slice(startIndex, endIndex);

  // Reset to first page when draws change
  useEffect(() => {
    setCurrentPage(1);
  }, [drawRequests.length]);

  // Fetch real draw data from API
  useEffect(() => {
    fetchDrawData();
  }, [opportunityId]);

  const fetchDrawData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/opportunities/${opportunityId}/draws`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch draws: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Transform the data to match our interface
        const transformedDraws = data.draws.map((draw: any) => ({
          id: draw.id,
          drawNumber: draw.drawNumber,
          requestedAmount: draw.requestedAmount,
          approvedAmount: draw.approvedAmount,
          status: draw.status,
          requestDate: draw.requestDate,
          disbursementDate: draw.disbursementDate,
          purpose: draw.description, // Using description as purpose since there's no separate purpose field
          description: draw.description,
          documents: [], // Documents would be fetched separately
          inspectionRequired: false, // Not in the actual schema
          inspectionCompleted: false, // Not in the actual schema
          inspectionDate: null, // Not in the actual schema
          notes: draw.notes,
          fee: draw.drawFee,
          verifiedBy: draw.verifiedBy,
          authorizedBy: draw.authorizedBy,
          releasedBy: draw.releasedBy,
          requestedBy: draw.requestedBy,
          rejectionReason: draw.rejectionReason
        }));
        
        setDrawRequests(transformedDraws);
        console.log('💰 Draw data loaded:', data);
      } else {
        throw new Error(data.error || 'Failed to fetch draws');
      }
    } catch (error) {
      console.error('Error fetching draw data:', error);
      // Fallback to empty array on error
      setDrawRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'disbursed':
        return <CheckCircleIconSolid className="w-5 h-5 text-green-500" />;
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disbursed':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalRequested = drawRequests.reduce((sum, draw) => sum + draw.requestedAmount, 0);
  const totalApproved = drawRequests.reduce((sum, draw) => sum + (draw.approvedAmount || 0), 0);
  const totalDisbursed = drawRequests
    .filter(draw => draw.status === 'disbursed')
    .reduce((sum, draw) => sum + (draw.approvedAmount || 0), 0);
  const totalRejected = drawRequests
    .filter(draw => draw.status === 'rejected')
    .reduce((sum, draw) => sum + draw.requestedAmount, 0);

  // Pagination handlers
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handleNewDrawSubmit = async () => {
    try {
      // Get auth parameters
      const auth0UserId = user?.sub || '';
      const userEmail = user?.email || '';

      const drawData = {
        requestedAmount: parseFloat(newDrawAmount),
        description: newDrawDescription,
        auth0_user_id: auth0UserId,
        email: userEmail
      };

      console.log('Creating new draw request:', drawData);

      const response = await fetch(`/api/opportunities/${opportunityId}/draws`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(drawData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create draw request: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Draw request created successfully:', result);
        
        // Refresh the draw data
        await fetchDrawData();
        
        // Close modal and reset form
        setShowNewDrawModal(false);
        setNewDrawAmount('');
        setNewDrawDescription('');
        
        // Show success message (you could use a toast library here)
        alert(`Draw request #${result.drawNumber} created successfully!`);
      } else {
        throw new Error(result.error || 'Failed to create draw request');
      }
    } catch (error) {
      console.error('Error creating draw request:', error);
      alert(`Failed to create draw request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Loading Draw Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      <div className="bg-gradient-to-r from-ternus-600 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BanknotesIcon className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Draw Management</h2>
              <p className="text-white/80 mt-1">Track and manage your construction loan draws</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewDrawModal(true)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Request Draw</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold">{formatCurrency(totalRequested)}</div>
            <div className="text-white/80 text-sm">Total Requested</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold">{formatCurrency(totalApproved)}</div>
            <div className="text-white/80 text-sm">Total Approved</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold">{formatCurrency(totalDisbursed)}</div>
            <div className="text-white/80 text-sm">Total Disbursed</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold">{formatCurrency(totalRejected)}</div>
            <div className="text-white/80 text-sm">Total Rejected</div>
          </div>
        </div>
      </div>

      {/* Draw Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Draw Requests</h3>
              <p className="text-sm text-gray-600 mt-1">
                {drawRequests.length} draw request{drawRequests.length !== 1 ? 's' : ''}
              </p>
            </div>
            {totalPages > 1 && (
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, drawRequests.length)} of {drawRequests.length}
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {currentDraws.map((draw, index) => (
            <motion.div
              key={draw.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedDraw(draw)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                    <span className="text-teal-600 font-semibold">#{draw.drawNumber}</span>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900">{draw.purpose}</h4>
                    <p className="text-sm text-gray-600">{draw.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-500">
                        Requested: {formatDate(draw.requestDate)}
                      </span>
                      {draw.inspectionRequired && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">Inspection:</span>
                          {draw.inspectionCompleted ? (
                            <CheckCircleIconSolid className="w-4 h-4 text-green-500" />
                          ) : (
                            <ClockIcon className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(draw.requestedAmount)}
                  </div>
                  {draw.approvedAmount && draw.approvedAmount !== draw.requestedAmount && (
                    <div className="text-sm text-green-600">
                      Approved: {formatCurrency(draw.approvedAmount)}
                    </div>
                  )}
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(draw.status)}`}>
                      {getStatusIcon(draw.status)}
                      <span className="ml-1 capitalize">{draw.status}</span>
                    </span>
                    {draw.status === 'rejected' && draw.rejectionReason && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                        <strong>Reason:</strong> {draw.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-1" />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    if (!showPage) {
                      // Show ellipsis for gaps
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 py-1 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageClick(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          currentPage === page
                            ? 'bg-teal-500 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Draw Request Modal */}
      <AnimatePresence>
        {showNewDrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewDrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Request New Draw</h3>
                <button
                  onClick={() => setShowNewDrawModal(false)}
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
                    Requested Amount
                  </label>
                  <input
                    type="number"
                    value={newDrawAmount}
                    onChange={(e) => setNewDrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newDrawDescription}
                    onChange={(e) => setNewDrawDescription(e.target.value)}
                    placeholder="Describe the work or expenses"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewDrawModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNewDrawSubmit}
                    disabled={!newDrawAmount || !newDrawDescription}
                    className="px-6 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draw Detail Modal */}
      <AnimatePresence>
        {selectedDraw && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDraw(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Draw #{selectedDraw.drawNumber} - {selectedDraw.purpose}
                  </h3>
                  <button
                    onClick={() => setSelectedDraw(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Status and Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedDraw.status)}`}>
                          {getStatusIcon(selectedDraw.status)}
                          <span className="ml-2 capitalize">{selectedDraw.status}</span>
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Requested Amount</label>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(selectedDraw.requestedAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-900 mt-1">{selectedDraw.description}</p>
                  </div>

                  {/* Rejection Reason (if rejected) */}
                  {selectedDraw.status === 'rejected' && selectedDraw.rejectionReason && (
                    <div>
                      <label className="text-sm font-medium text-red-600">Rejection Reason</label>
                      <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 text-sm">{selectedDraw.rejectionReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-3 block">Timeline</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Requested: {formatDate(selectedDraw.requestDate)}
                        </span>
                      </div>
                      {selectedDraw.approvalDate && (
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-600">
                            Approved: {formatDate(selectedDraw.approvalDate)}
                          </span>
                        </div>
                      )}
                      {selectedDraw.disbursementDate && (
                        <div className="flex items-center space-x-3">
                          <BanknotesIcon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-600">
                            Disbursed: {formatDate(selectedDraw.disbursementDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-3 block">Documents</label>
                    <div className="space-y-2">
                      {selectedDraw.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.name}</p>
                              <p className="text-sm text-gray-500">{doc.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                              doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.status}
                            </span>
                            <button className="p-1 hover:bg-gray-200 rounded">
                              <EyeIcon className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DrawManagement;
