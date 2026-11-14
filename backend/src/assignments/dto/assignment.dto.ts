import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'Worker UUID' })
  @IsNotEmpty({ message: 'Worker ID is required' })
  @IsString()
  workerId: string;

  @ApiProperty({ description: 'Work site UUID' })
  @IsNotEmpty({ message: 'Work site ID is required' })
  @IsString()
  workSiteId: string;

  @ApiPropertyOptional({ description: 'Shift UUID' })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiProperty({ description: 'Assignment start date (YYYY-MM-DD)', example: '2024-03-01' })
  @IsNotEmpty({ message: 'Start date is required' })
  @IsString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Assignment end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Role or trade designation on this site' })
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional({ description: 'Assigned supervisor user UUID' })
  @IsOptional()
  @IsString()
  supervisorId?: string;
}

export class TransferWorkerDto {
  @ApiProperty({ description: 'Target work site UUID' })
  @IsNotEmpty({ message: 'Target work site ID is required' })
  @IsString()
  targetWorkSiteId: string;

  @ApiPropertyOptional({ description: 'Target shift UUID' })
  @IsOptional()
  @IsString()
  targetShiftId?: string;

  @ApiProperty({ description: 'Effective date of transfer (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Effective date is required' })
  @IsString()
  effectiveDate: string;

  @ApiPropertyOptional({ description: 'Updated role title on target site' })
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional({ description: 'Transfer rationale or notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
