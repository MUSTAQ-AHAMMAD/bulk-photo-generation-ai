import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';
import { EngineModule } from '../engine/engine.module';
import { InsightFaceModule } from '../insightface/insightface.module';
import { ProcessingModule } from '../processing/processing.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'generation' }),
    EngineModule,
    InsightFaceModule,
    ProcessingModule,
    StorageModule,
  ],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
