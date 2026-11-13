import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get live KPI metrics, trends, and charts for Dashboard' })
  async getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboardStats(user);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Get live attendance report with filters' })
  async getAttendance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('workSiteId') workSiteId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getAttendanceReport({ startDate, endDate, workSiteId }, user);
  }

  @Get('attendance/export-csv')
  @ApiOperation({ summary: 'Export scoped attendance report as CSV' })
  async exportAttendanceCsv(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('workSiteId') workSiteId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const csvData = await this.service.getAttendanceReportCsv({ startDate, endDate, workSiteId }, user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    return res.send(csvData);
  }

  @Get('workers/export-csv')
  @ApiOperation({ summary: 'Export scoped worker directory as CSV' })
  async exportWorkersCsv(@CurrentUser() user: any, @Res() res: Response) {
    const csvData = await this.service.getWorkerDirectoryCsv(user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="workers-directory.csv"');
    return res.send(csvData);
  }
}
