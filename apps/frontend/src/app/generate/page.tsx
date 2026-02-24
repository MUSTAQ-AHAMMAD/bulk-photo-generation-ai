'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationStore } from '@/store/generation.store'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import Navbar from '@/components/layout/navbar'
import ImagePreviewModal from '@/components/generation/image-preview-modal'
import {
  Upload, X, Sparkles, Loader2, CheckCircle2, XCircle, Clock,
  Zap, Star, Gauge, Eye
} from 'lucide-react'

const POSES = [
  { id: 'FRONT', label: 'Front' },
  { id: 'BACK', label: 'Back' },
  { id: 'LEFT', label: 'Left' },
  { id: 'RIGHT', label: 'Right' },
  { id: 'FORTY_FIVE_DEGREE', label: '45°' },
  { id: 'WALKING', label: 'Walking' },
  { id: 'SEATED', label: 'Seated' },
  { id: 'HAND_ON_HIP', label: 'Hand on Hip' },
  { id: 'DETAIL_CLOSE_UP', label: 'Close-up' },
]

const ENGINE_PRESETS = [
  { id: 'BEST_QUALITY', label: 'Best Quality', icon: Star, desc: 'DALL-E 3 / max quality' },
  { id: 'BALANCED', label: 'Balanced', icon: Gauge, desc: 'Stability SDXL' },
  { id: 'FAST', label: 'Fast', icon: Zap, desc: 'Replicate / quick' },
]

const RESOLUTIONS = [
  { id: 'RES_4000', label: '4000×4000' },
  { id: 'RES_2500', label: '2500×2500' },
  { id: 'RES_1500', label: '1500×1500' },
  { id: 'RES_1000', label: '1000×1000' },
]

const FORMATS = ['WEBP', 'PNG', 'JPEG']

type Pose = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'FORTY_FIVE_DEGREE' | 'WALKING' | 'SEATED' | 'HAND_ON_HIP' | 'DETAIL_CLOSE_UP'

function statusIcon(status: string) {
  switch (status) {
    case 'COMPLETED': return <CheckCircle2 className="text-green-400" size={16} />
    case 'FAILED':
    case 'REJECTED': return <XCircle className="text-red-400" size={16} />
    default: return <Clock className="text-yellow-400 animate-pulse" size={16} />
  }
}

