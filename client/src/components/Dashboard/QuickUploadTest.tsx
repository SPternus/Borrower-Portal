'use client';

import React, { useState } from 'react';

interface QuickUploadTestProps {
  opportunityId: string;
}

const QuickUploadTest: React.FC<QuickUploadTestProps> = ({ opportunityId }) => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('W-2');

  // Fetch valid categories on component mount
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/debug/picklist/file_folder/category');
        const data = await response.json();
        if (data.success && data.active_values) {
          setCategories(data.active_values);
          if (data.active_values.length > 0) {
            setSelectedCategory(data.active_values[0]);
          }
        } else {
          // Fallback to mock values
          const mockCategories = data.mock_values || ['W-2', 'Paystub', 'BankStmt', 'PropertyDocs'];
          setCategories(mockCategories);
          setSelectedCategory(mockCategories[0]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        const mockCategories = ['W-2', 'Paystub', 'BankStmt', 'PropertyDocs'];
        setCategories(mockCategories);
        setSelectedCategory(mockCategories[0]);
      }
    };
    fetchCategories();
  }, []);

  const testQuickUpload = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Create a simple test file
      const testFile = new File(['Hello World Test'], 'test.txt', { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append('file', testFile);
      formData.append('opportunity_id', opportunityId);
      formData.append('folder_instance_id', 'a92O20000003uP3IAI'); // Application Documents folder
      formData.append('category', selectedCategory);

      const response = await fetch('/api/debug/upload-test', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      console.log('Quick test result:', data);

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        step: 'fetch_error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-900">Quick Upload Test</h4>
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1 text-xs border rounded"
            disabled={loading}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={testQuickUpload}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Upload'}
          </button>
        </div>
      </div>

      {result && (
        <div className="text-xs">
          <div className={`font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
            {result.success ? '✅ Success' : '❌ Failed'} - Step: {result.step}
          </div>
          {result.error && (
            <div className="text-red-600 mt-1">Error: {result.error}</div>
          )}
          {result.success && result.link_result && (
            <div className="text-green-600 mt-1">
              File linked successfully! ID: {result.link_result.file_folder_id}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickUploadTest;
