'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

interface FundData {
  provider_name: string
  investment_name: string
  total_invested: number
  total_balance_today: number
  net_multiple: number
  investment_letter_grade: string
  purchase_month: string
}

export default function Dashboard() {
  const [fundData, setFundData] = useState<FundData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('fund_data')
        .select('*')
        .order('purchase_month', { ascending: false })
        .limit(1000)

      if (error) throw error

      setFundData(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate portfolio metrics
  const portfolioMetrics = fundData.reduce(
    (acc, item) => ({
      totalInvested: acc.totalInvested + (item.total_invested || 0),
      currentValue: acc.currentValue + (item.total_balance_today || 0),
      avgMultiple: acc.avgMultiple + (item.net_multiple || 0),
      count: acc.count + 1,
    }),
    { totalInvested: 0, currentValue: 0, avgMultiple: 0, count: 0 }
  )

  if (portfolioMetrics.count > 0) {
    portfolioMetrics.avgMultiple = portfolioMetrics.avgMultiple / portfolioMetrics.count
  }

  // Get unique providers
  const providers = Array.from(new Set(fundData.map(f => f.provider_name))).sort()

  // Grade distribution
  const gradeDistribution = fundData.reduce((acc: any, item) => {
    const grade = item.investment_letter_grade || 'Unknown'
    acc[grade] = (acc[grade] || 0) + 1
    return acc
  }, {})

  const gradeData = Object.entries(gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
  }))

  // Provider performance
  const providerPerformance = providers.map(provider => {
    const providerData = fundData.filter(f => f.provider_name === provider)
    const metrics = providerData.reduce(
      (acc, item) => ({
        invested: acc.invested + (item.total_invested || 0),
        current: acc.current + (item.total_balance_today || 0),
        count: acc.count + 1,
      }),
      { invested: 0, current: 0, count: 0 }
    )
    return {
      provider,
      investments: metrics.count,
      invested: metrics.invested,
      current: metrics.current,
      multiple: metrics.invested > 0 ? metrics.current / metrics.invested : 0,
    }
  }).sort((a, b) => b.invested - a.invested).slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Error loading data</p>
          <p className="mt-2">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Collection Curves Dashboard</h1>
          <p className="text-gray-600 mt-2">Portfolio Performance Analytics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Invested</p>
            <p className="text-2xl font-bold text-gray-900">
              ${portfolioMetrics.totalInvested.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Current Value</p>
            <p className="text-2xl font-bold text-gray-900">
              ${portfolioMetrics.currentValue.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Net Multiple</p>
            <p className="text-2xl font-bold text-gray-900">
              {portfolioMetrics.avgMultiple.toFixed(2)}x
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Investments</p>
            <p className="text-2xl font-bold text-gray-900">
              {portfolioMetrics.count}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Grade Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Investment Grade Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Providers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top 10 Providers by Investment</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="provider" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="invested" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Provider Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Provider Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Invested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Multiple
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {providerPerformance.map((provider) => (
                  <tr key={provider.provider} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {provider.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {provider.investments}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${provider.invested.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${provider.current.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {provider.multiple.toFixed(2)}x
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