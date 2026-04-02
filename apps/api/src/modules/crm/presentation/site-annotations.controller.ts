import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateSiteAnnotationDto,
  UpdateSiteAnnotationDto,
} from '../application/dto/site-annotation.dto';

@ApiTags('Site Annotations')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class SiteAnnotationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':leadId/annotations')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Create a site annotation for a lead' })
  async create(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: CreateSiteAnnotationDto,
    @CurrentUser('id') userId: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const annotation = await this.prisma.siteAnnotation.create({
      data: {
        leadId,
        type: dto.type,
        geometryType: dto.geometryType,
        coordinates: dto.coordinates,
        label: dto.label,
        note: dto.note,
        color: dto.color,
        createdById: userId,
      },
    });

    const typeLabel = dto.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const description = dto.label
      ? `Site annotation added: ${typeLabel} at ${dto.label}`
      : `Site annotation added: ${typeLabel}`;

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: 'SITE_ANNOTATION',
        description,
        metadata: { annotationId: annotation.id, annotationType: dto.type },
      },
    });

    return annotation;
  }

  @Get(':leadId/annotations')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP, UserRole.REFERRAL)
  @ApiOperation({ summary: 'List all site annotations for a lead' })
  async findAll(@Param('leadId', ParseUUIDPipe) leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.siteAnnotation.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Patch(':leadId/annotations/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update a site annotation' })
  async update(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSiteAnnotationDto,
  ) {
    const annotation = await this.prisma.siteAnnotation.findFirst({
      where: { id, leadId },
    });
    if (!annotation) throw new NotFoundException('Annotation not found');

    return this.prisma.siteAnnotation.update({
      where: { id },
      data: dto,
    });
  }

  @Delete(':leadId/annotations/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Delete a site annotation' })
  async remove(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const annotation = await this.prisma.siteAnnotation.findFirst({
      where: { id, leadId },
    });
    if (!annotation) throw new NotFoundException('Annotation not found');

    const typeLabel = annotation.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const description = annotation.label
      ? `Site annotation removed: ${typeLabel} at ${annotation.label}`
      : `Site annotation removed: ${typeLabel}`;

    await this.prisma.siteAnnotation.delete({ where: { id } });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: 'SITE_ANNOTATION',
        description,
        metadata: { annotationId: id, annotationType: annotation.type },
      },
    });

    return { success: true };
  }
}
