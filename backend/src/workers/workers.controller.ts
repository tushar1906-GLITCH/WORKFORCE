import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkersService, CreateWorkerDto, UpdateWorkerDto, WorkerQueryDto } from './workers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Workers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workers')
export class WorkersController {
  constructor(private readonly service: WorkersService) {}

  @Get()
  @ApiOperation({ summary: 'List and search workers (scoped to role and assigned sites)' })
  async findAll(@Query() query: WorkerQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get worker profile details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Get(':id/attendance')
  @ApiOperation({ summary: 'Get worker attendance history' })
  async getAttendance(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getAttendanceHistory(id, user);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Get worker assignment history' })
  async getAssignments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getAssignmentHistory(id, user);
  }

  @Get(':id/leave')
  @ApiOperation({ summary: 'Get worker leave request history' })
  async getLeave(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getLeaveHistory(id, user);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get worker payroll and payment history (Admin only)' })
  async getPayments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getPaymentHistory(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new worker' })
  async create(
    @Body() dto: CreateWorkerDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.create(dto, user, ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update worker details' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkerDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.update(id, dto, user, ip);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate worker and close active assignments' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.deactivate(id, user, ip);
  }

  @Patch(':id/reactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reactivate an inactive worker (Admin only)' })
  async reactivate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.reactivate(id, user, ip);
  }
}
