import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { WorkSite } from './work-site.entity';

@Entity('supervisor_sites')
@Unique(['userId', 'workSiteId'])
export class SupervisorSite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'work_site_id', type: 'uuid' })
  workSiteId: string;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @ManyToOne(() => User, (u) => u.supervisorSites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => WorkSite, (ws) => ws.supervisorSites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_site_id' })
  workSite: WorkSite;
}
