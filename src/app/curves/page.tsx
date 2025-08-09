'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

interface CurveData {
  month: number
  provider: string
  recoveryRate: number
  cumulativeRecovery: number
  cases: number
}

export default function CollectionCurvesPage() {
  const [curveData, setCurveData] = useState<CurveData[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'6' | '12' | '24' | 'all'>('12')
  const [viewType, setViewType] = useState<'cumulative' | 'monthly' | 'comparative'>('cumulative')

  useEffect(() => {
    fetchCurveData()
  }, [])

  const fetchCurveData = async () => {
    try {
      setLoading(true)
      
      if (!supabase) {
        throw new Error('Supabase not initialized')
      }

      const { data, error } = await supabase
        .from('fund_data')
        .select('*')
        .order('origination_date', { ascending: true })

      if (error) throw error

      // Process data to create collection curves
      const curveMap = new Map<string, Map<number, any>>()
      const providerSet = new Set<string>()
      
      data?.forEach(record => {
        const provider = record.provider_name_per_tbr
        if (!provider) return
        
        providerSet.add(provider)
        
        // Calculate months since origination
        const originDate = new Date(record.origination_date)
        const repaidDate = record.repayment_date ? new Date(record.repayment_date) : new Date()
        const monthsSince = Math.floor((repaidDate.getTime() - originDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        
        if (!curveMap.has(provider)) {
          curveMap.set(provider, new Map())
        }
        
        const providerCurve = curveMap.get(provider)!
        
        for (let month = 0; month <= Math.min(monthsSince, 36); month++) {
          if (!providerCurve.has(month)) {
            providerCurve.set(month, {
              totalInvested: 0,
              totalRecovered: 0,
              caseCount: 0
            })
          }
          
          const monthData = providerCurve.get(month)!
          monthData.totalInvested += record.total_sent || 0
          
          // Progressive recovery simulation based on actual data
          if (record.total_repaid && monthsSince > 0) {
            const recoveryProgress = Math.min(month / monthsSince, 1)
            monthData.totalRecovered += (record.total_repaid || 0) * recoveryProgress
          }
          
          monthData.caseCount += 1
        }
      })

      // Convert to array format
      const curves: CurveData[] = []
      
      curveMap.forEach((providerCurve, provider) => {
        let cumulative = 0
        providerCurve.forEach((data, month) => {
          const recoveryRate = data.totalInvested > 0 
            ? (data.totalRecovered / data.totalInvested) * 100 
            : 0
          
          cumulative += recoveryRate
          
          curves.push({
            month,
            provider,
            recoveryRate,
            cumulativeRecovery: cumulative,
            cases: data.caseCount
          })
        })
      })

      setCurveData(curves)
      setProviders(Array.from(providerSet).sort())
      // Select top 5 providers by default
      setSelectedProviders(Array.from(providerSet).sort().slice(0, 5))
      
    } catch (err) {
      console.error('Error fetching curve data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter data based on selections
  const filteredData = curveData.filter(d => {
    const inProviders = selectedProviders.length === 0 || selectedProviders.includes(d.provider)
    const inTimeRange = timeRange === 'all' || d.month <= parseInt(timeRange)
    return inProviders && inTimeRange
  })

  // Prepare chart data
  const chartData = (() => {
    const monthsArray = Array.from(new Set(filteredData.map(d => d.month))).sort((a, b) => a - b)
    
    return monthsArray.map(month => {
      const monthData: any = { month }
      
      selectedProviders.forEach(provider => {
        const providerData = filteredData.find(d => d.provider === provider && d.month === month)
        if (providerData) {
          monthData[provider] = viewType === 'cumulative' 
            ? providerData.cumulativeRecovery 
            : providerData.recoveryRate
        }
      })
      
      return monthData
    })
  })()

  // Calculate average curve
  const averageCurve = (() => {
    const monthsArray = Array.from(new Set(filteredData.map(d => d.month))).sort((a, b) => a - b)
    
    return monthsArray.map(month => {
      const monthRecords = filteredData.filter(d => d.month === month)
      const avgRecovery = monthRecords.reduce((sum, r) => sum + r.recoveryRate, 0) / monthRecords.length
      const avgCumulative = monthRecords.reduce((sum, r) => sum + r.cumulativeRecovery, 0) / monthRecords.length
      
      return {
        month,
        average: viewType === 'cumulative' ? avgCumulative : avgRecovery,
        min: Math.min(...monthRecords.map(r => viewType === 'cumulative' ? r.cumulativeRecovery : r.recoveryRate)),
        max: Math.max(...monthRecords.map(r => viewType === 'cumulative' ? r.cumulativeRecovery : r.recoveryRate))
      }
    })
  })()

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating collection curves...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Collection Curves Analysis</h1>
          <p className="text-gray-600 mt-2">Recovery patterns and performance over time</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* View Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
              <select
                value={viewType}
                onChange={(e) => setViewType(e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cumulative">Cumulative Recovery</option>
                <option value="monthly">Monthly Recovery</option>
                <option value="comparative">Comparative Analysis</option>
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
                <option value="24">24 Months</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Providers ({selectedProviders.length} selected)
              </label>
              <div className="relative">
                <select
                  multiple
                  value={selectedProviders}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value)
                    setSelectedProviders(values)
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {providers.map(provider => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Collection Curves Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {viewType === 'cumulative' ? 'Cumulative Collection Curves' : 'Monthly Recovery Rates'}
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                label={{ value: 'Months Since Origination', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Recovery Rate (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => `${value?.toFixed(2)}%`}
                labelFormatter={(label) => `Month ${label}`}
              />
              <Legend />
              
              {selectedProviders.map((provider, index) => (
                <Line
                  key={provider}
                  type="monotone"
                  dataKey={provider}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={provider}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Average Curve with Confidence Band */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Portfolio Average Curve</h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={averageCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                label={{ value: 'Months Since Origination', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Recovery Rate (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => `${value?.toFixed(2)}%`}
                labelFormatter={(label) => `Month ${label}`}
              />
              <Legend />
              
              <Area
                type="monotone"
                dataKey="max"
                stroke="none"
                fill="#E0E7FF"
                fillOpacity={0.3}
                name="Max"
              />
              <Area
                type="monotone"
                dataKey="min"
                stroke="none"
                fill="#FFFFFF"
                fillOpacity={1}
                name="Min"
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={false}
                name="Average"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recovery Metrics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Average 6-Month Recovery:</span>
                <span className="font-semibold">
                  {averageCurve.find(d => d.month === 6)?.average.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average 12-Month Recovery:</span>
                <span className="font-semibold">
                  {averageCurve.find(d => d.month === 12)?.average.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average 24-Month Recovery:</span>
                <span className="font-semibold">
                  {averageCurve.find(d => d.month === 24)?.average.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Range</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Best 12-Month:</span>
                <span className="font-semibold text-green-600">
                  {averageCurve.find(d => d.month === 12)?.max.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Worst 12-Month:</span>
                <span className="font-semibold text-red-600">
                  {averageCurve.find(d => d.month === 12)?.min.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Variance:</span>
                <span className="font-semibold">
                  {((averageCurve.find(d => d.month === 12)?.max || 0) - 
                    (averageCurve.find(d => d.month === 12)?.min || 0)).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Velocity Metrics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">0-6 Month Velocity:</span>
                <span className="font-semibold">
                  {((averageCurve.find(d => d.month === 6)?.average || 0) / 6).toFixed(2)}%/mo
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">6-12 Month Velocity:</span>
                <span className="font-semibold">
                  {(((averageCurve.find(d => d.month === 12)?.average || 0) - 
                     (averageCurve.find(d => d.month === 6)?.average || 0)) / 6).toFixed(2)}%/mo
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">12-24 Month Velocity:</span>
                <span className="font-semibold">
                  {(((averageCurve.find(d => d.month === 24)?.average || 0) - 
                     (averageCurve.find(d => d.month === 12)?.average || 0)) / 12).toFixed(2)}%/mo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}