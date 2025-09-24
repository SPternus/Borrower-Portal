'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  ClipboardDocumentListIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
  UserIcon,
  FolderIcon,
  DocumentIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface Task {
  id: string;
  name: string;
  opportunityId: string;
  status: 'not started' | 'in progress' | 'completed' | 'on hold' | 'cancelled';
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: string;
  completionDate?: string;
  description: string;
  taskCategory: string;
  assignmentType: string;
  assignedTo?: string;
  assignedContact?: string;
  completedByContact?: string;
  borrowerInstructions: string;
  borrowerNotes: string;
  completionNotes: string;
  department: string;
  loanStage: string;
  estimatedHours: number;
  requiredForStage: boolean;
  requiresUpload: boolean;
  visibleToBorrower: boolean;
  documentCategory: string;
  requiredFolder?: string;
  folderInstance?: string;
  taskTemplateId: string;
  createdById: string;
  lastModifiedById: string;
  ownerId: string;
}

interface TaskSummary {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

interface TaskManagementProps {
  opportunityId: string;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ opportunityId }) => {
  const { user } = useAuth0();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [summary, setSummary] = useState<TaskSummary>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    completionRate: 0
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Show 5 tasks per page

  // New task form state
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskRequiredForStage, setNewTaskRequiredForStage] = useState(false);
  const [newTaskVisibleToBorrower, setNewTaskVisibleToBorrower] = useState(false);

  // Pagination calculations
  const totalPages = Math.ceil(tasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = tasks.slice(startIndex, endIndex);

  // Reset to first page when tasks change
  useEffect(() => {
    setCurrentPage(1);
  }, [tasks.length]);

  // Fetch real task data from API
  useEffect(() => {
    fetchTaskData();
  }, [opportunityId]);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/opportunities/${opportunityId}/tasks`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setTasks(data.tasks);
        setSummary(data.summary);
        console.log('📋 Task data loaded:', data);
      } else {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching task data:', error);
      setTasks([]); // Fallback to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIconSolid className="w-5 h-5 text-green-500" />;
      case 'in progress':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'not started':
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
      case 'on hold':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <XMarkIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'not started':
        return 'bg-gray-100 text-gray-800';
      case 'on hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (!dueDate || status.toLowerCase() === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

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

  const handleNewTaskSubmit = async () => {
    try {
      // Get auth parameters
      const auth0UserId = user?.sub || '';
      const userEmail = user?.email || '';

      const taskData = {
        name: newTaskName,
        description: newTaskDescription,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || null,
        taskCategory: newTaskCategory,
        requiredForStage: newTaskRequiredForStage,
        visibleToBorrower: newTaskVisibleToBorrower,
        auth0_user_id: auth0UserId,
        email: userEmail
      };

      console.log('Creating new task:', taskData);

      const response = await fetch(`/api/opportunities/${opportunityId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Task created successfully:', result);
        
        // Refresh the task data
        await fetchTaskData();
        
        // Close modal and reset form
        setShowNewTaskModal(false);
        setNewTaskName('');
        setNewTaskDescription('');
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
        setNewTaskCategory('');
        setNewTaskRequiredForStage(false);
        setNewTaskVisibleToBorrower(false);
        
        // Show success message
        alert(`Task "${newTaskName}" created successfully!`);
      } else {
        throw new Error(result.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Task status updated successfully');
        await fetchTaskData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert(`Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="bg-gradient-to-r from-ternus-600 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <ClipboardDocumentListIcon className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Task Management</h2>
              <p className="text-white/80 mt-1">Track and manage your loan processing tasks</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold">{summary.totalTasks}</div>
            <div className="text-white/80 text-sm">Total Tasks</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold">{summary.completedTasks}</div>
            <div className="text-white/80 text-sm">Completed</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold">{summary.inProgressTasks}</div>
            <div className="text-white/80 text-sm">In Progress</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-2xl font-bold">{summary.overdueTasks}</div>
            <div className="text-white/80 text-sm">Overdue</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Completion Progress</span>
            <span>{Math.round(summary.completionRate)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300" 
              style={{ width: `${summary.completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </h3>
            {totalPages > 1 && (
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, tasks.length)} of {tasks.length}
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {currentTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                    <ClipboardDocumentListIcon className="w-5 h-5 text-teal-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{task.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-500">
                        Due: {formatDate(task.dueDate)}
                      </span>
                      {task.taskCategory && (
                        <span className="text-sm text-gray-500">
                          Category: {task.taskCategory}
                        </span>
                      )}
                      {task.requiredForStage && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          Required for Stage
                        </span>
                      )}
                      {task.visibleToBorrower && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Visible to Borrower
                        </span>
                      )}
                      {isOverdue(task.dueDate, task.status) && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1 capitalize">{task.status}</span>
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  
                  {/* Quick Status Actions */}
                  <div className="flex space-x-1">
                    {task.status.toLowerCase() !== 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(task.id, 'completed');
                        }}
                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                    {task.status.toLowerCase() === 'not started' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(task.id, 'in progress');
                        }}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                      >
                        Start
                      </button>
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

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Task</h3>
                <button
                  onClick={() => setShowNewTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Enter task name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Describe the task"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    placeholder="e.g., Documentation, Review, Approval"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newTaskRequiredForStage}
                      onChange={(e) => setNewTaskRequiredForStage(e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Required for stage progression</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newTaskVisibleToBorrower}
                      onChange={(e) => setNewTaskVisibleToBorrower(e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Visible to borrower</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewTaskModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNewTaskSubmit}
                    disabled={!newTaskName || !newTaskDescription}
                    className="px-6 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{selectedTask.name}</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTask.status)}`}>
                        {getStatusIcon(selectedTask.status)}
                        <span className="ml-2 capitalize">{selectedTask.status}</span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Priority</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedTask.priority)}`}>
                        {selectedTask.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900 mt-1">{selectedTask.description}</p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Due Date</label>
                    <p className="text-gray-900 mt-1">{formatDate(selectedTask.dueDate)}</p>
                  </div>
                  {selectedTask.completionDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Completion Date</label>
                      <p className="text-gray-900 mt-1">{formatDate(selectedTask.completionDate)}</p>
                    </div>
                  )}
                </div>

                {/* Task Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <p className="text-gray-900 mt-1">{selectedTask.taskCategory || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Department</label>
                    <p className="text-gray-900 mt-1">{selectedTask.department || 'Not specified'}</p>
                  </div>
                </div>

                {/* Borrower Instructions */}
                {selectedTask.borrowerInstructions && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Borrower Instructions</label>
                    <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-sm">{selectedTask.borrowerInstructions}</p>
                    </div>
                  </div>
                )}

                {/* Completion Notes */}
                {selectedTask.completionNotes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Completion Notes</label>
                    <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 text-sm">{selectedTask.completionNotes}</p>
                    </div>
                  </div>
                )}

                {/* Task Properties */}
                <div className="flex flex-wrap gap-2">
                  {selectedTask.requiredForStage && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      Required for Stage
                    </span>
                  )}
                  {selectedTask.requiresUpload && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      Requires Upload
                    </span>
                  )}
                  {selectedTask.visibleToBorrower && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Visible to Borrower
                    </span>
                  )}
                  {isOverdue(selectedTask.dueDate, selectedTask.status) && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      Overdue
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {selectedTask.status.toLowerCase() !== 'completed' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedTask.id, 'completed');
                        setSelectedTask(null);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                  {selectedTask.status.toLowerCase() === 'not started' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedTask.id, 'in progress');
                        setSelectedTask(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Start Task
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskManagement;
