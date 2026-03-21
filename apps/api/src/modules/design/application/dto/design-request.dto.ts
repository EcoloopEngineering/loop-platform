import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DesignType } from '../../domain/entities/design-request.entity';

export class CreateDesignRequestDto {
  @ApiProperty({ enum: DesignType, example: DesignType.STANDARD })
  @IsEnum(DesignType)
  @IsNotEmpty()
  designType: DesignType;

  @ApiProperty({ example: false })
  @IsBoolean()
  treeRemoval: boolean;

  @ApiPropertyOptional({ example: 'Customer prefers panels on south-facing roof' })
  @IsOptional()
  @IsString()
  notes?: string;
}
