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
import { LeaveStatus, LeaveType } from '../../common/enums';
import { Worker } from './worker.entity';
import { WorkSite } from './work-site.entity';
import { User } from './user.entity';

@Entity('leave_requests')
@Index(['workerId', 'startDate', 'endDate'])
@Index(['workSiteId', 'status'])
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @Column({ name: 'work_site_id', type: 'uuid' })
  workSiteId: string;

  @Column({
    name: 'leave_type',
    type: 'enum',
    enum: LeaveType,
    default: LeaveType.CASUAL,
  })
  leaveType: LeaveType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'supporting_document_path', length: 255, nullable: true })
  supportingDocumentPath: string;

  @Column({
    type: 'enum',
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'review_remarks', type: 'text', nullable: true })
  reviewRemarks: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Worker, (w) => w.leaveRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @ManyToOne(() => WorkSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_site_id' })
  workSite: WorkSite;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedByUser: User;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;
}
