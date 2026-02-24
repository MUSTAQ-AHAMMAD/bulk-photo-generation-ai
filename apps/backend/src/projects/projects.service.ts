import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { name: dto.name, description: dto.description, userId },
    });
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        _count: { select: { generations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        generations: { orderBy: { createdAt: 'desc' }, take: 20 },
        products: true,
        models: true,
        _count: { select: { generations: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException();
    return project;
  }

  async update(id: string, userId: string, dto: Partial<CreateProjectDto>) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException();
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException();
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted' };
  }
}
