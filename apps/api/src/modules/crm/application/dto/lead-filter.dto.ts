import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStage, LeadSource } from '@loop/shared';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class LeadFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: LeadStage })
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}
