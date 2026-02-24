import { create } from 'zustand'

export type Pose = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'FORTY_FIVE_DEGREE' | 'WALKING' | 'SEATED' | 'HAND_ON_HIP' | 'DETAIL_CLOSE_UP'
export type Background = 'PURE_WHITE' | 'LIGHT_GRAY' | 'CUSTOM_HEX'
export type Resolution = 'RES_4000' | 'RES_2500' | 'RES_1500' | 'RES_1000'
export type OutputFormat = 'WEBP' | 'PNG' | 'JPEG'
export type EnginePreset = 'BEST_QUALITY' | 'BALANCED' | 'FAST'

interface GenerationState {
  prompt: string
  selectedPoses: Pose[]
  background: Background
  backgroundHex: string
  resolution: Resolution
  outputFormat: OutputFormat
  enginePreset: EnginePreset
  strictMode: boolean
  productImageUrl: string | null
  modelImageUrls: string[]
  selectedModelId: string | null
  selectedProjectId: string | null
  generations: any[]
  isGenerating: boolean

  setPrompt: (p: string) => void
  togglePose: (p: Pose) => void
  setBackground: (b: Background) => void
  setBackgroundHex: (hex: string) => void
  setResolution: (r: Resolution) => void
  setOutputFormat: (f: OutputFormat) => void
  setEnginePreset: (e: EnginePreset) => void
  setStrictMode: (s: boolean) => void
  setProductImageUrl: (url: string | null) => void
  setModelImageUrls: (urls: string[]) => void
  setSelectedModelId: (id: string | null) => void
  setSelectedProjectId: (id: string | null) => void
  setGenerations: (g: any[]) => void
  setIsGenerating: (b: boolean) => void
  reset: () => void
}

const initialState = {
  prompt: '',
  selectedPoses: ['FRONT'] as Pose[],
  background: 'PURE_WHITE' as Background,
  backgroundHex: '#ffffff',
  resolution: 'RES_1500' as Resolution,
  outputFormat: 'WEBP' as OutputFormat,
  enginePreset: 'BALANCED' as EnginePreset,
  strictMode: false,
  productImageUrl: null,
  modelImageUrls: [],
  selectedModelId: null,
  selectedProjectId: null,
  generations: [],
  isGenerating: false,
}

export const useGenerationStore = create<GenerationState>()((set) => ({
  ...initialState,
  setPrompt: (prompt) => set({ prompt }),
  togglePose: (pose) =>
    set((state) => ({
      selectedPoses: state.selectedPoses.includes(pose)
        ? state.selectedPoses.filter((p) => p !== pose)
        : [...state.selectedPoses, pose],
    })),
  setBackground: (background) => set({ background }),
  setBackgroundHex: (backgroundHex) => set({ backgroundHex }),
  setResolution: (resolution) => set({ resolution }),
  setOutputFormat: (outputFormat) => set({ outputFormat }),
  setEnginePreset: (enginePreset) => set({ enginePreset }),
  setStrictMode: (strictMode) => set({ strictMode }),
  setProductImageUrl: (productImageUrl) => set({ productImageUrl }),
  setModelImageUrls: (modelImageUrls) => set({ modelImageUrls }),
  setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setGenerations: (generations) => set({ generations }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  reset: () => set(initialState),
}))
