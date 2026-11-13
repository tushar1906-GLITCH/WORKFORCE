import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PayrollRun,
  PayrollItem,
  Worker,
  Attendance,
  WageRateHistory,
  WorkerAdvance,
  LeaveRequest,
  OrgSetting,
} from '../database/entities';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollRun,
      PayrollItem,
      Worker,
      Attendance,
      WageRateHistory,
      WorkerAdvance,
      LeaveRequest,
      OrgSetting,
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
