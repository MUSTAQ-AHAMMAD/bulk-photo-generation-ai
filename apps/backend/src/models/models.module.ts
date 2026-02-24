import { Module } from '@nestjs/common';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';
import { InsightFaceModule } from '../insightface/insightface.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [InsightFaceModule, StorageModule],
  controllers: [ModelsController],
  providers: [ModelsService],
})
export class ModelsModule {}
