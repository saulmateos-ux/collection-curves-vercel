'use client'

import { supabase } from '@/lib/supabase'

interface ExportButtonProps {
  className?: string
  format?: 'csv' | 'json' | 'excel'
}

export default function ExportButton({ className = '', format = 'csv' }: ExportButtonProps) {
  const handleExport = async () => {
    try {
      if (!supabase) {
        alert('Supabase not initialized')
        return
      }

      const { data, error } = await supabase
        .from('fund_data')
        .select('*')

      if (error) throw error

      let content: string
      let mimeType: string
      let filename: string

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2)
          mimeType = 'application/json'
          filename = `export_${new Date().toISOString().split('T')[0]}.json`
          break
        
        case 'csv':
        default:
          // Convert to CSV
          if (data && data.length > 0) {
            const headers = Object.keys(data[0]).join(',')
            const rows = data.map(row => 
              Object.values(row).map(val => 
                typeof val === 'string' && val.includes(',') ? `"${val}"` : val
              ).join(',')
            ).join('\n')
            content = `${headers}\n${rows}`
          } else {
            content = 'No data available'
          }
          mimeType = 'text/csv'
          filename = `export_${new Date().toISOString().split('T')[0]}.csv`
          break
      }

      // Create download
      const blob = new Blob([content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Export error:', err)
      alert(`Export failed: ${err}`)
    }
  }

  return (
    <button
      onClick={handleExport}
      className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition ${className}`}
    >
      Export {format.toUpperCase()}
    </button>
  )
}