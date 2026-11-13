import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from '../database/entities';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private repo: Repository<Shift>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll() {
    return this.repo.find({ order: { startTime: 'ASC' } });
  }

  async findOne(id: string) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Shift not found');
    return s;
  }

  async create(data: { name: string; startTime: string; endTime: string; crossesMidnight?: boolean; description?: string }, admin: any, ip?: string) {
    const created = this.repo.create(data);
    const saved = await this.repo.save(created);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'SHIFT_CREATED',
      entityType: 'Shift',
      entityId: saved.id,
      changeDetails: data,
      ipAddress: ip,
    });

    return saved;
  }

  async update(id: string, data: any, admin: any, ip?: string) {
    const s = await this.findOne(id);
    Object.assign(s, data);
    const saved = await this.repo.save(s);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'SHIFT_UPDATED',
      entityType: 'Shift',
      entityId: saved.id,
      changeDetails: data,
      ipAddress: ip,
    });

    return saved;
  }
}
