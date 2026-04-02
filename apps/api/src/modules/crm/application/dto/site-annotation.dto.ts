import { IsEnum, IsArray, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export enum AnnotationType {
  TREE_REMOVAL = 'TREE_REMOVAL',
  SHADE_AREA = 'SHADE_AREA',
  OBSTACLE = 'OBSTACLE',
  PANEL_PLACEMENT = 'PANEL_PLACEMENT',
  CUSTOM = 'CUSTOM',
}

export enum AnnotationGeometryType {
  POINT = 'POINT',
  POLYGON = 'POLYGON',
  LINE = 'LINE',
}

export class CreateSiteAnnotationDto {
  @IsEnum(AnnotationType)
  type: AnnotationType;

  @IsEnum(AnnotationGeometryType)
  geometryType: AnnotationGeometryType;

  @IsArray()
  coordinates: number[] | number[][] | number[][][];

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateSiteAnnotationDto extends PartialType(CreateSiteAnnotationDto) {}
