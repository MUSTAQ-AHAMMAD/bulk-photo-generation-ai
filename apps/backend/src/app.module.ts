import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { GenerateModule } from './generate/generate.module';
import { ProjectsModule } from './projects/projects.module';
import { ModelsModule } from './models/models.module';
import { ExportsModule } from './exports/exports.module';
import { AdminModule } from './admin/admin.module';
import { BillingModule } from './billing/billing.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: 60000,
          limit: config.get<number>('RATE_LIMIT', 100),
        },
      ],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    GenerateModule,
    ProjectsModule,
    ModelsModule,
    ExportsModule,
    AdminModule,
    BillingModule,
    QueueModule,
    StorageModule,
  ],
})
export class AppModule {}
