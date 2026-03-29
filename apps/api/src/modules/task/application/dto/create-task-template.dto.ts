import { IsString, IsOptional, IsInt, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

interface SubtaskDefinition {
  title: string;
  description?: string;
}

export class CreateTaskTemplateDto {
  @ApiProperty({ description: 'Pipeline stage this template applies to' })
  @IsString()
  stage: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Role of the default assignee (e.g. ADMIN, MANAGER)' })
  @IsOptional()
  @IsString()
  defaultAssigneeRole?: string;

  @ApiPropertyOptional({ description: 'Email of the default assignee' })
  @IsOptional()
  @IsString()
  defaultAssigneeEmail?: string;

  @ApiPropertyOptional({ description: 'Array of subtask definitions [{title, description}]' })
  @IsOptional()
  @IsObject({ each: true })
  subtasks?: SubtaskDefinition[];

  @ApiPropertyOptional({ description: 'Conditions to evaluate (e.g. {state: "CT", hasStructural: true})' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTaskTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultAssigneeRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultAssigneeEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject({ each: true })
  subtasks?: SubtaskDefinition[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
