import { IsOptional, IsString, IsEmail, IsEnum, IsBoolean, IsArray, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Full legal name of the user' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'New password' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be either ADMIN or SUPERVISOR' })
  role?: Role;

  @ApiPropertyOptional({ description: 'Account active flag (true for active, false for inactive)' })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Work site UUIDs assigned to this supervisor', type: [String] })
  @IsOptional()
  @IsArray()
  assignedSiteIds?: string[];
}

export class ChangeUserStatusDto {
  @ApiPropertyOptional({ description: 'Target active status' })
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive: boolean;
}
