import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { PayrollStatus } from '../../common/enums';
import { User } from './user.entity';
import { PayrollItem } from './payroll-item.entity';
import { PayrollAdjustment } from './payroll-adjustment.entity';

@Entity('payroll_runs')
@Index(['periodStart', 'periodEnd'])
export class PayrollRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT,
  })
  status: PayrollStatus;

  @Column({ name: 'total_workers', type: 'int', default: 0 })
  totalWorkers: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2, default: '0.00' })
  totalAmount: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;

  @OneToMany(() => PayrollItem, (pi) => pi.payrollRun, { cascade: true })
  items: PayrollItem[];

  @OneToMany(() => PayrollAdjustment, (pa) => pa.payrollRun)
  adjustments: PayrollAdjustment[];
}
