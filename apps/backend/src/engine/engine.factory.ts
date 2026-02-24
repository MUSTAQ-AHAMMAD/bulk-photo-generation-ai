import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIEngine } from './engine.interface';
import { OpenAIEngine } from '../ai-engines/openai.engine';
import { StabilityEngine } from '../ai-engines/stability.engine';
import { ReplicateEngine } from '../ai-engines/replicate.engine';

export type EnginePreset = 'BEST_QUALITY' | 'BALANCED' | 'FAST';

@Injectable()
export class EngineFactory {
  constructor(private config: ConfigService) {}

  getEngine(preset: EnginePreset): AIEngine {
    switch (preset) {
      case 'BEST_QUALITY':
        return new OpenAIEngine(this.config);
      case 'BALANCED':
        return new StabilityEngine(this.config);
      case 'FAST':
        return new ReplicateEngine(this.config);
      default:
        return new StabilityEngine(this.config);
    }
  }
}
