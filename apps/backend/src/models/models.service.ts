import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsightFaceService } from '../insightface/insightface.service';
import { CreateModelDto } from './dto/create-model.dto';

@Injectable()
export class ModelsService {
  constructor(
    private prisma: PrismaService,
    private insightface: InsightFaceService,
  ) {}

  async create(userId: string, dto: CreateModelDto) {
    const embeddings: number[][] = [];
    for (const imageUrl of dto.imageUrls) {
      const { embedding, faceDetected } = await this.insightface.getEmbedding(imageUrl);
      if (faceDetected && embedding.length > 0) {
        embeddings.push(embedding);
      }
    }

    return this.prisma.aIModel.create({
      data: {
        name: dto.name,
        userId,
        projectId: dto.projectId,
        imageUrls: dto.imageUrls,
        embeddingData: embeddings.length > 0 ? embeddings : undefined,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.aIModel.findMany({
      where: { userId },
      select: { id: true, name: true, imageUrls: true, projectId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const model = await this.prisma.aIModel.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        imageUrls: true,
        projectId: true,
        userId: true,
        createdAt: true,
      },
    });
    if (!model) throw new NotFoundException('Model not found');
    if (model.userId !== userId) throw new ForbiddenException();
    return model;
  }

  async remove(id: string, userId: string) {
    const model = await this.prisma.aIModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundException('Model not found');
    if (model.userId !== userId) throw new ForbiddenException();
    await this.prisma.aIModel.delete({ where: { id } });
    return { message: 'Model deleted' };
  }
}
