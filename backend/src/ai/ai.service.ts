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

    // 2. Fetch recent conversation history prior to new message for context
    const recentHistory = (await this.msgRepo.find({
      where: { conversationId: conv.id },
      order: { createdAt: 'DESC' },
      take: 10,
    })) || [];
    recentHistory.reverse();

    // 3. Save user message
    const userMsg = this.msgRepo.create({
      conversationId: conv.id,
      role: 'user',
      content: trimmedPrompt,
    });
    await this.msgRepo.save(userMsg);

    // 4. Check if Groq is available
    let assistantReply = '';
    let executedToolsRecord: any[] = [];
    let tokensUsed = 0;

    if (this.groqService.isConfigured()) {
      try {
        const groqResult = await this.runGroqWorkflow(conv.id, trimmedPrompt, user, recentHistory);
        assistantReply = groqResult.reply;
        executedToolsRecord = groqResult.toolsUsed;
        tokensUsed = groqResult.tokens;
      } catch (err: any) {
        this.logger.warn(`Groq chat failed, falling back to local query engine: ${err.message}`);
        assistantReply = await this.runLocalFallback(trimmedPrompt, user, recentHistory);
      }
    } else {
      // Direct local natural language DB query engine
      assistantReply = await this.runLocalFallback(trimmedPrompt, user, recentHistory);
    }

    // 5. Save assistant response
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

  private async runGroqWorkflow(
    conversationId: string,
    currentPrompt: string,
    user: any,
    history: AiMessage[],
  ) {
    const tools = this.aiToolsService.getToolsDefinitions();

    const systemPrompt = `You are WorkForce AI, an intelligent, witty, friendly, and slightly sarcastic Gen-Z workplace assistant for WorkForce 2.0.
User Name: ${user.fullName}
User Role: ${user.role}
Authorized Sites: ${user.role === 'ADMIN' ? 'ALL SITES' : (user.assignedSites?.map((s: any) => s.name).join(', ') || 'None')}

CORE PERSONALITY & TONE GUIDELINES:
1. Tone: Friendly, natural, confident, slightly sarcastic, and occasionally humorous ("bruh", "bro", "lock in 💀", "I manage workers, not the weather 😭"). Avoid calling users "bestie" or using exaggerated pet names — stick to clean, normal Gen-Z conversational phrasing.
2. Do NOT use slang excessively or add emojis to every single message. Never sound robotic or generic corporate.
3. For SERIOUS BUSINESS MATTERS (payroll, salaries, employee records, attendance disputes, sensitive personal matters):
   - Maintain a respectful, strictly professional tone.
   - Absolutely NO sarcasm, NO jokes about employees or their personal circumstances.
4. For UNRELATED QUESTIONS outside WorkForce (e.g., "Who is Modi?", "What's the weather today?", "Tell me a joke", "What is the capital of France?", sports, cooking, etc.):
   - DO NOT call any database tools!
   - Respond with short, playful, witty Gen-Z refusals such as:
     - "Wrong department 💀 I'm the WorkForce assistant, not Google."
     - "I manage workers, not the weather. Ask me something work-related 😭"
     - "Bruh, I'm here for WORK stuff. Ask me something about your workforce 😭"
     - "That's completely outside my department 💀 Let's get back to managing the workforce."
     - "Bro, we have workers to manage. Lock in. 💀"
5. For GREETINGS and casual banter ("Hi", "Hello", "How are you"):
   - Respond naturally and warmly (e.g. "Hey! 👋 What are we sorting out today?", "Doing great! Ready to help you manage the workforce. What do you need?").
   - DO NOT call any database tools. DO NOT return Workforce Overview.
6. For AMBIGUOUS or vague questions ("Show me the workers", "What about the site?", "Tell me more"):
   - Ask a short clarification question rather than guessing or dumping random statistics.
   - (e.g. "Be a little more specific — all active workers, or workers from a particular location?", "Which site are we talking about? Give me its name and I'll check.").
7. For APPLICATION HELP questions ("How do I register a worker?", "How does attendance marking work?", "What does NOT_MARKED mean?", "How do I approve leave?", "How is payroll calculated?", "How do I assign workers to a site?", "What is the difference between Admin and Supervisor?", "How do I generate a report?", "How do I reactivate an inactive worker?"):
   - Answer clearly using the application's actual workflows and business logic.
   - DO NOT unnecessarily query PostgreSQL for general how-to explanations.
8. For OPERATIONAL QUESTIONS (workers, attendance, leaves, assignments, payroll, sites):
   - Always call the appropriate database tools to retrieve real data.
   - Never fabricate, invent, or guess numbers, names, or currency amounts.
   - Format answers clearly with Markdown tables, bold metrics, and bulleted summaries.
   - If user is a SUPERVISOR: strictly forbidden from accessing payroll/salaries or unassigned sites. Explain permissions immediately if attempted.
   - When reporting attendance: Calculate attendance rate against scheduled/eligible workers for that specific date/shift. NOT_MARKED is NOT absent.
9. NEVER use Workforce Overview as a default or fallback response for questions you don't understand. Only return it when explicitly requested.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const h of history) {
      if (h.role === 'user' || h.role === 'assistant') {
        messages.push({ role: h.role, content: h.content });
      }
    }

    // Add current message if not already in history
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
      const summaryRes = await this.groqService.chatCompletion(messages);
      finalContent = summaryRes.message.content || 'Summary complete.';
    }

    return {
      reply: finalContent,
      toolsUsed,
      tokens: totalTokens,
    };
  }

  // --- Application Help Knowledge Base (Answers how-to without touching DB) ---
  public getAppHelpResponse(prompt: string): string | null {
    const p = prompt.toLowerCase();

    // 1. Worker registration
    if (
      /\b(how\s+(do|can)\s+i\s+(register|add|create|onboard)|how\s+to\s+(register|add|create|onboard))\b/i.test(p) &&
      p.includes('worker')
    ) {
      return `### 📝 How to Register a Worker in WorkForce\n\n` +
        `1. **Navigate to Workers Page:** Click **Workers** in the left sidebar.\n` +
        `2. **Click Add Worker:** In the top-right corner, click **"+ Add Worker"** (or use the Bulk CSV Import option).\n` +
        `3. **Fill Required Information:**\n` +
        `   - **Worker Code & Full Name:** Enter a unique worker code (e.g. \`WKR-027\`) and full name.\n` +
        `   - **Phone Number:** Valid 10-digit Indian mobile number starting with 6–9 (\`^[6-9]\\d{9}$\`).\n` +
        `   - **Department & Category:** Assign the department (Civil, Mechanical, etc.) and category (Skilled, Semi-Skilled, Unskilled).\n` +
        `   - **Wage Settings:** Select Wage Type (**Daily**, **Hourly**, or **Monthly**) and set the base wage rate in INR.\n` +
        `   - **Bank & Identity:** Enter Aadhaar/ID and bank account details for direct payment processing.\n` +
        `4. **Save Worker:** Click **Save**. The worker is registered with \`ACTIVE\` status and becomes available for site assignments.`;
    }

    // 2. Attendance marking workflow
    if (
      /\b(how\s+does\s+attendance\s+marking\s+work|how\s+(to|do\s+i|can\s+i)\s+mark\s+attendance|attendance\s+marking\s+workflow|attendance\s+marking\s+process)\b/i.test(p)
    ) {
      return `### 📋 How Attendance Marking Works\n\n` +
        `WorkForce follows an **individual-first, shift-wise attendance process**:\n\n` +
        `1. **Open Daily Attendance:** Navigate to **Daily Attendance** from the sidebar.\n` +
        `2. **Select Context:** Choose the **Date**, **Shift** (Morning, Evening, Night), and **Work Site**.\n` +
        `3. **Review Scheduled Workers:** All workers assigned to that site and shift appear. Initial status is \`NOT_MARKED\`.\n` +
        `4. **Mark Individual Statuses:** For each worker, mark:\n` +
        `   - \`PRESENT\` (enter overtime hours if applicable)\n` +
        `   - \`ABSENT\` (unexcused absence)\n` +
        `   - \`HALF_DAY\` (counted as 0.5 working day)\n` +
        `   *(Approved leaves and weekly offs are automatically recognized)*\n` +
        `5. **Finalize Attendance:** Once all scheduled workers are marked, click **Finalize Attendance**. Finalizing locks the shift records and feeds verified hours into the payroll engine.`;
    }

    // 3. What NOT_MARKED means
    if (
      /\b(what\s+(does\s+)?not_marked\s+mean|what\s+is\s+not_marked|explain\s+not_marked|not_marked\s+meaning)\b/i.test(p) ||
      (/\bnot\s+marked\b/i.test(p) && /\b(mean|meaning|what\s+is|what\s+does)\b/i.test(p))
    ) {
      return `### ❓ What Does NOT_MARKED Mean?\n\n` +
        `In WorkForce, \`NOT_MARKED\` means attendance has **not yet been recorded** for a worker scheduled for that specific date and shift.\n\n` +
        `**Key Rules:**\n` +
        `- **NOT_MARKED is NOT Absent:** It is never counted as an unexcused absence in attendance rates or payroll deductions.\n` +
        `- **Blocks Finalization:** An attendance shift sheet **cannot be finalized** until all scheduled workers are explicitly set to \`PRESENT\`, \`ABSENT\`, or \`HALF_DAY\`.\n` +
        `- **Accurate Calculation:** Scheduled workers with \`NOT_MARKED\` status are counted in the denominator of eligible workers, but only verified \`PRESENT\` workers contribute to the attendance percentage.`;
    }

    // 4. Approve leave request
    if (
      /\b(how\s+(to|do\s+i|can\s+i)\s+approve\s+(a\s+)?leave|approve\s+leave|leave\s+approval\s+process)\b/i.test(p)
    ) {
      return `### 🌴 How to Approve a Leave Request\n\n` +
        `1. **Navigate to Leaves:** Select **Leaves** from the navigation menu.\n` +
        `2. **Filter by Pending:** Open the **Pending Requests** tab to see leave requests submitted by workers or supervisors.\n` +
        `3. **Review Details:** Review the worker name, department, leave type (Casual, Sick, Earned), date range, and reason.\n` +
        `4. **Approve or Reject:**\n` +
        `   - Click **Approve** (green checkmark) to approve the leave.\n` +
        `   - Click **Reject** (red cross) with an optional reason to deny it.\n` +
        `5. **Automatic Calendar Update:** Approved leave is automatically recognized by the daily attendance engine, preventing the worker from being marked absent on those dates.`;
    }

    // 5. Payroll calculation formula
    if (
      /\b(how\s+is\s+payroll\s+calculated|how\s+(do|can)\s+you\s+calculate\s+payroll|payroll\s+calculation|salary\s+calculation|payroll\s+formula|salary\s+formula)\b/i.test(p)
    ) {
      return `### 💰 How Payroll is Calculated\n\n` +
        `WorkForce calculates payroll per worker for each payroll cycle based on finalized attendance and configured wage rates:\n\n` +
        `1. **Base Wage Calculation:**\n` +
        `   - **Daily Wage:** $(\\text{Present Days} + 0.5 \\times \\text{Half Days}) \\times \\text{Daily Rate}$\n` +
        `   - **Hourly Wage:** $\\text{Total Approved Hours} \\times \\text{Hourly Rate}$\n` +
        `   - **Monthly Wage:** Base Monthly Salary adjusted for working days and unapproved absences\n` +
        `2. **Overtime Pay:**\n` +
        `   - $\\text{Overtime Hours} \\times (\\text{Hourly Rate} \\times \\text{OT Multiplier})$ *(e.g. 1.5x on normal shifts, 2.0x on holidays)*\n` +
        `3. **Gross Pay:**\n` +
        `   - $\\text{Gross Pay} = \\text{Base Wage} + \\text{Overtime Pay} + \\text{Approved Allowances}$\n` +
        `4. **Deductions:**\n` +
        `   - Advance salary recoveries + PF/tax deductions + unpaid leave penalties\n` +
        `5. **Net Payable:**\n` +
        `   - $\\text{Net Pay} = \\text{Gross Pay} - \\text{Total Deductions}$\n\n` +
        `Admins can review itemized wage breakdowns, approve the payroll run, and disburse payments directly.`;
    }

    // 6. Assign workers to site
    if (
      /\b(how\s+(to|do\s+i|can\s+i)\s+assign\s+(a\s+)?worker|how\s+does\s+site\s+assignment\s+work|site\s+assignment\s+process)\b/i.test(p)
    ) {
      return `### 🏗️ How to Assign Workers to a Site\n\n` +
        `1. **Navigate to Site Assignments:** Go to **Site Assignments** in the sidebar.\n` +
        `2. **Click Assign Worker:** Click the **"+ Assign Worker"** button.\n` +
        `3. **Select Assignment Details:**\n` +
        `   - Choose the target **Work Site**.\n` +
        `   - Choose the **Worker** from the active worker directory.\n` +
        `   - Select the assigned **Shift** (Morning, Evening, Night) and effective **Start Date**.\n` +
        `4. **Conflict Check:** WorkForce automatically verifies that the worker has no overlapping assignments or conflicting shifts.\n` +
        `5. **Save:** Click **Save Assignment**. The worker will now appear on that site's daily attendance sheets.`;
    }

    // 7. Difference between Admin and Supervisor
    if (
      (p.includes('difference') || p.includes('vs') || p.includes('between')) &&
      p.includes('admin') &&
      p.includes('supervisor')
    ) {
      return `### 👥 Difference Between Admin and Supervisor Roles\n\n` +
        `| Feature / Permission | Admin | Supervisor |\n` +
        `| :--- | :---: | :---: |\n` +
        `| **Scope of Access** | Organization-wide | Assigned site(s) only |\n` +
        `| **Worker Management** | Full CRUD across all workers | View assigned crew only |\n` +
        `| **Daily Attendance** | Mark, finalize, and edit any site | Mark and finalize assigned sites only |\n` +
        `| **Leave Management** | Final approval / rejection | Submit requests for site workers |\n` +
        `| **Site Assignments** | Create, transfer, and edit assignments | View site roster |\n` +
        `| **Payroll & Wages** | **Full Access** (view, calculate, disburse) | **Strictly Forbidden** (no access) |\n` +
        `| **Financial Reports** | Gross expenditure, net pay, cost analysis | No access to financial data |\n` +
        `| **User Administration** | Create/manage Admin & Supervisor accounts | No access to user settings |`;
    }

    // 8. Generate and export reports
    if (
      p.includes('report') &&
      (p.includes('generate') || p.includes('export') || p.includes('create') || p.includes('download'))
    ) {
      return `### 📊 How to Generate and Export Reports\n\n` +
        `1. **Navigate to Reports:** Click **Reports** in the navigation bar.\n` +
        `2. **Select Report Type:** Choose from **Attendance Summary**, **Payroll & Expenditure**, **Worker Master List**, or **Site Utilization**.\n` +
        `3. **Set Filters:** Select date range (This Week, This Month, or Custom), site filter, and department.\n` +
        `4. **Review Metrics & Charts:** View live summary cards, interactive charts, and itemized tables.\n` +
        `5. **Export Data:**\n` +
        `   - Click **"Export CSV"** for spreadsheet analysis.\n` +
        `   - Click **"Export PDF"** to generate a clean, formatted printable document.`;
    }

    // 9. Reactivate inactive worker
    if (
      /\b(how\s+(to|do\s+i|can\s+i)\s+reactivate|reactivate\s+(an\s+)?inactive\s+worker)\b/i.test(p) &&
      p.includes('worker')
    ) {
      return `### 🔄 How to Reactivate an Inactive Worker\n\n` +
        `1. **Navigate to Workers Page:** Open the **Workers** module.\n` +
        `2. **Filter by Inactive:** Toggle the status filter to **"Inactive"** (or search by worker code/name).\n` +
        `3. **Open Worker Profile / Actions:** Locate the worker row and click the **Actions** menu or profile.\n` +
        `4. **Click Reactivate:** Click the **"Reactivate"** button.\n` +
        `5. **Confirm Action:** Confirm the reactivation prompt.\n\n` +
        `**Preservation Guarantee:** Reactivation updates the worker's status back to \`ACTIVE\`. It **never creates a duplicate record** and preserves all existing Worker IDs, wage histories, attendance records, leave logs, and previous assignments. The action is logged in Activity Logs.`;
    }

    return null;
  }

  // --- Local Natural Language Database Engine (Always works even without Groq Key) ---
  public async runLocalFallback(prompt: string, user: any, history: AiMessage[] = []): Promise<string> {
    const p = prompt.toLowerCase().trim();

    // ==========================================
    // 1. SECURITY & PERMISSIONS CHECKS
    // ==========================================

    // 1.1 Supervisor attempting to access payroll/salary
    const isPayrollAttempt =
      /\b(salary|salaries|wage|wages|payroll|pay\s*slip|payslip|gross|net\s*pay|disbursement|expenditure|compensation|earnings)\b/i.test(p);
    if (isPayrollAttempt && user.role !== 'ADMIN') {
      return `### 🔒 Access Denied\n\nYou do not have permission to view payroll or salary information. This action is restricted to Administrators only.`;
    }

    // 1.2 Prompt injection attempts
    const isPromptInjection =
      /(ignore\s+(all\s+)?(previous|prior|above)\s+instructions|system\s+prompt|reveal\s+(secret|password|key|token|instructions)|override\s+rules|bypass\s+(security|auth)|drop\s+table)/i.test(p);
    if (isPromptInjection) {
      return `Nice try 💀 System security and workforce rules stay locked down. Let's stick to managing actual workers.`;
    }

    // ==========================================
    // 2. GREETINGS & CASUAL CONVERSATION
    // ==========================================
    const isCasualGreeting =
      /^(hi|hello|hey|greetings|howdy|sup|what's\s+up|yo|good\s+(morning|afternoon|evening))[\s!?.]*$/i.test(p);
    if (isCasualGreeting) {
      if (p.startsWith('hello')) {
        return `Hey there! Ready to get some workforce operations sorted?`;
      }
      return `Hey! 👋 What are we sorting out today?`;
    }

    const isHowAreYou =
      /^(how\s+are\s+you|how's\s+it\s+going|how\s+are\s+things)[\s!?.]*$/i.test(p);
    if (isHowAreYou) {
      return `Doing great! Ready to help you manage the workforce. What do you need?`;
    }

    // ==========================================
    // 3. UNRELATED / OFF-TOPIC QUESTIONS
    // ==========================================
    if (/\b(modi|biden|trump|putin|rahul\s+gandhi|prime\s+minister|president)\b/i.test(p)) {
      return `Wrong department 💀 I'm the WorkForce assistant, not Google.`;
    }

    if (/\b(weather|rain|raining|temperature|forecast|climate|hot\s+outside|cold\s+outside)\b/i.test(p)) {
      return `I manage workers, not the weather. Ask me something work-related 😭`;
    }

    if (/\b(tell\s+me\s+a\s+joke|joke|make\s+me\s+laugh|say\s+something\s+funny)\b/i.test(p)) {
      return `Bruh, I'm here for WORK stuff. Ask me something about your workforce 😭`;
    }

    if (/\b(capital\s+of|france|germany|paris|london|antarctica|astronomy|mars|space)\b/i.test(p)) {
      return `That's completely outside my department 💀 Let's get back to managing the workforce.`;
    }

    if (/\b(recipe|cook|pizza|burger|cricket|football|movie|song|actor|actress|crypto|bitcoin)\b/i.test(p)) {
      return `Bro, we have workers to manage. Lock in. 💀`;
    }

    // ==========================================
    // 4. AMBIGUOUS / VAGUE QUESTIONS
    // ==========================================
    if (/^(show\s+me\s+the\s+workers|show\s+workers|the\s+workers|workers)[\s!.]*$/i.test(p)) {
      return `Be a little more specific — all active workers, or workers from a particular location?`;
    }

    if (/^(what\s+about\s+the\s+site\??|the\s+site|about\s+the\s+site)[\s!.]*$/i.test(p)) {
      return `Which site are we talking about? Give me its name and I'll check.`;
    }

    if (/^(tell\s+me\s+more|more\s+details|tell\s+more)[\s!.]*$/i.test(p)) {
      return `Tell you more about what? Pick a topic: attendance, payroll, site deployments, or leave requests!`;
    }

    // ==========================================
    // 5. APPLICATION HELP QUESTIONS (Knowledge Base)
    // ==========================================
    const appHelp = this.getAppHelpResponse(p);
    if (appHelp) {
      return appHelp;
    }

    // ==========================================
    // 6. MULTI-TURN CONVERSATION FOLLOW-UP HANDLING
    // ==========================================
    if (
      history &&
      history.length > 0 &&
      (/\b(which\s+site\s+had\s+the\s+most|who\s+had\s+the\s+most|highest\s+absent|most\s+absent)\b/i.test(p) ||
        /\b(show\s+me\s+their\s+names|who\s+are\s+they|list\s+their\s+names|names\s+of\s+them)\b/i.test(p))
    ) {
      const lastAssistantMsg = [...history].reverse().find((m) => m.role === 'assistant');
      const lastContext = lastAssistantMsg?.content?.toLowerCase() || '';

      // Follow-up for absenteeism
      if (lastContext.includes('absent') || lastContext.includes('attendance')) {
        const isYesterday = lastContext.includes('yesterday') || p.includes('yesterday');
        const targetDate = isYesterday ? 'yesterday' : 'today';
        const att: any = await this.aiToolsService.getAttendanceSummary({ date: targetDate }, user);

        if (/\b(which\s+site\s+had\s+the\s+most|who\s+had\s+the\s+most|highest\s+absent|most\s+absent)\b/i.test(p)) {
          const breakdown = att.siteBreakdown || {};
          const sorted = Object.entries(breakdown)
            .map(([site, s]: any) => ({ site, absent: s.absent || 0, total: s.total || 0 }))
            .sort((a, b) => b.absent - a.absent);

          const top = sorted[0];
          if (!top || top.absent === 0) {
            return `No sites recorded absent workers on ${att.date}.`;
          }

          const rows = sorted
            .map((s) => `| **${s.site}** | ${s.total} | ${s.absent} |`)
            .join('\n');

          return `### 📍 Site Absenteeism Breakdown (${att.date})\n\n` +
            `**${top.site}** had the most absent workers with **${top.absent}** absentees.\n\n` +
            `| Site | Scheduled Workers | Absent |\n| :--- | :--- | :--- |\n${rows}\n\n` +
            `*(Retrieved live from PostgreSQL database)*`;
        }

        if (/\b(show\s+me\s+their\s+names|who\s+are\s+they|list\s+their\s+names)\b/i.test(p)) {
          const absentWorkers = att.absentWorkers || [];
          if (absentWorkers.length === 0) {
            return `No workers were marked absent on ${att.date}.`;
          }
          const rows = absentWorkers
            .map((w: any) => `| **${w.workerCode}** | ${w.fullName} | ${w.site} | ${w.shift} |`)
            .join('\n');

          return `### 📋 Absent Workers (${att.date})\n\n` +
            `| Worker Code | Full Name | Site | Shift |\n| :--- | :--- | :--- | :--- |\n${rows}\n\n` +
            `*(Retrieved live from PostgreSQL database)*`;
        }
      }

      // Follow-up for unassigned workers
      if (lastContext.includes('unassigned')) {
        const unassigned = await this.aiToolsService.searchWorkers({ unassigned: true }, user);
        if (Array.isArray(unassigned) && unassigned.length > 0) {
          const rows = unassigned
            .map((w: any) => `| **${w.workerCode}** | ${w.fullName} | ${w.department} | ${w.category} |`)
            .join('\n');
          return `### 👷 Unassigned Worker Names (${unassigned.length} workers)\n\n` +
            `| Worker Code | Full Name | Department | Category |\n| :--- | :--- | :--- | :--- |\n${rows}\n\n` +
            `*(Retrieved live from PostgreSQL database)*`;
        }
      }
    }

    // ==========================================
    // 7. OPERATIONAL DATABASE QUERIES
    // ==========================================

    try {
      // 7.1 Attendance comparison (yesterday vs today)
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

      // 7.2 Specific Site Worker Search: e.g. "workers assigned to Apex Tower" or "workers at Apex Tower"
      const assignedMatch = prompt.match(/(?:workers?\s+assigned\s+to|workers?\s+at|who\s+is\s+at)\s+([a-zA-Z0-9\s]+)/i);
      if (assignedMatch && assignedMatch[1]) {
        const targetSite = assignedMatch[1].trim();
        const workers = await this.aiToolsService.searchWorkers({ site: targetSite }, user);
        if (Array.isArray(workers) && workers.length > 0) {
          const rows = workers.map((w: any) =>
            `| **${w.workerCode}** | ${w.fullName} | ${w.department} | ${w.activeShift || 'General Shift'} | \`${w.status}\` |`
          ).join('\n');
          return `### 🏗️ Workers Assigned to ${targetSite} (${workers.length} found)\n\n` +
            `| Code | Worker Name | Department | Shift | Status |\n` +
            `| :--- | :--- | :--- | :--- | :--- |\n` +
            `${rows}\n\n` +
            `*(Retrieved live from PostgreSQL database)*`;
        } else {
          return `No active worker assignments found for site "${targetSite}".`;
        }
      }

      // 7.3 Unassigned workers query: e.g. "which workers are unassigned?"
      if (p.includes('unassigned') || p.includes('not assigned') || p.includes('without assignment')) {
        const unassigned = await this.aiToolsService.searchWorkers({ unassigned: true }, user);
        if (Array.isArray(unassigned) && unassigned.length > 0) {
          const rows = unassigned.map((w: any) =>
            `| **${w.workerCode}** | ${w.fullName} | ${w.department} | ${w.category} | \`${w.status}\` |`
          ).join('\n');
          return `### 👷 Unassigned Workers (${unassigned.length} found)\n\n` +
            `| Code | Worker Name | Department | Category | Status |\n` +
            `| :--- | :--- | :--- | :--- | :--- |\n` +
            `${rows}\n\n` +
            `*(Retrieved live from PostgreSQL database)*`;
        } else {
          return `All active workers currently have valid site assignments.`;
        }
      }

      // 7.4 Attendance summary (today, yesterday, specific date, who is absent)
      if (
        p.includes('attendance') ||
        p.includes('absent') ||
        p.includes('present') ||
        p.includes('who is absent') ||
        p.includes('attendance summary')
      ) {
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

        const absentDetail =
          att.absentCount === 0
            ? `**0** workers were marked absent today. Attendance was recorded for the selected shift.`
            : `**${att.absentCount}** worker(s) marked absent on this date. Attendance was recorded for the selected shift.`;

        return `### 📋 Attendance Summary for ${att.date} (${att.filteredBySite})\n\n` +
          `${absentDetail}\n\n` +
          `- **Overall Attendance Rate:** **${att.attendanceRate}**\n` +
          `- **Scheduled Workers:** ${att.scheduledWorkers}\n` +
          `- **Present:** ${att.presentCount}\n` +
          `- **Absent:** ${att.absentCount}\n` +
          `- **Half Day:** ${att.halfDayCount}\n` +
          `- **Not Marked:** ${att.notMarkedCount}\n\n` +
          (shiftRows ? `#### Shift Breakdown\n| Shift | Total Scheduled | Present | Absent | Half Day | Not Marked |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${shiftRows}\n\n` : '') +
          `*(Retrieved live from PostgreSQL database)*`;
      }

      // 7.5 Leave requests
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

      // 7.6 Payroll summary (Admin only)
      if (p.includes('payroll') || p.includes('expenditure') || p.includes('gross') || p.includes('net pay') || p.includes('outstanding')) {
        if (user.role !== 'ADMIN') {
          return `### 🔒 Access Denied\n\nYou do not have permission to view payroll or salary information. This action is restricted to Administrators only.`;
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

      // 7.7 Work sites / locations & staffing
      if (
        (p.includes('site') || p.includes('location') || p.includes('work site')) &&
        (p.includes('list') || p.includes('all') || p.includes('show') || p.includes('staffing'))
      ) {
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

      // 7.8 Explicit Workforce Overview requests ONLY
      const isExplicitWorkforceRequest =
        /\b(workforce\s+overview|total\s+workforce|active\s+workers|total\s+active\s+workers|inactive\s+workers|workforce\s+distribution|department-wise\s+workforce|general\s+worker\s+statistics|how\s+many\s+workers\s+(are\s+there|registered|total)|workforce\s+summary)\b/i.test(p);

      if (isExplicitWorkforceRequest) {
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
    } catch (err: any) {
      if (err instanceof ForbiddenException || err.status === 403 || err.message?.includes('not authorized')) {
        return `### 🔒 Access Denied\n\n${err.message || 'You are not authorized to view information for that site.'}`;
      }
      return `⚠️ Error executing request: ${err.message}`;
    }

    // ==========================================
    // 8. UNMATCHED / UNKNOWN FALLBACK
    // (Never return Workforce Overview as fallback!)
    // ==========================================
    return `I'm not quite sure what you need. You can ask me about attendance, active workers, site assignments, leaves, payroll, or how WorkForce features work!`;
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
