import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillCategory } from '../database/entities';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(SkillCategory)
    private repo: Repository<SkillCategory>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Skill category not found');
    return s;
  }

  async create(data: { name: string; description?: string }, admin: any, ip?: string) {
    const existing = await this.repo.findOne({ where: { name: data.name } });
    if (existing) throw new ConflictException('Skill category already exists');

    const created = this.repo.create(data);
    const saved = await this.repo.save(created);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'SKILL_CREATED',
      entityType: 'SkillCategory',
      entityId: saved.id,
      changeDetails: data,
      ipAddress: ip,
    });

    return saved;
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }, admin: any, ip?: string) {
    const s = await this.findOne(id);
    if (data.name) s.name = data.name;
    if (data.description !== undefined) s.description = data.description;
    if (data.isActive !== undefined) s.isActive = data.isActive;

    const saved = await this.repo.save(s);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'SKILL_UPDATED',
      entityType: 'SkillCategory',
      entityId: saved.id,
      changeDetails: data,
      ipAddress: ip,
    });

    return saved;
  }
}
