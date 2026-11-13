import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WageRateHistory, Worker } from '../database/entities';
import { WageType } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

export interface CreateWageDto {
  workerId: string;
  wageType: WageType;
  rate: string;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
}

@Injectable()
export class WagesService {
  constructor(
    @InjectRepository(WageRateHistory)
    private wageRepo: Repository<WageRateHistory>,
    @InjectRepository(Worker)
    private workerRepo: Repository<Worker>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll(workerId?: string) {
    const qb = this.wageRepo
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.worker', 'worker')
      .leftJoinAndSelect('w.changedByUser', 'changedBy');

    if (workerId) {
      qb.where('w.workerId = :workerId', { workerId });
    }

    qb.orderBy('w.effectiveFrom', 'DESC').addOrderBy('w.createdAt', 'DESC');
    return qb.getMany();
  }

  async getWorkerHistory(workerId: string) {
    return this.wageRepo.find({
      where: { workerId },
      order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
      relations: ['changedByUser'],
    });
  }

  async create(dto: CreateWageDto, admin: any, ip?: string) {
    const worker = await this.workerRepo.findOne({ where: { id: dto.workerId } });
    if (!worker) throw new NotFoundException('Worker not found');

    const entry = this.wageRepo.create({
      workerId: dto.workerId,
      wageType: dto.wageType,
      rate: dto.rate,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo || null,
      notes: dto.notes || null,
      changedBy: admin.id,
    });
    const saved = await this.wageRepo.save(entry);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'WAGE_RATE_UPDATED',
      entityType: 'WageRateHistory',
      entityId: saved.id,
      changeDetails: { workerCode: worker.workerCode, wageType: dto.wageType, rate: dto.rate },
      ipAddress: ip,
    });

    return saved;
  }
}
