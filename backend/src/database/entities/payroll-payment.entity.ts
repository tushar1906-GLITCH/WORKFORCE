import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PaymentMethod } from '../../common/enums';
import { PayrollItem } from './payroll-item.entity';
import { User } from './user.entity';

@Entity('payroll_payments')
@Index(['payrollItemId'])
export class PayrollPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payroll_item_id', type: 'uuid' })
  payrollItemId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PaymentMethod;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ name: 'payment_reference', length: 150, nullable: true })
  paymentReference: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ name: 'recorded_by', type: 'uuid' })
  recordedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => PayrollItem, (pi) => pi.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_item_id' })
  payrollItem: PayrollItem;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by' })
  recordedByUser: User;
}
