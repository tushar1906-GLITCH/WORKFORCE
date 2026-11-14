import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PayrollPayment, PayrollItem, PayrollRun, Worker } from '../database/entities';
import { PaymentMethod, PaymentStatus, PayrollStatus } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

export { CreatePaymentDto };

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PayrollPayment)
    private paymentRepo: Repository<PayrollPayment>,
    @InjectRepository(PayrollItem)
    private itemRepo: Repository<PayrollItem>,
    private dataSource: DataSource,
    private activityLogsService: ActivityLogsService,
  ) {}

  async findAll(workerId?: string) {
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.payrollItem', 'item')
      .leftJoinAndSelect('item.worker', 'worker')
      .leftJoinAndSelect('item.payrollRun', 'payrollRun')
      .leftJoinAndSelect('p.recordedByUser', 'recordedBy');

    if (workerId) {
      qb.where('item.workerId = :workerId', { workerId });
    }

    qb.orderBy('p.paymentDate', 'DESC').addOrderBy('p.createdAt', 'DESC');
    return qb.getMany();
  }

  async create(dto: CreatePaymentDto, admin: any, ip?: string) {
    const paymentAmount = parseFloat(dto.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock the required payroll item INDEPENDENTLY (avoiding FOR UPDATE on nullable outer joins)
      const item = await queryRunner.manager
        .createQueryBuilder(PayrollItem, 'item')
        .setLock('pessimistic_write')
        .where('item.id = :id', { id: dto.payrollItemId })
        .getOne();

      if (!item) {
        throw new NotFoundException('Payroll line item not found');
      }

      // 2. Verify associated payroll run is APPROVED
      const payrollRun = await queryRunner.manager.findOne(PayrollRun, {
        where: { id: item.payrollRunId },
      });
      if (!payrollRun) {
        throw new NotFoundException('Associated payroll run not found');
      }
      if (payrollRun.status !== PayrollStatus.APPROVED) {
        throw new BadRequestException(
          `Payments can only be disbursed against an APPROVED payroll run (current run status: ${payrollRun.status})`,
        );
      }

      // 3. Fetch worker details for audit logging
      const worker = await queryRunner.manager.findOne(Worker, {
        where: { id: item.workerId },
      });

      // 4. Fetch existing payments within the transaction for exact balance calculation
      const existingPayments = await queryRunner.manager.find(PayrollPayment, {
        where: { payrollItemId: item.id },
      });

      // 5. Decimal-safe integer cents / paise calculations
      const netPayCents = Math.round(Number(item.netPay) * 100);
      const totalPaidCents = existingPayments.reduce(
        (sum, p) => sum + Math.round(Number(p.amount) * 100),
        0,
      );
      const outstandingCents = Math.max(0, netPayCents - totalPaidCents);
      const paymentCents = Math.round(paymentAmount * 100);

      if (paymentCents <= 0) {
        throw new BadRequestException('Payment amount must be greater than zero');
      }

      if (paymentCents > outstandingCents) {
        const remainingFormatted = (outstandingCents / 100).toFixed(2);
        const requestedFormatted = (paymentCents / 100).toFixed(2);
        throw new BadRequestException(
          `Payment amount (₹${requestedFormatted}) exceeds remaining payable balance (₹${remainingFormatted})`,
        );
      }

      // 6. Record payment
      const payment = queryRunner.manager.create(PayrollPayment, {
        payrollItemId: item.id,
        amount: (paymentCents / 100).toFixed(2),
        paymentMethod: dto.paymentMethod,
        paymentDate: dto.paymentDate,
        paymentReference: dto.paymentReference?.trim() || null,
        remarks: dto.remarks?.trim() || null,
        recordedBy: admin.id,
      });
      const savedPayment = await queryRunner.manager.save(payment);

      // 7. Update payroll item payment status
      const newTotalPaidCents = totalPaidCents + paymentCents;
      if (newTotalPaidCents >= netPayCents) {
        item.paymentStatus = PaymentStatus.PAID;
      } else {
        item.paymentStatus = PaymentStatus.PARTIALLY_PAID;
      }
      await queryRunner.manager.save(item);

      // 8. Commit atomic transaction
      await queryRunner.commitTransaction();

      await this.activityLogsService.log({
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        action: 'PAYMENT_RECORDED',
        entityType: 'PayrollPayment',
        entityId: savedPayment.id,
        changeDetails: {
          workerCode: worker?.workerCode || 'UNKNOWN',
          workerName: worker?.fullName || 'UNKNOWN',
          amount: savedPayment.amount,
          method: savedPayment.paymentMethod,
          reference: savedPayment.paymentReference,
          newStatus: item.paymentStatus,
          remainingBalance: Math.max(0, (netPayCents - newTotalPaidCents) / 100).toFixed(2),
        },
        ipAddress: ip,
      });

      return {
        ...savedPayment,
        outstandingBalance: Math.max(0, (netPayCents - newTotalPaidCents) / 100).toFixed(2),
        paymentStatus: item.paymentStatus,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
