import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerAdvance, Worker } from '../database/entities';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

export interface CreateAdvanceDto {
  workerId: string;
  amount: string;
  advanceDate: string;
  reason?: string;
}

@Injectable()
export class AdvancesService {
  constructor(
    @InjectRepository(WorkerAdvance)
    private advRepo: Repository<WorkerAdvance>,
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll(workerId?: string) {
    const qb = this.advRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.worker', 'worker')
      .leftJoinAndSelect('a.approvedByUser', 'approvedBy');

    if (workerId) {
      qb.where('a.workerId = :workerId', { workerId });
    }

    qb.orderBy('a.advanceDate', 'DESC');
    return qb.getMany();
  }

  async create(dto: CreateAdvanceDto, admin: any, ip?: string) {
    const worker = await this.workerRepo.findOne({ where: { id: dto.workerId } });
    if (!worker) throw new NotFoundException('Worker not found');

    const numAmount = parseFloat(dto.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestException('Advance amount must be a positive number');
    }

    const adv = this.advRepo.create({
      workerId: dto.workerId,
      amount: numAmount.toFixed(2),
      remainingBalance: numAmount.toFixed(2),
      advanceDate: dto.advanceDate,
      reason: dto.reason || null,
      status: 'ACTIVE',
      approvedBy: admin.id,
    });
    const saved = await this.advRepo.save(adv);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'WORKER_ADVANCE_ISSUED',
      entityType: 'WorkerAdvance',
      entityId: saved.id,
      changeDetails: { workerCode: worker.workerCode, amount: saved.amount },
      ipAddress: ip,
    });

    return saved;
  }
}
