import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SupervisorSite } from './supervisor-site.entity';
import { WorkerAssignment } from './worker-assignment.entity';
import { Attendance } from './attendance.entity';

@Entity('work_sites')
export class WorkSite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => SupervisorSite, (ss) => ss.workSite)
  supervisorSites: SupervisorSite[];

  @OneToMany(() => WorkerAssignment, (wa) => wa.workSite)
  assignments: WorkerAssignment[];

  @OneToMany(() => Attendance, (att) => att.workSite)
  attendances: Attendance[];
}
