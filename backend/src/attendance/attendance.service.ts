import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Between } from 'typeorm';
import {
  Attendance,
  WorkerAssignment,
  Worker,
  LeaveRequest,
  Holiday,
  SupervisorSite,
  WorkSite,
} from '../database/entities';
import { Role, AttendanceStatus, LeaveStatus, AssignmentStatus } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface MarkAttendanceItemDto {
  workerId: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  overtimeMinutes?: number;
  remarks?: string;
}

export interface BulkAttendanceDto {
  workSiteId: string;
  shiftId: string;
  date: string;
  records: MarkAttendanceItemDto[];
  correctionReason?: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attRepo: Repository<Attendance>,
    @InjectRepository(WorkerAssignment)
    private waRepo: Repository<WorkerAssignment>,
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    @InjectRepository(LeaveRequest)
    private leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(Holiday)
    private holRepo: Repository<Holiday>,
    @InjectRepository(SupervisorSite)
    private ssRepo: Repository<SupervisorSite>,
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    private dataSource: DataSource,
    private activityLogsService: ActivityLogsService,
    private notifService: NotificationsService,
  ) {}

  private async checkSupervisorAccess(userId: string, workSiteId: string) {
    const hasAccess = await this.ssRepo.findOne({
      where: { userId, workSiteId },
    });
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied: You are not authorized for work location ID ${workSiteId}`,
      );
    }
  }

  async getEligibleWorkers(workSiteId: string, date: string, shiftId: string, user: any) {
    if (user.role === Role.SUPERVISOR) {
      await this.checkSupervisorAccess(user.id, workSiteId);
    }

    const site = await this.siteRepo.findOne({ where: { id: workSiteId } });
    if (!site) throw new NotFoundException('Work location not found');
    if (site.status === 'INACTIVE') {
      throw new BadRequestException(`Cannot retrieve attendance: Work location "${site.name}" is inactive`);
    }

    // 1. Find all active assignments for this site on this date (and shift if given)
    const waQb = this.waRepo
      .createQueryBuilder('wa')
      .innerJoinAndSelect('wa.worker', 'worker')
      .leftJoinAndSelect('worker.department', 'department')
      .leftJoinAndSelect('worker.skillCategory', 'skillCategory')
      .leftJoinAndSelect('wa.shift', 'shift')
      .where('wa.workSiteId = :workSiteId', { workSiteId })
      .andWhere('wa.status = :activeStatus', { activeStatus: AssignmentStatus.ACTIVE })
      .andWhere('wa.startDate <= :date', { date })
      .andWhere('(wa.endDate IS NULL OR wa.endDate >= :date)', { date })
      .andWhere('worker.status = :workerActive', { workerActive: 'ACTIVE' });

    if (shiftId) {
      waQb.andWhere('(wa.shiftId = :shiftId OR wa.shiftId IS NULL)', { shiftId });
    }

    const assignments = await waQb.orderBy('worker.workerCode', 'ASC').getMany();

    // 2. Fetch any existing attendance for this site, date, shift
    const existingRecords = await this.attRepo.find({
      where: {
        workSiteId,
        attendanceDate: date,
        shiftId,
      },
    });
    const recordMap = new Map<string, Attendance>();
    existingRecords.forEach((r) => recordMap.set(r.workerId, r));

    // 3. Fetch approved leaves overlapping this date
    const approvedLeaves = await this.leaveRepo.find({
      where: {
        startDate: Between('1900-01-01', date),
        endDate: Between(date, '2100-01-01'),
        status: LeaveStatus.APPROVED,
      },
    });
    const leaveMap = new Map<string, LeaveRequest>();
    approvedLeaves.forEach((l) => leaveMap.set(l.workerId, l));

    // 4. Check if date is a Holiday
    const holiday = await this.holRepo.findOne({
      where: [
        { date, workSiteId },
        { date, workSiteId: null as any },
      ],
    });

    const isBatchFinalized = existingRecords.length > 0 && existingRecords.every((r) => !!r.finalizedAt);

    // Build composite list
    const workersList = assignments.map((a) => {
      const existing = recordMap.get(a.workerId);
      const leave = leaveMap.get(a.workerId);

      return {
        assignmentId: a.id,
        workerId: a.worker.id,
        workerCode: a.worker.workerCode,
        fullName: a.worker.fullName,
        phone: a.worker.phone,
        department: a.worker.department ? a.worker.department.name : 'General',
        skillCategory: a.worker.skillCategory ? a.worker.skillCategory.name : 'Unskilled',
        roleTitle: a.roleTitle,
        assignedShift: a.shift,
        // Attendance Status
        currentStatus: existing ? existing.status : 'NOT_MARKED',
        attendanceId: existing ? existing.id : null,
        checkIn: existing ? existing.checkIn : null,
        checkOut: existing ? existing.checkOut : null,
        overtimeMinutes: existing ? existing.overtimeMinutes : 0,
        remarks: existing ? existing.remarks : null,
        isFinalized: existing ? !!existing.finalizedAt : false,
        finalizedAt: existing ? existing.finalizedAt : null,
        // Contextual policy flags
        hasApprovedLeave: !!leave,
        leaveDetails: leave ? { type: leave.leaveType, reason: leave.reason } : null,
        isHoliday: !!holiday,
        holidayDetails: holiday ? { name: holiday.name, isPaid: holiday.isPaid } : null,
      };
    });

    return {
      workSiteId,
      date,
      shiftId,
      isBatchFinalized,
      totalEligible: workersList.length,
      workers: workersList,
    };
  }

  async markBulk(dto: BulkAttendanceDto, user: any, ip?: string) {
    if (user.role === Role.SUPERVISOR) {
      await this.checkSupervisorAccess(user.id, dto.workSiteId);
    }

    const site = await this.siteRepo.findOne({ where: { id: dto.workSiteId } });
    if (!site) throw new NotFoundException('Work location not found');
    if (site.status === 'INACTIVE') {
      throw new BadRequestException(`Cannot record attendance: Work location "${site.name}" is inactive`);
    }

    if (!dto.records || dto.records.length === 0) {
      throw new BadRequestException('No worker attendance records provided in batch');
    }

    // Check if batch is already finalized and user is not admin
    const existingFinalized = await this.attRepo.findOne({
      where: {
        workSiteId: dto.workSiteId,
        attendanceDate: dto.date,
        shiftId: dto.shiftId,
      },
    });

    if (existingFinalized?.finalizedAt && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'This attendance batch has been finalized. Only an Administrator can authorize reopening finalized records.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedRecords: Attendance[] = [];

      for (const item of dto.records) {
        // Prevent marking as NOT_MARKED in database
        if (item.status === ('NOT_MARKED' as any)) {
          continue;
        }

        // Check if record exists for this worker, date, shift
        let record = await queryRunner.manager.findOne(Attendance, {
          where: {
            workerId: item.workerId,
            attendanceDate: dto.date,
            shiftId: dto.shiftId,
          },
        });

        // Cross-site conflict check: ensure worker was not marked at another site for same date & shift
        const crossSite = await queryRunner.manager.findOne(Attendance, {
          where: {
            workerId: item.workerId,
            attendanceDate: dto.date,
            shiftId: dto.shiftId,
          },
        });
        if (crossSite && crossSite.workSiteId !== dto.workSiteId) {
          throw new ConflictException(
            `Worker ID ${item.workerId} is already recorded at another work location for this date and shift.`,
          );
        }

        if (record) {
          // Correction of existing record
          record.status = item.status;
          record.checkIn = item.checkIn || record.checkIn;
          record.checkOut = item.checkOut || record.checkOut;
          record.overtimeMinutes = item.overtimeMinutes !== undefined ? item.overtimeMinutes : record.overtimeMinutes;
          record.remarks = item.remarks || (dto.correctionReason ? `Correction: ${dto.correctionReason}` : record.remarks);
          record.updatedBy = user.id;
        } else {
          // New attendance record
          record = queryRunner.manager.create(Attendance, {
            workerId: item.workerId,
            workSiteId: dto.workSiteId,
            shiftId: dto.shiftId,
            attendanceDate: dto.date,
            status: item.status,
            checkIn: item.checkIn || null,
            checkOut: item.checkOut || null,
            overtimeMinutes: item.overtimeMinutes || 0,
            remarks: item.remarks || null,
            markedBy: user.id,
          });
        }

        const saved = await queryRunner.manager.save(record);
        savedRecords.push(saved);
      }

      await queryRunner.commitTransaction();

      // Log activity
      await this.activityLogsService.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'ATTENDANCE_BATCH_SAVED',
        entityType: 'Attendance',
        entityId: dto.workSiteId,
        changeDetails: {
          workSiteId: dto.workSiteId,
          shiftId: dto.shiftId,
          date: dto.date,
          recordsCount: savedRecords.length,
          correctionReason: dto.correctionReason || null,
        },
        ipAddress: ip,
      });

      return {
        message: `Successfully saved attendance for ${savedRecords.length} worker(s)`,
        recordsCount: savedRecords.length,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async finalizeBatch(workSiteId: string, date: string, shiftId: string, user: any, ip?: string) {
    if (user.role === Role.SUPERVISOR) {
      await this.checkSupervisorAccess(user.id, workSiteId);
    }

    // Load eligible workers to ensure none remain NOT_MARKED
    const eligibleData = await this.getEligibleWorkers(workSiteId, date, shiftId, user);
    const unmarked = eligibleData.workers.filter((w) => w.currentStatus === 'NOT_MARKED');

    if (unmarked.length > 0) {
      throw new BadRequestException(
        `Cannot finalize attendance: ${unmarked.length} eligible worker(s) remain NOT MARKED. All eligible workers must have an explicit status before finalization.`,
      );
    }

    const records = await this.attRepo.find({
      where: {
        workSiteId,
        attendanceDate: date,
        shiftId,
      },
    });

    if (records.length === 0) {
      throw new BadRequestException('No attendance records found to finalize');
    }

    const now = new Date();
    for (const r of records) {
      r.finalizedAt = now;
      r.finalizedBy = user.id;
    }
    await this.attRepo.save(records);

    // Activity Log & Notification
    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'ATTENDANCE_FINALIZED',
      entityType: 'Attendance',
      entityId: workSiteId,
      changeDetails: { date, shiftId, finalizedCount: records.length },
      ipAddress: ip,
    });

    await this.notifService.create({
      roleTarget: Role.ADMIN,
      workSiteId,
      title: 'Attendance Batch Finalized',
      message: `Attendance finalized for site on date ${date} for ${records.length} workers.`,
      type: 'ATTENDANCE',
    });

    return {
      message: `Attendance finalized successfully for ${records.length} worker(s). Records are now locked.`,
      finalizedCount: records.length,
    };
  }

  async reopenBatch(workSiteId: string, date: string, shiftId: string, reason: string, adminUser: any, ip?: string) {
    if (adminUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only an Administrator can reopen finalized attendance records');
    }
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A descriptive audit reason is mandatory to reopen finalized attendance');
    }

    const records = await this.attRepo.find({
      where: {
        workSiteId,
        attendanceDate: date,
        shiftId,
      },
    });

    for (const r of records) {
      r.finalizedAt = null;
      r.finalizedBy = null;
      r.remarks = r.remarks ? `${r.remarks} | Reopened: ${reason}` : `Reopened: ${reason}`;
    }
    await this.attRepo.save(records);

    await this.activityLogsService.log({
      userId: adminUser.id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: 'ATTENDANCE_REOPENED',
      entityType: 'Attendance',
      entityId: workSiteId,
      changeDetails: { date, shiftId, reason, affectedRecords: records.length },
      ipAddress: ip,
    });

    return {
      message: `Attendance unlocked and reopened for edits. Audit reason logged.`,
      reopenedCount: records.length,
    };
  }

  async getSummary(workSiteId: string, date: string, shiftId: string, user: any) {
    const eligibleData = await this.getEligibleWorkers(workSiteId, date, shiftId, user);
    const workers = eligibleData.workers;

    const counts = {
      TOTAL_ELIGIBLE: workers.length,
      PRESENT: workers.filter((w) => w.currentStatus === AttendanceStatus.PRESENT).length,
      ABSENT: workers.filter((w) => w.currentStatus === AttendanceStatus.ABSENT).length,
      HALF_DAY: workers.filter((w) => w.currentStatus === AttendanceStatus.HALF_DAY).length,
      ON_LEAVE: workers.filter((w) => w.currentStatus === AttendanceStatus.ON_LEAVE).length,
      WEEKLY_OFF: workers.filter((w) => w.currentStatus === AttendanceStatus.WEEKLY_OFF).length,
      HOLIDAY: workers.filter((w) => w.currentStatus === AttendanceStatus.HOLIDAY).length,
      NOT_MARKED: workers.filter((w) => w.currentStatus === 'NOT_MARKED').length,
    };

    const markedCount = counts.TOTAL_ELIGIBLE - counts.NOT_MARKED;
    const completionPercentage =
      counts.TOTAL_ELIGIBLE > 0 ? Math.round((markedCount / counts.TOTAL_ELIGIBLE) * 100) : 0;

    return {
      ...counts,
      isBatchFinalized: eligibleData.isBatchFinalized,
      completionPercentage,
    };
  }
}
