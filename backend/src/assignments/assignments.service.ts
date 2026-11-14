import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkerAssignment, Worker, WorkSite, SupervisorSite } from '../database/entities';
import { Role, AssignmentStatus, WorkerStatus } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateAssignmentDto, TransferWorkerDto } from './dto/assignment.dto';

export { CreateAssignmentDto, TransferWorkerDto };

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(WorkerAssignment)
    private waRepo: Repository<WorkerAssignment>,
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    @InjectRepository(SupervisorSite)
    private ssRepo: Repository<SupervisorSite>,
    private dataSource: DataSource,
    private activityLogsService: ActivityLogsService,
  ) {}

  private async checkSupervisorAccess(userId: string, workSiteId: string) {
    const ss = await this.ssRepo.findOne({
      where: { userId, workSiteId },
    });
    if (!ss) {
      throw new ForbiddenException(
        `Access denied: You do not have authorization for work site ID ${workSiteId}`,
      );
    }
  }

  async findAll(query: { workSiteId?: string; workerId?: string; status?: string }, user: any) {
    const qb = this.waRepo
      .createQueryBuilder('wa')
      .leftJoinAndSelect('wa.worker', 'worker')
      .leftJoinAndSelect('wa.workSite', 'workSite')
      .leftJoinAndSelect('wa.shift', 'shift')
      .leftJoinAndSelect('wa.supervisor', 'supervisor');

    if (user.role === Role.SUPERVISOR) {
      const supSites = await this.ssRepo.find({ where: { userId: user.id } });
      const allowedSiteIds = supSites.map((s) => s.workSiteId);
      if (allowedSiteIds.length === 0) return [];
      qb.andWhere('wa.workSiteId IN (:...allowedSiteIds)', { allowedSiteIds });
    } else if (query.workSiteId) {
      qb.andWhere('wa.workSiteId = :siteId', { siteId: query.workSiteId });
    }

    if (query.workerId) {
      qb.andWhere('wa.workerId = :workerId', { workerId: query.workerId });
    }
    if (query.status) {
      qb.andWhere('wa.status = :status', { status: query.status });
    }

    qb.orderBy('wa.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string, user: any) {
    const wa = await this.waRepo.findOne({
      where: { id },
      relations: ['worker', 'workSite', 'shift', 'supervisor'],
    });
    if (!wa) throw new NotFoundException('Worker assignment record not found');

    if (user.role === Role.SUPERVISOR) {
      await this.checkSupervisorAccess(user.id, wa.workSiteId);
    }
    return wa;
  }

  async create(dto: CreateAssignmentDto, user: any, ip?: string) {
    if (user.role === Role.SUPERVISOR) {
      await this.checkSupervisorAccess(user.id, dto.workSiteId);
    }

    // Check target work location exists and is ACTIVE
    const site = await this.siteRepo.findOne({ where: { id: dto.workSiteId } });
    if (!site) throw new NotFoundException('Work location not found');
    if (site.status === 'INACTIVE') {
      throw new BadRequestException(`Cannot assign worker: Work location "${site.name}" is inactive`);
    }

    // Check worker exists and is ACTIVE
    const worker = await this.workerRepo.findOne({ where: { id: dto.workerId } });
    if (!worker) throw new NotFoundException('Worker not found');
    if (worker.status === WorkerStatus.INACTIVE) {
      throw new BadRequestException(
        `Cannot assign inactive worker ${worker.workerCode} (${worker.fullName}). Please reactivate the worker first.`,
      );
    }

    // Rule: Prevent overlapping active assignments for the same worker
    const activeAssignment = await this.waRepo.findOne({
      where: { workerId: dto.workerId, status: AssignmentStatus.ACTIVE },
    });
    if (activeAssignment) {
      throw new ConflictException(
        `Worker ${worker.workerCode} already has an ACTIVE assignment. Please transfer the worker or end the active assignment first.`,
      );
    }

    const assignment = this.waRepo.create({
      workerId: dto.workerId,
      workSiteId: dto.workSiteId,
      shiftId: dto.shiftId || null,
      startDate: dto.startDate,
      endDate: dto.endDate || null,
      roleTitle: dto.roleTitle || null,
      supervisorId: dto.supervisorId || user.id,
      status: AssignmentStatus.ACTIVE,
    });
    const saved = await this.waRepo.save(assignment);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'WORKER_ASSIGNED',
      entityType: 'WorkerAssignment',
      entityId: saved.id,
      changeDetails: { workerCode: worker.workerCode, workSiteId: dto.workSiteId },
      ipAddress: ip,
    });

    return this.findOne(saved.id, user);
  }

  async transfer(assignmentId: string, dto: TransferWorkerDto, user: any, ip?: string) {
    const current = await this.waRepo.findOne({
      where: { id: assignmentId },
      relations: ['worker', 'workSite'],
    });
    if (!current) throw new NotFoundException('Assignment not found');

    if (current.worker.status === WorkerStatus.INACTIVE) {
      throw new BadRequestException('Cannot transfer an inactive worker. Please reactivate the worker first.');
    }

    // Check target work location exists and is ACTIVE
    const targetSite = await this.siteRepo.findOne({ where: { id: dto.targetWorkSiteId } });
    if (!targetSite) throw new NotFoundException('Target work location not found');
    if (targetSite.status === 'INACTIVE') {
      throw new BadRequestException(`Cannot transfer worker: Target work location "${targetSite.name}" is inactive`);
    }

    // Both current site and target site checks if supervisor
    if (user.role === Role.SUPERVISOR) {
      await this.checkSupervisorAccess(user.id, current.workSiteId);
      await this.checkSupervisorAccess(user.id, dto.targetWorkSiteId);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Mark current assignment as TRANSFERRED
      current.status = AssignmentStatus.TRANSFERRED;
      current.endDate = dto.effectiveDate;
      await queryRunner.manager.save(current);

      // 2. Create new active assignment
      const newAssignment = queryRunner.manager.create(WorkerAssignment, {
        workerId: current.workerId,
        workSiteId: dto.targetWorkSiteId,
        shiftId: dto.targetShiftId || null,
        startDate: dto.effectiveDate,
        roleTitle: dto.roleTitle || current.roleTitle,
        supervisorId: user.id,
        status: AssignmentStatus.ACTIVE,
      });
      const savedNew = await queryRunner.manager.save(newAssignment);

      await queryRunner.commitTransaction();

      await this.activityLogsService.log({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'WORKER_TRANSFERRED',
        entityType: 'WorkerAssignment',
        entityId: savedNew.id,
        changeDetails: {
          workerCode: current.worker.workerCode,
          fromSiteId: current.workSiteId,
          toSiteId: dto.targetWorkSiteId,
          effectiveDate: dto.effectiveDate,
        },
        ipAddress: ip,
      });

      return this.findOne(savedNew.id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, dto: Partial<CreateAssignmentDto> & { status?: AssignmentStatus }, user: any, ip?: string) {
    const wa = await this.findOne(id, user);

    if (dto.shiftId !== undefined) wa.shiftId = dto.shiftId;
    if (dto.endDate !== undefined) wa.endDate = dto.endDate;
    if (dto.roleTitle !== undefined) wa.roleTitle = dto.roleTitle;
    if (dto.status) wa.status = dto.status;

    await this.waRepo.save(wa);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'ASSIGNMENT_UPDATED',
      entityType: 'WorkerAssignment',
      entityId: id,
      changeDetails: dto,
      ipAddress: ip,
    });

    return this.findOne(id, user);
  }
}
