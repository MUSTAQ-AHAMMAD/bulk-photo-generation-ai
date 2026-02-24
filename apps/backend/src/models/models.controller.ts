import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ModelsService } from './models.service';
import { CreateModelDto } from './dto/create-model.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('models')
@Controller('models')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ModelsController {
  constructor(private modelsService: ModelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create model with reference images' })
  create(@Request() req, @Body() dto: CreateModelDto) {
    return this.modelsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List models' })
  findAll(@Request() req) {
    return this.modelsService.findAll(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.modelsService.findOne(id, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete model' })
  remove(@Request() req, @Param('id') id: string) {
    return this.modelsService.remove(id, req.user.sub);
  }
}
