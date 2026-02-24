import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { CreateExportDto } from './dto/create-export.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('exports')
@Controller('exports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create bulk export ZIP' })
  create(@Request() req, @Body() dto: CreateExportDto) {
    return this.exportsService.createExport(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List exports' })
  findAll(@Request() req) {
    return this.exportsService.getUserExports(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get export status' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.exportsService.getExport(id, req.user.sub);
  }
}
