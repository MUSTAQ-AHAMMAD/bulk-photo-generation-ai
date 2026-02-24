export interface Generation {
  id: string
  userId: string
  projectId: string
  prompt: string
  pose: string
  background: string
  backgroundHex?: string
  resolution: string
  outputFormat: string
  enginePreset: string
  strictMode: boolean
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED'
  resultImageUrl?: string
  processedImageUrl?: string
  similarityScore?: number
  ssimScore?: number
  rejectionReason?: string
  retryCount: number
  seed?: number
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  userId: string
  createdAt: string
  updatedAt: string
  _count?: { generations: number }
}

export interface AIModel {
  id: string
  name: string
  imageUrls: string[]
  projectId?: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  name: string
  role: string
  credits: number
}
