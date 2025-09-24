import React from 'react'
import { Settings, Database, FileText, Save } from 'lucide-react'

const Configuration = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Configuration</h1>
          <p className="text-secondary-600">System settings and configuration options</p>
        </div>
        <button className="btn-primary flex items-center">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-secondary-900">Database Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Connection String
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="postgresql://user:pass@localhost:5432/pricing"
                defaultValue="postgresql://user:pass@localhost:5432/pricing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Max Connections
              </label>
              <input 
                type="number" 
                className="input" 
                defaultValue="20"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-secondary-900">Excel Integration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Template File Path
              </label>
              <input 
                type="text" 
                className="input" 
                defaultValue="./TERM SHEET TEMPLATE V 6.9.2025.xltx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Auto-sync formulas
              </label>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  defaultChecked
                />
                <span className="ml-2 text-sm text-secondary-700">
                  Automatically sync Excel formulas on startup
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Configuration 