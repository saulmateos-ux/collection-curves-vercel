'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | null, text: string }>({ type: null, text: '' })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dataPreview, setDataPreview] = useState<any[]>([])
  const [uploadStats, setUploadStats] = useState<{ total: number, success: number, failed: number } | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setSelectedFile(file)
    setMessage({ type: 'info', text: `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` })
    
    // Preview for CSV files
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').slice(0, 6) // Preview first 5 rows
        const headers = lines[0].split(',')
        const preview = lines.slice(1).map(line => {
          const values = line.split(',')
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim()
            return obj
          }, {} as any)
        })
        setDataPreview(preview)
      }
      reader.readAsText(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a file first' })
      return
    }

    if (!supabase) {
      setMessage({ type: 'error', text: 'Supabase connection not available' })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setMessage({ type: 'info', text: 'Processing file...' })

    try {
      // Read file content
      const reader = new FileReader()
      
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          const headers = lines[0].split(',').map(h => h.trim())
          
          setUploadProgress(10)
          setMessage({ type: 'info', text: `Parsing ${lines.length - 1} records...` })
          
          // Parse CSV data
          const records = lines.slice(1).map(line => {
            const values = line.split(',')
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index]?.trim()
              return obj
            }, {} as any)
          })
          
          setUploadProgress(30)
          setMessage({ type: 'info', text: 'Uploading to database...' })
          
          // Upload in batches
          const batchSize = 100
          let successCount = 0
          let failCount = 0
          
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize)
            
            try {
              const { error } = await supabase
                .from('fund_data')
                .upsert(batch)
              
              if (error) {
                console.error('Batch upload error:', error)
                failCount += batch.length
              } else {
                successCount += batch.length
              }
            } catch (err) {
              console.error('Batch error:', err)
              failCount += batch.length
            }
            
            const progress = 30 + ((i + batch.length) / records.length) * 60
            setUploadProgress(Math.min(progress, 90))
          }
          
          setUploadProgress(100)
          setUploadStats({ total: records.length, success: successCount, failed: failCount })
          
          if (failCount === 0) {
            setMessage({ 
              type: 'success', 
              text: `Successfully uploaded ${successCount} records!` 
            })
          } else {
            setMessage({ 
              type: 'error', 
              text: `Uploaded ${successCount} records, ${failCount} failed` 
            })
          }
          
        } catch (err) {
          console.error('Upload error:', err)
          setMessage({ type: 'error', text: `Upload failed: ${err}` })
        }
      }
      
      reader.readAsText(selectedFile)
      
    } catch (err) {
      console.error('File processing error:', err)
      setMessage({ type: 'error', text: `Error: ${err}` })
    } finally {
      setUploading(false)
    }
  }

  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone!')) {
      return
    }
    
    try {
      setMessage({ type: 'info', text: 'Clearing database...' })
      
      if (!supabase) {
        throw new Error('Supabase not initialized')
      }
      
      const { error } = await supabase
        .from('fund_data')
        .delete()
        .neq('id', 0) // Delete all records
      
      if (error) throw error
      
      setMessage({ type: 'success', text: 'Database cleared successfully' })
    } catch (err) {
      console.error('Clear error:', err)
      setMessage({ type: 'error', text: `Failed to clear database: ${err}` })
    }
  }

  const handleExportData = async () => {
    try {
      setMessage({ type: 'info', text: 'Exporting data...' })
      
      if (!supabase) {
        throw new Error('Supabase not initialized')
      }
      
      const { data, error } = await supabase
        .from('fund_data')
        .select('*')
        .csv()
      
      if (error) throw error
      
      // Create download link
      const blob = new Blob([data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fund_data_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setMessage({ type: 'success', text: 'Data exported successfully' })
    } catch (err) {
      console.error('Export error:', err)
      setMessage({ type: 'error', text: `Export failed: ${err}` })
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Tools</h1>
          <p className="text-gray-600 mt-2">Data management and system administration</p>
        </div>

        {/* Alert Message */}
        {message.type && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' :
            message.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Upload</h2>
          
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={uploading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50"
              />
            </div>

            {/* Data Preview */}
            {dataPreview.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Data Preview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(dataPreview[0]).slice(0, 5).map(key => (
                          <th key={key} className="px-2 py-1 text-left">{key}</th>
                        ))}
                        {Object.keys(dataPreview[0]).length > 5 && (
                          <th className="px-2 py-1">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {dataPreview.map((row, i) => (
                        <tr key={i} className="border-t">
                          {Object.values(row).slice(0, 5).map((val: any, j) => (
                            <td key={j} className="px-2 py-1">{val}</td>
                          ))}
                          {Object.keys(row).length > 5 && (
                            <td className="px-2 py-1">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {uploading && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Stats */}
            {uploadStats && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{uploadStats.total}</p>
                  <p className="text-sm text-gray-600">Total Records</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{uploadStats.success}</p>
                  <p className="text-sm text-gray-600">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{uploadStats.failed}</p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {uploading ? 'Uploading...' : 'Upload Data'}
            </button>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Management</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Export All Data
            </button>
            
            <button
              onClick={handleClearDatabase}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Clear Database
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">CSV Upload Instructions</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• File must be in CSV format with headers in the first row</li>
            <li>• Required columns: provider_name_per_tbr, total_sent, total_repaid, origination_date</li>
            <li>• Maximum file size: 50MB</li>
            <li>• Data will be automatically validated during upload</li>
            <li>• Duplicate records will be updated based on unique identifiers</li>
          </ul>
        </div>
      </div>
    </div>
  )
}