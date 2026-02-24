import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface EmbeddingResult {
  embedding: number[];
  faceDetected: boolean;
}

@Injectable()
export class InsightFaceService {
  private readonly logger = new Logger(InsightFaceService.name);

  constructor(private config: ConfigService) {}

  async getEmbedding(imageUrl: string): Promise<EmbeddingResult> {
    const insightfaceUrl = this.config.get<string>('INSIGHTFACE_URL', 'http://insightface:5000');

    try {
      const response = await axios.post(
        `${insightfaceUrl}/embed`,
        { image_url: imageUrl },
        { timeout: 30000 },
      );
      return {
        embedding: response.data.embedding,
        faceDetected: response.data.face_detected,
      };
    } catch (error) {
      this.logger.warn(`InsightFace embedding failed: ${error.message}`);
      return { embedding: [], faceDetected: false };
    }
  }

  async computeSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
    if (!embedding1.length || !embedding2.length) return 0;

    const insightfaceUrl = this.config.get<string>('INSIGHTFACE_URL', 'http://insightface:5000');
    try {
      const response = await axios.post(
        `${insightfaceUrl}/similarity`,
        { embedding1, embedding2 },
        { timeout: 10000 },
      );
      return response.data.similarity;
    } catch {
      return this.cosineSimilarity(embedding1, embedding2);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async validateIdentityLock(
    referenceEmbeddings: number[][],
    generatedImageUrl: string,
    threshold: number,
  ): Promise<{ passed: boolean; score: number; reason?: string }> {
    const { embedding: genEmbedding, faceDetected } = await this.getEmbedding(generatedImageUrl);

    if (!faceDetected) {
      return { passed: false, score: 0, reason: 'No face detected in generated image' };
    }

    let maxSimilarity = 0;
    for (const refEmb of referenceEmbeddings) {
      const sim = await this.computeSimilarity(refEmb, genEmbedding);
      if (sim > maxSimilarity) maxSimilarity = sim;
    }

    if (maxSimilarity < threshold) {
      return {
        passed: false,
        score: maxSimilarity,
        reason: `Face similarity ${maxSimilarity.toFixed(3)} below threshold ${threshold}`,
      };
    }

    return { passed: true, score: maxSimilarity };
  }
}
