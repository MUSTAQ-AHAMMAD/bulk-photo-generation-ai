import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AIEngine, GenerateParams, ImageResult } from '../engine/engine.interface';

export class StabilityEngine implements AIEngine {
  constructor(private config: ConfigService) {}

  getName(): string {
    return 'stability-sdxl';
  }

  async generateImage(params: GenerateParams): Promise<ImageResult> {
    const apiKey = this.config.get<string>('STABILITY_API_KEY');
    if (!apiKey) throw new Error('STABILITY_API_KEY not configured');

    const prompt = this.buildPrompt(params);
    const seed = params.seed || Math.floor(Math.random() * 4294967295);

    try {
      const response = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          text_prompts: [
            { text: prompt, weight: 1 },
            {
              text: 'blurry, low quality, watermark, text, bad anatomy, distorted',
              weight: -1,
            },
          ],
          cfg_scale: params.guidanceScale || 7,
          height: Math.min(params.height, 1024),
          width: Math.min(params.width, 1024),
          steps: params.steps || 30,
          samples: 1,
          seed,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 120000,
        },
      );

      const b64 = response.data.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${b64}`;

      return { imageUrl, seed, engine: this.getName() };
    } catch (error) {
      throw new Error(`Stability generation failed: ${error.message}`);
    }
  }

  private buildPrompt(params: GenerateParams): string {
    const bgDesc =
      params.background === 'PURE_WHITE'
        ? 'pure white background'
        : params.background === 'LIGHT_GRAY'
          ? 'light gray studio background'
          : `solid ${params.backgroundHex || '#f0f0f0'} background`;

    return `professional fashion ecommerce product photography, ${params.pose.toLowerCase().replace(/_/g, ' ')}, ${bgDesc}, studio lighting, sharp details, ${params.prompt}, photorealistic, high resolution`;
  }
}
