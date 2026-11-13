import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSite, SupervisorSite, WorkerAssignment, Attendance } from '../database/entities';
import { Role } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class WorkSitesService {
  constructor(
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    @InjectRepository(SupervisorSite)
    private ssRepo: Repository<SupervisorSite>,
    @InjectRepository(WorkerAssignment)
    private waRepo: Repository<WorkerAssignment>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll(user: any) {
    if (user.role === Role.ADMIN) {
      return this.siteRepo.find({
        order: { name: 'ASC' },
        relations: ['supervisorSites', 'supervisorSites.user'],
      });
    }

    // Supervisor: only assigned sites
    const supSites = await this.ssRepo.find({
      where: { userId: user.id },
      relations: ['workSite'],
    });
    return supSites.map((ss) => ss.workSite);
  }

  async findOne(id: string, user: any) {
    if (user.role === Role.SUPERVISOR) {
      const hasAccess = await this.ssRepo.findOne({
        where: { userId: user.id, workSiteId: id },
      });
      if (!hasAccess) {
        throw new ForbiddenException('Access denied: Site is not assigned to your supervisor account');
      }
    }

    const site = await this.siteRepo.findOne({
      where: { id },
      relations: ['supervisorSites', 'supervisorSites.user'],
    });
    if (!site) {
      throw new NotFoundException('Work location not found');
    }

    // Count active workers currently assigned to this site
    const activeWorkersCount = await this.waRepo.count({
      where: { workSiteId: id, status: 'ACTIVE' as any },
    });

    return {
      ...site,
      activeWorkersCount,
    };
  }

  async create(data: { name: string; address: string; description?: string; supervisorIds?: string[] }, adminUser: any, ip?: string) {
    const site = this.siteRepo.create({
      name: data.name,
      address: data.address,
      description: data.description,
      status: 'ACTIVE',
    });
    const saved = await this.siteRepo.save(site);

    if (data.supervisorIds?.length) {
      for (const uid of data.supervisorIds) {
        await this.ssRepo.save(
          this.ssRepo.create({
            userId: uid,
            workSiteId: saved.id,
          }),
        );
      }
    }

    await this.activityLogsService.log({
      userId: adminUser.id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: 'SITE_CREATED',
      entityType: 'WorkSite',
      entityId: saved.id,
      changeDetails: { name: saved.name, address: saved.address },
      ipAddress: ip,
    });

    return this.findOne(saved.id, adminUser);
  }

  async update(id: string, data: { name?: string; address?: string; description?: string; status?: string; supervisorIds?: string[] }, adminUser: any, ip?: string) {
    const site = await this.siteRepo.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException('Work location not found');
    }

    if (data.name) site.name = data.name;
    if (data.address) site.address = data.address;
    if (data.description !== undefined) site.description = data.description;
    if (data.status) site.status = data.status;

    await this.siteRepo.save(site);

    if (data.supervisorIds !== undefined) {
      await this.ssRepo.delete({ workSiteId: site.id });
      for (const uid of data.supervisorIds) {
        await this.ssRepo.save(
          this.ssRepo.create({
            userId: uid,
            workSiteId: site.id,
          }),
        );
      }
    }

    await this.activityLogsService.log({
      userId: adminUser.id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: 'SITE_UPDATED',
      entityType: 'WorkSite',
      entityId: site.id,
      changeDetails: data,
      ipAddress: ip,
    });

    return this.findOne(site.id, adminUser);
  }
}
