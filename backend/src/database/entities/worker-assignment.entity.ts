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
import { AssignmentStatus } from '../../common/enums';
import { Worker } from './worker.entity';
import { WorkSite } from './work-site.entity';
import { Shift } from './shift.entity';
import { User } from './user.entity';

@Entity('worker_assignments')
@Index(['workerId', 'status'])
@Index(['workSiteId', 'status'])
export class WorkerAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @Column({ name: 'work_site_id', type: 'uuid' })
  workSiteId: string;

  @Column({ name: 'shift_id', type: 'uuid', nullable: true })
  shiftId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string;

  @Column({ name: 'role_title', length: 100, nullable: true })
  roleTitle: string;

  @Column({ name: 'supervisor_id', type: 'uuid', nullable: true })
  supervisorId: string;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.ACTIVE,
  })
  status: AssignmentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Worker, (w) => w.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @ManyToOne(() => WorkSite, (ws) => ws.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_site_id' })
  workSite: WorkSite;

  @ManyToOne(() => Shift, (s) => s.assignments, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor: User;
}
