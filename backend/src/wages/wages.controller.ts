import { Controller, Get, Post, Body, Query, Param, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WagesService, CreateWageDto } from './wages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wages')
export class WagesController {
  constructor(private readonly service: WagesService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all wage rates / history (Admin only)' })
  async findAll(@Query('workerId') workerId: string) {
    return this.service.findAll(workerId);
  }

  @Get('worker/:workerId/history')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get wage history for a worker (Admin only)' })
  async getWorkerHistory(@Param('workerId') workerId: string) {
    return this.service.getWorkerHistory(workerId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new wage rate record with effective date (Admin only)' })
  async create(
    @Body() dto: CreateWageDto,
    @CurrentUser() admin: any,
    @Ip() ip: string,
  ) {
    return this.service.create(dto, admin, ip);
  }
}
