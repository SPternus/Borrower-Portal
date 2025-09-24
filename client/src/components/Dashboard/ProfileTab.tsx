import React from 'react';
import SafeRenderer from '../SafeRenderer';

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

interface ProfileTabProps {
  contact: Contact | null;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ contact }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Your Profile</h3>
      
      {contact ? (
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="border-b border-gray-200 pb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <p className="mt-1 text-sm text-gray-900">
                  <SafeRenderer value={contact.firstName} />
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <p className="mt-1 text-sm text-gray-900">
                  <SafeRenderer value={contact.lastName} />
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">
                  <SafeRenderer value={contact.email} />
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">
                  <SafeRenderer value={contact.phone} />
                </p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          {contact.mailingAddress && (
            <div className="border-b border-gray-200 pb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Mailing Address</h4>
              <div className="space-y-2">
                {contact.mailingAddress.street && (
                  <p className="text-sm text-gray-900">
                    <SafeRenderer value={contact.mailingAddress.street} />
                  </p>
                )}
                {contact.mailingAddress.city && contact.mailingAddress.state && (
                  <p className="text-sm text-gray-900">
                    <SafeRenderer value={contact.mailingAddress.city} />, <SafeRenderer value={contact.mailingAddress.state} /> <SafeRenderer value={contact.mailingAddress.postalCode} />
                  </p>
                )}
                {contact.mailingAddress.country && (
                  <p className="text-sm text-gray-900">
                    <SafeRenderer value={contact.mailingAddress.country} />
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Account Information */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Account Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account ID</label>
                <p className="mt-1 text-sm text-gray-900">
                  <SafeRenderer value={contact.accountId} />
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact ID</label>
                <p className="mt-1 text-sm text-gray-900">
                  <SafeRenderer value={contact.id} />
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">👤</div>
          <p className="text-gray-500">No profile information available</p>
        </div>
      )}
    </div>
  );
};

export default ProfileTab; 