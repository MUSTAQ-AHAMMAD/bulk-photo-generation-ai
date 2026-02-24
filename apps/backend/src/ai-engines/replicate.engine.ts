import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AIEngine, GenerateParams, ImageResult } from '../engine/engine.interface';

export class ReplicateEngine implements AIEngine {
  constructor(private config: ConfigService) {}

  getName(): string {
    return 'replicate-sdxl';
  }

  async generateImage(params: GenerateParams): Promise<ImageResult> {
    const apiKey = this.config.get<string>('REPLICATE_API_KEY');
    if (!apiKey) throw new Error('REPLICATE_API_KEY not configured');

    const prompt = this.buildPrompt(params);
    const seed = params.seed || Math.floor(Math.random() * 4294967295);

    try {
      const createResponse = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          input: {
            prompt,
            negative_prompt: 'blurry, low quality, watermark, text, distorted',
            width: Math.min(params.width, 1024),
            height: Math.min(params.height, 1024),
            num_inference_steps: params.steps || 25,
            guidance_scale: params.guidanceScale || 7.5,
            seed,
          },
        },
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const predictionId = createResponse.data.id;
      const imageUrl = await this.pollForResult(predictionId, apiKey);

      return { imageUrl, seed, engine: this.getName() };
    } catch (error) {
      throw new Error(`Replicate generation failed: ${error.message}`);
    }
  }

  private async pollForResult(predictionId: string, apiKey: string): Promise<string> {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const response = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: { Authorization: `Token ${apiKey}` },
        },
      );
      const { status, output, error } = response.data;
      if (status === 'succeeded' && output?.[0]) return output[0];
      if (status === 'failed') throw new Error(`Replicate failed: ${error}`);
    }
    throw new Error('Replicate prediction timed out');
  }

  private buildPrompt(params: GenerateParams): string {
    const bgDesc =
      params.background === 'PURE_WHITE'
        ? 'pure white background'
        : params.background === 'LIGHT_GRAY'
          ? 'light gray background'
          : `solid ${params.backgroundHex || '#f0f0f0'} background`;

    return `fashion product photo, ${params.pose.toLowerCase().replace(/_/g, ' ')}, ${bgDesc}, professional lighting, ${params.prompt}`;
  }
}
