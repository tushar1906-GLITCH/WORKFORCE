import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import {
  PayrollRun,
  PayrollItem,
  Worker,
  Attendance,
  WageRateHistory,
  WorkerAdvance,
  LeaveRequest,
  OrgSetting,
} from '../database/entities';
import {
  Role,
  PayrollStatus,
  PaymentStatus,
  WageType,
  AttendanceStatus,
  LeaveStatus,
  LeaveType,
} from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface GeneratePayrollDto {
  periodStart: string;
  periodEnd: string;
  notes?: string;
  workSiteId?: string;
}

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRun)
    private runRepo: Repository<PayrollRun>,
    @InjectRepository(PayrollItem)
    private itemRepo: Repository<PayrollItem>,
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    @InjectRepository(Attendance)
    private attRepo: Repository<Attendance>,
    @InjectRepository(WageRateHistory)
    private wageRepo: Repository<WageRateHistory>,
    @InjectRepository(WorkerAdvance)
    private advRepo: Repository<WorkerAdvance>,
    @InjectRepository(LeaveRequest)
    private leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(OrgSetting)
    private orgRepo: Repository<OrgSetting>,
    private dataSource: DataSource,
    private activityLogsService: ActivityLogsService,
    private notifService: NotificationsService,
  ) {}

  async findAll() {
    return this.runRepo.find({
      order: { periodStart: 'DESC', createdAt: 'DESC' },
      relations: ['createdByUser', 'approvedByUser'],
    });
  }

  async findOne(id: string) {
    const run = await this.runRepo.findOne({
      where: { id },
      relations: [
        'createdByUser',
        'approvedByUser',
        'items',
        'items.worker',
        'items.worker.department',
        'items.payments',
      ],
    });
    if (!run) throw new NotFoundException('Payroll run record not found');
    return run;
  }

  async generate(dto: GeneratePayrollDto, admin: any, ip?: string) {
    if (dto.periodStart > dto.periodEnd) {
      throw new BadRequestException('Period start date cannot be after end date');
    }

    // Check duplicate or overlapping payroll run
    const existing = await this.runRepo.findOne({
      where: {
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        status: PayrollStatus.APPROVED,
      },
    });
    if (existing) {
      throw new ConflictException(
        `An approved payroll run already exists for period ${dto.periodStart} to ${dto.periodEnd}`,
      );
    }

    // Load active workers
    const workers = await this.workerRepo.find({
      where: { status: 'ACTIVE' as any },
      relations: ['department', 'skillCategory'],
      order: { workerCode: 'ASC' },
    });

    if (workers.length === 0) {
      throw new BadRequestException('No active workers found to generate payroll for');
    }

    // Config: overtime multiplier
    const otSetting = await this.orgRepo.findOne({ where: { key: 'overtime_multiplier' } });
    const otMultiplier = otSetting ? parseFloat(otSetting.value) || 1.5 : 1.5;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payrollRun = queryRunner.manager.create(PayrollRun, {
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        status: PayrollStatus.DRAFT,
        notes: dto.notes || `Payroll calculation for ${dto.periodStart} to ${dto.periodEnd}`,
        createdBy: admin.id,
      });
      const savedRun = await queryRunner.manager.save(payrollRun);

      let totalRunAmount = 0;
      const createdItems: PayrollItem[] = [];

      for (const w of workers) {
        // Effective wage rate for this period
        const latestWage = await this.wageRepo.findOne({
          where: { workerId: w.id, effectiveFrom: Between('1900-01-01', dto.periodEnd) },
          order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
        });

        if (!latestWage) {
          continue; // Skip workers without configured wage rates
        }

        const wageType = latestWage.wageType;
        const wageRate = parseFloat(latestWage.rate);

        // Fetch attendance records within the period
        const attendances = await this.attRepo.find({
          where: {
            workerId: w.id,
            attendanceDate: Between(dto.periodStart, dto.periodEnd),
          },
        });

        const presentCount = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
        const halfDayCount = attendances.filter((a) => a.status === AttendanceStatus.HALF_DAY).length;
        const weeklyOffCount = attendances.filter((a) => a.status === AttendanceStatus.WEEKLY_OFF).length;
        const holidayCount = attendances.filter((a) => a.status === AttendanceStatus.HOLIDAY).length;

        // Fetch approved leaves in this period
        const approvedLeaves = await this.leaveRepo.find({
          where: {
            workerId: w.id,
            startDate: Between(dto.periodStart, dto.periodEnd),
            status: LeaveStatus.APPROVED,
          },
        });
        const paidLeaveCount = approvedLeaves.filter((l) => l.leaveType !== LeaveType.UNPAID).length;
        const unpaidLeaveCount = approvedLeaves.filter((l) => l.leaveType === LeaveType.UNPAID).length;

        // Overtime minutes sum
        const totalOtMinutes = attendances.reduce((acc, a) => acc + (a.overtimeMinutes || 0), 0);
        const otHours = totalOtMinutes / 60;

        let grossEarnings = 0;
        let regularHours = 0;

        if (wageType === WageType.DAILY) {
          // Regular earnings = (Present + 0.5 * half + paid_leave) * daily wage rate
          const payableDays = presentCount + 0.5 * halfDayCount + paidLeaveCount;
          const regularEarnings = payableDays * wageRate;
          const derivedHourly = wageRate / 8;
          const otEarnings = otHours * derivedHourly * otMultiplier;
          grossEarnings = regularEarnings + otEarnings;
          regularHours = payableDays * 8;
        } else if (wageType === WageType.HOURLY) {
          // Hourly: regular hours = (Present * 8 + half_day * 4) * hourly rate
          regularHours = presentCount * 8 + halfDayCount * 4 + paidLeaveCount * 8;
          const regularEarnings = regularHours * wageRate;
          const otEarnings = otHours * wageRate * otMultiplier;
          grossEarnings = regularEarnings + otEarnings;
        } else if (wageType === WageType.MONTHLY) {
          // Monthly: standard monthly 26 days policy
          // Payable days = present + 0.5 * half + paid_leave + weekly_off + holiday
          const payableDays = presentCount + 0.5 * halfDayCount + paidLeaveCount + weeklyOffCount + holidayCount;
          const perDayRate = wageRate / 26;
          const regularEarnings = Math.min(wageRate, payableDays * perDayRate);
          const derivedHourly = perDayRate / 8;
          const otEarnings = otHours * derivedHourly * otMultiplier;
          grossEarnings = regularEarnings + otEarnings;
          regularHours = payableDays * 8;
        }

        // Active advances to recover
        const activeAdvance = await this.advRepo.findOne({
          where: { workerId: w.id, status: 'ACTIVE' },
          order: { advanceDate: 'ASC' },
        });

        let advanceRecovery = 0;
        if (activeAdvance) {
          const rem = parseFloat(activeAdvance.remainingBalance);
          if (rem > 0) {
            // Cap deduction at 25% of gross or full remaining advance
            advanceRecovery = Math.min(rem, grossEarnings * 0.25);
          }
        }

        const deductions = 0; // Configurable org deductions
        const netPay = Math.max(0, grossEarnings - deductions - advanceRecovery);

        const item = queryRunner.manager.create(PayrollItem, {
          payrollRunId: savedRun.id,
          workerId: w.id,
          wageTypeSnapshot: wageType,
          wageRateSnapshot: wageRate.toFixed(2),
          presentDays: presentCount.toFixed(2),
          halfDays: halfDayCount,
          paidLeaveDays: paidLeaveCount,
          unpaidLeaveDays: unpaidLeaveCount,
          regularHours: regularHours.toFixed(2),
          overtimeHours: otHours.toFixed(2),
          overtimeRateMultiplier: otMultiplier.toFixed(2),
          grossEarnings: grossEarnings.toFixed(2),
          deductions: deductions.toFixed(2),
          advanceRecovery: advanceRecovery.toFixed(2),
          netPay: netPay.toFixed(2),
          paymentStatus: PaymentStatus.UNPAID,
        });

        const savedItem = await queryRunner.manager.save(item);
        createdItems.push(savedItem);
        totalRunAmount += netPay;
      }

      savedRun.totalWorkers = createdItems.length;
      savedRun.totalAmount = totalRunAmount.toFixed(2);
      await queryRunner.manager.save(savedRun);

      await queryRunner.commitTransaction();

      await this.activityLogsService.log({
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        action: 'PAYROLL_GENERATED',
        entityType: 'PayrollRun',
        entityId: savedRun.id,
        changeDetails: {
          period: `${dto.periodStart} to ${dto.periodEnd}`,
          totalWorkers: savedRun.totalWorkers,
          totalAmount: savedRun.totalAmount,
        },
        ipAddress: ip,
      });

      return this.findOne(savedRun.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async approve(id: string, admin: any, ip?: string) {
    const run = await this.findOne(id);

    if (run.status === PayrollStatus.APPROVED) {
      throw new BadRequestException('This payroll run is already approved and locked');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      run.status = PayrollStatus.APPROVED;
      run.approvedBy = admin.id;
      run.approvedAt = new Date();
      await queryRunner.manager.save(run);

      // Deduct advance recoveries from worker_advances
      for (const item of run.items) {
        const advRecovery = parseFloat(item.advanceRecovery);
        if (advRecovery > 0) {
          const adv = await queryRunner.manager.findOne(WorkerAdvance, {
            where: { workerId: item.workerId, status: 'ACTIVE' },
          });
          if (adv) {
            const currentRem = parseFloat(adv.remainingBalance);
            const newRem = Math.max(0, currentRem - advRecovery);
            adv.remainingBalance = newRem.toFixed(2);
            if (newRem === 0) adv.status = 'REPAID';
            await queryRunner.manager.save(adv);
          }
        }
      }

      await queryRunner.commitTransaction();

      await this.activityLogsService.log({
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        action: 'PAYROLL_APPROVED',
        entityType: 'PayrollRun',
        entityId: run.id,
        changeDetails: { approvedAmount: run.totalAmount, totalWorkers: run.totalWorkers },
        ipAddress: ip,
      });

      await this.notifService.create({
        roleTarget: Role.ADMIN,
        title: 'Payroll Run Approved',
        message: `Payroll run for ${run.periodStart} to ${run.periodEnd} approved for ₹${run.totalAmount}.`,
        type: 'PAYROLL',
      });

      return this.findOne(run.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
