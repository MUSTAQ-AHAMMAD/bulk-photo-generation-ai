import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ImageProcessingService } from '../processing/image-processing.service';
import { CreateExportDto } from './dto/create-export.dto';
import * as archiver from 'archiver';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private imageProcessing: ImageProcessingService,
  ) {}

  async createExport(userId: string, dto: CreateExportDto) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException();

    const exportRecord = await this.prisma.export.create({
      data: {
        userId,
        projectId: dto.projectId,
        status: 'PENDING',
        metadata: { generationIds: dto.generationIds, resolutions: dto.resolutions },
      },
    });

    this.processExport(exportRecord.id, userId, dto).catch((err) => {
      this.logger.error(`Export ${exportRecord.id} failed: ${err.message}`);
    });

    return { exportId: exportRecord.id, status: 'PENDING', message: 'Export job started' };
  }

  private async processExport(exportId: string, userId: string, dto: CreateExportDto) {
    await this.prisma.export.update({ where: { id: exportId }, data: { status: 'PROCESSING' } });

    try {
      const generations = await this.prisma.generation.findMany({
        where: { id: { in: dto.generationIds }, userId, status: 'COMPLETED' },
      });

      if (!generations.length) {
        await this.prisma.export.update({
          where: { id: exportId },
          data: { status: 'FAILED', metadata: { error: 'No completed generations found' } },
        });
        return;
      }

      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));

      const metadata = [];
      for (const gen of generations) {
        const imageUrl = gen.processedImageUrl || gen.resultImageUrl;
        if (!imageUrl) continue;

        const buf = await this.imageProcessing.downloadImageAsBuffer(imageUrl);
        const filename = `${gen.pose}_${gen.id}.${gen.outputFormat.toLowerCase()}`;
        archive.append(buf, { name: filename });

        metadata.push({
          id: gen.id,
          pose: gen.pose,
          resolution: gen.resolution,
          format: gen.outputFormat,
          seed: gen.seed,
          filename,
          createdAt: gen.createdAt,
        });
      }

      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
      await archive.finalize();

      const zipBuffer = Buffer.concat(chunks);
      const zipUrl = await this.storage.uploadBuffer(
        zipBuffer,
        `exports/${userId}`,
        exportId,
        'raw',
      );

      await this.prisma.export.update({
        where: { id: exportId },
        data: { status: 'COMPLETED', zipUrl, metadata: { generations: metadata } },
      });
    } catch (error) {
      await this.prisma.export.update({
        where: { id: exportId },
        data: { status: 'FAILED', metadata: { error: error.message } },
      });
    }
  }

  async getExport(id: string, userId: string) {
    const exp = await this.prisma.export.findUnique({ where: { id } });
    if (!exp) throw new NotFoundException('Export not found');
    if (exp.userId !== userId) throw new ForbiddenException();
    return exp;
  }

  async getUserExports(userId: string) {
    return this.prisma.export.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
