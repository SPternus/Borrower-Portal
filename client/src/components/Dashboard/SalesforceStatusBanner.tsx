import React from 'react';

interface Opportunity {
  id: string;
  name: string;
  amount?: number;
  stageName: string;
  closeDate?: string;
  createdDate: string;
  loanType?: string;
  propertyAddress?: any;
  loanOfficer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

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

interface SalesforceStatusBannerProps {
  contact: Contact | null;
  opportunities: Opportunity[];
  currentOpportunity: Opportunity | null;
  sfdcError: string | null;
}

const SalesforceStatusBanner: React.FC<SalesforceStatusBannerProps> = ({
  contact,
  opportunities,
  currentOpportunity,
  sfdcError
}) => {
  // Connected to Salesforce with data
  if (contact && opportunities.length > 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-green-800 font-medium">Connected to Salesforce</span>
          <span className="text-green-600 text-sm">
            • {opportunities.length} loan{opportunities.length !== 1 ? 's' : ''} found
            {currentOpportunity && ` • Current: ${currentOpportunity.name}`}
          </span>
        </div>
      </div>
    );
  }

  // Demo mode (no contact found)
  if (!contact && !sfdcError) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-blue-800 font-medium">Demo Mode</span>
          <span className="text-blue-600 text-sm">• No Salesforce contact found for your account</span>
        </div>
      </div>
    );
  }

  // Connection issue (but not access denied)
  if (sfdcError && !sfdcError.includes('Access denied')) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-yellow-800 font-medium">Connection Issue</span>
          <span className="text-yellow-600 text-sm">• {sfdcError}</span>
        </div>
      </div>
    );
  }

  return null;
};

export default SalesforceStatusBanner; 