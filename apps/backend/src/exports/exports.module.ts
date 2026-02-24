import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { StorageModule } from '../storage/storage.module';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [StorageModule, ProcessingModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
