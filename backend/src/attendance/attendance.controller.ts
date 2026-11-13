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
import { AttendanceService, BulkAttendanceDto } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get('eligible-workers')
  @ApiOperation({ summary: 'Get all eligible active workers for site, date and shift with attendance state' })
  async getEligible(
    @Query('workSiteId') workSiteId: string,
    @Query('date') date: string,
    @Query('shiftId') shiftId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getEligibleWorkers(workSiteId, date, shiftId, user);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get attendance summary counts and completion rate for site and date' })
  async getSummary(
    @Query('workSiteId') workSiteId: string,
    @Query('date') date: string,
    @Query('shiftId') shiftId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getSummary(workSiteId, date, shiftId, user);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Save individual or bulk worker attendance in database transaction' })
  async markBulk(
    @Body() dto: BulkAttendanceDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.markBulk(dto, user, ip);
  }

  @Post('finalize')
  @ApiOperation({ summary: 'Finalize and lock attendance batch (requires all eligible workers marked)' })
  async finalize(
    @Body() body: { workSiteId: string; date: string; shiftId: string },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.finalizeBatch(body.workSiteId, body.date, body.shiftId, user, ip);
  }

  @Post('reopen')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reopen finalized attendance batch with audited reason (Admin only)' })
  async reopen(
    @Body() body: { workSiteId: string; date: string; shiftId: string; reason: string },
    @CurrentUser() admin: any,
    @Ip() ip: string,
  ) {
    return this.service.reopenBatch(body.workSiteId, body.date, body.shiftId, body.reason, admin, ip);
  }
}
