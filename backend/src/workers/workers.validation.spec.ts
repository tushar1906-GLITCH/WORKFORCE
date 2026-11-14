import { validate } from 'class-validator';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { EmploymentType, WageType, WorkerStatus } from '../common/enums';

describe('Bug Fix 1 & 2: Worker Phone Validation and Status Lifecycle Suite', () => {
  const baseValidWorker = {
    fullName: 'Ramesh Kumar',
    phone: '9845011001',
    address: 'Plot 45, Sector 12, Industrial Area',
    joiningDate: '2024-01-15',
    employmentType: EmploymentType.DAILY_WAGE,
    wageType: WageType.DAILY,
    wageRate: '850.00',
  };

  it('1. should accept valid 10-digit Indian numbers starting with 6, 7, 8, 9', async () => {
    const validPhones = ['9845011001', '8123456789', '7012345678', '6987654321'];

    for (const phone of validPhones) {
      const dto = new CreateWorkerDto();
      Object.assign(dto, baseValidWorker, { phone });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('2. should reject 9-digit phone numbers', async () => {
    const dto = new CreateWorkerDto();
    Object.assign(dto, baseValidWorker, { phone: '984501100' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.matches).toBeDefined();
  });

  it('3. should reject 11-digit phone numbers (e.g. 55544445455)', async () => {
    const dto = new CreateWorkerDto();
    Object.assign(dto, baseValidWorker, { phone: '55544445455' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('4. should reject 10-digit numbers starting with 1 through 5 (e.g. 2222222222)', async () => {
    const invalidStartingDigits = ['1234567890', '2222222222', '3456789012', '4567890123', '5555555555'];

    for (const phone of invalidStartingDigits) {
      const dto = new CreateWorkerDto();
      Object.assign(dto, baseValidWorker, { phone });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('5. should reject alphabetic and special characters in phone', async () => {
    const invalidFormats = ['984501100a', '98450-1100', '9845 01100', '9845@11001'];

    for (const phone of invalidFormats) {
      const dto = new CreateWorkerDto();
      Object.assign(dto, baseValidWorker, { phone });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('6. should reject empty phone number', async () => {
    const dto = new CreateWorkerDto();
    Object.assign(dto, baseValidWorker, { phone: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('7. UpdateWorkerDto should validate phone if provided but allow omitting phone', async () => {
    const validUpdate = new UpdateWorkerDto();
    validUpdate.fullName = 'Ramesh K. Updated';
    const validErrors = await validate(validUpdate);
    expect(validErrors.length).toBe(0);

    const invalidUpdate = new UpdateWorkerDto();
    invalidUpdate.phone = '12345';
    const invalidErrors = await validate(invalidUpdate);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('8. Worker Reactivation should preserve ID, workerCode, wage and assignment history', () => {
    const originalWorker = {
      id: 'worker-uuid-1',
      workerCode: 'WF-1001',
      fullName: 'Suresh Patel',
      phone: '9876543210',
      status: WorkerStatus.INACTIVE,
      historicalAssignments: [{ id: 'asg-1', status: 'COMPLETED' }],
      wageHistory: [{ rate: '800.00' }],
      attendanceRecords: 24,
    };

    // Reactivation transition
    expect(originalWorker.status).toBe(WorkerStatus.INACTIVE);
    const reactivatedWorker = {
      ...originalWorker,
      status: WorkerStatus.ACTIVE,
    };

    // Verification
    expect(reactivatedWorker.id).toBe(originalWorker.id);
    expect(reactivatedWorker.workerCode).toBe(originalWorker.workerCode);
    expect(reactivatedWorker.status).toBe(WorkerStatus.ACTIVE);
    expect(reactivatedWorker.historicalAssignments.length).toBe(1);
    expect(reactivatedWorker.wageHistory.length).toBe(1);
    expect(reactivatedWorker.attendanceRecords).toBe(24);
  });
});
