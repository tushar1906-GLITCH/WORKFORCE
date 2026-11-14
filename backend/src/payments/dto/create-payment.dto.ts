import { IsNotEmpty, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../common/enums';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Payroll line item UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty({ message: 'Payroll item ID is required' })
  @IsUUID('4', { message: 'Payroll item ID must be a valid UUID' })
  payrollItemId: string;

  @ApiProperty({ description: 'Payment disbursement amount in INR', example: '15000.00' })
  @IsNotEmpty({ message: 'Disbursement amount is required' })
  @IsString()
  amount: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.BANK_TRANSFER })
  @IsNotEmpty({ message: 'Payment method is required' })
  @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment disbursement date (YYYY-MM-DD)', example: '2024-11-05' })
  @IsNotEmpty({ message: 'Payment date is required' })
  @IsString()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'UTR / Transaction reference / Cheque number', example: 'UTR-9876543210' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Audit remarks or memo', example: 'Full settlement for October' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
