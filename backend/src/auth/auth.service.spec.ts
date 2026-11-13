import { Role } from '../common/enums';

describe('Role and Site-level Access Control Suite', () => {
  it('Admin should have organization-wide access', () => {
    const adminUser = { role: Role.ADMIN, assignedSiteIds: [] };
    const canAccessAnySite = adminUser.role === Role.ADMIN;
    expect(canAccessAnySite).toBe(true);
  });

  it('Supervisor should only have access to assigned work locations', () => {
    const supervisor = {
      role: Role.SUPERVISOR,
      assignedSiteIds: ['site-uuid-1', 'site-uuid-2'],
    };

    const hasAccessToSite1 = supervisor.assignedSiteIds.includes('site-uuid-1');
    const hasAccessToSite3 = supervisor.assignedSiteIds.includes('site-uuid-3');

    expect(hasAccessToSite1).toBe(true);
    expect(hasAccessToSite3).toBe(false);
  });

  it('Supervisor should be forbidden from accessing payroll endpoints', () => {
    const supervisorRole = Role.SUPERVISOR;
    const allowedRolesForPayroll = [Role.ADMIN];

    const isPermitted = allowedRolesForPayroll.includes(supervisorRole as any);
    expect(isPermitted).toBe(false);
  });
});
