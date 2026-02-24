import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get generation metrics' })
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  getUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getUsers(page, limit);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Update user status' })
  updateUserStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.updateUserStatus(id, body.isActive);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get admin config' })
  getConfig() {
    return this.adminService.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Set admin config key' })
  setConfig(@Body() body: { key: string; value: string; description?: string }) {
    return this.adminService.setConfig(body.key, body.value, body.description);
  }

  @Get('generations')
  @ApiOperation({ summary: 'Get recent generations' })
  getRecentGenerations(@Query('limit') limit?: number) {
    return this.adminService.getRecentGenerations(limit);
  }
}
