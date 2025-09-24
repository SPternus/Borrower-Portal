'use client';

import { useState } from 'react';

export default function TestInvitePage() {
  const [email, setEmail] = useState('john.doe@example.com');
  const [contactId, setContactId] = useState('003XX0000004DcW');
  const [accountId, setAccountId] = useState('001XX000003DHP0');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateInvitation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/generate-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          contactId,
          accountId,
          loanOfficerId: 'loan123'
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to generate invitation' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Test SFDC Invitation Generator
          </h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john.doe@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salesforce Contact ID
              </label>
              <input
                type="text"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="003XX0000004DcW"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salesforce Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="001XX000003DHP0"
              />
            </div>

            <button
              onClick={generateInvitation}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Invitation'}
            </button>
          </div>

          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Result:</h3>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
              
              {result.success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 font-medium">✅ Invitation Generated Successfully!</p>
                  <p className="text-green-600 text-sm mt-1">
                    Check the server console for the generated token, then test the invitation flow.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-blue-800 font-medium mb-2">📋 Testing Instructions:</h3>
            <ol className="text-blue-700 text-sm space-y-1">
              <li>1. Click "Generate Invitation" to create a test token</li>
              <li>2. Check the server console for the generated token</li>
              <li>3. Visit: <code>/invite/[token]?email={email}</code></li>
              <li>4. Test the Auth0 login flow</li>
              <li>5. Verify the dashboard shows SFDC data</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-yellow-800 font-medium mb-2">🔗 Quick Links:</h3>
            <div className="space-y-2 text-sm">
              <div>
                <a href="/" className="text-blue-600 hover:underline">
                  🏠 Dashboard (requires login)
                </a>
              </div>
              <div>
                <a href="/documents" className="text-blue-600 hover:underline">
                  📁 Documents Page
                </a>
              </div>
              <div>
                <a href="http://localhost:5000/health" target="_blank" className="text-blue-600 hover:underline">
                  🔧 Server Health Check
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 