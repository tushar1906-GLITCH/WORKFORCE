import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiToolsService } from './ai-tools.service';
import { AiService } from './ai.service';
import { GroqService } from './groq.service';
import { Role, WorkerStatus, AttendanceStatus, AssignmentStatus } from '../common/enums';

describe('WorkForce 2.0 AI Assistant & Database Tools Suite', () => {
  let aiToolsService: AiToolsService;
  let aiService: AiService;
  let groqService: GroqService;

  // Mock repositories
  const mockWorkerRepo: any = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSiteRepo: any = {
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    }),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockDeptRepo: any = {};
  const mockShiftRepo: any = {};

  const mockAttRepo: any = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  const mockLeaveRepo: any = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  const mockAssignRepo: any = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPayrollRunRepo: any = {
    createQueryBuilder: jest.fn(),
  };

  const mockPayrollItemRepo: any = {};
  const mockUserRepo: any = {};
  const mockSupervisorSiteRepo: any = {};

  const mockConvRepo: any = {
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'conv-uuid-1', ...dto, createdAt: new Date(), updatedAt: new Date() })),
    save: jest.fn((c) => Promise.resolve(c)),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockMsgRepo: any = {
    create: jest.fn((dto) => ({ id: 'msg-uuid-1', ...dto, createdAt: new Date() })),
    save: jest.fn((m) => Promise.resolve(m)),
    find: jest.fn(),
  };

  const mockConfigService: any = {
    get: jest.fn((key: string, defaultVal: any) => {
      if (key === 'groq.apiKey') return '';
      if (key === 'groq.model') return 'llama-3.3-70b-versatile';
      if (key === 'groq.fallbackModel') return 'llama-3.1-8b-instant';
      return defaultVal;
    }),
  };

  const adminUser = {
    id: 'admin-uuid',
    email: 'admin@workforce.com',
    fullName: 'System Administrator',
    role: Role.ADMIN,
    assignedSiteIds: [],
    assignedSites: [],
  };

  const supervisorUser = {
    id: 'supervisor-uuid',
    email: 'supervisor@workforce.com',
    fullName: 'Site Supervisor A',
    role: Role.SUPERVISOR,
    assignedSiteIds: ['site-uuid-1'],
    assignedSites: [{ id: 'site-uuid-1', name: 'Site A' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    groqService = new GroqService(mockConfigService);
    aiToolsService = new AiToolsService(
      mockWorkerRepo,
      mockSiteRepo,
      mockDeptRepo,
      mockShiftRepo,
      mockAttRepo,
      mockLeaveRepo,
      mockAssignRepo,
      mockPayrollRunRepo,
      mockPayrollItemRepo,
      mockUserRepo,
      mockSupervisorSiteRepo,
    );
    aiService = new AiService(mockConvRepo, mockMsgRepo, groqService, aiToolsService);
  });

  describe('1. Database Tools Schema & Definitions', () => {
    it('should expose all 8 required database-connected tools', () => {
      const tools = aiToolsService.getToolsDefinitions();
      expect(tools.length).toBe(8);
      const names = tools.map((t) => t.function.name);
      expect(names).toContain('get_workforce_summary');
      expect(names).toContain('search_workers');
      expect(names).toContain('get_attendance_summary');
      expect(names).toContain('get_worker_attendance_history');
      expect(names).toContain('get_leave_requests');
      expect(names).toContain('get_payroll_summary');
      expect(names).toContain('get_site_locations_and_staffing');
      expect(names).toContain('compare_attendance_dates');
    });
  });

  describe('2. Role-Based Permissions & Security', () => {
    it('Admin can access payroll summary tool', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'run-1',
            periodStart: '2026-11-01',
            periodEnd: '2026-11-30',
            status: 'APPROVED',
            totalWorkers: 15,
            totalAmount: '125000.00',
            items: [{ paymentStatus: 'PAID', netPay: '125000.00' }],
          },
        ]),
      };
      mockPayrollRunRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await aiToolsService.getPayrollSummary({}, adminUser);
      expect(result.totalRunsAnalyzed).toBe(1);
      expect(result.aggregate.totalGrossExpenditure).toContain('1,25,000');
    });

    it('Supervisor is strictly FORBIDDEN from accessing payroll summary tool', async () => {
      await expect(
        aiToolsService.getPayrollSummary({}, supervisorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Supervisor is strictly FORBIDDEN from querying unauthorized sites', async () => {
      mockSiteRepo.findOne.mockResolvedValue({
        id: '11111111-2222-3333-4444-555555555555',
        name: 'Unauthorized Site B',
      });

      await expect(
        aiToolsService.getAttendanceSummary({ site: '11111111-2222-3333-4444-555555555555' }, supervisorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Supervisor chat queries regarding salary/payroll are blocked with Access Denied', async () => {
      const response = await aiService.chat(supervisorUser, 'What is the salary of John Doe?');
      expect(response.message.content).toContain('Access Denied');
      expect(response.message.content).toContain('restricted to Administrators');
    });
  });

  describe('3. Attendance Rate Calculation & Denominator Rules', () => {
    it('calculates attendance percentage against scheduled workers for the date, NOT the entire workforce', async () => {
      // 10 workers scheduled
      const mockAssignments = Array.from({ length: 10 }).map((_, i) => ({
        workerId: `wkr-${i}`,
        workSite: { name: 'Site A' },
        shift: { name: 'Morning' },
      }));

      // 8 workers present, 2 absent
      const mockAtt = [
        ...Array.from({ length: 8 }).map((_, i) => ({
          workerId: `wkr-${i}`,
          status: AttendanceStatus.PRESENT,
          workSite: { name: 'Site A' },
          shift: { name: 'Morning' },
        })),
        ...Array.from({ length: 2 }).map((_, i) => ({
          workerId: `wkr-${8 + i}`,
          status: AttendanceStatus.ABSENT,
          workSite: { name: 'Site A' },
          shift: { name: 'Morning' },
        })),
      ];

      const assignQb: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAssignments),
      };
      mockAssignRepo.createQueryBuilder.mockReturnValue(assignQb);

      const attQb: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAtt),
      };
      mockAttRepo.createQueryBuilder.mockReturnValue(attQb);

      const summary = await aiToolsService.getAttendanceSummary({ date: 'today' }, adminUser);

      expect(summary.scheduledWorkers).toBe(10);
      expect(summary.presentCount).toBe(8);
      expect(summary.absentCount).toBe(2);
      expect(summary.attendanceRate).toBe('80%');
    });

    it('NOT_MARKED attendance is counted separately and never treated as ABSENT', async () => {
      // 10 workers scheduled, 6 present, 2 absent, 2 with no record (NOT_MARKED)
      const mockAssignments = Array.from({ length: 10 }).map((_, i) => ({
        workerId: `wkr-${i}`,
        workSite: { name: 'Site A' },
        shift: { name: 'Morning' },
      }));

      const mockAtt = [
        ...Array.from({ length: 6 }).map((_, i) => ({
          workerId: `wkr-${i}`,
          status: AttendanceStatus.PRESENT,
          workSite: { name: 'Site A' },
          shift: { name: 'Morning' },
        })),
        ...Array.from({ length: 2 }).map((_, i) => ({
          workerId: `wkr-${6 + i}`,
          status: AttendanceStatus.ABSENT,
          workSite: { name: 'Site A' },
          shift: { name: 'Morning' },
        })),
      ];

      const assignQb: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAssignments),
      };
      mockAssignRepo.createQueryBuilder.mockReturnValue(assignQb);

      const attQb: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAtt),
      };
      mockAttRepo.createQueryBuilder.mockReturnValue(attQb);

      const summary = await aiToolsService.getAttendanceSummary({ date: 'today' }, adminUser);

      expect(summary.scheduledWorkers).toBe(10);
      expect(summary.presentCount).toBe(6);
      expect(summary.absentCount).toBe(2);
      expect(summary.notMarkedCount).toBe(2);
      // Rate is (6 / 10) * 100 = 60%
      expect(summary.attendanceRate).toBe('60%');
    });
  });

  describe('4. Conversation Threads and History', () => {
    it('rejects empty prompts', async () => {
      await expect(aiService.chat(adminUser, '   ')).rejects.toThrow();
    });

    it('creates new conversation if no conversationId provided', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockWorkerRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await aiService.chat(adminUser, 'How many workers are currently registered?');
      expect(res.conversationId).toBe('conv-uuid-1');
      expect(mockConvRepo.create).toHaveBeenCalled();
      expect(mockMsgRepo.create).toHaveBeenCalledTimes(2); // user msg + assistant msg
    });
  });
});
