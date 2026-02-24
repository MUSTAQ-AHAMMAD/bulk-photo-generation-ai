import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExportDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  generationIds: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  resolutions?: string[];
}
