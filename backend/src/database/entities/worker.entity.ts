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
import { EmploymentType, WorkerStatus, WageType } from '../../common/enums';
import { Department } from './department.entity';
import { SkillCategory } from './skill-category.entity';
import { WorkerAssignment } from './worker-assignment.entity';
import { Attendance } from './attendance.entity';
import { LeaveRequest } from './leave-request.entity';
import { WageRateHistory } from './wage-rate-history.entity';
import { WorkerAdvance } from './worker-advance.entity';
import { PayrollItem } from './payroll-item.entity';
import { WorkerDocument } from './worker-document.entity';

@Entity('workers')
export class Worker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'worker_code', length: 50, unique: true })
  workerCode: string;

  @Column({ name: 'full_name', length: 150 })
  fullName: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ length: 20, nullable: true })
  gender: string;

  @Column({ name: 'joining_date', type: 'date' })
  joiningDate: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string;

  @Column({ name: 'skill_category_id', type: 'uuid', nullable: true })
  skillCategoryId: string;

  @Column({
    name: 'employment_type',
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.DAILY_WAGE,
  })
  employmentType: EmploymentType;

  @Column({
    type: 'enum',
    enum: WorkerStatus,
    default: WorkerStatus.ACTIVE,
  })
  status: WorkerStatus;

  @Column({ name: 'emergency_contact', length: 150, nullable: true })
  emergencyContact: string;

  @Column({ name: 'profile_photo_path', length: 255, nullable: true })
  profilePhotoPath: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Department, (dept) => dept.workers, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => SkillCategory, (skill) => skill.workers, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'skill_category_id' })
  skillCategory: SkillCategory;

  @OneToMany(() => WorkerAssignment, (wa) => wa.worker)
  assignments: WorkerAssignment[];

  @OneToMany(() => Attendance, (att) => att.worker)
  attendances: Attendance[];

  @OneToMany(() => LeaveRequest, (lr) => lr.worker)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => WageRateHistory, (wrh) => wrh.worker)
  wageHistories: WageRateHistory[];

  @OneToMany(() => WorkerAdvance, (wa) => wa.worker)
  advances: WorkerAdvance[];

  @OneToMany(() => PayrollItem, (pi) => pi.worker)
  payrollItems: PayrollItem[];

  @OneToMany(() => WorkerDocument, (d) => d.worker)
  documents: WorkerDocument[];
}
