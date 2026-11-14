import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AiToolsService } from './ai-tools.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiToolsService: AiToolsService,
  ) {}

  @Post('chat')
  async chat(@Request() req: any, @Body() body: { message: string; conversationId?: string }) {
    return this.aiService.chat(req.user, body.message, body.conversationId);
  }

  @Get('conversations')
  async getConversations(@Request() req: any) {
    return this.aiService.getUserConversations(req.user.id);
  }

  @Get('conversations/:id')
  async getConversation(@Request() req: any, @Param('id') id: string) {
    return this.aiService.getConversation(req.user.id, id);
  }

  @Delete('conversations/:id')
  async deleteConversation(@Request() req: any, @Param('id') id: string) {
    return this.aiService.deleteConversation(req.user.id, id);
  }

  @Get('command-center-insights')
  async getCommandCenterInsights(@Request() req: any) {
    // Generate AI Command Center Insights using live DB tools
    const user = req.user;
    const todaySummary = await this.aiToolsService.getAttendanceSummary({ date: 'today' }, user);
    const yesterdaySummary = await this.aiToolsService.getAttendanceSummary({ date: 'yesterday' }, user);
    const workforce = await this.aiToolsService.getWorkforceSummary({}, user);
    const pendingLeaves = await this.aiToolsService.getLeaveRequests({ status: 'PENDING' }, user);

    let payrollAlert = null;
    if (user.role === 'ADMIN') {
      const payroll = await this.aiToolsService.getPayrollSummary({}, user);
      payrollAlert = payroll.aggregate?.totalOutstanding || '₹0';
    }

    const issues: string[] = [];
    if (todaySummary.notMarkedCount > 0) {
      issues.push(`${todaySummary.notMarkedCount} scheduled workers have attendance not marked today.`);
    }
    if (pendingLeaves.length > 0) {
      issues.push(`${pendingLeaves.length} leave request(s) awaiting approval.`);
    }
    if (workforce.unassignedWorkers > 0) {
      issues.push(`${workforce.unassignedWorkers} active workers have no current site assignment.`);
    }

    return {
      todayAttendanceRate: todaySummary.attendanceRate,
      presentCount: todaySummary.presentCount,
      absentCount: todaySummary.absentCount,
      notMarkedCount: todaySummary.notMarkedCount,
      totalActiveWorkers: workforce.activeWorkers,
      unassignedWorkers: workforce.unassignedWorkers,
      pendingLeaveCount: pendingLeaves.length,
      outstandingPayroll: payrollAlert,
      actionableIssues: issues,
      lastUpdated: new Date().toISOString(),
    };
  }
}
