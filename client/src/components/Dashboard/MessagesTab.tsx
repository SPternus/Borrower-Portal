'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSalesforce } from '../../contexts/SalesforceContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface LoanOfficer {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

interface Comment {
  id: string;
  feedItemId: string;
  body: string;
  createdDate: string;
  commentType: string;
  createdBy: {
    id: string;
    name: string;
    photoUrl: string;
  };
}

interface Message {
  id: string;
  parentId: string;
  type: string;
  body: string;
  createdDate: string;
  likeCount: number;
  commentCount: number;
  createdBy: {
    id: string;
    name: string;
    photoUrl: string;
  };
  comments?: Comment[];
}

interface MessageStats {
  total_messages: number;
  loan_officer_messages: number;
  unread_messages: number;
  last_message_date: string | null;
}

const MessagesTab: React.FC = () => {
  const { sfdcContactId } = useSalesforce();
  const [loanOfficer, setLoanOfficer] = useState<LoanOfficer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [notifyLoanOfficer, setNotifyLoanOfficer] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // Refs for efficient updates
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateCheck = useRef<string | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load loan officer details (cached)
  const loadLoanOfficer = useCallback(async () => {
    if (!sfdcContactId) return;

    try {
      const response = await fetch(`/api/messages/contact-owner?contact_id=${sfdcContactId}`);
      const data = await response.json();
      
      if (data.success) {
        setLoanOfficer(data.loan_officer);
      } else {
        console.error('Failed to load loan officer:', data.error);
      }
    } catch (error) {
      console.error('Error loading loan officer:', error);
    }
  }, [sfdcContactId]);

  // Load messages (with smart caching)
  const loadMessages = useCallback(async (forceRefresh = false) => {
    if (!sfdcContactId) return;

    try {
      const url = `/api/messages/feed?contact_id=${sfdcContactId}&limit=20${forceRefresh ? '&force_refresh=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
        
        // Auto-scroll to bottom for new messages
        setTimeout(scrollToBottom, 100);
      } else {
        console.error('Failed to load messages:', data.error);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [sfdcContactId, scrollToBottom]);

  // Load message statistics (cached)
  const loadMessageStats = useCallback(async () => {
    if (!sfdcContactId) return;

    try {
      const response = await fetch(`/api/messages/stats?contact_id=${sfdcContactId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessageStats(data.stats);
        setHasUnreadMessages(data.stats.unread_messages > 0);
      } else {
        console.error('Failed to load message stats:', data.error);
      }
    } catch (error) {
      console.error('Error loading message stats:', error);
    }
  }, [sfdcContactId]);

  // Efficient update checking (replaces constant polling)
  const checkForUpdates = useCallback(async () => {
    if (!sfdcContactId) return;

    try {
      const response = await fetch(`/api/messages/check-updates?contact_id=${sfdcContactId}`);
      const data = await response.json();
      
      if (data.success && data.has_updates) {
        const newUpdateTime = data.last_message_time;
        
        // Only refresh if this is a truly new update
        if (newUpdateTime !== lastUpdateCheck.current) {
          lastUpdateCheck.current = newUpdateTime;
          
          // Refresh messages and stats
          await Promise.all([
            loadMessages(true), // Force refresh
            loadMessageStats()
          ]);
          
          // Show notification for new messages
          toast.success('📬 New message received!', {
            duration: 4000,
            position: 'top-right',
          });
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, [sfdcContactId, loadMessages, loadMessageStats]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!sfdcContactId || !hasUnreadMessages) return;

    try {
      await fetch(`/api/messages/mark-read?contact_id=${sfdcContactId}`, {
        method: 'POST',
      });
      
      setHasUnreadMessages(false);
      await loadMessageStats();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [sfdcContactId, hasUnreadMessages, loadMessageStats]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending || !sfdcContactId) return;
    
    setSending(true);
    
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: sfdcContactId,
          message: newMessage.trim(),
          notify_loan_officer: notifyLoanOfficer,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        setNotifyLoanOfficer(false);
        
        // Refresh messages immediately
        await loadMessages(true);
        await loadMessageStats();
        
        toast.success('✅ Message sent successfully!');
      } else {
        toast.error(`❌ Failed to send message: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('❌ Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!sfdcContactId) return;

    const initializeMessages = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadLoanOfficer(),
          loadMessages(),
          loadMessageStats(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    initializeMessages();
  }, [sfdcContactId, loadLoanOfficer, loadMessages, loadMessageStats]);

  // Set up update checking interval
  useEffect(() => {
    if (!sfdcContactId) return;

    updateIntervalRef.current = setInterval(checkForUpdates, 30000); // Check every 30 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [sfdcContactId, checkForUpdates]);

  // Mark messages as read when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && hasUnreadMessages) {
        markMessagesAsRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also mark as read when component mounts and there are unread messages
    if (hasUnreadMessages) {
      markMessagesAsRead();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasUnreadMessages, markMessagesAsRead]);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    } catch {
      return dateString;
    }
  };

  // Check if message is from loan officer
  // Check if message is from current user (borrower only)
  const isFromCurrentUser = (createdBy: { id: string; name: string }, messageBody: string): boolean => {
    // For API Integration messages, check if it's likely from current user (borrower)
    if (createdBy.name === "API Integration") {
      return isFromBorrower(createdBy, messageBody);
    }
    
    return false;
  };

  const isFromLoanOfficer = (createdBy: { id: string; name: string }) => {
    // Since API Integration posts all messages, we need better logic
    // Check if this is the loan officer's ID or if the message mentions the loan officer
    return loanOfficer && (
      createdBy.id === loanOfficer.id || 
      createdBy.name === loanOfficer.name ||
      // For API Integration messages, we'll use other context clues
      (createdBy.name === "API Integration" && false) // We'll enhance this logic
    );
  };

  // Check if message is from current user (borrower)
  const isFromBorrower = (createdBy: { id: string; name: string }, messageBody: string): boolean => {
    // For API Integration messages, check if it's likely from borrower
    if (createdBy.name === "API Integration") {
      // Enhanced heuristics for borrower detection:
      const lowerBody = messageBody.toLowerCase();
      
      // 1. Questions and requests from borrower
      const borrowerQuestions = ['question', 'help', 'please', 'can you', 'could you', 'would you', 'i need', 'when will', 'how long', 'what do', 'do i need'];
      
      // 2. Common borrower responses and acknowledgments
      const borrowerResponses = ['thank you', 'thanks', 'got it', 'understood', 'ok', 'okay', 'sure', "i'll", 'i will', 'sounds good'];
      
      // 3. Personal references (borrower talking about themselves)
      const personalReferences = ['i am', 'i have', 'my income', 'my job', 'my employment', 'i work', 'i live'];
      
      // 4. Document/process related from borrower perspective
      const borrowerDocuments = ['upload', 'send', 'submit', 'here is', 'attached', 'completed'];
      
      const allBorrowerKeywords = [...borrowerQuestions, ...borrowerResponses, ...personalReferences, ...borrowerDocuments];
      
      // Check for borrower keywords
      const hasBorrowerKeywords = allBorrowerKeywords.some(keyword => lowerBody.includes(keyword));
      
      // 5. Loan officer language patterns (professional, process-oriented)
      const loanOfficerKeywords = ['reviewed', 'please provide', 'we need', 'documentation', 'underwriting', 'approval', 'conditions', 'requirements'];
      const hasLoanOfficerKeywords = loanOfficerKeywords.some(keyword => lowerBody.includes(keyword));
      
      // If it has loan officer keywords, it's likely from loan officer
      if (hasLoanOfficerKeywords && !hasBorrowerKeywords) {
        return false;
      }
      
      // If it has borrower keywords, it's likely from borrower
      if (hasBorrowerKeywords) {
        return true;
      }
      
      // Default fallback: shorter messages tend to be from borrowers
      return messageBody.length < 100;
    }
    return !isFromLoanOfficer(createdBy);
  };

  // Get user initials for avatar - handle API Integration specially
  const getUserInitials = (createdBy: { id: string; name: string }, messageBody: string): string => {
    if (createdBy.name === "API Integration") {
      // Determine if it's loan officer or borrower based on context
      if (isFromBorrower(createdBy, messageBody)) {
        return "YOU"; // Show as borrower
      } else {
        return loanOfficer ? loanOfficer.name.split(' ').map(n => n[0]).join('').toUpperCase() : "LO";
      }
    }
    return createdBy.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get display name for messages
  const getDisplayName = (createdBy: { id: string; name: string }, messageBody: string): string => {
    if (createdBy.name === "API Integration") {
      if (isFromBorrower(createdBy, messageBody)) {
        return "You";
      } else {
        return loanOfficer?.name || "Loan Officer";
      }
    }
    return createdBy.name;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!sfdcContactId) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Contact information not available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
        <h2 className="text-2xl font-bold mb-4">Messages</h2>
        
        {/* Message Stats */}
        {messageStats && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{messageStats.total_messages}</div>
              <div className="text-sm opacity-80">Total Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{messageStats.loan_officer_messages}</div>
              <div className="text-sm opacity-80">From Loan Officer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold flex items-center justify-center">
                {messageStats.unread_messages}
                {hasUnreadMessages && (
                  <span className="ml-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                )}
              </div>
              <div className="text-sm opacity-80">Unread</div>
            </div>
          </div>
        )}

        {/* Loan Officer Info */}
        {loanOfficer && (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold">
                  {loanOfficer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{loanOfficer.name}</h3>
                <p className="text-sm opacity-80">{loanOfficer.title}</p>
              </div>
              <div className="text-right text-sm space-y-1">
                <div>{loanOfficer.email}</div>
                <div>{loanOfficer.phone}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No messages yet</h3>
            <p className="text-gray-500">Start a conversation with your loan officer!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-3">
              {/* Main Message */}
              <div
                className={`flex ${isFromCurrentUser(message.createdBy, message.body) ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-start space-x-3 max-w-xs lg:max-w-md">
                  {!isFromCurrentUser(message.createdBy, message.body) && (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {getUserInitials(message.createdBy, message.body)}
                    </div>
                  )}
                  
                  <div
                    className={`px-4 py-3 rounded-lg ${
                      isFromCurrentUser(message.createdBy, message.body)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {isFromCurrentUser(message.createdBy, message.body) ? '👤' : '💼'} {getDisplayName(message.createdBy, message.body)}
                      </span>
                    </div>
                    
                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs ${
                        isFromCurrentUser(message.createdBy, message.body) ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatRelativeTime(message.createdDate)}
                      </p>
                      
                      {message.commentCount > 0 && (
                        <span className={`text-xs ${
                          isFromCurrentUser(message.createdBy, message.body) ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {message.commentCount} {message.commentCount === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isFromCurrentUser(message.createdBy, message.body) && (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {getUserInitials(message.createdBy, message.body)}
                    </div>
                  )}
                </div>
              </div>

              {/* Comments/Replies */}
              {message.comments && message.comments.length > 0 && (
                <div className="ml-6 space-y-2">
                  {message.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`flex ${isFromLoanOfficer(comment.createdBy) ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className="flex items-start space-x-2 max-w-xs">
                        {isFromLoanOfficer(comment.createdBy) && (
                          <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {getUserInitials(comment.createdBy, comment.body)}
                          </div>
                        )}
                        
                        <div
                          className={`px-3 py-2 rounded-lg text-sm ${
                            isFromLoanOfficer(comment.createdBy)
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{comment.body}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(comment.createdDate)}
                          </p>
                        </div>
                        
                        {isFromBorrower(comment.createdBy, comment.body) && (
                          <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {getUserInitials(comment.createdBy, comment.body)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-6">
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={sending}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notifyLoanOfficer}
                onChange={(e) => setNotifyLoanOfficer(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={sending}
              />
              <span className="text-sm text-gray-600">📧 Notify loan officer</span>
            </label>
            
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !newMessage.trim() || sending
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {sending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </div>
              ) : (
                '📤 Send Message'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessagesTab; 