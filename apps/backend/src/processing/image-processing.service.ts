import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import axios from 'axios';

export const DEFAULT_SSIM_THRESHOLD = 0.92;

export interface ProcessingOptions {
  width: number;
  height: number;
  format: 'webp' | 'png' | 'jpeg';
  dpi?: number;
}

export interface SSIMResult {
  score: number;
  passed: boolean;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  async processImage(
    imageData: Buffer | string,
    options: ProcessingOptions,
  ): Promise<Buffer> {
    let input: Buffer;

    if (typeof imageData === 'string') {
      if (imageData.startsWith('data:')) {
        const base64 = imageData.split(',')[1];
        input = Buffer.from(base64, 'base64');
      } else {
        const response = await axios.get(imageData, { responseType: 'arraybuffer', timeout: 30000 });
        input = Buffer.from(response.data);
      }
    } else {
      input = imageData;
    }

    let pipeline = sharp(input, { failOn: 'none' })
      .resize(options.width, options.height, {
        kernel: sharp.kernel.lanczos3,
        fit: 'cover',
        withoutEnlargement: false,
      });

    if (options.format === 'webp') {
      pipeline = pipeline.webp({
        quality: 100,
        lossless: true,
        effort: 6,
      });
    } else if (options.format === 'png') {
      pipeline = pipeline.png({
        compressionLevel: 0,
        adaptiveFiltering: false,
      });
    } else {
      pipeline = pipeline.jpeg({
        quality: 100,
        chromaSubsampling: '4:4:4',
      });
    }

    const processed = await pipeline
      .withMetadata({
        density: options.dpi || 300,
      })
      .toBuffer();

    return processed;
  }

  async downloadImageAsBuffer(url: string): Promise<Buffer> {
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      return Buffer.from(base64, 'base64');
    }
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return Buffer.from(response.data);
  }

  async computeSSIM(
    imageA: Buffer,
    imageB: Buffer,
    region?: { x: number; y: number; width: number; height: number },
  ): Promise<SSIMResult> {
    try {
      let bufA = imageA;
      let bufB = imageB;

      if (region) {
        bufA = await sharp(imageA).extract(region).grayscale().raw().toBuffer();
        bufB = await sharp(imageB).extract(region).grayscale().raw().toBuffer();
      } else {
        const meta = await sharp(imageA).metadata();
        const w = Math.min(meta.width || 256, 256);
        const h = Math.min(meta.height || 256, 256);
        bufA = await sharp(imageA).resize(w, h).grayscale().raw().toBuffer();
        bufB = await sharp(imageB).resize(w, h).grayscale().raw().toBuffer();
      }

      const score = this.calculateSSIM(bufA, bufB);
      return { score, passed: score >= DEFAULT_SSIM_THRESHOLD };
    } catch (error) {
      this.logger.warn(`SSIM calculation failed: ${error.message}`);
      return { score: 0, passed: false };
    }
  }

  private calculateSSIM(a: Buffer, b: Buffer): number {
    if (a.length !== b.length) return 0;
    const n = a.length;
    const C1 = 6.5025;
    const C2 = 58.5225;

    let muA = 0;
    let muB = 0;
    for (let i = 0; i < n; i++) {
      muA += a[i];
      muB += b[i];
    }
    muA /= n;
    muB /= n;

    let sigA2 = 0;
    let sigB2 = 0;
    let sigAB = 0;
    for (let i = 0; i < n; i++) {
      const dA = a[i] - muA;
      const dB = b[i] - muB;
      sigA2 += dA * dA;
      sigB2 += dB * dB;
      sigAB += dA * dB;
    }
    sigA2 /= n;
    sigB2 /= n;
    sigAB /= n;

    const numerator = (2 * muA * muB + C1) * (2 * sigAB + C2);
    const denominator = (muA * muA + muB * muB + C1) * (sigA2 + sigB2 + C2);
    return denominator === 0 ? 1 : numerator / denominator;
  }

  getResolutionDimensions(resolution: string): { width: number; height: number } {
    switch (resolution) {
      case 'RES_4000': return { width: 4000, height: 4000 };
      case 'RES_2500': return { width: 2500, height: 2500 };
      case 'RES_1500': return { width: 1500, height: 1500 };
      case 'RES_1000': return { width: 1000, height: 1000 };
      default: return { width: 1500, height: 1500 };
    }
  }
}