export default function GeneratePage() {
  const store = useGenerationStore()
  const user = useAuthStore((s) => s.user)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [projectId, setProjectId] = useState('')

  const onProductDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return
    const formData = new FormData()
    formData.append('file', files[0])
    try {
      const res = await api.post('/upload/product', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      store.setProductImageUrl(res.data.url)
    } catch {
      const reader = new FileReader()
      reader.onload = (e) => store.setProductImageUrl(e.target?.result as string)
      reader.readAsDataURL(files[0])
    }
  }, [store])

  const onModelDrop = useCallback(async (files: File[]) => {
    const urls: string[] = []
    for (const file of files.slice(0, 3)) {
      const reader = new FileReader()
      await new Promise<void>((resolve) => {
        reader.onload = (e) => {
          urls.push(e.target?.result as string)
          resolve()
        }
        reader.readAsDataURL(file)
      })
    }
    store.setModelImageUrls([...store.modelImageUrls, ...urls].slice(0, 3))
  }, [store])

  const { getRootProps: getProdRoot, getInputProps: getProdInput, isDragActive: isProdDrag } = useDropzone({
    onDrop: onProductDrop, accept: { 'image/*': [] }, maxFiles: 1,
  })

  const { getRootProps: getModelRoot, getInputProps: getModelInput, isDragActive: isModelDrag } = useDropzone({
    onDrop: onModelDrop, accept: { 'image/*': [] }, maxFiles: 3,
  })

  const handleGenerate = async () => {
    if (!store.selectedPoses.length) return setError('Select at least one pose')
    if (!store.prompt.trim()) return setError('Enter a prompt')
    if (!projectId) return setError('Enter a project ID (find it in your Dashboard after creating a project)')

    setError('')
    store.setIsGenerating(true)
    try {
      const res = await api.post('/generate', {
        projectId,
        prompt: store.prompt,
        poses: store.selectedPoses,
        background: store.background,
        backgroundHex: store.backgroundHex,
        resolution: store.resolution,
        outputFormat: store.outputFormat,
        enginePreset: store.enginePreset,
        strictMode: store.strictMode,
        modelId: store.selectedModelId,
        modelImageUrls: store.modelImageUrls,
        seed: undefined,
      })
      store.setGenerations(res.data.generations)

      const pollInterval = setInterval(async () => {
        try {
          const updatedRes = await api.get('/generate')
          const updated = updatedRes.data.items?.filter((g: any) =>
            res.data.generations.some((orig: any) => orig.id === g.id)
          )
          if (updated?.length) {
            store.setGenerations(updated)
            const allDone = updated.every((g: any) => ['COMPLETED', 'FAILED', 'REJECTED'].includes(g.status))
            if (allDone) clearInterval(pollInterval)
          }
        } catch {}
      }, 3000)

      const POLL_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
      setTimeout(() => clearInterval(pollInterval), POLL_TIMEOUT_MS)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Generation failed')
    } finally {
      store.setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Prompt */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Prompt</label>
              <textarea
                value={store.prompt}
                onChange={(e) => store.setPrompt(e.target.value)}
                placeholder="A model wearing a red satin evening gown, elegant pose, studio lighting..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none transition"
                rows={4}
              />
            </div>

            {/* Project ID */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Project ID</label>
              <input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="your-project-uuid"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Product Image Upload */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Product Image</label>
              {store.productImageUrl ? (
                <div className="relative">
                  <img src={store.productImageUrl} alt="Product" className="w-full h-40 object-cover rounded-xl" />
                  <button
                    onClick={() => store.setProductImageUrl(null)}
                    className="absolute top-2 right-2 bg-gray-900/80 rounded-full p-1 hover:bg-red-900/80 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  {...getProdRoot()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                    isProdDrag ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input {...getProdInput()} />
                  <Upload className="mx-auto mb-2 text-gray-500" size={24} />
                  <p className="text-sm text-gray-500">Drop product image or click</p>
                </div>
              )}
            </div>

            {/* Model Images */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Model Reference Images <span className="text-gray-500 font-normal">(up to 3)</span>
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {store.modelImageUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={url} alt={`Model ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={() => store.setModelImageUrls(store.modelImageUrls.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 hover:bg-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {store.modelImageUrls.length < 3 && (
                  <div
                    {...getModelRoot()}
                    className={`aspect-square border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition ${
                      isModelDrag ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input {...getModelInput()} />
                    <Upload size={20} className="text-gray-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Strict Mode */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Strict Mode</p>
                  <p className="text-xs text-gray-500 mt-0.5">Lock model identity</p>
                </div>
                <button
                  onClick={() => store.setStrictMode(!store.strictMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${store.strictMode ? 'bg-indigo-600' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${store.strictMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Middle Panel - Pose & Settings */}
          <div className="lg:col-span-1 space-y-4">
            {/* Pose Selector */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <label className="text-sm font-medium text-gray-300 mb-3 block">Poses</label>
              <div className="grid grid-cols-3 gap-2">
                {POSES.map((pose) => (
                  <button
                    key={pose.id}
                    onClick={() => store.togglePose(pose.id as Pose)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium transition border ${
                      store.selectedPoses.includes(pose.id as Pose)
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {pose.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{store.selectedPoses.length} pose(s) selected · {store.selectedPoses.length} credit(s)</p>
            </div>

            {/* Background */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <label className="text-sm font-medium text-gray-300 mb-3 block">Background</label>
              <div className="space-y-2">
                {(['PURE_WHITE', 'LIGHT_GRAY', 'CUSTOM_HEX'] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => store.setBackground(bg)}
                    className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm transition border ${
                      store.background === bg ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded border border-gray-600"
                      style={{ background: bg === 'PURE_WHITE' ? '#fff' : bg === 'LIGHT_GRAY' ? '#d1d5db' : store.backgroundHex }}
                    />
                    {bg === 'PURE_WHITE' ? 'Pure White' : bg === 'LIGHT_GRAY' ? 'Light Gray' : 'Custom'}
                  </button>
                ))}
              </div>
              {store.background === 'CUSTOM_HEX' && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="color"
                    value={store.backgroundHex}
                    onChange={(e) => store.setBackgroundHex(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={store.backgroundHex}
                    onChange={(e) => store.setBackgroundHex(e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              )}
            </div>

            {/* Engine Preset */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <label className="text-sm font-medium text-gray-300 mb-3 block">Engine Preset</label>
              <div className="space-y-2">
                {ENGINE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => store.setEnginePreset(preset.id as any)}
                    className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm transition border ${
                      store.enginePreset === preset.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <preset.icon size={16} />
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-xs text-gray-500 ml-auto">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution & Format */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Resolution</label>
                  <div className="space-y-1.5">
                    {RESOLUTIONS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => store.setResolution(r.id as any)}
                        className={`w-full py-2 px-3 rounded-lg text-xs transition border ${
                          store.resolution === r.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Format</label>
                  <div className="space-y-1.5">
                    {FORMATS.map((f) => (
                      <button
                        key={f}
                        onClick={() => store.setOutputFormat(f as any)}
                        className={`w-full py-2 px-3 rounded-lg text-xs transition border ${
                          store.outputFormat === f ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-1 space-y-4">
            {/* Generate Button */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              {error && (
                <div className="mb-3 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-xs">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-gray-400">Credits available:</span>
                <span className="font-medium text-white">{user?.credits ?? '—'}</span>
              </div>
              <button
                onClick={handleGenerate}
                disabled={store.isGenerating}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl py-3.5 font-semibold transition flex items-center justify-center gap-2 text-base"
              >
                {store.isGenerating ? (
                  <><Loader2 size={18} className="animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles size={18} /> Generate {store.selectedPoses.length} Image{store.selectedPoses.length > 1 ? 's' : ''}</>
                )}
              </button>
            </div>

            {/* Results */}
            <AnimatePresence>
              {store.generations.map((gen) => (
                <motion.div
                  key={gen.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
                >
                  {gen.processedImageUrl || gen.resultImageUrl ? (
                    <div className="relative group">
                      <img
                        src={gen.processedImageUrl || gen.resultImageUrl}
                        alt={gen.pose}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPreviewUrl(gen.processedImageUrl || gen.resultImageUrl)}
                          className="bg-white/20 backdrop-blur rounded-full p-2 hover:bg-white/30 transition"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-800 flex items-center justify-center">
                      <Loader2 className="animate-spin text-gray-500" size={32} />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{gen.pose?.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-1">
                        {statusIcon(gen.status)}
                        <span className="text-xs text-gray-400">{gen.status}</span>
                      </div>
                    </div>
                    {gen.rejectionReason && (
                      <p className="text-xs text-red-400 mt-1">{gen.rejectionReason}</p>
                    )}
                    {gen.similarityScore != null && (
                      <p className="text-xs text-gray-500 mt-1">Similarity: {(gen.similarityScore * 100).toFixed(1)}%</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {previewUrl && (
        <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  )
}
