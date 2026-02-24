import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AIEngine, GenerateParams, ImageResult } from '../engine/engine.interface';

export class OpenAIEngine implements AIEngine {
  constructor(private config: ConfigService) {}

  getName(): string {
    return 'openai-dall-e-3';
  }

  async generateImage(params: GenerateParams): Promise<ImageResult> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const prompt = this.buildPrompt(params);
    const size = this.mapSize(params.width, params.height);

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt,
          n: 1,
          size,
          quality: 'hd',
          response_format: 'url',
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      );

      const imageUrl = response.data.data[0].url;
      const seed = Math.floor(Math.random() * 1000000);

      return { imageUrl, seed, engine: this.getName() };
    } catch (error) {
      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }

  private buildPrompt(params: GenerateParams): string {
    const bgDesc =
      params.background === 'PURE_WHITE'
        ? 'pure white background'
        : params.background === 'LIGHT_GRAY'
          ? 'light gray background'
          : `${params.backgroundHex || '#f0f0f0'} solid background`;

    return `Professional ecommerce fashion product photo, ${params.pose.toLowerCase().replace(/_/g, ' ')} pose, ${bgDesc}, high-end studio lighting, sharp focus, ${params.prompt}. No watermarks, photorealistic, commercial photography style.`;
  }

  private mapSize(width: number, height: number): string {
    if (width >= 4000) return '1024x1024';
    if (width >= 2500) return '1024x1024';
    return '1024x1024';
  }
}
