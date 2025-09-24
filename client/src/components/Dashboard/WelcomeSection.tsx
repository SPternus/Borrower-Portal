import React from 'react';
import { User } from '@auth0/auth0-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  accountId: string;
  mailingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

interface WelcomeSectionProps {
  user: User | undefined;
  contact: Contact | null;
}

const WelcomeSection: React.FC<WelcomeSectionProps> = ({ user, contact }) => {
  const getDisplayName = () => {
    // First try Auth0 user data (real authenticated user)
    if (user?.given_name) return user.given_name;
    
    // Fallback to Auth0 name field (first part)
    if (user?.name) return user.name.split(' ')[0];
    
    // Use Salesforce contact if not default mock data
    if (contact && !['John', 'Demo'].includes(contact.firstName)) {
      return contact.firstName;
    }
    
    // Final fallback to generic greeting
    return 'Borrower';
  };

  return (
    <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg p-8 text-white">
      <h2 className="text-2xl font-bold mb-2">Welcome back, {getDisplayName()}! 👋</h2>
      <p className="text-primary-100">Manage your loan applications and track their progress.</p>
    </div>
  );
};

export default WelcomeSection; 