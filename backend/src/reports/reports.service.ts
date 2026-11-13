import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Worker,
  Attendance,
  LeaveRequest,
  PayrollRun,
  PayrollPayment,
  WorkSite,
  Department,
  SupervisorSite,
} from '../database/entities';
import { Role, AttendanceStatus } from '../common/enums';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    @InjectRepository(Attendance)
    private attRepo: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(PayrollRun)
    private runRepo: Repository<PayrollRun>,
    @InjectRepository(PayrollPayment)
    private paymentRepo: Repository<PayrollPayment>,
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    @InjectRepository(Department)
    private deptRepo: Repository<Department>,
    @InjectRepository(SupervisorSite)
    private ssRepo: Repository<SupervisorSite>,
  ) {}

  private async getAllowedSiteIds(user: any): Promise<string[] | null> {
    if (user.role === Role.ADMIN) return null; // All sites allowed
    const supSites = await this.ssRepo.find({ where: { userId: user.id } });
    return supSites.map((s) => s.workSiteId);
  }

  async getDashboardStats(user: any) {
    const allowedSites = await this.getAllowedSiteIds(user);
    const today = new Date().toISOString().split('T')[0];

    // Total & Active Workers
    const workerQb = this.workerRepo.createQueryBuilder('w');
    if (allowedSites) {
      workerQb
        .innerJoin('w.assignments', 'wa')
        .where('wa.workSiteId IN (:...allowedSites) AND wa.status = :activeStatus', {
          allowedSites: allowedSites.length ? allowedSites : ['00000000-0000-0000-0000-000000000000'],
          activeStatus: 'ACTIVE',
        });
    }
    const totalWorkers = await workerQb.getCount();
    const activeWorkers = await workerQb.andWhere('w.status = :status', { status: 'ACTIVE' }).getCount();

    // Today's Attendance
    const attQb = this.attRepo
      .createQueryBuilder('a')
      .where('a.attendanceDate = :today', { today });

    if (allowedSites) {
      attQb.andWhere('a.workSiteId IN (:...allowedSites)', {
        allowedSites: allowedSites.length ? allowedSites : ['00000000-0000-0000-0000-000000000000'],
      });
    }
    const todayAttendances = await attQb.getMany();

    const presentToday = todayAttendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const absentToday = todayAttendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const halfDayToday = todayAttendances.filter((a) => a.status === AttendanceStatus.HALF_DAY).length;
    const onLeaveToday = todayAttendances.filter((a) => a.status === AttendanceStatus.ON_LEAVE).length;

    // Total Sites & Departments
    const totalSites = allowedSites ? allowedSites.length : await this.siteRepo.count();
    const totalDepartments = await this.deptRepo.count();

    // Pending Leave Requests
    const leaveQb = this.leaveRepo.createQueryBuilder('l').where('l.status = :pending', { pending: 'PENDING' });
    if (allowedSites) {
      leaveQb.andWhere('l.workSiteId IN (:...allowedSites)', {
        allowedSites: allowedSites.length ? allowedSites : ['00000000-0000-0000-0000-000000000000'],
      });
    }
    const pendingLeaves = await leaveQb.getCount();

    // Financial Stats (Admin only)
    let totalPayrollExpenditure = '0.00';
    let totalDisbursed = '0.00';
    let outstandingPayable = '0.00';

    if (user.role === Role.ADMIN) {
      const payrollRuns = await this.runRepo.find();
      const totalGross = payrollRuns.reduce((sum, r) => sum + parseFloat(r.totalAmount || '0'), 0);
      totalPayrollExpenditure = totalGross.toFixed(2);

      const payments = await this.paymentRepo.find();
      const disbursed = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      totalDisbursed = disbursed.toFixed(2);

      outstandingPayable = Math.max(0, totalGross - disbursed).toFixed(2);
    }

    // Attendance Trend (past 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const trendAttQb = this.attRepo
      .createQueryBuilder('a')
      .where('a.attendanceDate >= :startDate', { startDate });

    if (allowedSites) {
      trendAttQb.andWhere('a.workSiteId IN (:...allowedSites)', {
        allowedSites: allowedSites.length ? allowedSites : ['00000000-0000-0000-0000-000000000000'],
      });
    }
    const trendRecords = await trendAttQb.getMany();

    const attendanceTrendMap = new Map<string, { present: number; absent: number; halfDay: number; onLeave: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      attendanceTrendMap.set(dateStr, { present: 0, absent: 0, halfDay: 0, onLeave: 0 });
    }

    trendRecords.forEach((r) => {
      const entry = attendanceTrendMap.get(r.attendanceDate);
      if (entry) {
        if (r.status === AttendanceStatus.PRESENT) entry.present++;
        else if (r.status === AttendanceStatus.ABSENT) entry.absent++;
        else if (r.status === AttendanceStatus.HALF_DAY) entry.halfDay++;
        else if (r.status === AttendanceStatus.ON_LEAVE) entry.onLeave++;
      }
    });

    const attendanceTrend = Array.from(attendanceTrendMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Department Distribution
    const depts = await this.deptRepo.find({ relations: ['workers'] });
    const departmentDistribution = depts.map((d) => ({
      name: d.name,
      count: d.workers ? d.workers.length : 0,
    }));

    return {
      totalWorkers,
      activeWorkers,
      inactiveWorkers: totalWorkers - activeWorkers,
      presentToday,
      absentToday,
      halfDayToday,
      onLeaveToday,
      attendancePercentage: totalWorkers > 0 ? Math.round(((presentToday + 0.5 * halfDayToday) / totalWorkers) * 100) : 0,
      totalSites,
      totalDepartments,
      pendingLeaves,
      totalPayrollExpenditure,
      totalDisbursed,
      outstandingPayable,
      attendanceTrend,
      departmentDistribution,
    };
  }

  async getAttendanceReport(query: { startDate?: string; endDate?: string; workSiteId?: string }, user: any) {
    const allowedSites = await this.getAllowedSiteIds(user);
    const start = query.startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const end = query.endDate || new Date().toISOString().split('T')[0];

    const qb = this.attRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.worker', 'worker')
      .leftJoinAndSelect('worker.department', 'department')
      .leftJoinAndSelect('a.workSite', 'workSite')
      .leftJoinAndSelect('a.shift', 'shift')
      .where('a.attendanceDate BETWEEN :start AND :end', { start, end });

    if (allowedSites) {
      qb.andWhere('a.workSiteId IN (:...allowedSites)', {
        allowedSites: allowedSites.length ? allowedSites : ['00000000-0000-0000-0000-000000000000'],
      });
    } else if (query.workSiteId) {
      qb.andWhere('a.workSiteId = :siteId', { siteId: query.workSiteId });
    }

    qb.orderBy('a.attendanceDate', 'DESC').addOrderBy('worker.workerCode', 'ASC');
    return qb.getMany();
  }

  async getAttendanceReportCsv(query: { startDate?: string; endDate?: string; workSiteId?: string }, user: any) {
    const data = await this.getAttendanceReport(query, user);
    const headers = 'Attendance Date,Worker Code,Worker Name,Department,Work Site,Shift,Status,Check In,Check Out,Overtime Minutes,Remarks\n';
    const rows = data.map((r) => {
      return `"${r.attendanceDate}","${r.worker?.workerCode}","${r.worker?.fullName}","${r.worker?.department?.name || ''}","${r.workSite?.name || ''}","${r.shift?.name || ''}","${r.status}","${r.checkIn || ''}","${r.checkOut || ''}","${r.overtimeMinutes}","${(r.remarks || '').replace(/"/g, '""')}"`;
    });
    return headers + rows.join('\n');
  }

  async getWorkerDirectoryCsv(user: any) {
    const allowedSites = await this.getAllowedSiteIds(user);
    const qb = this.workerRepo
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.department', 'dept')
      .leftJoinAndSelect('w.skillCategory', 'skill')
      .leftJoinAndSelect('w.assignments', 'wa', 'wa.status = :status', { status: 'ACTIVE' })
      .leftJoinAndSelect('wa.workSite', 'site');

    if (allowedSites) {
      qb.andWhere('wa.workSiteId IN (:...allowedSites)', {
        allowedSites: allowedSites.length ? allowedSites : ['00000000-0000-0000-0000-000000000000'],
      });
    }

    const workers = await qb.orderBy('w.workerCode', 'ASC').getMany();

    const headers = 'Worker Code,Full Name,Phone,Email,Joining Date,Department,Skill Category,Employment Type,Status,Current Work Site\n';
    const rows = workers.map((w) => {
      const activeSite = w.assignments && w.assignments[0] ? w.assignments[0].workSite?.name : '';
      return `"${w.workerCode}","${w.fullName}","${w.phone}","${w.email || ''}","${w.joiningDate}","${w.department?.name || ''}","${w.skillCategory?.name || ''}","${w.employmentType}","${w.status}","${activeSite || ''}"`;
    });
    return headers + rows.join('\n');
  }
}
