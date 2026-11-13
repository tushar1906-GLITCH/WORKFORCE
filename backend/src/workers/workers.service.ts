import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Worker,
  WorkerAssignment,
  WageRateHistory,
  Attendance,
  LeaveRequest,
  PayrollItem,
  SupervisorSite,
} from '../database/entities';
import { Role, WorkerStatus, AssignmentStatus, WageType } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

export interface CreateWorkerDto {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  dateOfBirth?: string;
  gender?: string;
  joiningDate: string;
  departmentId?: string;
  skillCategoryId?: string;
  employmentType?: any;
  emergencyContact?: string;
  // Optional initial assignment
  workSiteId?: string;
  shiftId?: string;
  // Optional initial wage
  wageType?: WageType;
  wageRate?: string;
}

export interface WorkerQueryDto {
  search?: string;
  departmentId?: string;
  skillCategoryId?: string;
  employmentType?: string;
  workSiteId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    @InjectRepository(WorkerAssignment)
    private waRepo: Repository<WorkerAssignment>,
    @InjectRepository(WageRateHistory)
    private wageRepo: Repository<WageRateHistory>,
    @InjectRepository(Attendance)
    private attRepo: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(PayrollItem)
    private payrollItemRepo: Repository<PayrollItem>,
    @InjectRepository(SupervisorSite)
    private ssRepo: Repository<SupervisorSite>,
    private dataSource: DataSource,
    private activityLogsService: ActivityLogsService,
  ) {}

  private async generateWorkerCode(): Promise<string> {
    const lastWorker = await this.workerRepo
      .createQueryBuilder('worker')
      .orderBy('worker.createdAt', 'DESC')
      .getOne();

    if (!lastWorker) return 'WF-1001';
    const match = lastWorker.workerCode.match(/WF-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `WF-${nextNum}`;
    }
    return `WF-${Date.now().toString().slice(-4)}`;
  }

  async findAll(query: WorkerQueryDto, user: any) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.workerRepo
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.department', 'department')
      .leftJoinAndSelect('worker.skillCategory', 'skillCategory')
      .leftJoinAndSelect(
        'worker.assignments',
        'assignment',
        'assignment.status = :activeStatus',
        { activeStatus: AssignmentStatus.ACTIVE },
      )
      .leftJoinAndSelect('assignment.workSite', 'workSite')
      .leftJoinAndSelect('assignment.shift', 'shift');

    // Scope for supervisor: only workers who have active or prior assignment at supervisor's sites
    if (user.role === Role.SUPERVISOR) {
      const supSites = await this.ssRepo.find({ where: { userId: user.id } });
      const allowedSiteIds = supSites.map((s) => s.workSiteId);
      if (allowedSiteIds.length === 0) {
        return { items: [], total: 0, page, limit, totalPages: 0 };
      }
      qb.andWhere('assignment.workSiteId IN (:...allowedSiteIds)', { allowedSiteIds });
    } else if (query.workSiteId) {
      qb.andWhere('assignment.workSiteId = :siteId', { siteId: query.workSiteId });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(worker.fullName) LIKE LOWER(:search) OR LOWER(worker.workerCode) LIKE LOWER(:search) OR worker.phone LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.departmentId) {
      qb.andWhere('worker.departmentId = :deptId', { deptId: query.departmentId });
    }
    if (query.skillCategoryId) {
      qb.andWhere('worker.skillCategoryId = :skillId', { skillId: query.skillCategoryId });
    }
    if (query.employmentType) {
      qb.andWhere('worker.employmentType = :empType', { empType: query.employmentType });
    }
    if (query.status) {
      qb.andWhere('worker.status = :status', { status: query.status });
    }

    qb.orderBy('worker.workerCode', 'ASC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Attach latest wage rate for convenience
    for (const w of items) {
      const latestWage = await this.wageRepo.findOne({
        where: { workerId: w.id },
        order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
      });
      (w as any).currentWage = latestWage || null;
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: any) {
    const worker = await this.workerRepo.findOne({
      where: { id },
      relations: [
        'department',
        'skillCategory',
        'assignments',
        'assignments.workSite',
        'assignments.shift',
      ],
    });

    if (!worker) throw new NotFoundException('Worker not found');

    // Verify supervisor scope
    if (user.role === Role.SUPERVISOR) {
      const supSites = await this.ssRepo.find({ where: { userId: user.id } });
      const allowedSiteIds = supSites.map((s) => s.workSiteId);
      const isAssigned = worker.assignments.some((a) =>
        allowedSiteIds.includes(a.workSiteId),
      );
      if (!isAssigned) {
        throw new ForbiddenException('Access denied: Worker is not assigned to your supervised work locations');
      }
    }

    // Latest Wage Rate
    const currentWage = await this.wageRepo.findOne({
      where: { workerId: id },
      order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
    });

    return {
      ...worker,
      currentWage,
    };
  }

  async getAttendanceHistory(id: string, user: any) {
    await this.findOne(id, user); // checks access
    return this.attRepo.find({
      where: { workerId: id },
      order: { attendanceDate: 'DESC' },
      relations: ['workSite', 'shift'],
      take: 60,
    });
  }

  async getAssignmentHistory(id: string, user: any) {
    await this.findOne(id, user); // checks access
    return this.waRepo.find({
      where: { workerId: id },
      order: { startDate: 'DESC' },
      relations: ['workSite', 'shift'],
    });
  }

  async getLeaveHistory(id: string, user: any) {
    await this.findOne(id, user); // checks access
    return this.leaveRepo.find({
      where: { workerId: id },
      order: { startDate: 'DESC' },
      relations: ['workSite'],
    });
  }

  async getPaymentHistory(id: string, user: any) {
    // Only Admin can see payroll/payment history!
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied: Payment history is restricted to Administrators');
    }
    return this.payrollItemRepo.find({
      where: { workerId: id },
      order: { createdAt: 'DESC' },
      relations: ['payrollRun', 'payments'],
    });
  }

  async create(dto: CreateWorkerDto, user: any, ip?: string) {
    // If supervisor is creating, they must assign worker to one of their supervised sites
    if (user.role === Role.SUPERVISOR) {
      if (!dto.workSiteId) {
        throw new BadRequestException('Work site is required when registering a worker');
      }
      const hasAccess = await this.ssRepo.findOne({
        where: { userId: user.id, workSiteId: dto.workSiteId },
      });
      if (!hasAccess) {
        throw new ForbiddenException('You can only register workers for your assigned work locations');
      }
    }

    const workerCode = await this.generateWorkerCode();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const worker = queryRunner.manager.create(Worker, {
        workerCode,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email || null,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth || null,
        gender: dto.gender || null,
        joiningDate: dto.joiningDate,
        departmentId: dto.departmentId || null,
        skillCategoryId: dto.skillCategoryId || null,
        employmentType: dto.employmentType || 'DAILY_WAGE',
        status: WorkerStatus.ACTIVE,
        emergencyContact: dto.emergencyContact || null,
      });
      const savedWorker = await queryRunner.manager.save(worker);

      // Wage rate if provided
      if (dto.wageRate && parseFloat(dto.wageRate) > 0) {
        const wage = queryRunner.manager.create(WageRateHistory, {
          workerId: savedWorker.id,
          wageType: dto.wageType || WageType.DAILY,
          rate: dto.wageRate,
          effectiveFrom: dto.joiningDate,
          changedBy: user.id,
          notes: 'Initial contractual wage upon registration',
        });
        await queryRunner.manager.save(wage);
      }

      // Initial assignment if provided
      if (dto.workSiteId) {
        const assignment = queryRunner.manager.create(WorkerAssignment, {
          workerId: savedWorker.id,
          workSiteId: dto.workSiteId,
          shiftId: dto.shiftId || null,
          startDate: dto.joiningDate,
          supervisorId: user.id,
          status: AssignmentStatus.ACTIVE,
        });
        await queryRunner.manager.save(assignment);
      }

      await queryRunner.commitTransaction();

      await this.activityLogsService.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'WORKER_REGISTERED',
        entityType: 'Worker',
        entityId: savedWorker.id,
        changeDetails: { workerCode: savedWorker.workerCode, name: savedWorker.fullName },
        ipAddress: ip,
      });

      return this.findOne(savedWorker.id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, dto: Partial<CreateWorkerDto> & { status?: WorkerStatus }, user: any, ip?: string) {
    const worker = await this.findOne(id, user); // validates supervisor scope

    if (dto.fullName) worker.fullName = dto.fullName;
    if (dto.phone) worker.phone = dto.phone;
    if (dto.email !== undefined) worker.email = dto.email;
    if (dto.address) worker.address = dto.address;
    if (dto.dateOfBirth !== undefined) worker.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) worker.gender = dto.gender;
    if (dto.departmentId !== undefined) worker.departmentId = dto.departmentId;
    if (dto.skillCategoryId !== undefined) worker.skillCategoryId = dto.skillCategoryId;
    if (dto.employmentType) worker.employmentType = dto.employmentType;
    if (dto.emergencyContact !== undefined) worker.emergencyContact = dto.emergencyContact;
    if (dto.status) worker.status = dto.status;

    await this.workerRepo.save(worker);

    // Wage update if provided (Admin only)
    if (dto.wageRate && user.role === Role.ADMIN) {
      await this.wageRepo.save(
        this.wageRepo.create({
          workerId: id,
          wageType: dto.wageType || WageType.DAILY,
          rate: dto.wageRate,
          effectiveFrom: new Date().toISOString().split('T')[0],
          changedBy: user.id,
          notes: 'Updated worker wage rate',
        }),
      );
    }

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'WORKER_UPDATED',
      entityType: 'Worker',
      entityId: id,
      changeDetails: dto,
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }

  async deactivate(id: string, user: any, ip?: string) {
    const worker = await this.findOne(id, user);
    worker.status = WorkerStatus.INACTIVE;
    await this.workerRepo.save(worker);

    // Mark current active assignments as completed
    await this.waRepo.update(
      { workerId: id, status: AssignmentStatus.ACTIVE },
      { status: AssignmentStatus.COMPLETED, endDate: new Date().toISOString().split('T')[0] },
    );

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'WORKER_DEACTIVATED',
      entityType: 'Worker',
      entityId: id,
      ipAddress: ip,
    });

    return { message: `Worker ${worker.workerCode} has been deactivated` };
  }
}
