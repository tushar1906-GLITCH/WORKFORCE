import { Controller, Get, Post, Body, Query, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all payment disbursement records (Admin only)' })
  async findAll(@Query('workerId') workerId: string) {
    return this.service.findAll(workerId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Record a full or partial disbursement payment (Admin only)' })
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() admin: any,
    @Ip() ip: string,
  ) {
    return this.service.create(dto, admin, ip);
  }
}
