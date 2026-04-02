import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSource, RoofCondition, PropertyType, DesignType } from '@loop/shared';

// Step 1: Contact Information
export class ContactStepDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+15551234567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: LeadSource, example: LeadSource.DOOR_KNOCK })
  @IsEnum(LeadSource)
  source: LeadSource;
}

// Step 2: Home / Property Information
export class HomeStepDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  streetAddress: string;

  @ApiProperty({ example: 'Austin' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'TX' })
  @IsString()
  state: string;

  @ApiProperty({ example: '78701' })
  @IsString()
  zip: string;

  @ApiPropertyOptional({ example: 30.2672 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -97.7431 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ enum: RoofCondition, example: RoofCondition.GOOD })
  @IsEnum(RoofCondition)
  roofCondition: RoofCondition;

  @ApiPropertyOptional({ example: '200A' })
  @IsOptional()
  @IsString()
  electricalService?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  hasPool: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  hasEV: boolean;

  @ApiProperty({ enum: PropertyType, example: PropertyType.RESIDENTIAL })
  @IsEnum(PropertyType)
  propertyType: PropertyType;
}

// Step 3: Energy Information
export class EnergyStepDto {
  @ApiPropertyOptional({ example: 180.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyBill?: number;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualKwhUsage?: number;

  @ApiPropertyOptional({ example: 'Austin Energy' })
  @IsOptional()
  @IsString()
  utilityProvider?: string;
}

// Step 4: Design Information
export class DesignStepDto {
  @ApiProperty({ enum: DesignType, example: DesignType.AI_DESIGN })
  @IsEnum(DesignType)
  designType: DesignType;

  @ApiPropertyOptional({ example: 'Customer prefers panels on south-facing roof' })
  @IsOptional()
  @IsString()
  designNotes?: string;
}

// Combined DTO for the full 5-step wizard
export class CreateLeadDto {
  @ApiProperty({ type: ContactStepDto })
  @ValidateNested()
  @Type(() => ContactStepDto)
  contact: ContactStepDto;

  @ApiProperty({ type: HomeStepDto })
  @ValidateNested()
  @Type(() => HomeStepDto)
  home: HomeStepDto;

  @ApiProperty({ type: EnergyStepDto })
  @ValidateNested()
  @Type(() => EnergyStepDto)
  energy: EnergyStepDto;

  @ApiPropertyOptional({ type: DesignStepDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStepDto)
  design?: DesignStepDto;
}
