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
import { LeaveService, CreateLeaveDto, ReviewLeaveDto } from './leave.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Leave Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Get()
  @ApiOperation({ summary: 'Get leave requests filtered by site, status or worker' })
  async findAll(
    @Query('workSiteId') workSiteId: string,
    @Query('status') status: string,
    @Query('workerId') workerId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findAll({ workSiteId, status, workerId }, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave request details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Record leave request on behalf of a worker' })
  async create(
    @Body() dto: CreateLeaveDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.create(dto, user, ip);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Approve or reject leave request' })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.review(id, dto, user, ip);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel leave request' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.cancel(id, user, ip);
  }
}
