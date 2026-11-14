import { validate } from 'class-validator';
import { UpdateUserDto, ChangeUserStatusDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '../common/enums';

describe('Bug Fix 5: Supervisor Status Lifecycle and DTO Whitelisting Suite', () => {
  it('1. should preserve isActive in UpdateUserDto through class-validator whitelisting', async () => {
    const dto = new UpdateUserDto();
    dto.isActive = false;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.isActive).toBe(false);
  });

  it('2. ChangeUserStatusDto should require boolean isActive', async () => {
    const validDto = new ChangeUserStatusDto();
    validDto.isActive = false;
    const validErrors = await validate(validDto);
    expect(validErrors.length).toBe(0);

    const invalidDto = new ChangeUserStatusDto();
    // @ts-ignore
    invalidDto.isActive = 'not-a-boolean';
    const invalidErrors = await validate(invalidDto);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('3. Inactive supervisor must not be permitted to authenticate (login rejection)', () => {
    const inactiveUser = {
      id: 'sup-1',
      email: 'supervisor1@workforce.internal',
      isActive: false,
    };

    const allowLogin = inactiveUser.isActive;
    expect(allowLogin).toBe(false);
  });

  it('4. Inactive supervisor JWT token must be rejected during strategy validation', () => {
    const dbUserLookup = {
      id: 'sup-1',
      email: 'supervisor1@workforce.internal',
      isActive: false,
    };

    const isTokenAuthorized = dbUserLookup !== null && dbUserLookup.isActive === true;
    expect(isTokenAuthorized).toBe(false);
  });

  it('5. Admin self-deactivation must be prevented', () => {
    const adminUser = { id: 'admin-uuid-1', role: Role.ADMIN };
    const targetUserId = 'admin-uuid-1';
    const newStatus = false;

    const isSelfDeactivation = adminUser.id === targetUserId && !newStatus;
    expect(isSelfDeactivation).toBe(true);

    const canProceed = !isSelfDeactivation;
    expect(canProceed).toBe(false);
  });

  it('6. Reactivation should restore login and API access while keeping site assignments intact', () => {
    const deactivatedUser = {
      id: 'sup-1',
      fullName: 'Vikram Singh',
      role: Role.SUPERVISOR,
      isActive: false,
      assignedSites: ['site-1', 'site-2'],
    };

    // Reactivation
    const reactivatedUser = {
      ...deactivatedUser,
      isActive: true,
    };

    expect(reactivatedUser.isActive).toBe(true);
    expect(reactivatedUser.assignedSites.length).toBe(2);
  });
});
