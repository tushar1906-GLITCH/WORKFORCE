import { Controller, Get, Post, Patch, Param, Body, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkSitesService } from './work-sites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Work Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class WorkSitesController {
  constructor(private readonly service: WorkSitesService) {}

  @Get()
  @ApiOperation({ summary: 'Get work locations (Admin gets all, Supervisor gets assigned sites)' })
  async findAll(@CurrentUser() user: any) {
    return this.service.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of specific work location' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new work location (Admin only)' })
  async create(@Body() body: any, @CurrentUser() admin: any, @Ip() ip: string) {
    return this.service.create(body, admin, ip);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update work location and supervisors (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() admin: any,
    @Ip() ip: string,
  ) {
    return this.service.update(id, body, admin, ip);
  }
}
