import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { PaymentStatus, WageType } from '../../common/enums';
import { PayrollRun } from './payroll-run.entity';
import { Worker } from './worker.entity';
import { PayrollPayment } from './payroll-payment.entity';

@Entity('payroll_items')
@Unique(['payrollRunId', 'workerId'])
@Index(['workerId'])
export class PayrollItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payroll_run_id', type: 'uuid' })
  payrollRunId: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @Column({
    name: 'wage_type_snapshot',
    type: 'enum',
    enum: WageType,
    default: WageType.DAILY,
  })
  wageTypeSnapshot: WageType;

  @Column({ name: 'wage_rate_snapshot', type: 'numeric', precision: 12, scale: 2 })
  wageRateSnapshot: string;

  @Column({ name: 'present_days', type: 'numeric', precision: 6, scale: 2, default: '0.00' })
  presentDays: string;

  @Column({ name: 'half_days', type: 'int', default: 0 })
  halfDays: number;

  @Column({ name: 'paid_leave_days', type: 'int', default: 0 })
  paidLeaveDays: number;

  @Column({ name: 'unpaid_leave_days', type: 'int', default: 0 })
  unpaidLeaveDays: number;

  @Column({ name: 'regular_hours', type: 'numeric', precision: 8, scale: 2, default: '0.00' })
  regularHours: string;

  @Column({ name: 'overtime_hours', type: 'numeric', precision: 8, scale: 2, default: '0.00' })
  overtimeHours: string;

  @Column({ name: 'overtime_rate_multiplier', type: 'numeric', precision: 4, scale: 2, default: '1.50' })
  overtimeRateMultiplier: string;

  @Column({ name: 'gross_earnings', type: 'numeric', precision: 12, scale: 2, default: '0.00' })
  grossEarnings: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: '0.00' })
  deductions: string;

  @Column({ name: 'advance_recovery', type: 'numeric', precision: 12, scale: 2, default: '0.00' })
  advanceRecovery: string;

  @Column({ name: 'net_pay', type: 'numeric', precision: 12, scale: 2, default: '0.00' })
  netPay: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => PayrollRun, (pr) => pr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_run_id' })
  payrollRun: PayrollRun;

  @ManyToOne(() => Worker, (w) => w.payrollItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @OneToMany(() => PayrollPayment, (pp) => pp.payrollItem)
  payments: PayrollPayment[];
}
