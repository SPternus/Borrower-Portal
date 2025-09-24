'use client';

import React, { useState, useRef } from 'react';

interface UploadDebuggerProps {
  opportunityId: string;
}

const UploadDebugger: React.FC<UploadDebuggerProps> = ({ opportunityId }) => {
  const [debugResult, setDebugResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const testUpload = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      alert('Please select a file first');
      return;
    }

    setLoading(true);
    setDebugResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('opportunity_id', opportunityId);
      formData.append('folder_instance_id', 'a92O20000003uP3IAI'); // Use Application Documents folder ID from debug

      const response = await fetch('/api/debug/upload-test', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setDebugResult(result);
      console.log('Debug result:', result);

    } catch (error) {
      setDebugResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        step: 'fetch_error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Upload Debugger</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Test File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          onClick={testUpload}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing Upload...' : 'Test Upload'}
        </button>

        {debugResult && (
          <div className="mt-4 p-4 bg-white rounded-md border">
            <h4 className="font-semibold mb-2">Debug Result:</h4>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDebugger;




