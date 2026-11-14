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
  WorkSite,
  WorkerDocument,
} from '../database/entities';
import { Role, WorkerStatus, AssignmentStatus, WageType, EmploymentType } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

export { CreateWorkerDto, UpdateWorkerDto };

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
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    @InjectRepository(WorkerDocument)
    private docRepo: Repository<WorkerDocument>,
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
    // Validate Indian mobile phone format
    if (!dto.phone || !/^[6-9]\d{9}$/.test(dto.phone)) {
      throw new BadRequestException(
        'Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
      );
    }

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

    // Verify initial work site is active if provided
    if (dto.workSiteId) {
      const site = await this.siteRepo.findOne({ where: { id: dto.workSiteId } });
      if (!site) {
        throw new NotFoundException('Work location not found');
      }
      if (site.status === 'INACTIVE') {
        throw new BadRequestException(`Cannot assign worker to inactive work location "${site.name}"`);
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
        employmentType: dto.employmentType || EmploymentType.DAILY_WAGE,
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

  async update(id: string, dto: UpdateWorkerDto, user: any, ip?: string) {
    const worker = await this.findOne(id, user); // validates supervisor scope

    if (dto.phone) {
      if (!/^[6-9]\d{9}$/.test(dto.phone)) {
        throw new BadRequestException(
          'Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
        );
      }
      worker.phone = dto.phone;
    }

    if (dto.fullName) worker.fullName = dto.fullName;
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

    if (worker.status === WorkerStatus.INACTIVE) {
      throw new BadRequestException(`Worker ${worker.workerCode} is already inactive`);
    }

    worker.status = WorkerStatus.INACTIVE;
    await this.workerRepo.save(worker);

    // Mark current active assignments as completed (preserve historical records)
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

    return {
      message: `Worker ${worker.workerCode} has been deactivated`,
      worker: await this.findOne(id, user),
    };
  }

  async reactivate(id: string, user: any, ip?: string) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Administrators can reactivate inactive workers');
    }

    const worker = await this.workerRepo.findOne({
      where: { id },
      relations: ['department', 'skillCategory'],
    });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    if (worker.status === WorkerStatus.ACTIVE) {
      throw new BadRequestException(`Worker ${worker.workerCode} is already active`);
    }

    // Reactivate existing record (never duplicate)
    worker.status = WorkerStatus.ACTIVE;
    await this.workerRepo.save(worker);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'WORKER_REACTIVATED',
      entityType: 'Worker',
      entityId: id,
      changeDetails: { previousStatus: WorkerStatus.INACTIVE, newStatus: WorkerStatus.ACTIVE },
      ipAddress: ip,
    });

    return {
      message: `Worker ${worker.workerCode} has been reactivated successfully`,
      worker: await this.findOne(id, user),
    };
  }

  // --- Worker Document Management ---

  async getWorkerDocuments(workerId: string, user: any) {
    await this.findOne(workerId, user); // verifies worker exists and user has site scope
    return this.docRepo.find({
      where: { workerId },
      relations: ['verifier'],
      order: { createdAt: 'DESC' },
    });
  }

  async addWorkerDocument(workerId: string, dto: any, user: any, ip?: string) {
    const worker = await this.findOne(workerId, user);

    if (!dto.title || !dto.documentType) {
      throw new BadRequestException('Document title and type are required');
    }

    const doc = this.docRepo.create({
      workerId,
      documentType: dto.documentType,
      title: dto.title,
      documentNumber: dto.documentNumber || null,
      fileName: dto.fileName || `${dto.title.replace(/\s+/g, '_')}.pdf`,
      filePath: dto.filePath || `/uploads/documents/${worker.workerCode}_${Date.now()}.pdf`,
      fileSize: dto.fileSize || 102400,
      mimeType: dto.mimeType || 'application/pdf',
      issueDate: dto.issueDate || null,
      expiryDate: dto.expiryDate || null,
      verificationStatus: 'PENDING',
      notes: dto.notes || null,
    });

    const saved = await this.docRepo.save(doc);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'WORKER_DOCUMENT_UPLOADED',
      entityType: 'WorkerDocument',
      entityId: saved.id,
      changeDetails: { workerCode: worker.workerCode, title: doc.title, type: doc.documentType },
      ipAddress: ip,
    });

    return saved;
  }

  async verifyWorkerDocument(
    workerId: string,
    docId: string,
    dto: { status: 'VERIFIED' | 'REJECTED'; notes?: string },
    user: any,
    ip?: string,
  ) {
    await this.findOne(workerId, user);
    const doc = await this.docRepo.findOne({ where: { id: docId, workerId } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    doc.verificationStatus = dto.status;
    doc.verifiedBy = user.id;
    doc.verifiedAt = new Date();
    if (dto.notes) doc.notes = dto.notes;

    const saved = await this.docRepo.save(doc);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: `WORKER_DOCUMENT_${dto.status}`,
      entityType: 'WorkerDocument',
      entityId: saved.id,
      changeDetails: { documentId: docId, newStatus: dto.status, verifier: user.email },
      ipAddress: ip,
    });

    return saved;
  }

  async deleteWorkerDocument(workerId: string, docId: string, user: any, ip?: string) {
    await this.findOne(workerId, user);
    const doc = await this.docRepo.findOne({ where: { id: docId, workerId } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.docRepo.remove(doc);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'WORKER_DOCUMENT_DELETED',
      entityType: 'WorkerDocument',
      entityId: docId,
      changeDetails: { title: doc.title, documentType: doc.documentType },
      ipAddress: ip,
    });

    return { success: true, message: 'Document deleted successfully' };
  }

  // --- Bulk Worker Import ---

  async bulkImport(
    workersList: Array<{
      fullName: string;
      phone: string;
      address?: string;
      gender?: string;
      joiningDate?: string;
      employmentType?: EmploymentType;
      wageType?: WageType;
      wageRate?: number;
      workSiteId?: string;
    }>,
    user: any,
    ip?: string,
  ) {
    if (!Array.isArray(workersList) || workersList.length === 0) {
      throw new BadRequestException('Import payload must be a non-empty array of workers');
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    const results = {
      total: workersList.length,
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; name?: string; phone?: string; error: string }>,
      createdWorkerCodes: [] as string[],
    };

    for (let i = 0; i < workersList.length; i++) {
      const row = workersList[i];
      const rowNum = i + 1;

      try {
        if (!row.fullName || !row.fullName.trim()) {
          throw new BadRequestException('Full name is required');
        }

        const phone = (row.phone || '').trim();
        if (!phoneRegex.test(phone)) {
          throw new BadRequestException(
            `Invalid phone "${phone}". Must be exactly 10 digits starting with 6-9`,
          );
        }

        const existingPhone = await this.workerRepo.findOne({ where: { phone } });
        if (existingPhone) {
          throw new ConflictException(`Phone ${phone} already exists in database`);
        }

        const workerCode = await this.generateWorkerCode();

        const worker = this.workerRepo.create({
          workerCode,
          fullName: row.fullName.trim(),
          phone,
          address: row.address?.trim() || 'Work Site Accommodation',
          gender: row.gender || 'MALE',
          joiningDate: row.joiningDate || new Date().toISOString().split('T')[0],
          employmentType: row.employmentType || EmploymentType.DAILY_WAGE,
          status: WorkerStatus.ACTIVE,
        });

        const savedWorker = await this.workerRepo.save(worker);

        // Record initial wage
        const wageRate = row.wageRate || 650;
        const wage = this.wageRepo.create({
          workerId: savedWorker.id,
          wageType: row.wageType || WageType.DAILY,
          rate: wageRate.toFixed(2),
          effectiveFrom: savedWorker.joiningDate,
          changedBy: user.id,
          notes: 'Initial wage rate upon bulk import',
        });
        await this.wageRepo.save(wage);

        // Assign to work site if provided
        if (row.workSiteId) {
          const assign = this.waRepo.create({
            workerId: savedWorker.id,
            workSiteId: row.workSiteId,
            startDate: savedWorker.joiningDate,
            status: AssignmentStatus.ACTIVE,
            roleTitle: 'General Labour',
          });
          await this.waRepo.save(assign);
        }

        results.imported++;
        results.createdWorkerCodes.push(savedWorker.workerCode);
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          name: row.fullName,
          phone: row.phone,
          error: err.message || 'Unknown import error',
        });
      }
    }

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'WORKERS_BULK_IMPORTED',
      entityType: 'Worker',
      entityId: user.id,
      changeDetails: {
        total: results.total,
        imported: results.imported,
        failed: results.failed,
      },
      ipAddress: ip,
    });

    return results;
  }
}
