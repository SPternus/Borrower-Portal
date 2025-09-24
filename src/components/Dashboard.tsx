import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  Calculator, 
  Activity,
  ArrowUpRight,
  ArrowDownRight 
} from 'lucide-react'

interface DashboardStats {
  totalCalculations: number
  averageLoanAmount: number
  totalScenarios: number
  systemHealth: string
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCalculations: 0,
    averageLoanAmount: 0,
    totalScenarios: 0,
    systemHealth: 'healthy'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call to get dashboard stats
    const fetchStats = async () => {
      try {
        // In a real app, this would be an API call to the pricing engine backend
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setStats({
          totalCalculations: 1247,
          averageLoanAmount: 385000,
          totalScenarios: 89,
          systemHealth: 'healthy'
        })
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue 
  }: {
    title: string
    value: string | number
    icon: any
    trend?: 'up' | 'down'
    trendValue?: string
  }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary-600">{title}</p>
          <p className="text-2xl font-bold text-secondary-900">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center mt-1 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        <div className="p-3 bg-primary-50 rounded-full">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
          <p className="text-secondary-600">Pricing engine overview and system health</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary">
            Export Report
          </button>
          <button className="btn-primary">
            Test Calculation
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Calculations"
          value={stats.totalCalculations.toLocaleString()}
          icon={Calculator}
          trend="up"
          trendValue="+12.5%"
        />
        <StatCard
          title="Avg. Loan Amount"
          value={`$${stats.averageLoanAmount.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="+5.2%"
        />
        <StatCard
          title="Saved Scenarios"
          value={stats.totalScenarios}
          icon={Activity}
          trend="up"
          trendValue="+8.1%"
        />
        <StatCard
          title="System Health"
          value="Healthy"
          icon={TrendingUp}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Recent Calculations</h3>
          <div className="space-y-3">
            {[
              { id: 'calc-001', type: 'Fix & Flip', amount: 450000, time: '2 minutes ago' },
              { id: 'calc-002', type: 'DSCR', amount: 325000, time: '15 minutes ago' },
              { id: 'calc-003', type: 'Bridge Purchase', amount: 675000, time: '1 hour ago' },
              { id: 'calc-004', type: 'WholeTail', amount: 285000, time: '2 hours ago' },
            ].map((calc) => (
              <div key={calc.id} className="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                <div>
                  <p className="font-medium text-secondary-900">{calc.type}</p>
                  <p className="text-sm text-secondary-600">${calc.amount.toLocaleString()}</p>
                </div>
                <span className="text-sm text-secondary-500">{calc.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-secondary-600">Pricing Engine</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-secondary-900">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary-600">Database</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-secondary-900">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary-600">Excel Integration</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-secondary-900">Active</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary-600">API Endpoints</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-secondary-900">Responsive</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 