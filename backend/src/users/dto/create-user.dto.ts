import { IsNotEmpty, IsString, IsOptional, IsEmail, IsEnum, IsArray, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums';

export class CreateUserDto {
  @ApiProperty({ description: 'Full legal name of the user', example: 'Marcus Brody' })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Unique user email address', example: 'supervisor1@workforce.internal' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @ApiPropertyOptional({ description: 'Account password (minimum 6 characters)', example: 'SecurePass@123' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @ApiProperty({ enum: Role, default: Role.SUPERVISOR })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(Role, { message: 'Role must be either ADMIN or SUPERVISOR' })
  role: Role;

  @ApiPropertyOptional({ description: 'Work site UUIDs assigned to this supervisor', type: [String] })
  @IsOptional()
  @IsArray()
  assignedSiteIds?: string[];
}
