import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AiConversation,
  AiMessage,
  Worker,
  WorkSite,
  Department,
  Shift,
  Attendance,
  LeaveRequest,
  WorkerAssignment,
  PayrollRun,
  PayrollItem,
  User,
  SupervisorSite,
} from '../database/entities';
import { GroqService } from './groq.service';
import { AiToolsService } from './ai-tools.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiConversation,
      AiMessage,
      Worker,
      WorkSite,
      Department,
      Shift,
      Attendance,
      LeaveRequest,
      WorkerAssignment,
      PayrollRun,
      PayrollItem,
      User,
      SupervisorSite,
    ]),
  ],
  controllers: [AiController],
  providers: [GroqService, AiToolsService, AiService],
  exports: [AiService, AiToolsService],
})
export class AiModule {}
