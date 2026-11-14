import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, WageType } from '../../common/enums';

export class CreateWorkerDto {
  @ApiProperty({ description: 'Full legal name of the worker', example: 'Ramesh Kumar' })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: '10-digit Indian mobile number starting with 6, 7, 8, or 9',
    example: '9845011001',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
  })
  phone: string;

  @ApiPropertyOptional({ description: 'Optional email address', example: 'ramesh.k@workforce.internal' })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @ApiProperty({ description: 'Residential address', example: 'Plot 45, Sector 12, Industrial Area' })
  @IsNotEmpty({ message: 'Address is required' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)', example: '1988-06-15' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Gender', example: 'MALE' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: 'Date of joining (YYYY-MM-DD)', example: '2024-01-15' })
  @IsNotEmpty({ message: 'Joining date is required' })
  @IsString()
  joiningDate: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Skill Category UUID' })
  @IsOptional()
  @IsString()
  skillCategoryId?: string;

  @ApiPropertyOptional({ enum: EmploymentType, default: EmploymentType.DAILY_WAGE })
  @IsOptional()
  @IsEnum(EmploymentType, { message: 'Invalid employment type' })
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Emergency contact phone or name' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  // Optional initial assignment
  @ApiPropertyOptional({ description: 'Initial work site UUID' })
  @IsOptional()
  @IsString()
  workSiteId?: string;

  @ApiPropertyOptional({ description: 'Initial shift UUID' })
  @IsOptional()
  @IsString()
  shiftId?: string;

  // Optional initial wage
  @ApiPropertyOptional({ enum: WageType, default: WageType.DAILY })
  @IsOptional()
  @IsEnum(WageType, { message: 'Invalid wage type' })
  wageType?: WageType;

  @ApiPropertyOptional({ description: 'Initial wage rate amount', example: '850.00' })
  @IsOptional()
  @IsString()
  wageRate?: string;
}
