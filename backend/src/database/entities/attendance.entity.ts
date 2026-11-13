import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { AttendanceStatus } from '../../common/enums';
import { Worker } from './worker.entity';
import { WorkSite } from './work-site.entity';
import { Shift } from './shift.entity';
import { User } from './user.entity';

@Entity('attendance')
@Unique(['workerId', 'attendanceDate', 'shiftId'])
@Index(['workSiteId', 'attendanceDate'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @Column({ name: 'work_site_id', type: 'uuid' })
  workSiteId: string;

  @Column({ name: 'shift_id', type: 'uuid' })
  shiftId: string;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ name: 'check_in', length: 10, nullable: true })
  checkIn: string;

  @Column({ name: 'check_out', length: 10, nullable: true })
  checkOut: string;

  @Column({ name: 'overtime_minutes', type: 'int', default: 0 })
  overtimeMinutes: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ name: 'marked_by', type: 'uuid', nullable: true })
  markedBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt: Date;

  @Column({ name: 'finalized_by', type: 'uuid', nullable: true })
  finalizedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Worker, (w) => w.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @ManyToOne(() => WorkSite, (ws) => ws.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_site_id' })
  workSite: WorkSite;

  @ManyToOne(() => Shift, (s) => s.attendances, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'marked_by' })
  markedByUser: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'finalized_by' })
  finalizedByUser: User;
}
