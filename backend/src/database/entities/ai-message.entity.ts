import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AiConversation } from './ai-conversation.entity';

@Entity('ai_messages')
@Index(['conversationId', 'createdAt'])
export class AiMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ type: 'varchar', length: 50 })
  role: string; // 'user' | 'assistant' | 'system' | 'tool'

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'tool_calls', type: 'jsonb', nullable: true })
  toolCalls?: any;

  @Column({ name: 'tool_results', type: 'jsonb', nullable: true })
  toolResults?: any;

  @Column({ name: 'tokens_used', type: 'int', nullable: true })
  tokensUsed?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => AiConversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: AiConversation;
}
