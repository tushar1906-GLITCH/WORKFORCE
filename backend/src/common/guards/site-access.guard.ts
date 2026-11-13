import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../enums';
import { SupervisorSite } from '../../database/entities';

@Injectable()
export class SiteAccessGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Admin has organization-wide access
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Extract workSiteId from params, query, or body
    const workSiteId =
      request.params?.workSiteId ||
      request.params?.siteId ||
      request.query?.workSiteId ||
      request.query?.siteId ||
      request.body?.workSiteId ||
      request.body?.siteId;

    if (!workSiteId) {
      // If endpoint is not specifically parametrized with a site ID,
      // allow service-level checks to scope queries
      return true;
    }

    const ssRepo = this.dataSource.getRepository(SupervisorSite);
    const hasAccess = await ssRepo.findOne({
      where: {
        userId: user.id,
        workSiteId: workSiteId,
      },
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied: You do not have supervisor authorization for work site ID ${workSiteId}`,
      );
    }

    return true;
  }
}
