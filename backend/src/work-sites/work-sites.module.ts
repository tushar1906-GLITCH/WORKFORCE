import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkSite, SupervisorSite, WorkerAssignment } from '../database/entities';
import { WorkSitesService } from './work-sites.service';
import { WorkSitesController } from './work-sites.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkSite, SupervisorSite, WorkerAssignment])],
  controllers: [WorkSitesController],
  providers: [WorkSitesService],
  exports: [WorkSitesService],
})
export class WorkSitesModule {}
