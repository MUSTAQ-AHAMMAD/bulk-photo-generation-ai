'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import Navbar from '@/components/layout/navbar'
import { Project } from '@/types'
import { Plus, Folder, Image, Loader2, CreditCard } from 'lucide-react'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const createProject = async () => {
    if (!newProjectName.trim()) return
    setCreating(true)
    try {
      const res = await api.post('/projects', { name: newProjectName })
      setProjects([res.data, ...projects])
      setNewProjectName('')
      setShowCreate(false)
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <CreditCard size={16} className="text-indigo-400" />
              <span className="text-sm text-gray-300">{user?.credits ?? 0} credits</span>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
            >
              <Plus size={16} /> New Project
            </button>
          </div>
        </div>

        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6"
          >
            <h3 className="text-sm font-medium text-gray-300 mb-3">Create New Project</h3>
            <div className="flex gap-3">
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProject()}
                placeholder="Project name..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button onClick={createProject} disabled={creating} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create
              </button>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white px-3">Cancel</button>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <Folder size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 mb-4">No projects yet</p>
            <button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition">
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/projects/${project.id}`} className="block bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                      <Folder size={20} className="text-indigo-400" />
                    </div>
                    <span className="text-xs text-gray-500">{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-indigo-300 transition">{project.name}</h3>
                  {project.description && <p className="text-xs text-gray-500 mt-1">{project.description}</p>}
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                    <Image size={12} />
                    <span>{project._count?.generations ?? 0} generations</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
