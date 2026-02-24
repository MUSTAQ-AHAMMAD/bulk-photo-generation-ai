export interface GenerateParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed?: number;
  productImageUrl?: string;
  modelImageUrls?: string[];
  pose: string;
  background: string;
  backgroundHex?: string;
  strictMode?: boolean;
  steps?: number;
  guidanceScale?: number;
}

export interface ImageResult {
  imageUrl: string;
  seed: number;
  engine: string;
  metadata?: Record<string, any>;
}

export interface AIEngine {
  generateImage(params: GenerateParams): Promise<ImageResult>;
  getName(): string;
}
