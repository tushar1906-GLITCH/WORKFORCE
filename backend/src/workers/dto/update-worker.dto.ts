import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, WageType, WorkerStatus } from '../../common/enums';

export class UpdateWorkerDto {
  @ApiPropertyOptional({ description: 'Full legal name of the worker' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: '10-digit Indian mobile number starting with 6, 7, 8, or 9',
    example: '9845011001',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'Optional email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Residential address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Skill Category UUID' })
  @IsOptional()
  @IsString()
  skillCategoryId?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType, { message: 'Invalid employment type' })
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Emergency contact phone or name' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional({ enum: WorkerStatus })
  @IsOptional()
  @IsEnum(WorkerStatus, { message: 'Invalid worker status' })
  status?: WorkerStatus;

  // Optional wage update (Admin only)
  @ApiPropertyOptional({ enum: WageType })
  @IsOptional()
  @IsEnum(WageType, { message: 'Invalid wage type' })
  wageType?: WageType;

  @ApiPropertyOptional({ description: 'Updated wage rate amount', example: '900.00' })
  @IsOptional()
  @IsString()
  wageRate?: string;
}
