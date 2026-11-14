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

@Entity('worker_documents')
@Index(['workerId', 'documentType'])
@Index(['expiryDate'])
export class WorkerDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'worker_id', type: 'uuid' })
  workerId: string;

  @Column({ name: 'document_type', type: 'varchar', length: 50 })
  documentType: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'document_number', type: 'varchar', length: 100, nullable: true })
  documentNumber?: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate?: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: string;

  @Column({
    name: 'verification_status',
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  verificationStatus: string; // 'PENDING' | 'VERIFIED' | 'REJECTED'

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy?: string;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Worker, (w) => w.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker: Worker;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier?: User;
}
