import { Module } from '@nestjs/common';
import { InsightFaceService } from './insightface.service';

@Module({
  providers: [InsightFaceService],
  exports: [InsightFaceService],
})
export class InsightFaceModule {}
