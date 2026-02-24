'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import Navbar from '@/components/layout/navbar'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { Users, Image, TrendingDown, CheckCircle, XCircle, Clock, Settings, Loader2 } from 'lucide-react'

interface Metrics {
  users: { total: number }
  generations: {
    total: number
    completed: number
    rejected: number
    failed: number
    pending: number
    rejectionRate: string
  }
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [threshold, setThreshold] = useState('0.65')
  const [ssimThreshold, setSsimThreshold] = useState('0.92')

  useEffect(() => {
    if (user?.role !== 'ADMIN') { router.push('/dashboard'); return }
    Promise.all([
      api.get('/admin/metrics'),
      api.get('/admin/config'),
    ]).then(([m, c]) => {
      setMetrics(m.data)
      if (c.data.FACE_SIMILARITY_THRESHOLD) setThreshold(c.data.FACE_SIMILARITY_THRESHOLD)
      if (c.data.PRODUCT_SSIM_THRESHOLD) setSsimThreshold(c.data.PRODUCT_SSIM_THRESHOLD)
    }).catch(console.error).finally(() => setLoading(false))
  }, [user, router])

  const saveConfig = async () => {
    setSavingConfig(true)
    try {
      await Promise.all([
        api.put('/admin/config', { key: 'FACE_SIMILARITY_THRESHOLD', value: threshold, description: 'Face identity lock threshold (0-1)' }),
        api.put('/admin/config', { key: 'PRODUCT_SSIM_THRESHOLD', value: ssimThreshold, description: 'Product SSIM threshold (0-1)' }),
      ])
      alert('Config saved')
    } catch (e) { console.error(e) }
    finally { setSavingConfig(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-500" size={32} />
    </div>
  )

  const statCards = metrics ? [
    { label: 'Total Users', value: metrics.users.total, icon: Users, color: 'text-blue-400' },
    { label: 'Total Generations', value: metrics.generations.total, icon: Image, color: 'text-indigo-400' },
    { label: 'Completed', value: metrics.generations.completed, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Rejection Rate', value: `${metrics.generations.rejectionRate}%`, icon: TrendingDown, color: 'text-orange-400' },
    { label: 'Rejected', value: metrics.generations.rejected, icon: XCircle, color: 'text-red-400' },
    { label: 'Pending', value: metrics.generations.pending, icon: Clock, color: 'text-yellow-400' },
  ] : []

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <card.icon size={20} className={card.color} />
                <span className="text-sm text-gray-400">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Config */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Configuration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Face Similarity Threshold</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Identity lock threshold (default: 0.65)</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Product SSIM Threshold</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={ssimThreshold}
                onChange={(e) => setSsimThreshold(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Product accuracy threshold (default: 0.92)</p>
            </div>
          </div>
          <button
            onClick={saveConfig}
            disabled={savingConfig}
            className="mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 text-sm font-medium flex items-center gap-2 transition"
          >
            {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
            Save Config
          </button>
        </div>
      </div>
    </div>
  )
}
