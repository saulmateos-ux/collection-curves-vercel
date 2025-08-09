'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

interface ProviderData {
  provider_name_per_tbr: string
  total_sent: number
  total_repaid: number
  case_count: number
  avg_multiple: number
  pending_cases: number
  closed_cases: number
  recovery_rate: number
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderData[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'invested' | 'repaid' | 'multiple'>('invested')

  useEffect(() => {
    fetchProviderData()
  }, [])

  const fetchProviderData = async () => {
    try {
      setLoading(true)
      
      if (!supabase) {
        throw new Error('Supabase not initialized')
      }

      const { data, error } = await supabase
        .from('fund_data')
        .select('*')

      if (error) throw error

      // Process provider data
      const providerMap = new Map<string, any>()
      
      data?.forEach(record => {
        const provider = record.provider_name_per_tbr
        if (!provider) return
        
        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            provider_name_per_tbr: provider,
            total_sent: 0,
            total_repaid: 0,
            case_count: 0,
            pending_cases: 0,
            closed_cases: 0,
            total_multiple: 0
          })
        }
        
        const p = providerMap.get(provider)
        p.total_sent += record.total_sent || 0
        p.total_repaid += record.total_repaid || 0
        p.case_count += 1
        
        if (record.case_status === 'Pending') {
          p.pending_cases += 1
        } else if (record.repaid) {
          p.closed_cases += 1
        }
        
        if (record.total_sent > 0) {
          p.total_multiple += (record.total_repaid || 0) / record.total_sent
        }
      })

      // Calculate averages and recovery rates
      const processedProviders = Array.from(providerMap.values()).map(p => ({
        ...p,
        avg_multiple: p.case_count > 0 ? p.total_multiple / p.case_count : 0,
        recovery_rate: p.total_sent > 0 ? (p.total_repaid / p.total_sent) * 100 : 0
      }))

      setProviders(processedProviders)
    } catch (err) {
      console.error('Error fetching provider data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort providers
  const filteredProviders = providers
    .filter(p => p.provider_name_per_tbr.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      switch(sortBy) {
        case 'name': return a.provider_name_per_tbr.localeCompare(b.provider_name_per_tbr)
        case 'invested': return b.total_sent - a.total_sent
        case 'repaid': return b.total_repaid - a.total_repaid
        case 'multiple': return b.avg_multiple - a.avg_multiple
        default: return 0
      }
    })

  const topProviders = filteredProviders.slice(0, 10)

  // Calculate portfolio totals
  const totals = providers.reduce((acc, p) => ({
    invested: acc.invested + p.total_sent,
    repaid: acc.repaid + p.total_repaid,
    cases: acc.cases + p.case_count
  }), { invested: 0, repaid: 0, cases: 0 })

  // Prepare chart data
  const performanceData = topProviders.map(p => ({
    name: p.provider_name_per_tbr.slice(0, 20),
    invested: p.total_sent,
    repaid: p.total_repaid,
    recovery: p.recovery_rate
  }))

  const distributionData = topProviders.map(p => ({
    name: p.provider_name_per_tbr.slice(0, 20),
    value: p.total_sent
  }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading provider analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Provider Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive provider performance metrics</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Providers</p>
            <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Invested</p>
            <p className="text-2xl font-bold text-gray-900">${totals.invested.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Repaid</p>
            <p className="text-2xl font-bold text-gray-900">${totals.repaid.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Cases</p>
            <p className="text-2xl font-bold text-gray-900">{totals.cases.toLocaleString()}</p>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="invested">Sort by Invested</option>
              <option value="repaid">Sort by Repaid</option>
              <option value="multiple">Sort by Multiple</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top Provider Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="invested" fill="#3B82F6" name="Invested" />
                <Bar dataKey="repaid" fill="#10B981" name="Repaid" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Investment Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${((entry.value / totals.invested) * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Provider Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">All Providers ({filteredProviders.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cases
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Invested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Repaid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recovery Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Multiple
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProviders.map((provider) => (
                  <tr 
                    key={provider.provider_name_per_tbr} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedProvider(provider.provider_name_per_tbr)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {provider.provider_name_per_tbr}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {provider.case_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${provider.total_sent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${provider.total_repaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(provider.recovery_rate, 100)}%` }}
                          />
                        </div>
                        <span>{provider.recovery_rate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {provider.avg_multiple.toFixed(2)}x
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {provider.pending_cases} pending
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}