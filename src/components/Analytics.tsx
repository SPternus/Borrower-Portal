import React from 'react'
import { BarChart3, TrendingUp, PieChart, Download } from 'lucide-react'

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Analytics</h1>
          <p className="text-secondary-600">Pricing trends and performance metrics</p>
        </div>
        <button className="btn-secondary flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">Loan Volume</h3>
            <BarChart3 className="h-5 w-5 text-primary-600" />
          </div>
          <div className="h-48 bg-secondary-50 rounded-lg flex items-center justify-center">
            <p className="text-secondary-500">Chart placeholder - Volume over time</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">Product Mix</h3>
            <PieChart className="h-5 w-5 text-primary-600" />
          </div>
          <div className="h-48 bg-secondary-50 rounded-lg flex items-center justify-center">
            <p className="text-secondary-500">Chart placeholder - Product distribution</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">Rate Trends</h3>
            <TrendingUp className="h-5 w-5 text-primary-600" />
          </div>
          <div className="h-48 bg-secondary-50 rounded-lg flex items-center justify-center">
            <p className="text-secondary-500">Chart placeholder - Interest rate trends</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-secondary-50 rounded-lg">
            <p className="text-2xl font-bold text-primary-600">4.2s</p>
            <p className="text-sm text-secondary-600">Avg. Calculation Time</p>
          </div>
          <div className="text-center p-4 bg-secondary-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">99.8%</p>
            <p className="text-sm text-secondary-600">System Uptime</p>
          </div>
          <div className="text-center p-4 bg-secondary-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">1,247</p>
            <p className="text-sm text-secondary-600">Daily Calculations</p>
          </div>
          <div className="text-center p-4 bg-secondary-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">89</p>
            <p className="text-sm text-secondary-600">Active Scenarios</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics 