import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GenerateService } from './generate.service';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('generate')
@Controller('generate')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GenerateController {
  constructor(private generateService: GenerateService) {}

  @Post()
  @ApiOperation({ summary: 'Create generation job(s) for multiple poses' })
  createGeneration(@Request() req, @Body() dto: CreateGenerationDto) {
    return this.generateService.createGeneration(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user generations' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getUserGenerations(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.generateService.getUserGenerations(req.user.sub, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get generation by ID' })
  getGeneration(@Request() req, @Param('id') id: string) {
    return this.generateService.getGeneration(id, req.user.sub);
  }
}
