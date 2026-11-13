import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkSite } from './work-site.entity';

@Entity('holidays')
@Index(['date', 'workSiteId'])
export class Holiday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'work_site_id', type: 'uuid', nullable: true })
  workSiteId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_paid', default: true })
  isPaid: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => WorkSite, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_site_id' })
  workSite: WorkSite;
}
