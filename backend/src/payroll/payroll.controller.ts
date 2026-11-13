import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PayrollService, GeneratePayrollDto } from './payroll.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all historical and current payroll runs (Admin only)' })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get detailed payroll run including line items and pay slips (Admin only)' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('generate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate a new draft payroll run for a period (Admin only)' })
  async generate(
    @Body() dto: GeneratePayrollDto,
    @CurrentUser() admin: any,
    @Ip() ip: string,
  ) {
    return this.service.generate(dto, admin, ip);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve and lock payroll run (Admin only)' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() admin: any,
    @Ip() ip: string,
  ) {
    return this.service.approve(id, admin, ip);
  }
}
