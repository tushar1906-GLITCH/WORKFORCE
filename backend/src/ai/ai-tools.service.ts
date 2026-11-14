import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Worker,
  WorkSite,
  Department,
  Shift,
  Attendance,
  LeaveRequest,
  WorkerAssignment,
  PayrollRun,
  PayrollItem,
  User,
  SupervisorSite,
} from '../database/entities';
import { AttendanceStatus, WorkerStatus, AssignmentStatus } from '../common/enums';

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    @InjectRepository(Department)
    private deptRepo: Repository<Department>,
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
    @InjectRepository(Attendance)
    private attRepo: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(WorkerAssignment)
    private assignRepo: Repository<WorkerAssignment>,
    @InjectRepository(PayrollRun)
    private payrollRunRepo: Repository<PayrollRun>,
    @InjectRepository(PayrollItem)
    private payrollItemRepo: Repository<PayrollItem>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(SupervisorSite)
    private supervisorSiteRepo: Repository<SupervisorSite>,
  ) {}

  getToolsDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'get_workforce_summary',
          description:
            'Get summary of total workers, active/inactive counts, department breakdown, site breakdown, and unassigned workers.',
          parameters: {
            type: 'object',
            properties: {
              site: {
                type: 'string',
                description: 'Optional site name or site ID',
              },
              department: {
                type: 'string',
                description: 'Optional department name or ID',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_workers',
          description:
            'Search worker profiles by name, code, phone, department, or status.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search string (worker name, code, or phone)',
              },
              site: {
                type: 'string',
                description: 'Optional site name or ID',
              },
              status: {
                type: 'string',
                description: 'ACTIVE or INACTIVE',
              },
              unassigned: {
                type: 'boolean',
                description: 'Filter workers who have no active site assignment',
              },
              limit: {
                type: 'number',
                description: 'Max results to return (default 10)',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_attendance_summary',
          description:
            'Get attendance counts (present, absent, half-day, not-marked, attendance percentage) and shift breakdown for a specific date (today, yesterday, or YYYY-MM-DD).',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description:
                  'Date string: "today", "yesterday", or "YYYY-MM-DD"',
              },
              site: {
                type: 'string',
                description: 'Optional site name or site ID',
              },
              shift: {
                type: 'string',
                description: 'Optional shift name or shift ID',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_worker_attendance_history',
          description:
            'Get attendance records for a specific worker by worker code or name.',
          parameters: {
            type: 'object',
            properties: {
              worker: {
                type: 'string',
                description: 'Worker code (e.g. WKR-001) or full name',
              },
              startDate: {
                type: 'string',
                description: 'Start date in YYYY-MM-DD format',
              },
              endDate: {
                type: 'string',
                description: 'End date in YYYY-MM-DD format',
              },
            },
            required: ['worker'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_leave_requests',
          description:
            'Get pending, approved, or rejected leave requests by site or status.',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                description: 'PENDING, APPROVED, or REJECTED',
              },
              site: {
                type: 'string',
                description: 'Optional site name or ID',
              },
              date: {
                type: 'string',
                description: 'Optional date YYYY-MM-DD to check who is on leave',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_payroll_summary',
          description:
            'Get organization or site payroll expenditure, net pay, deductions, and payment status. ADMIN ONLY.',
          parameters: {
            type: 'object',
            properties: {
              month: {
                type: 'string',
                description: 'Month in YYYY-MM format',
              },
              status: {
                type: 'string',
                description: 'DRAFT, APPROVED, or REVISED',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_site_locations_and_staffing',
          description:
            'Get list of operational work sites, addresses, active worker counts, and supervisor assignments.',
          parameters: {
            type: 'object',
            properties: {
              site: {
                type: 'string',
                description: 'Optional site name or ID',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'compare_attendance_dates',
          description:
            'Compare attendance rates, present count, and absent count between two dates.',
          parameters: {
            type: 'object',
            properties: {
              date1: {
                type: 'string',
                description: 'First date (e.g. "yesterday" or YYYY-MM-DD)',
              },
              date2: {
                type: 'string',
                description: 'Second date (e.g. "today" or YYYY-MM-DD)',
              },
              site: {
                type: 'string',
                description: 'Optional site name or ID',
              },
            },
            required: ['date1', 'date2'],
          },
        },
      },
    ];
  }

  async executeTool(name: string, args: any, user: any): Promise<any> {
    this.logger.log(`Executing tool "${name}" for user ${user?.email} (${user?.role})`);

    try {
      switch (name) {
        case 'get_workforce_summary':
          return await this.getWorkforceSummary(args, user);
        case 'search_workers':
          return await this.searchWorkers(args, user);
        case 'get_attendance_summary':
          return await this.getAttendanceSummary(args, user);
        case 'get_worker_attendance_history':
          return await this.getWorkerAttendanceHistory(args, user);
        case 'get_leave_requests':
          return await this.getLeaveRequests(args, user);
        case 'get_payroll_summary':
          return await this.getPayrollSummary(args, user);
        case 'get_site_locations_and_staffing':
          return await this.getSiteLocationsAndStaffing(args, user);
        case 'compare_attendance_dates':
          return await this.compareAttendanceDates(args, user);
        default:
          return { error: `Tool ${name} is not recognized` };
      }
    } catch (err: any) {
      this.logger.error(`Error executing tool ${name}: ${err.message}`, err.stack);
      return { error: err.message };
    }
  }

  // --- Helpers ---

  resolveDate(dateStr?: string): string {
    const today = new Date();
    if (!dateStr || dateStr.toLowerCase() === 'today') {
      return today.toISOString().split('T')[0];
    }
    if (dateStr.toLowerCase() === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
    if (match) return dateStr;
    return today.toISOString().split('T')[0];
  }

  private async resolveSite(siteInput?: string, user?: any): Promise<WorkSite | null> {
    if (!siteInput) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteInput);
    let site: WorkSite | null = null;
    if (isUuid) {
      site = await this.siteRepo.findOne({ where: { id: siteInput } });
    } else {
      site = await this.siteRepo
        .createQueryBuilder('ws')
        .where('LOWER(ws.name) LIKE LOWER(:name)', { name: `%${siteInput.trim()}%` })
        .getOne();
    }

    if (site && user && user.role !== 'ADMIN') {
      const allowedSiteIds: string[] = user.assignedSiteIds || [];
      if (!allowedSiteIds.includes(site.id)) {
        throw new ForbiddenException(
          `You are not authorized to view information for site "${site.name}".`,
        );
      }
    }
    return site;
  }

  private getEffectiveSiteIds(resolvedSite: WorkSite | null, user: any): string[] | null {
    if (user.role === 'ADMIN') {
      return resolvedSite ? [resolvedSite.id] : null;
    }
    const allowedSiteIds: string[] = user.assignedSiteIds || [];
    if (resolvedSite) {
      if (!allowedSiteIds.includes(resolvedSite.id)) {
        throw new ForbiddenException(`You are not authorized to access site ${resolvedSite.name}`);
      }
      return [resolvedSite.id];
    }
    return allowedSiteIds;
  }

  // --- Tool 1: Workforce Summary ---
  async getWorkforceSummary(args: any, user: any) {
    const resolvedSite = await this.resolveSite(args.site, user);
    const effectiveSiteIds = this.getEffectiveSiteIds(resolvedSite, user);

    const qb = this.workerRepo.createQueryBuilder('w')
      .leftJoinAndSelect('w.department', 'd')
      .leftJoinAndSelect(
        'w.assignments',
        'wa',
        'wa.status = :activeAssign',
        { activeAssign: AssignmentStatus.ACTIVE },
      )
      .leftJoinAndSelect('wa.workSite', 'ws');

    if (effectiveSiteIds !== null) {
      if (effectiveSiteIds.length === 0) {
        return {
          totalWorkers: 0,
          activeWorkers: 0,
          inactiveWorkers: 0,
          departmentCounts: {},
          siteCounts: {},
          unassignedWorkers: 0,
          filteredBySite: 'None',
          error: undefined,
        };
      }
      qb.where('wa.workSiteId IN (:...siteIds)', { siteIds: effectiveSiteIds });
    }

    const workers = await qb.getMany();

    const totalWorkers = workers.length;
    const activeWorkers = workers.filter((w) => w.status === WorkerStatus.ACTIVE).length;
    const inactiveWorkers = workers.filter((w) => w.status === WorkerStatus.INACTIVE).length;

    const departmentCounts: Record<string, number> = {};
    const siteCounts: Record<string, number> = {};
    let unassignedWorkers = 0;

    for (const w of workers) {
      const deptName = w.department?.name || 'Unassigned Department';
      departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;

      const activeAssign = (w.assignments || []).find((a) => a.status === AssignmentStatus.ACTIVE);
      if (activeAssign?.workSite) {
        const sName = activeAssign.workSite.name;
        siteCounts[sName] = (siteCounts[sName] || 0) + 1;
      } else {
        unassignedWorkers++;
      }
    }

    return {
      totalWorkers,
      activeWorkers,
      inactiveWorkers,
      departmentCounts,
      siteCounts,
      unassignedWorkers,
      filteredBySite: resolvedSite ? resolvedSite.name : 'All authorized sites',
      error: undefined,
    };
  }

  // --- Tool 2: Search Workers ---
  async searchWorkers(args: any, user: any) {
    const resolvedSite = await this.resolveSite(args.site, user);
    const effectiveSiteIds = this.getEffectiveSiteIds(resolvedSite, user);

    const qb = this.workerRepo.createQueryBuilder('w')
      .leftJoinAndSelect('w.department', 'dept')
      .leftJoinAndSelect('w.skillCategory', 'skill')
      .leftJoinAndSelect('w.wageHistories', 'wage')
      .leftJoinAndSelect(
        'w.assignments',
        'wa',
        'wa.status = :activeAssign',
        { activeAssign: AssignmentStatus.ACTIVE },
      )
      .leftJoinAndSelect('wa.workSite', 'ws')
      .leftJoinAndSelect('wa.shift', 'sh');

    if (args.query && args.query.trim()) {
      const q = `%${args.query.trim()}%`;
      qb.andWhere(
        '(LOWER(w.fullName) LIKE LOWER(:q) OR LOWER(w.workerCode) LIKE LOWER(:q) OR w.phone LIKE :q)',
        { q },
      );
    }

    if (args.status) {
      const upper = args.status.toUpperCase();
      if (upper === 'ACTIVE' || upper === 'INACTIVE') {
        qb.andWhere('w.status = :status', { status: upper });
      }
    }

    if (args.unassigned) {
      qb.andWhere('wa.id IS NULL');
      if (!args.status) {
        qb.andWhere('w.status = :activeStatus', { activeStatus: WorkerStatus.ACTIVE });
      }
    }

    if (effectiveSiteIds !== null && !args.unassigned) {
      if (effectiveSiteIds.length === 0) return [];
      qb.andWhere('wa.workSiteId IN (:...siteIds)', { siteIds: effectiveSiteIds });
    }

    const limit = Math.min(Math.max(args.limit || 10, 1), 50);
    qb.take(limit);

    const workers = await qb.getMany();

    return workers.map((w) => {
      const activeAssign = (w.assignments || []).find((a) => a.status === AssignmentStatus.ACTIVE);
      const activeWage = (w.wageHistories || []).find((wh) => !wh.effectiveTo);
      return {
        id: w.id,
        workerCode: w.workerCode,
        fullName: w.fullName,
        phone: w.phone,
        status: w.status,
        employmentType: w.employmentType,
        wageType: user.role === 'ADMIN' && activeWage ? activeWage.wageType : undefined,
        currentWageRate: user.role === 'ADMIN' && activeWage ? activeWage.rate : undefined,
        department: w.department?.name || 'None',
        skillCategory: w.skillCategory?.name || 'None',
        currentSite: activeAssign?.workSite?.name || 'Unassigned',
        currentShift: activeAssign?.shift?.name || 'None',
      };
    });
  }

  // --- Tool 3: Attendance Summary ---
  async getAttendanceSummary(args: any, user: any) {
    const targetDate = this.resolveDate(args.date);
    const resolvedSite = await this.resolveSite(args.site, user);
    const effectiveSiteIds = this.getEffectiveSiteIds(resolvedSite, user);

    // 1. Get eligible active assignments for this date
    const assignQb = this.assignRepo.createQueryBuilder('wa')
      .innerJoinAndSelect('wa.worker', 'w')
      .innerJoinAndSelect('wa.workSite', 'ws')
      .leftJoinAndSelect('wa.shift', 's')
      .where('wa.status = :activeStatus', { activeStatus: AssignmentStatus.ACTIVE })
      .andWhere('wa.startDate <= :targetDate', { targetDate })
      .andWhere('(wa.endDate IS NULL OR wa.endDate >= :targetDate)', { targetDate });

    if (effectiveSiteIds !== null) {
      if (effectiveSiteIds.length === 0) {
        return {
          date: targetDate,
          scheduledWorkers: 0,
          presentCount: 0,
          absentCount: 0,
          halfDayCount: 0,
          notMarkedCount: 0,
          attendanceRate: '0%',
          shiftBreakdown: {},
          siteBreakdown: {},
          filteredBySite: 'None',
          error: undefined,
        };
      }
      assignQb.andWhere('wa.workSiteId IN (:...siteIds)', { siteIds: effectiveSiteIds });
    }

    if (args.shift) {
      assignQb.andWhere(
        '(LOWER(s.name) LIKE LOWER(:shift) OR LOWER(s.code) = LOWER(:shift))',
        { shift: `%${args.shift.trim()}%` },
      );
    }

    const assignments = await assignQb.getMany();
    const scheduledWorkerIds = assignments.map((a) => a.workerId);

    // 2. Query attendance records for targetDate
    const attQb = this.attRepo.createQueryBuilder('att')
      .innerJoinAndSelect('att.worker', 'w')
      .leftJoinAndSelect('att.shift', 's')
      .leftJoinAndSelect('att.workSite', 'ws')
      .where('att.attendanceDate = :targetDate', { targetDate });

    if (effectiveSiteIds !== null) {
      attQb.andWhere('att.workSiteId IN (:...siteIds)', { siteIds: effectiveSiteIds });
    }

    const attendanceRecords = await attQb.getMany();

    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let notMarkedCount = 0;

    const absentWorkersList: { workerCode: string; fullName: string; site: string; shift: string }[] = [];
    const recordWorkerIds = new Set<string>();
    const shiftStats: Record<string, { present: number; absent: number; halfDay: number; notMarked: number; total: number }> = {};
    const siteStats: Record<string, { present: number; absent: number; halfDay: number; notMarked: number; total: number }> = {};

    for (const r of attendanceRecords) {
      recordWorkerIds.add(r.workerId);
      const sName = r.shift?.name || 'General Shift';
      const siteName = r.workSite?.name || 'General Site';

      if (!shiftStats[sName]) shiftStats[sName] = { present: 0, absent: 0, halfDay: 0, notMarked: 0, total: 0 };
      if (!siteStats[siteName]) siteStats[siteName] = { present: 0, absent: 0, halfDay: 0, notMarked: 0, total: 0 };

      shiftStats[sName].total++;
      siteStats[siteName].total++;

      if (r.status === AttendanceStatus.PRESENT) {
        presentCount++;
        shiftStats[sName].present++;
        siteStats[siteName].present++;
      } else if (r.status === AttendanceStatus.ABSENT) {
        absentCount++;
        shiftStats[sName].absent++;
        siteStats[siteName].absent++;
        absentWorkersList.push({
          workerCode: r.worker?.workerCode || 'N/A',
          fullName: r.worker?.fullName || 'Unknown',
          site: siteName,
          shift: sName,
        });
      } else if (r.status === AttendanceStatus.HALF_DAY) {
        halfDayCount++;
        shiftStats[sName].halfDay++;
        siteStats[siteName].halfDay++;
      }
    }

    // Workers scheduled but with no attendance record count as NOT_MARKED
    for (const a of assignments) {
      if (!recordWorkerIds.has(a.workerId)) {
        notMarkedCount++;
        const sName = a.shift?.name || 'General Shift';
        const siteName = a.workSite?.name || 'General Site';
        if (!shiftStats[sName]) shiftStats[sName] = { present: 0, absent: 0, halfDay: 0, notMarked: 0, total: 0 };
        if (!siteStats[siteName]) siteStats[siteName] = { present: 0, absent: 0, halfDay: 0, notMarked: 0, total: 0 };
        shiftStats[sName].notMarked++;
        shiftStats[sName].total++;
        siteStats[siteName].notMarked++;
        siteStats[siteName].total++;
      }
    }

    const scheduledWorkers = Math.max(scheduledWorkerIds.length, attendanceRecords.length);
    const attendanceRate =
      scheduledWorkers > 0
        ? Number((((presentCount + 0.5 * halfDayCount) / scheduledWorkers) * 100).toFixed(1))
        : 0;

    return {
      date: targetDate,
      scheduledWorkers,
      presentCount,
      absentCount,
      halfDayCount,
      notMarkedCount,
      attendanceRate: `${attendanceRate}%`,
      shiftBreakdown: shiftStats,
      siteBreakdown: siteStats,
      absentWorkers: absentWorkersList,
      filteredBySite: resolvedSite ? resolvedSite.name : 'All authorized sites',
      error: undefined,
    };
  }

  // --- Tool 4: Worker Attendance History ---
  async getWorkerAttendanceHistory(args: any, user: any) {
    const workerTerm = args.worker?.trim();
    if (!workerTerm) return { error: 'Worker name or code is required' };

    const worker = await this.workerRepo
      .createQueryBuilder('w')
      .where('LOWER(w.workerCode) = LOWER(:term) OR LOWER(w.fullName) LIKE LOWER(:termLike)', {
        term: workerTerm,
        termLike: `%${workerTerm}%`,
      })
      .getOne();

    if (!worker) {
      return { error: `No worker found matching "${workerTerm}"` };
    }

    if (user.role !== 'ADMIN') {
      const allowedSiteIds: string[] = user.assignedSiteIds || [];
      const hasAssignmentInSite = await this.assignRepo.findOne({
        where: {
          workerId: worker.id,
          workSiteId: In(allowedSiteIds),
        },
      });
      if (!hasAssignmentInSite) {
        throw new ForbiddenException(
          `You are not authorized to view records for worker ${worker.fullName} (${worker.workerCode}) as they are not assigned to your sites.`,
        );
      }
    }

    const attQb = this.attRepo.createQueryBuilder('att')
      .leftJoinAndSelect('att.shift', 's')
      .leftJoinAndSelect('att.workSite', 'ws')
      .where('att.workerId = :workerId', { workerId: worker.id });

    if (args.startDate) {
      attQb.andWhere('att.attendanceDate >= :startDate', { startDate: args.startDate });
    }
    if (args.endDate) {
      attQb.andWhere('att.attendanceDate <= :endDate', { endDate: args.endDate });
    }

    attQb.orderBy('att.attendanceDate', 'DESC').take(30);

    const logs = await attQb.getMany();

    return {
      worker: {
        id: worker.id,
        workerCode: worker.workerCode,
        fullName: worker.fullName,
        phone: worker.phone,
        status: worker.status,
      },
      totalRecords: logs.length,
      records: logs.map((l) => ({
        date: l.attendanceDate,
        status: l.status,
        shift: l.shift?.name || 'General',
        site: l.workSite?.name || 'General',
        checkIn: l.checkIn,
        checkOut: l.checkOut,
        overtimeMinutes: l.overtimeMinutes,
        remarks: l.remarks,
      })),
      error: undefined,
    };
  }

  // --- Tool 5: Leave Requests ---
  async getLeaveRequests(args: any, user: any) {
    const resolvedSite = await this.resolveSite(args.site, user);
    const effectiveSiteIds = this.getEffectiveSiteIds(resolvedSite, user);

    const qb = this.leaveRepo.createQueryBuilder('lr')
      .innerJoinAndSelect('lr.worker', 'w')
      .leftJoinAndSelect('lr.reviewedByUser', 'u')
      .leftJoinAndSelect('lr.workSite', 'ws');

    if (args.status) {
      qb.andWhere('lr.status = :status', { status: args.status.toUpperCase() });
    }

    if (args.date) {
      const d = this.resolveDate(args.date);
      qb.andWhere('lr.startDate <= :d AND lr.endDate >= :d', { d });
    }

    if (effectiveSiteIds !== null) {
      if (effectiveSiteIds.length === 0) return [];
      qb.andWhere('lr.workSiteId IN (:...siteIds)', { siteIds: effectiveSiteIds });
    }

    qb.orderBy('lr.createdAt', 'DESC').take(25);

    const leaves = await qb.getMany();

    return leaves.map((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

      return {
        id: l.id,
        workerCode: l.worker?.workerCode,
        workerName: l.worker?.fullName,
        siteName: l.workSite?.name || 'General Site',
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        daysCount: diffDays,
        reason: l.reason,
        status: l.status,
        reviewedBy: l.reviewedByUser?.fullName || 'N/A',
        reviewRemarks: l.reviewRemarks,
      };
    });
  }

  // --- Tool 6: Payroll Summary (ADMIN ONLY) ---
  async getPayrollSummary(args: any, user: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view payroll or salary information. This action is restricted to Administrators only.',
      );
    }

    const qb = this.payrollRunRepo.createQueryBuilder('pr')
      .leftJoinAndSelect('pr.items', 'pi');

    if (args.status) {
      qb.andWhere('pr.status = :status', { status: args.status.toUpperCase() });
    }

    if (args.month) {
      qb.andWhere("TO_CHAR(pr.periodStart, 'YYYY-MM') = :month", { month: args.month });
    }

    qb.orderBy('pr.periodEnd', 'DESC').take(12);

    const runs = await qb.getMany();

    let totalAmount = 0;
    let totalPaid = 0;

    const summaryByRun = runs.map((r) => {
      const amount = Number(r.totalAmount) || 0;
      totalAmount += amount;

      let runPaid = 0;
      for (const item of r.items || []) {
        if (item.paymentStatus === 'PAID') {
          runPaid += Number(item.netPay) || 0;
        }
      }
      totalPaid += runPaid;

      return {
        id: r.id,
        period: `${r.periodStart} to ${r.periodEnd}`,
        status: r.status,
        totalWorkers: r.totalWorkers,
        totalAmount: `₹${amount.toLocaleString('en-IN')}`,
        paid: `₹${runPaid.toLocaleString('en-IN')}`,
        outstanding: `₹${Math.max(0, amount - runPaid).toLocaleString('en-IN')}`,
      };
    });

    const outstanding = Math.max(0, totalAmount - totalPaid);

    return {
      totalRunsAnalyzed: runs.length,
      aggregate: {
        totalGrossExpenditure: `₹${totalAmount.toLocaleString('en-IN')}`,
        totalNetPayable: `₹${totalAmount.toLocaleString('en-IN')}`,
        totalDeductions: '₹0.00',
        totalPaid: `₹${totalPaid.toLocaleString('en-IN')}`,
        totalOutstanding: `₹${outstanding.toLocaleString('en-IN')}`,
      },
      runs: summaryByRun,
      error: undefined,
    };
  }

  // --- Tool 7: Site Locations and Staffing ---
  async getSiteLocationsAndStaffing(args: any, user: any) {
    const resolvedSite = await this.resolveSite(args.site, user);
    const effectiveSiteIds = this.getEffectiveSiteIds(resolvedSite, user);

    const qb = this.siteRepo.createQueryBuilder('ws')
      .leftJoinAndSelect('ws.supervisorSites', 'ss')
      .leftJoinAndSelect('ss.user', 'u');

    if (effectiveSiteIds !== null) {
      if (effectiveSiteIds.length === 0) return [];
      qb.where('ws.id IN (:...siteIds)', { siteIds: effectiveSiteIds });
    }

    const sites = await qb.getMany();

    const result = [];
    for (const site of sites) {
      const activeWorkerCount = await this.assignRepo.count({
        where: {
          workSiteId: site.id,
          status: AssignmentStatus.ACTIVE,
        },
      });

      result.push({
        id: site.id,
        name: site.name,
        address: site.address,
        description: site.description,
        status: site.status,
        isActive: site.status === 'ACTIVE',
        activeWorkerCount,
        supervisors: (site.supervisorSites || []).map((s) => ({
          name: s.user?.fullName,
          email: s.user?.email,
        })),
      });
    }

    return result;
  }

  // --- Tool 8: Compare Attendance Dates ---
  async compareAttendanceDates(args: any, user: any) {
    const date1 = this.resolveDate(args.date1);
    const date2 = this.resolveDate(args.date2);
    const resolvedSite = await this.resolveSite(args.site, user);

    const res1 = await this.getAttendanceSummary({ date: date1, site: args.site }, user);
    const res2 = await this.getAttendanceSummary({ date: date2, site: args.site }, user);

    const rate1 = parseFloat(String(res1.attendanceRate).replace('%', '')) || 0;
    const rate2 = parseFloat(String(res2.attendanceRate).replace('%', '')) || 0;
    const diff = Number((rate2 - rate1).toFixed(1));

    return {
      site: resolvedSite ? resolvedSite.name : 'All authorized sites',
      comparison: {
        date1: {
          date: date1,
          scheduled: res1.scheduledWorkers,
          present: res1.presentCount,
          absent: res1.absentCount,
          halfDay: res1.halfDayCount,
          notMarked: res1.notMarkedCount,
          rate: res1.attendanceRate,
        },
        date2: {
          date: date2,
          scheduled: res2.scheduledWorkers,
          present: res2.presentCount,
          absent: res2.absentCount,
          halfDay: res2.halfDayCount,
          notMarked: res2.notMarkedCount,
          rate: res2.attendanceRate,
        },
        change: {
          rateChange: `${diff >= 0 ? '+' : ''}${diff}%`,
          presentDiff: res2.presentCount - res1.presentCount,
          absentDiff: res2.absentCount - res1.absentCount,
          trend: diff > 0 ? 'IMPROVED' : diff < 0 ? 'DECLINED' : 'UNCHANGED',
        },
      },
      error: undefined,
    };
  }
}
