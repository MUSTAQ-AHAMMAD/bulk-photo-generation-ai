import { IsString, IsArray, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGenerationDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty()
  @IsString()
  prompt: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  poses: string[];

  @ApiProperty({ enum: ['PURE_WHITE', 'LIGHT_GRAY', 'CUSTOM_HEX'] })
  @IsString()
  background: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundHex?: string;

  @ApiProperty({ enum: ['RES_4000', 'RES_2500', 'RES_1500', 'RES_1000'] })
  @IsString()
  resolution: string;

  @ApiProperty({ enum: ['WEBP', 'PNG', 'JPEG'] })
  @IsString()
  outputFormat: string;

  @ApiPropertyOptional({ enum: ['BEST_QUALITY', 'BALANCED', 'FAST'] })
  @IsOptional()
  @IsString()
  enginePreset?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  strictMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  modelImageUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  seed?: number;
}
