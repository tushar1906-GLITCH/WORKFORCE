import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkSiteDto {
  @ApiProperty({ description: 'Unique name of the work location / site', example: 'Apex Tower Phase 2' })
  @IsNotEmpty({ message: 'Location name is required' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Physical street address / GPS coordinates', example: 'Sector 62, Noida, UP' })
  @IsNotEmpty({ message: 'Address is required' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Description or operational details' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Array of supervisor user UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  supervisorIds?: string[];
}
