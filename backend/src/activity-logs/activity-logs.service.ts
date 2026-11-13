import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../database/entities';

export interface CreateLogParams {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changeDetails?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private logRepo: Repository<ActivityLog>,
  ) {}

  async log(params: CreateLogParams): Promise<ActivityLog> {
    try {
      const entry = this.logRepo.create(params);
      return await this.logRepo.save(entry);
    } catch (err) {
      this.logger.error(`Failed to record activity log: ${err.message}`);
      return null;
    }
  }

  async findAll(query: {
    action?: string;
    entityType?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.logRepo.createQueryBuilder('log');

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }

    qb.orderBy('log.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
