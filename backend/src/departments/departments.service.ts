import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../database/entities';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private repo: Repository<Department>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Department not found');
    return d;
  }

  async create(data: { name: string; code?: string; description?: string }, admin: any, ip?: string) {
    const existing = await this.repo.findOne({ where: { name: data.name } });
    if (existing) throw new ConflictException('Department with this name already exists');

    const created = this.repo.create(data);
    const saved = await this.repo.save(created);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'DEPARTMENT_CREATED',
      entityType: 'Department',
      entityId: saved.id,
      changeDetails: data,
      ipAddress: ip,
    });

    return saved;
  }

  async update(id: string, data: { name?: string; code?: string; description?: string; isActive?: boolean }, admin: any, ip?: string) {
    const d = await this.findOne(id);
    if (data.name) d.name = data.name;
    if (data.code !== undefined) d.code = data.code;
    if (data.description !== undefined) d.description = data.description;
    if (data.isActive !== undefined) d.isActive = data.isActive;

    const saved = await this.repo.save(d);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'Department',
      entityId: saved.id,
      changeDetails: data,
      ipAddress: ip,
    });

    return saved;
  }
}
