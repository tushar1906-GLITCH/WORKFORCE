import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkerAssignment } from './worker-assignment.entity';
import { Attendance } from './attendance.entity';

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'start_time', length: 10 })
  startTime: string; // e.g. "08:00"

  @Column({ name: 'end_time', length: 10 })
  endTime: string; // e.g. "17:00"

  @Column({ name: 'crosses_midnight', default: false })
  crossesMidnight: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => WorkerAssignment, (wa) => wa.shift)
  assignments: WorkerAssignment[];

  @OneToMany(() => Attendance, (att) => att.shift)
  attendances: Attendance[];
}
