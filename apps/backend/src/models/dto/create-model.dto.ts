import { IsString, IsArray, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModelDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ type: [String], description: 'Up to 3 reference image URLs' })
  @IsArray()
  @IsString({ each: true })
  imageUrls: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;
}
