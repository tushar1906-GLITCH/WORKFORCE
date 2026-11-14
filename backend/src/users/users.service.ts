import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, SupervisorSite, WorkSite } from '../database/entities';
import { Role } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ChangeUserStatusDto } from './dto/update-user.dto';

export { CreateUserDto, UpdateUserDto, ChangeUserStatusDto };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(SupervisorSite)
    private ssRepo: Repository<SupervisorSite>,
    @InjectRepository(WorkSite)
    private siteRepo: Repository<WorkSite>,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll() {
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['supervisorSites', 'supervisorSites.workSite'],
    });

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      assignedSites: u.supervisorSites ? u.supervisorSites.map((ss) => ss.workSite) : [],
    }));
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['supervisorSites', 'supervisorSites.workSite'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      assignedSites: user.supervisorSites ? user.supervisorSites.map((ss) => ss.workSite) : [],
    };
  }

  async create(dto: CreateUserDto, currentAdmin: any, ipAddress?: string) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const rawPassword = dto.password || 'Welcome@123456';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = this.userRepo.create({
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role,
      isActive: true,
    });
    const savedUser = await this.userRepo.save(user);

    // If supervisor has assigned sites
    if (dto.role === Role.SUPERVISOR && dto.assignedSiteIds?.length) {
      for (const siteId of dto.assignedSiteIds) {
        await this.ssRepo.save(
          this.ssRepo.create({
            userId: savedUser.id,
            workSiteId: siteId,
          }),
        );
      }
    }

    await this.activityLogsService.log({
      userId: currentAdmin.id,
      userEmail: currentAdmin.email,
      userRole: currentAdmin.role,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: savedUser.id,
      changeDetails: { email: savedUser.email, role: savedUser.role },
      ipAddress,
    });

    return this.findOne(savedUser.id);
  }

  async update(id: string, dto: UpdateUserDto, currentAdmin: any, ipAddress?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing) {
        throw new ConflictException('Email is already registered by another user');
      }
      user.email = dto.email.toLowerCase();
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.role) user.role = dto.role;
    if (typeof dto.isActive === 'boolean') {
      if (user.id === currentAdmin.id && !dto.isActive) {
        throw new BadRequestException('Administrators cannot deactivate their own user account.');
      }
      user.isActive = dto.isActive;
    }

    if (dto.password && dto.password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.userRepo.save(user);

    // Update supervisor sites if specified
    if (dto.assignedSiteIds !== undefined) {
      await this.ssRepo.delete({ userId: user.id });
      if (user.role === Role.SUPERVISOR && dto.assignedSiteIds.length > 0) {
        for (const siteId of dto.assignedSiteIds) {
          await this.ssRepo.save(
            this.ssRepo.create({
              userId: user.id,
              workSiteId: siteId,
            }),
          );
        }
      }
    }

    await this.activityLogsService.log({
      userId: currentAdmin.id,
      userEmail: currentAdmin.email,
      userRole: currentAdmin.role,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.id,
      changeDetails: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return this.findOne(user.id);
  }

  async setStatus(id: string, isActive: boolean, currentAdmin: any, ipAddress?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === currentAdmin.id && !isActive) {
      throw new BadRequestException('Administrators cannot deactivate their own user account.');
    }

    user.isActive = isActive;
    await this.userRepo.save(user);

    await this.activityLogsService.log({
      userId: currentAdmin.id,
      userEmail: currentAdmin.email,
      userRole: currentAdmin.role,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: user.id,
      changeDetails: { isActive },
      ipAddress,
    });

    return {
      message: `User account has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: await this.findOne(user.id),
    };
  }
}
