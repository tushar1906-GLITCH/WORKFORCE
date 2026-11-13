import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Worker,
  WorkerAssignment,
  WageRateHistory,
  Attendance,
  LeaveRequest,
  PayrollItem,
  SupervisorSite,
} from '../database/entities';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Worker,
      WorkerAssignment,
      WageRateHistory,
      Attendance,
      LeaveRequest,
      PayrollItem,
      SupervisorSite,
    ]),
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
