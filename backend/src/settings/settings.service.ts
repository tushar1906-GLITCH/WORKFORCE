import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgSetting } from '../database/entities';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(OrgSetting)
    private repo: Repository<OrgSetting>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll() {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  async update(key: string, value: string, admin: any, ip?: string) {
    let setting = await this.repo.findOne({ where: { key } });
    if (!setting) {
      setting = this.repo.create({ key, value, description: 'Organization configuration' });
    } else {
      setting.value = value;
    }
    setting.updatedBy = admin.id;
    const saved = await this.repo.save(setting);

    await this.activityLogsService.log({
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      action: 'SETTING_UPDATED',
      entityType: 'OrgSetting',
      entityId: saved.id,
      changeDetails: { key, value },
      ipAddress: ip,
    });

    return saved;
  }
}
