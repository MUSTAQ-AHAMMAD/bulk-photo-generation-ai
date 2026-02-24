'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import Navbar from '@/components/layout/navbar'
import { Generation, Project } from '@/types'
import ImagePreviewModal from '@/components/generation/image-preview-modal'
import {
  Loader2, Eye, Download, Package
} from 'lucide-react'

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-green-900/40 text-green-400 border-green-800',
    FAILED: 'bg-red-900/40 text-red-400 border-red-800',
    REJECTED: 'bg-orange-900/40 text-orange-400 border-orange-800',
    PENDING: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    PROCESSING: 'bg-blue-900/40 text-blue-400 border-blue-800',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  )
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project & { generations: Generation[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    api.get(`/projects/${id}`).then((r) => setProject(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleExport = async () => {
    if (!project) return
    setExporting(true)
    try {
      const completedIds = project.generations
        .filter((g) => g.status === 'COMPLETED')
        .map((g) => g.id)
      if (!completedIds.length) { setExportMessage({ type: 'error', text: 'No completed generations to export' }); return }
      await api.post('/exports', { projectId: id, generationIds: completedIds })
      setExportMessage({ type: 'success', text: 'Export started! Check your exports.' })
    } catch (e: any) {
      setExportMessage({ type: 'error', text: e.response?.data?.message || 'Export failed' })
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-gray-500" size={32} />
    </div>
  )

  if (!project) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500">Project not found</p>
    </div>
  )

  const completed = project.generations.filter((g) => g.status === 'COMPLETED')

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-gray-400 mt-1">{project.description}</p>}
            <p className="text-sm text-gray-500 mt-1">{project.generations.length} generations · {completed.length} completed</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || !completed.length}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 border border-gray-700 transition"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
            Export ZIP
          </button>
        </div>

        {exportMessage && (
          <div className={`mb-4 p-3 rounded-xl text-sm border ${exportMessage.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-red-900/30 border-red-700 text-red-300'}`}>
            {exportMessage.text}
          </div>
        )}

        {project.generations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>No generations yet. <a href="/generate" className="text-indigo-400 hover:underline">Generate some images</a></p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {project.generations.map((gen, i) => (
              <motion.div
                key={gen.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
              >
                {gen.processedImageUrl || gen.resultImageUrl ? (
                  <div className="relative group aspect-square">
                    <img
                      src={gen.processedImageUrl || gen.resultImageUrl}
                      alt={gen.pose}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPreviewUrl(gen.processedImageUrl || gen.resultImageUrl || '')}
                        className="bg-white/20 backdrop-blur rounded-full p-2 hover:bg-white/30"
                      >
                        <Eye size={14} />
                      </button>
                      {gen.processedImageUrl && (
                        <a
                          href={gen.processedImageUrl}
                          download
                          className="bg-white/20 backdrop-blur rounded-full p-2 hover:bg-white/30"
                        >
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-800 flex items-center justify-center">
                    <Loader2 className="animate-spin text-gray-600" size={24} />
                  </div>
                )}
                <div className="p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-400 truncate">{gen.pose?.replace(/_/g, ' ')}</span>
                    {statusBadge(gen.status)}
                  </div>
                  {gen.rejectionReason && <p className="text-xs text-red-400 mt-1 truncate" title={gen.rejectionReason}>{gen.rejectionReason}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {previewUrl && <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  )
}
