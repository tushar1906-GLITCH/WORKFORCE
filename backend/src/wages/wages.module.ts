import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WageRateHistory, Worker } from '../database/entities';
import { WagesService } from './wages.service';
import { WagesController } from './wages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WageRateHistory, Worker])],
  controllers: [WagesController],
  providers: [WagesService],
  exports: [WagesService],
})
export class WagesModule {}
