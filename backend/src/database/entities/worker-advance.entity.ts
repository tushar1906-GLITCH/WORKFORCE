import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Worker } from './worker.entity';
import { User } from './user.entity';

@Entity('worker_advances')
@Index(['workerId', 'status'])
export class WorkerAdvance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'remaining_balance', type: 'numeric', precision: 12, scale: 2 })
  remainingBalance: string;

  @Column({ name: 'advance_date', type: 'date' })
  advanceDate: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ default: 'ACTIVE' }) // PENDING, ACTIVE, REPAID
  status: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Worker, (w) => w.advances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;
}
