import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest, Worker, WorkSite, SupervisorSite } from '../database/entities';
import { Role, LeaveStatus, LeaveType } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateLeaveDto {
  workerId: string;
  workSiteId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  supportingDocumentPath?: string;
}

export interface ReviewLeaveDto {
  status: LeaveStatus.APPROVED | LeaveStatus.REJECTED;
  reviewRemarks?: string;
}

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    @InjectRepository(SupervisorSite)
    private ssRepo: Repository<SupervisorSite>,
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

  async findAll(query: { workSiteId?: string; status?: string; workerId?: string }, user: any) {
    const qb = this.leaveRepo
      .createQueryBuilder('lr')
      .leftJoinAndSelect('lr.worker', 'worker')
      .leftJoinAndSelect('lr.workSite', 'workSite')
      .leftJoinAndSelect('lr.createdByUser', 'creator')
      .leftJoinAndSelect('lr.reviewedByUser', 'reviewer');

    if (user.role === Role.SUPERVISOR) {
      const supSites = await this.ssRepo.find({ where: { userId: user.id } });
      const allowedSiteIds = supSites.map((s) => s.workSiteId);
      if (allowedSiteIds.length === 0) return [];
      qb.andWhere('lr.workSiteId IN (:...allowedSiteIds)', { allowedSiteIds });
    } else if (query.workSiteId) {
      qb.andWhere('lr.workSiteId = :siteId', { siteId: query.workSiteId });
    }

    if (query.status) {
      qb.andWhere('lr.status = :status', { status: query.status });
    }
    if (query.workerId) {
      qb.andWhere('lr.workerId = :workerId', { workerId: query.workerId });
    }

    qb.orderBy('lr.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string, user: any) {
    const lr = await this.leaveRepo.findOne({
      where: { id },
      relations: ['worker', 'workSite', 'createdByUser', 'reviewedByUser'],
    });
    if (!lr) throw new NotFoundException('Leave request not found');

    if (user.role === Role.SUPERVISOR) {
      await this.checkSupervisorAccess(user.id, lr.workSiteId);
    }
    return lr;
  }

  async create(dto: CreateLeaveDto, user: any, ip?: string) {
    if (user.role === Role.SUPERVISOR) {
      await this.checkSupervisorAccess(user.id, dto.workSiteId);
    }

    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Check overlapping approved or pending leave for same worker
    const overlapping = await this.leaveRepo
      .createQueryBuilder('lr')
      .where('lr.workerId = :workerId', { workerId: dto.workerId })
      .andWhere('lr.status IN (:...statuses)', {
        statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
      })
      .andWhere('(lr.startDate <= :endDate AND lr.endDate >= :startDate)', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      })
      .getOne();

    if (overlapping) {
      throw new ConflictException(
        `Worker already has an active leave request (${overlapping.status}) overlapping these dates (${overlapping.startDate} to ${overlapping.endDate})`,
      );
    }

    const leave = this.leaveRepo.create({
      workerId: dto.workerId,
      workSiteId: dto.workSiteId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      supportingDocumentPath: dto.supportingDocumentPath || null,
      status: LeaveStatus.PENDING,
      createdBy: user.id,
    });
    const saved = await this.leaveRepo.save(leave);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LEAVE_REQUESTED',
      entityType: 'LeaveRequest',
      entityId: saved.id,
      changeDetails: dto,
      ipAddress: ip,
    });

    await this.notifService.create({
      roleTarget: Role.SUPERVISOR,
      workSiteId: dto.workSiteId,
      title: 'Pending Leave Request Recorded',
      message: `Leave request (${dto.leaveType}) recorded from ${dto.startDate} to ${dto.endDate}.`,
      type: 'LEAVE',
    });

    return this.findOne(saved.id, user);
  }

  async review(id: string, dto: ReviewLeaveDto, user: any, ip?: string) {
    const leave = await this.findOne(id, user);

    if (leave.status !== LeaveStatus.PENDING && user.role !== Role.ADMIN) {
      throw new BadRequestException(`Leave request has already been ${leave.status}. Only Admin can override decisions.`);
    }

    leave.status = dto.status;
    leave.reviewedBy = user.id;
    leave.reviewedAt = new Date();
    leave.reviewRemarks = dto.reviewRemarks || null;

    const saved = await this.leaveRepo.save(leave);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: dto.status === LeaveStatus.APPROVED ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      entityType: 'LeaveRequest',
      entityId: saved.id,
      changeDetails: { status: dto.status, remarks: dto.reviewRemarks },
      ipAddress: ip,
    });

    return this.findOne(saved.id, user);
  }

  async cancel(id: string, user: any, ip?: string) {
    const leave = await this.findOne(id, user);
    leave.status = LeaveStatus.CANCELLED;
    await this.leaveRepo.save(leave);

    await this.activityLogsService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LEAVE_CANCELLED',
      entityType: 'LeaveRequest',
      entityId: id,
      ipAddress: ip,
    });

    return { message: 'Leave request has been cancelled' };
  }
}
