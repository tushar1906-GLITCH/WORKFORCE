import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSite, SupervisorSite, WorkerAssignment, Attendance } from '../database/entities';
import { Role } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateWorkSiteDto } from './dto/create-work-site.dto';
import { UpdateWorkSiteDto } from './dto/update-work-site.dto';

export { CreateWorkSiteDto, UpdateWorkSiteDto };

@Injectable()
export class WorkSitesService {
  constructor(
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    @InjectRepository(SupervisorSite)
    private ssRepo: Repository<SupervisorSite>,
    @InjectRepository(WorkerAssignment)
    private waRepo: Repository<WorkerAssignment>,
    @InjectRepository(Attendance)
    private attRepo: Repository<Attendance>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll(user: any, status?: string) {
    if (user.role === Role.ADMIN) {
      const where: any = {};
      if (status) {
        where.status = status;
      }
      return this.siteRepo.find({
        where,
        order: { name: 'ASC' },
        relations: ['supervisorSites', 'supervisorSites.user'],
      });
    }

    // Supervisor: only assigned sites (filtered by status if requested)
    const supSites = await this.ssRepo.find({
      where: { userId: user.id },
      relations: ['workSite'],
    });

    const userSites = supSites.map((ss) => ss.workSite).filter(Boolean);
    if (status) {
      return userSites.filter((s) => s.status === status);
    }
    return userSites;
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

  async create(data: CreateWorkSiteDto, adminUser: any, ip?: string) {
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

  async update(id: string, data: UpdateWorkSiteDto, adminUser: any, ip?: string) {
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

  async deactivate(id: string, adminUser: any, ip?: string) {
    const site = await this.siteRepo.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException('Work location not found');
    }

    if (site.status === 'INACTIVE') {
      throw new BadRequestException(`Work location "${site.name}" is already inactive`);
    }

    // Check active assignments count to warn admin (assignments preserved, not deleted)
    const activeWorkersCount = await this.waRepo.count({
      where: { workSiteId: id, status: 'ACTIVE' as any },
    });

    site.status = 'INACTIVE';
    await this.siteRepo.save(site);

    await this.activityLogsService.log({
      userId: adminUser.id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: 'SITE_DEACTIVATED',
      entityType: 'WorkSite',
      entityId: site.id,
      changeDetails: { previousStatus: 'ACTIVE', newStatus: 'INACTIVE', activeWorkersCount },
      ipAddress: ip,
    });

    return {
      message: `Work location "${site.name}" deactivated successfully.`,
      activeWorkersCount,
      warning: activeWorkersCount > 0
        ? `${activeWorkersCount} worker(s) have active assignments at this location. Historical assignments remain preserved.`
        : null,
      site: await this.findOne(site.id, adminUser),
    };
  }

  async reactivate(id: string, adminUser: any, ip?: string) {
    const site = await this.siteRepo.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException('Work location not found');
    }

    if (site.status === 'ACTIVE') {
      throw new BadRequestException(`Work location "${site.name}" is already active`);
    }

    site.status = 'ACTIVE';
    await this.siteRepo.save(site);

    await this.activityLogsService.log({
      userId: adminUser.id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: 'SITE_REACTIVATED',
      entityType: 'WorkSite',
      entityId: site.id,
      changeDetails: { previousStatus: 'INACTIVE', newStatus: 'ACTIVE' },
      ipAddress: ip,
    });

    return {
      message: `Work location "${site.name}" reactivated successfully.`,
      site: await this.findOne(site.id, adminUser),
    };
  }

  async delete(id: string, adminUser: any, ip?: string) {
    const site = await this.siteRepo.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException('Work location not found');
    }

    // Safety Check: Check if historical worker assignments or attendance exist
    const assignmentCount = await this.waRepo.count({ where: { workSiteId: id } });
    const attendanceCount = await this.attRepo.count({ where: { workSiteId: id } });

    if (assignmentCount > 0 || attendanceCount > 0) {
      throw new BadRequestException(
        `Cannot delete work location "${site.name}": Historical records exist (${assignmentCount} assignment(s), ${attendanceCount} attendance record(s)). Deactivate the location instead to preserve historical and payroll audit trails.`,
      );
    }

    // Safe deletion: remove supervisor links and delete site
    await this.ssRepo.delete({ workSiteId: id });
    await this.siteRepo.delete(id);

    await this.activityLogsService.log({
      userId: adminUser.id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: 'SITE_DELETED',
      entityType: 'WorkSite',
      entityId: id,
      changeDetails: { name: site.name, address: site.address },
      ipAddress: ip,
    });

    return { message: `Work location "${site.name}" permanently deleted.` };
  }
}
