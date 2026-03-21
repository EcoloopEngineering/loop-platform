import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStage, LeadSource } from '@loop/shared';

export class LeadScoreResponseDto {
  @ApiProperty() totalScore: number;
  @ApiProperty() roofScore: number;
  @ApiProperty() energyScore: number;
  @ApiProperty() contactScore: number;
  @ApiProperty() propertyScore: number;
  @ApiPropertyOptional() calculatedAt?: Date;
}

export class LeadCustomerResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiPropertyOptional() email?: string | null;
  @ApiPropertyOptional() phone?: string | null;
}

export class LeadPropertyResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() streetAddress: string;
  @ApiProperty() city: string;
  @ApiProperty() state: string;
  @ApiProperty() zip: string;
  @ApiPropertyOptional() latitude?: number | null;
  @ApiPropertyOptional() longitude?: number | null;
  @ApiPropertyOptional() roofCondition?: string;
  @ApiPropertyOptional() monthlyBill?: number | null;
  @ApiPropertyOptional() propertyType?: string;
}

export class LeadAssignmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() splitPct: number;
  @ApiProperty() isPrimary: boolean;
  @ApiPropertyOptional() userName?: string;
}

export class LeadResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: LeadStage }) currentStage: LeadStage;
  @ApiProperty({ enum: LeadSource }) source: LeadSource;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() wonAt?: Date | null;
  @ApiPropertyOptional() lostAt?: Date | null;
  @ApiPropertyOptional() lostReason?: string | null;

  @ApiProperty({ type: LeadCustomerResponseDto })
  customer: LeadCustomerResponseDto;

  @ApiProperty({ type: LeadPropertyResponseDto })
  property: LeadPropertyResponseDto;

  @ApiPropertyOptional({ type: LeadScoreResponseDto })
  score?: LeadScoreResponseDto | null;

  @ApiPropertyOptional({ type: [LeadAssignmentResponseDto] })
  assignments?: LeadAssignmentResponseDto[];
}
