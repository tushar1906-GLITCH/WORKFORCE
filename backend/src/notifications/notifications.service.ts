import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../database/entities';
import { Role } from '../common/enums';

export interface CreateNotifParams {
  userId?: string;
  roleTarget?: string;
  workSiteId?: string;
  title: string;
  message: string;
  type?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  async create(params: CreateNotifParams): Promise<Notification> {
    try {
      const notif = this.notifRepo.create(params);
      return await this.notifRepo.save(notif);
    } catch (err) {
      this.logger.error(`Failed to create notification: ${err.message}`);
      return null;
    }
  }

  async getForUser(user: { id: string; role: Role }) {
    const qb = this.notifRepo.createQueryBuilder('n');

    if (user.role === Role.ADMIN) {
      qb.where('n.userId = :userId OR n.roleTarget = :role OR n.roleTarget IS NULL', {
        userId: user.id,
        role: Role.ADMIN,
      });
    } else {
      qb.where('n.userId = :userId OR n.roleTarget = :role', {
        userId: user.id,
        role: Role.SUPERVISOR,
      });
    }

    qb.orderBy('n.createdAt', 'DESC').take(50);
    const notifications = await qb.getMany();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(id: string) {
    await this.notifRepo.update(id, { isRead: true });
    return { success: true };
  }

  async markAllAsRead(user: { id: string; role: Role }) {
    const qb = this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true });

    if (user.role === Role.ADMIN) {
      qb.where('userId = :userId OR roleTarget = :role OR roleTarget IS NULL', {
        userId: user.id,
        role: Role.ADMIN,
      });
    } else {
      qb.where('userId = :userId OR roleTarget = :role', {
        userId: user.id,
        role: Role.SUPERVISOR,
      });
    }

    await qb.execute();
    return { success: true };
  }
}
