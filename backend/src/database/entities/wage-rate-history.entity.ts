import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WageType } from '../../common/enums';
import { Worker } from './worker.entity';
import { User } from './user.entity';

@Entity('wage_rate_history')
@Index(['workerId', 'effectiveFrom'])
export class WageRateHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @Column({
    name: 'wage_type',
    type: 'enum',
    enum: WageType,
    default: WageType.DAILY,
  })
  wageType: WageType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  rate: string;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: string;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Worker, (w) => w.wageHistories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;
}
