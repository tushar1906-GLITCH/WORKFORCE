import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Worker,
  Attendance,
  LeaveRequest,
  PayrollRun,
  PayrollPayment,
  WorkSite,
  Department,
  SupervisorSite,
} from '../database/entities';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Worker,
      Attendance,
      LeaveRequest,
      PayrollRun,
      PayrollPayment,
      WorkSite,
      Department,
      SupervisorSite,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
