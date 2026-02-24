'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

interface Props {
  url: string
  onClose: () => void
}

export default function ImagePreviewModal({ url, onClose }: Props) {
  const [zoom, setZoom] = useState(1)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-4xl max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <button
              onClick={() => setZoom(Math.min(zoom * 1.25, 4))}
              className="bg-black/50 backdrop-blur rounded-full p-2 text-white hover:bg-black/70 transition"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom(Math.max(zoom / 1.25, 0.5))}
              className="bg-black/50 backdrop-blur rounded-full p-2 text-white hover:bg-black/70 transition"
            >
              <ZoomOut size={16} />
            </button>
            <a
              href={url}
              download
              className="bg-black/50 backdrop-blur rounded-full p-2 text-white hover:bg-black/70 transition"
            >
              <Download size={16} />
            </a>
            <button
              onClick={onClose}
              className="bg-black/50 backdrop-blur rounded-full p-2 text-white hover:bg-black/70 transition"
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-auto max-h-[90vh] rounded-2xl">
            <img
              src={url}
              alt="Preview"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}
              className="max-w-full rounded-2xl"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
