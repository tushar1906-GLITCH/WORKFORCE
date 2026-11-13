import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PayrollPayment, PayrollItem } from '../database/entities';
import { PaymentMethod, PaymentStatus } from '../common/enums';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

export interface CreatePaymentDto {
  payrollItemId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  paymentReference?: string;
  remarks?: string;
}

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
      // Lock payroll item for update to prevent concurrent overpayments
      const item = await queryRunner.manager
        .createQueryBuilder(PayrollItem, 'item')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('item.payments', 'payment')
        .leftJoinAndSelect('item.worker', 'worker')
        .where('item.id = :id', { id: dto.payrollItemId })
        .getOne();

      if (!item) {
        throw new NotFoundException('Payroll line item not found');
      }

      const totalPaidSoFar = item.payments.reduce(
        (sum, p) => sum + parseFloat(p.amount),
        0,
      );
      const netPay = parseFloat(item.netPay);
      const outstandingBalance = Math.max(0, netPay - totalPaidSoFar);

      if (paymentAmount > outstandingBalance + 0.001) {
        throw new BadRequestException(
          `Payment amount (₹${paymentAmount.toFixed(2)}) exceeds remaining payable balance (₹${outstandingBalance.toFixed(2)})`,
        );
      }

      const payment = queryRunner.manager.create(PayrollPayment, {
        payrollItemId: dto.payrollItemId,
        amount: paymentAmount.toFixed(2),
        paymentMethod: dto.paymentMethod,
        paymentDate: dto.paymentDate,
        paymentReference: dto.paymentReference || null,
        remarks: dto.remarks || null,
        recordedBy: admin.id,
      });
      const savedPayment = await queryRunner.manager.save(payment);

      // Update item payment status
      const newTotalPaid = totalPaidSoFar + paymentAmount;
      if (newTotalPaid >= netPay - 0.01) {
        item.paymentStatus = PaymentStatus.PAID;
      } else {
        item.paymentStatus = PaymentStatus.PARTIALLY_PAID;
      }
      await queryRunner.manager.save(item);

      await queryRunner.commitTransaction();

      await this.activityLogsService.log({
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        action: 'PAYMENT_RECORDED',
        entityType: 'PayrollPayment',
        entityId: savedPayment.id,
        changeDetails: {
          workerCode: item.worker.workerCode,
          amount: savedPayment.amount,
          method: savedPayment.paymentMethod,
          newStatus: item.paymentStatus,
        },
        ipAddress: ip,
      });

      return savedPayment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
