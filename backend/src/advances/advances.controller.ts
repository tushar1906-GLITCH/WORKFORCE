import { Controller, Get, Post, Body, Query, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdvancesService, CreateAdvanceDto } from './advances.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Advances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('advances')
export class AdvancesController {
  constructor(private readonly service: AdvancesService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get worker advances (Admin only)' })
  async findAll(@Query('workerId') workerId: string) {
    return this.service.findAll(workerId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Issue worker advance (Admin only)' })
  async create(
    @Body() dto: CreateAdvanceDto,
    @CurrentUser() admin: any,
    @Ip() ip: string,
  ) {
    return this.service.create(dto, admin, ip);
  }
}
