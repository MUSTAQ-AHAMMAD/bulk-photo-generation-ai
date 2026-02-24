import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getMetrics() {
    const [
      totalUsers,
      totalGenerations,
      completedGenerations,
      rejectedGenerations,
      failedGenerations,
      pendingGenerations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.generation.count(),
      this.prisma.generation.count({ where: { status: 'COMPLETED' } }),
      this.prisma.generation.count({ where: { status: 'REJECTED' } }),
      this.prisma.generation.count({ where: { status: 'FAILED' } }),
      this.prisma.generation.count({ where: { status: 'PENDING' } }),
    ]);

    const rejectionRate =
      totalGenerations > 0 ? (rejectedGenerations / totalGenerations) * 100 : 0;

    return {
      users: { total: totalUsers },
      generations: {
        total: totalGenerations,
        completed: completedGenerations,
        rejected: rejectedGenerations,
        failed: failedGenerations,
        pending: pendingGenerations,
        rejectionRate: rejectionRate.toFixed(2),
      },
    };
  }

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          credits: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, page, limit };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  async getConfig() {
    const configs = await this.prisma.adminConfig.findMany();
    return configs.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});
  }

  async setConfig(key: string, value: string, description?: string) {
    return this.prisma.adminConfig.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  async getRecentGenerations(limit = 50) {
    return this.prisma.generation.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, name: true } } },
    });
  }
}
