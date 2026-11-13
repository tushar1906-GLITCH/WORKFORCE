import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import * as entities from './database/entities';

import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkSitesModule } from './work-sites/work-sites.module';
import { DepartmentsModule } from './departments/departments.module';
import { SkillsModule } from './skills/skills.module';
import { ShiftsModule } from './shifts/shifts.module';
import { WorkersModule } from './workers/workers.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { WagesModule } from './wages/wages.module';
import { AdvancesModule } from './advances/advances.module';
import { PayrollModule } from './payroll/payroll.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host', '127.0.0.1'),
        port: config.get<number>('database.port', 5433),
        username: config.get<string>('database.username', 'postgres'),
        password: config.get<string>('database.password', ''),
        database: config.get<string>('database.database', 'workforce_db'),
        entities: Object.values(entities),
        synchronize: false,
        logging: ['error'],
      }),
      inject: [ConfigService],
    }),
    ActivityLogsModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    WorkSitesModule,
    DepartmentsModule,
    SkillsModule,
    ShiftsModule,
    WorkersModule,
    AssignmentsModule,
    AttendanceModule,
    LeaveModule,
    WagesModule,
    AdvancesModule,
    PayrollModule,
    PaymentsModule,
    ReportsModule,
    SettingsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
