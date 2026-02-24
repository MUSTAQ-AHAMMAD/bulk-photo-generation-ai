import { Module } from '@nestjs/common';
import { EngineFactory } from './engine.factory';

@Module({
  providers: [EngineFactory],
  exports: [EngineFactory],
})
export class EngineModule {}
