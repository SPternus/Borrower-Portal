import React, { useState } from 'react'
import { 
  Settings, 
  Calculator, 
  Database, 
  BarChart3, 
  DollarSign, 
  FileText, 
  Users,
  Menu,
  X 
} from 'lucide-react'
import Dashboard from './components/Dashboard'
import PricingRules from './components/PricingRules'
import Configuration from './components/Configuration'
import Analytics from './components/Analytics'
import './App.css'

interface NavItem {
  id: string
  name: string
  icon: any
  component: any
}

const navItems: NavItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3, component: Dashboard },
  { id: 'rules', name: 'Pricing Rules', icon: Calculator, component: PricingRules },
  { id: 'config', name: 'Configuration', icon: Settings, component: Configuration },
  { id: 'analytics', name: 'Analytics', icon: Database, component: Analytics },
]

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const ActiveComponent = navItems.find(item => item.id === activeTab)?.component || Dashboard

  return (
    <div className="flex h-screen bg-secondary-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-secondary-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-secondary-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-primary-600" />
            <div className="ml-2">
              <h1 className="text-lg font-bold text-secondary-900">Ternus Pricing</h1>
              <p className="text-xs text-secondary-500">Admin Console</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-secondary-400 hover:text-secondary-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveTab(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`
                      sidebar-item w-full text-left
                      ${activeTab === item.id ? 'sidebar-item-active' : 'sidebar-item-inactive'}
                    `}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="card py-3">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-sm text-secondary-600">Backend Connected</span>
            </div>
            <p className="text-xs text-secondary-500 mt-1">
              Port 5001 • FastAPI
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-secondary-200">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-secondary-400 hover:text-secondary-500"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h2 className="ml-2 lg:ml-0 text-xl font-semibold text-secondary-900 capitalize">
                {navItems.find(item => item.id === activeTab)?.name}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-secondary-600">
                <Users className="h-4 w-4" />
                <span>Admin User</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-secondary-50 p-6">
          <ActiveComponent />
        </main>
      </div>
    </div>
  )
}

export default App 