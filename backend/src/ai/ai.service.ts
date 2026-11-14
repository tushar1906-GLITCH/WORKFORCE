import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiConversation, AiMessage } from '../database/entities';
import { GroqService, ChatMessage } from './groq.service';
import { AiToolsService } from './ai-tools.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(AiConversation)
    private convRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private msgRepo: Repository<AiMessage>,
    private groqService: GroqService,
    private aiToolsService: AiToolsService,
  ) {}

  async chat(user: any, prompt: string, conversationId?: string) {
    if (!prompt || !prompt.trim()) {
      throw new Error('Message prompt cannot be empty');
    }

    const trimmedPrompt = prompt.trim();

    // 1. Get or create conversation
    let conv: AiConversation | null = null;
    if (conversationId) {
      conv = await this.convRepo.findOne({
        where: { id: conversationId, userId: user.id },
      });
      if (!conv) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      // Auto-generate title from first 6 words
      const words = trimmedPrompt.split(/\s+/).slice(0, 6).join(' ');
      const title = words.length > 50 ? words.substring(0, 47) + '...' : words;
      conv = this.convRepo.create({
        userId: user.id,
        title: title || 'New Conversation',
      });
      conv = await this.convRepo.save(conv);
    }

    // 2. Save user message
    const userMsg = this.msgRepo.create({
      conversationId: conv.id,
      role: 'user',
      content: trimmedPrompt,
    });
    await this.msgRepo.save(userMsg);

    // 3. Check if Groq is available
    let assistantReply = '';
    let executedToolsRecord: any[] = [];
    let tokensUsed = 0;

    if (this.groqService.isConfigured()) {
      try {
        const groqResult = await this.runGroqWorkflow(conv.id, trimmedPrompt, user);
        assistantReply = groqResult.reply;
        executedToolsRecord = groqResult.toolsUsed;
        tokensUsed = groqResult.tokens;
      } catch (err: any) {
        this.logger.warn(`Groq chat failed, falling back to local query engine: ${err.message}`);
        assistantReply = await this.runLocalFallback(trimmedPrompt, user);
      }
    } else {
      // Direct local natural language DB query engine
      assistantReply = await this.runLocalFallback(trimmedPrompt, user);
    }

    // 4. Save assistant response
    const assistantMsg = this.msgRepo.create({
      conversationId: conv.id,
      role: 'assistant',
      content: assistantReply,
      toolCalls: executedToolsRecord.length > 0 ? executedToolsRecord : undefined,
      tokensUsed: tokensUsed || undefined,
    });
    await this.msgRepo.save(assistantMsg);

    // Touch conversation updated_at
    conv.updatedAt = new Date();
    await this.convRepo.save(conv);

    return {
      conversationId: conv.id,
      message: assistantMsg,
      conversationTitle: conv.title,
    };
  }

  private async runGroqWorkflow(conversationId: string, currentPrompt: string, user: any) {
    const tools = this.aiToolsService.getToolsDefinitions();

    // Load recent history
    const history = await this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: 8,
    });
    history.reverse();

    const systemPrompt = `You are WorkForce AI, an intelligent operations and labour management assistant for WorkForce 2.0.
User Name: ${user.fullName}
User Role: ${user.role}
Authorized Sites: ${user.role === 'ADMIN' ? 'ALL SITES' : (user.assignedSites?.map((s: any) => s.name).join(', ') || 'None')}

CRITICAL OPERATIONAL RULES:
1. Always use available database tools to retrieve actual data about workers, attendance, leaves, shifts, sites, and payroll.
2. Never guess or hallucinate any numbers, names, dates, or financial amounts.
3. If the user is a SUPERVISOR, they are strictly prohibited from viewing payroll, wage rates, net pay, or any financial amounts. If they ask about salary or payroll, immediately explain: "You do not have permission to view payroll or salary information."
4. If a Supervisor asks about a site they are not assigned to, explain: "You are not authorized to view information for that site."
5. When reporting attendance:
   - Calculate attendance percentages ONLY against scheduled/eligible workers for that specific date/shift.
   - Workers with NOT_MARKED attendance are NOT absent; report NOT_MARKED separately.
6. Format your final answers clearly with markdown: tables for multiple rows, bold metrics, and bulleted summaries.
7. Keep answers professional, concise, and accurate.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const h of history) {
      if (h.role === 'user' || h.role === 'assistant') {
        messages.push({ role: h.role, content: h.content });
      }
    }

    // Add current message if not in history
    if (!messages.some((m) => m.role === 'user' && m.content === currentPrompt)) {
      messages.push({ role: 'user', content: currentPrompt });
    }

    let iterations = 0;
    const maxIterations = 3;
    const toolsUsed: any[] = [];
    let totalTokens = 0;
    let finalContent = '';

    while (iterations < maxIterations) {
      iterations++;
      const res = await this.groqService.chatCompletion(messages, tools);
      if (res.tokensUsed) totalTokens += res.tokensUsed;

      const msg = res.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push({
          role: 'assistant',
          content: msg.content || '',
          tool_calls: msg.tool_calls,
        });

        for (const toolCall of msg.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch {
            fnArgs = {};
          }

          const toolOutput = await this.aiToolsService.executeTool(fnName, fnArgs, user);
          toolsUsed.push({ tool: fnName, args: fnArgs, result: toolOutput });

          messages.push({
            role: 'tool',
            name: fnName,
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolOutput),
          });
        }
      } else {
        finalContent = msg.content || 'I could not generate an answer.';
        break;
      }
    }

    if (!finalContent && iterations >= maxIterations) {
      // Make one final call without tools to summarize
      const summaryRes = await this.groqService.chatCompletion(messages);
      finalContent = summaryRes.message.content || 'Summary complete.';
    }

    return {
      reply: finalContent,
      toolsUsed,
      tokens: totalTokens,
    };
  }

  // --- Local Natural Language Database Engine (Always works even without Groq Key) ---
  private async runLocalFallback(prompt: string, user: any): Promise<string> {
    const p = prompt.toLowerCase();

    // 1. Supervisor trying to ask for payroll
    if ((p.includes('salary') || p.includes('wage') || p.includes('payroll') || p.includes('pay') || p.includes('expenditure')) && user.role !== 'ADMIN') {
      return `### 🔒 Access Denied\n\nYou do not have permission to view payroll or salary information. This action is restricted to Administrators only.`;
    }

    // 2. Attendance comparison (yesterday vs today)
    if (p.includes('compare') && (p.includes('attendance') || p.includes('yesterday') || p.includes('today'))) {
      const comp: any = await this.aiToolsService.compareAttendanceDates({ date1: 'yesterday', date2: 'today' }, user);
      if (comp.error) return `⚠️ Error: ${comp.error}`;
      const c = comp.comparison;
      return `### 📊 Attendance Comparison: Yesterday vs Today (${comp.site})\n\n` +
        `| Metric | Yesterday (${c.date1.date}) | Today (${c.date2.date}) | Change |\n` +
        `| :--- | :--- | :--- | :--- |\n` +
        `| **Attendance Rate** | ${c.date1.rate} | ${c.date2.rate} | **${c.change.rateChange}** (${c.change.trend}) |\n` +
        `| **Scheduled** | ${c.date1.scheduled} | ${c.date2.scheduled} | - |\n` +
        `| **Present** | ${c.date1.present} | ${c.date2.present} | ${c.change.presentDiff >= 0 ? '+' : ''}${c.change.presentDiff} |\n` +
        `| **Absent** | ${c.date1.absent} | ${c.date2.absent} | ${c.change.absentDiff >= 0 ? '+' : ''}${c.change.absentDiff} |\n` +
        `| **Half Day** | ${c.date1.halfDay} | ${c.date2.halfDay} | - |\n` +
        `| **Not Marked** | ${c.date1.notMarked} | ${c.date2.notMarked} | - |\n\n` +
        `*(Retrieved live from PostgreSQL database)*`;
    }

    // 3. Attendance yesterday or today or specific date
    if (p.includes('attendance') || p.includes('absent') || p.includes('present') || p.includes('who is absent') || p.includes('attendance summary')) {
      const isYesterday = p.includes('yesterday');
      const targetDate = isYesterday ? 'yesterday' : 'today';
      const att: any = await this.aiToolsService.getAttendanceSummary({ date: targetDate }, user);
      if (att.error) return `⚠️ Error: ${att.error}`;

      let shiftRows = '';
      if (att.shiftBreakdown && Object.keys(att.shiftBreakdown).length > 0) {
        shiftRows = Object.entries(att.shiftBreakdown)
          .map(([name, s]: any) => `| **${name}** | ${s.total} | ${s.present} | ${s.absent} | ${s.halfDay} | ${s.notMarked} |`)
          .join('\n');
      }

      return `### 📋 Attendance Summary for ${att.date} (${att.filteredBySite})\n\n` +
        `- **Overall Attendance Rate:** **${att.attendanceRate}**\n` +
        `- **Scheduled Workers:** ${att.scheduledWorkers}\n` +
        `- **Present:** ${att.presentCount}\n` +
        `- **Absent:** ${att.absentCount}\n` +
        `- **Half Day:** ${att.halfDayCount}\n` +
        `- **Not Marked:** ${att.notMarkedCount}\n\n` +
        (shiftRows ? `#### Shift Breakdown\n| Shift | Total Scheduled | Present | Absent | Half Day | Not Marked |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${shiftRows}\n\n` : '') +
        `*(Retrieved live from PostgreSQL database)*`;
    }

    // 4. Leave requests
    if (p.includes('leave') || p.includes('leaves') || p.includes('vacation')) {
      const leaves = await this.aiToolsService.getLeaveRequests({ status: p.includes('pending') ? 'PENDING' : undefined }, user);
      if (Array.isArray(leaves) && leaves.length === 0) {
        return `### 🌴 Leave Requests\n\nNo matching leave requests found in the database.`;
      }
      const rows = leaves.slice(0, 10).map((l: any) =>
        `| **${l.workerCode}** | ${l.workerName} | ${l.leaveType} | ${l.startDate} to ${l.endDate} (${l.daysCount}d) | \`${l.status}\` |`
      ).join('\n');

      return `### 🌴 Leave Requests (${leaves.length} found)\n\n` +
        `| Code | Worker Name | Type | Period | Status |\n` +
        `| :--- | :--- | :--- | :--- | :--- |\n` +
        `${rows}\n\n` +
        `*(Retrieved live from PostgreSQL database)*`;
    }

    // 5. Payroll summary (Admin only)
    if (p.includes('payroll') || p.includes('expenditure') || p.includes('gross') || p.includes('net pay')) {
      if (user.role !== 'ADMIN') {
        return `### 🔒 Access Denied\n\nYou do not have permission to view payroll or salary information.`;
      }
      const pay: any = await this.aiToolsService.getPayrollSummary({}, user);
      if (pay.error) return `⚠️ Error: ${pay.error}`;

      const runRows = (pay.runs || []).slice(0, 5).map((r: any) =>
        `| ${r.runNumber} | ${r.site} | ${r.period} | ${r.gross} | ${r.net} | ${r.paid} | ${r.outstanding} | \`${r.status}\` |`
      ).join('\n');

      return `### 💰 Payroll & Expenditure Summary\n\n` +
        `- **Total Gross Expenditure:** **${pay.aggregate.totalGrossExpenditure}**\n` +
        `- **Total Net Payable:** **${pay.aggregate.totalNetPayable}**\n` +
        `- **Total Paid:** **${pay.aggregate.totalPaid}**\n` +
        `- **Total Outstanding:** **${pay.aggregate.totalOutstanding}**\n` +
        `- **Total Deductions:** ${pay.aggregate.totalDeductions}\n\n` +
        `#### Recent Payroll Runs\n` +
        `| Run # | Site | Period | Gross | Net | Paid | Outstanding | Status |\n` +
        `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n` +
        `${runRows}\n\n` +
        `*(Retrieved live from PostgreSQL database)*`;
    }

    // 6. Work sites / locations
    if (p.includes('site') || p.includes('location') || p.includes('work site')) {
      const sites = await this.aiToolsService.getSiteLocationsAndStaffing({}, user);
      if (Array.isArray(sites) && sites.length === 0) {
        return `### 📍 Work Locations\n\nNo authorized work sites found.`;
      }
      const rows = sites.map((s: any) =>
        `| **${s.code}** | ${s.name} | ${s.city}, ${s.state} | **${s.activeWorkerCount}** active workers | ${s.isActive ? '✅ Active' : '❌ Inactive'} |`
      ).join('\n');

      return `### 📍 Work Locations & Current Staffing\n\n` +
        `| Code | Site Name | Location | Assigned Workers | Status |\n` +
        `| :--- | :--- | :--- | :--- | :--- |\n` +
        `${rows}\n\n` +
        `*(Retrieved live from PostgreSQL database)*`;
    }

    // 7. General workforce / worker search / default
    const wf: any = await this.aiToolsService.getWorkforceSummary({}, user);
    if (wf.error) return `⚠️ Error: ${wf.error}`;

    const deptRows = Object.entries(wf.departmentCounts || {})
      .map(([name, count]) => `- **${name}:** ${count} worker(s)`)
      .join('\n');

    const siteRows = Object.entries(wf.siteCounts || {})
      .map(([name, count]) => `- **${name}:** ${count} worker(s)`)
      .join('\n');

    return `### 👷 Workforce Overview (${wf.filteredBySite})\n\n` +
      `- **Total Workers:** **${wf.totalWorkers}**\n` +
      `- **Active Workers:** **${wf.activeWorkers}**\n` +
      `- **Inactive Workers:** ${wf.inactiveWorkers}\n` +
      `- **Unassigned Workers:** ${wf.unassignedWorkers}\n\n` +
      `#### Department Breakdown\n${deptRows || 'No departments recorded'}\n\n` +
      `#### Site Deployment Breakdown\n${siteRows || 'No site deployments'}\n\n` +
      `*(Retrieved live from PostgreSQL database)*`;
  }

  // --- Conversations Management ---

  async getUserConversations(userId: string) {
    return this.convRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 30,
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, userId },
      relations: ['messages'],
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    // Sort messages chronologically
    conv.messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return conv;
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, userId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    await this.convRepo.remove(conv);
    return { success: true, message: 'Conversation deleted' };
  }
}
