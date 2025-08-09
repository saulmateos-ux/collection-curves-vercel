'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Treemap
} from 'recharts'

interface AnalyticsData {
  provider: string
  investmentGrade: string
  riskScore: number
  performanceScore: number
  recoveryVelocity: number
  consistency: number
  volume: number
  efficiency: number
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'risk' | 'performance' | 'efficiency'>('performance')
  const [timeFrame, setTimeFrame] = useState<'30' | '90' | '180' | '365'>('90')

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeFrame])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      if (!supabase) {
        throw new Error('Supabase not initialized')
      }

      const { data, error } = await supabase
        .from('fund_data')
        .select('*')

      if (error) throw error

      // Process and calculate advanced analytics
      const providerAnalytics = new Map<string, any>()
      
      data?.forEach(record => {
        const provider = record.provider_name_per_tbr
        if (!provider) return
        
        if (!providerAnalytics.has(provider)) {
          providerAnalytics.set(provider, {
            provider,
            totalInvested: 0,
            totalRecovered: 0,
            caseCount: 0,
            recoveryTimes: [],
            monthlyPerformance: new Map(),
            gradeDistribution: new Map()
          })
        }
        
        const analytics = providerAnalytics.get(provider)
        analytics.totalInvested += record.total_sent || 0
        analytics.totalRecovered += record.total_repaid || 0
        analytics.caseCount += 1
        
        // Track recovery times
        if (record.origination_date && record.repayment_date) {
          const recoveryDays = Math.floor(
            (new Date(record.repayment_date).getTime() - new Date(record.origination_date).getTime()) 
            / (1000 * 60 * 60 * 24)
          )
          analytics.recoveryTimes.push(recoveryDays)
        }
        
        // Track monthly performance
        const month = new Date(record.origination_date).toISOString().slice(0, 7)
        if (!analytics.monthlyPerformance.has(month)) {
          analytics.monthlyPerformance.set(month, { invested: 0, recovered: 0 })
        }
        const monthData = analytics.monthlyPerformance.get(month)
        monthData.invested += record.total_sent || 0
        monthData.recovered += record.total_repaid || 0
      })

      // Calculate advanced metrics
      const processedAnalytics = Array.from(providerAnalytics.values()).map(analytics => {
        // Risk Score (0-100, lower is better)
        const recoveryRate = analytics.totalInvested > 0 
          ? analytics.totalRecovered / analytics.totalInvested 
          : 0
        const avgRecoveryTime = analytics.recoveryTimes.length > 0
          ? analytics.recoveryTimes.reduce((a, b) => a + b, 0) / analytics.recoveryTimes.length
          : 365
        const riskScore = Math.max(0, Math.min(100, 
          (1 - recoveryRate) * 50 + 
          Math.min(avgRecoveryTime / 365, 1) * 50
        ))

        // Performance Score (0-100, higher is better)
        const performanceScore = Math.min(100,
          recoveryRate * 40 +
          Math.min(analytics.caseCount / 10, 1) * 20 +
          (1 - riskScore / 100) * 40
        )

        // Recovery Velocity (% per month)
        const recoveryVelocity = avgRecoveryTime > 0 
          ? (recoveryRate * 100) / (avgRecoveryTime / 30)
          : 0

        // Consistency Score (standard deviation of monthly performance)
        const monthlyRates = Array.from(analytics.monthlyPerformance.values()).map(m => 
          m.invested > 0 ? m.recovered / m.invested : 0
        )
        const avgRate = monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length
        const variance = monthlyRates.reduce((sum, rate) => 
          sum + Math.pow(rate - avgRate, 2), 0
        ) / monthlyRates.length
        const consistency = Math.max(0, 100 - Math.sqrt(variance) * 100)

        // Efficiency Score
        const efficiency = Math.min(100,
          recoveryVelocity * 10 +
          consistency * 0.3 +
          performanceScore * 0.6
        )

        // Determine investment grade
        let investmentGrade = 'F'
        if (performanceScore >= 90) investmentGrade = 'A'
        else if (performanceScore >= 80) investmentGrade = 'B'
        else if (performanceScore >= 70) investmentGrade = 'C'
        else if (performanceScore >= 60) investmentGrade = 'D'
        else if (performanceScore >= 50) investmentGrade = 'E'

        return {
          provider: analytics.provider,
          investmentGrade,
          riskScore,
          performanceScore,
          recoveryVelocity,
          consistency,
          volume: analytics.totalInvested,
          efficiency
        }
      })

      setAnalyticsData(processedAnalytics)
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Prepare visualization data
  const topPerformers = [...analyticsData]
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 10)

  const gradeDistribution = analyticsData.reduce((acc, item) => {
    acc[item.investmentGrade] = (acc[item.investmentGrade] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const gradeData = Object.entries(gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
    percentage: (count / analyticsData.length) * 100
  })).sort((a, b) => a.grade.localeCompare(b.grade))

  const scatterData = analyticsData.map(item => ({
    x: item.riskScore,
    y: item.performanceScore,
    z: item.volume,
    name: item.provider
  }))

  const radarData = topPerformers.slice(0, 5).map(item => ({
    provider: item.provider.slice(0, 15),
    risk: 100 - item.riskScore,
    performance: item.performanceScore,
    velocity: Math.min(item.recoveryVelocity * 10, 100),
    consistency: item.consistency,
    efficiency: item.efficiency
  }))

  const treemapData = analyticsData.map(item => ({
    name: item.provider,
    size: item.volume,
    grade: item.investmentGrade,
    performance: item.performanceScore
  }))

  const GRADE_COLORS = {
    'A': '#10B981',
    'B': '#3B82F6', 
    'C': '#FBBF24',
    'D': '#FB923C',
    'E': '#EF4444',
    'F': '#991B1B'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing portfolio metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-2">Investment grading, risk assessment, and performance metrics</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="performance">Performance Focus</option>
              <option value="risk">Risk Analysis</option>
              <option value="efficiency">Efficiency Metrics</option>
            </select>
            
            <select
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 180 Days</option>
              <option value="365">Last Year</option>
            </select>
          </div>
        </div>

        {/* Investment Grade Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Investment Grade Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="percentage" fill={(entry) => GRADE_COLORS[entry.grade as keyof typeof GRADE_COLORS] || '#999'}>
                  {gradeData.map((entry, index) => (
                    <Bar key={`cell-${index}`} fill={GRADE_COLORS[entry.grade as keyof typeof GRADE_COLORS] || '#999'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk vs Performance Scatter */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Risk vs Performance Matrix</h2>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="x" 
                  name="Risk Score" 
                  domain={[0, 100]}
                  label={{ value: 'Risk Score', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="y" 
                  name="Performance Score" 
                  domain={[0, 100]}
                  label={{ value: 'Performance Score', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis dataKey="z" range={[50, 400]} name="Volume" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Providers" data={scatterData} fill="#3B82F6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Radar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Top 5 Providers - Multi-Metric Analysis</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="provider" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Risk (Inverted)" dataKey="risk" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
              <Radar name="Performance" dataKey="performance" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
              <Radar name="Velocity" dataKey="velocity" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
              <Radar name="Consistency" dataKey="consistency" stroke="#FBBF24" fill="#FBBF24" fillOpacity={0.1} />
              <Radar name="Efficiency" dataKey="efficiency" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Provider Analytics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recovery Velocity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consistency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recommendation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topPerformers.map((item) => (
                  <tr key={item.provider} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        style={{ 
                          backgroundColor: GRADE_COLORS[item.investmentGrade as keyof typeof GRADE_COLORS] + '20',
                          color: GRADE_COLORS[item.investmentGrade as keyof typeof GRADE_COLORS]
                        }}
                      >
                        {item.investmentGrade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${item.performanceScore}%` }}
                          />
                        </div>
                        <span>{item.performanceScore.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={item.riskScore < 30 ? 'text-green-600' : item.riskScore < 60 ? 'text-yellow-600' : 'text-red-600'}>
                        {item.riskScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.recoveryVelocity.toFixed(2)}%/mo
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.consistency.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.efficiency.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={
                        item.performanceScore >= 80 ? 'text-green-600 font-semibold' :
                        item.performanceScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }>
                        {item.performanceScore >= 80 ? 'STRONG BUY' :
                         item.performanceScore >= 60 ? 'HOLD' :
                         'REDUCE'}
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