import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EngineFactory } from '../engine/engine.factory';
import { InsightFaceService } from '../insightface/insightface.service';
import { ImageProcessingService, DEFAULT_SSIM_THRESHOLD } from '../processing/image-processing.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';

export interface GenerationJobData {
  generationId: string;
  userId: string;
  prompt: string;
  pose: string;
  background: string;
  backgroundHex?: string;
  resolution: string;
  outputFormat: string;
  enginePreset: string;
  strictMode: boolean;
  productImageUrl?: string;
  modelImageUrls?: string[];
  modelEmbeddings?: number[][];
  seed?: number;
  similarityThreshold?: number;
  ssimThreshold?: number;
}

const MAX_RETRIES = 3;

@Processor('generation')
export class GenerationProcessor {
  private readonly logger = new Logger(GenerationProcessor.name);
  private readonly maxRetries: number;

  constructor(
    private prisma: PrismaService,
    private engineFactory: EngineFactory,
    private insightface: InsightFaceService,
    private imageProcessing: ImageProcessingService,
    private storage: StorageService,
    private config: ConfigService,
  ) {
    this.maxRetries = parseInt(config.get<string>('GENERATION_MAX_RETRIES', String(MAX_RETRIES)), 10);
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} for generation ${job.data.generationId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }

  @Process('generate')
  async handleGeneration(job: Job<GenerationJobData>) {
    const data = job.data;
    const gen = await this.prisma.generation.findUnique({ where: { id: data.generationId } });
    if (!gen) return;

    await this.prisma.generation.update({
      where: { id: data.generationId },
      data: { status: 'PROCESSING', jobId: String(job.id) },
    });

    try {
      const dims = this.imageProcessing.getResolutionDimensions(data.resolution);
      const engine = this.engineFactory.getEngine(data.enginePreset as any);

      let generatedUrl: string;
      let seed = data.seed;
      let attemptCount = 0;
      let lastRejectionReason: string | null = null;
      let finalSimilarityScore: number | null = null;
      let finalSsimScore: number | null = null;

      while (attemptCount < this.maxRetries) {
        attemptCount++;

        const result = await engine.generateImage({
          prompt: data.prompt,
          width: dims.width,
          height: dims.height,
          seed,
          pose: data.pose,
          background: data.background,
          backgroundHex: data.backgroundHex,
          productImageUrl: data.productImageUrl,
          modelImageUrls: data.modelImageUrls,
          strictMode: data.strictMode,
        });

        generatedUrl = result.imageUrl;
        seed = result.seed;

        if (data.strictMode && data.modelEmbeddings?.length) {
          const threshold =
            data.similarityThreshold ||
            parseFloat(this.config.get<string>('FACE_SIMILARITY_THRESHOLD', '0.65'));

          const identityCheck = await this.insightface.validateIdentityLock(
            data.modelEmbeddings,
            generatedUrl,
            threshold,
          );

          finalSimilarityScore = identityCheck.score;

          if (!identityCheck.passed) {
            lastRejectionReason = identityCheck.reason;
            this.logger.warn(
              `Attempt ${attemptCount}: identity check failed - ${identityCheck.reason}`,
            );
            continue;
          }
        }

        if (data.productImageUrl) {
          const ssimThreshold =
            data.ssimThreshold ||
            parseFloat(this.config.get<string>('PRODUCT_SSIM_THRESHOLD', String(DEFAULT_SSIM_THRESHOLD)));

          const productBuf = await this.imageProcessing.downloadImageAsBuffer(
            data.productImageUrl,
          );
          const genBuf = await this.imageProcessing.downloadImageAsBuffer(generatedUrl);
          const ssimResult = await this.imageProcessing.computeSSIM(productBuf, genBuf);
          finalSsimScore = ssimResult.score;

          if (!ssimResult.passed && ssimResult.score < ssimThreshold) {
            lastRejectionReason = `Product SSIM ${ssimResult.score.toFixed(3)} below threshold ${ssimThreshold}`;
            this.logger.warn(`Attempt ${attemptCount}: SSIM check failed`);
            continue;
          }
        }

        lastRejectionReason = null;
        break;
      }

      if (lastRejectionReason) {
        await this.prisma.generation.update({
          where: { id: data.generationId },
          data: {
            status: 'REJECTED',
            rejectionReason: lastRejectionReason,
            retryCount: attemptCount,
            similarityScore: finalSimilarityScore,
            ssimScore: finalSsimScore,
          },
        });
        return;
      }

      const format = data.outputFormat.toLowerCase() as 'webp' | 'png' | 'jpeg';
      const processed = await this.imageProcessing.processImage(generatedUrl, {
        width: dims.width,
        height: dims.height,
        format,
        dpi: 300,
      });

      const uploadFolder = `generations/${data.userId}`;
      const rawUrl = await this.storage.uploadFromUrl(generatedUrl, `${uploadFolder}/raw`);
      const processedUrl = await this.storage.uploadBuffer(
        processed,
        `${uploadFolder}/processed`,
        `${data.generationId}_${data.pose}`,
      );

      await this.prisma.generation.update({
        where: { id: data.generationId },
        data: {
          status: 'COMPLETED',
          resultImageUrl: rawUrl,
          processedImageUrl: processedUrl,
          retryCount: attemptCount - 1,
          seed,
          similarityScore: finalSimilarityScore,
          ssimScore: finalSsimScore,
        },
      });

      await this.prisma.creditLedger.create({
        data: {
          userId: data.userId,
          amount: -1,
          type: 'GENERATION',
          description: `Generated image for pose ${data.pose}`,
          generationId: data.generationId,
        },
      });

      await this.prisma.user.update({
        where: { id: data.userId },
        data: { credits: { decrement: 1 } },
      });
    } catch (error) {
      this.logger.error(`Generation failed: ${error.message}`, error.stack);
      await this.prisma.generation.update({
        where: { id: data.generationId },
        data: {
          status: 'FAILED',
          rejectionReason: error.message,
        },
      });
    }
  }
}
