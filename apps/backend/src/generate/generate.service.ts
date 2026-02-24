import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { InsightFaceService } from '../insightface/insightface.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { CreateGenerationDto } from './dto/create-generation.dto';

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(
    @InjectQueue('generation') private generationQueue: Queue,
    private prisma: PrismaService,
    private insightface: InsightFaceService,
    private storage: StorageService,
    private config: ConfigService,
  ) {}

  async createGeneration(userId: string, dto: CreateGenerationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.credits < dto.poses.length) {
      throw new ForbiddenException(
        `Insufficient credits. Need ${dto.poses.length}, have ${user.credits}`,
      );
    }

    let modelEmbeddings: number[][] = [];
    if (dto.strictMode && dto.modelId) {
      const model = await this.prisma.aIModel.findUnique({ where: { id: dto.modelId } });
      if (model?.embeddingData) {
        modelEmbeddings = model.embeddingData as number[][];
      }
    }

    const generations = [];

    for (const pose of dto.poses) {
      const generation = await this.prisma.generation.create({
        data: {
          userId,
          projectId: dto.projectId,
          modelId: dto.modelId,
          productId: dto.productId,
          prompt: dto.prompt,
          pose: pose as any,
          background: dto.background as any,
          backgroundHex: dto.backgroundHex,
          resolution: dto.resolution as any,
          outputFormat: dto.outputFormat as any,
          enginePreset: dto.enginePreset as any,
          strictMode: dto.strictMode || false,
          status: 'PENDING',
          creditsUsed: 1,
        },
      });

      let productImageUrl: string | undefined;
      if (dto.productId) {
        const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
        productImageUrl = product?.imageUrl;
      }

      const job = await this.generationQueue.add(
        'generate',
        {
          generationId: generation.id,
          userId,
          prompt: dto.prompt,
          pose,
          background: dto.background,
          backgroundHex: dto.backgroundHex,
          resolution: dto.resolution,
          outputFormat: dto.outputFormat,
          enginePreset: dto.enginePreset || 'BALANCED',
          strictMode: dto.strictMode || false,
          productImageUrl,
          modelImageUrls: dto.modelImageUrls,
          modelEmbeddings,
          seed: dto.seed,
        },
        {
          attempts: 1,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      await this.prisma.generation.update({
        where: { id: generation.id },
        data: { jobId: String(job.id) },
      });

      generations.push(generation);
    }

    return { generations, message: `${generations.length} generation job(s) queued` };
  }

  async getGeneration(id: string, userId: string) {
    return this.prisma.generation.findFirst({
      where: { id, userId },
      include: { product: true, aiModel: true },
    });
  }

  async getUserGenerations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.generation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { product: true, aiModel: true, project: true },
      }),
      this.prisma.generation.count({ where: { userId } }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
