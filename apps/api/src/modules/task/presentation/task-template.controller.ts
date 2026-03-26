import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from '../application/dto/create-task-template.dto';

@ApiTags('Task Templates')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('task-templates')
export class TaskTemplateController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List task templates' })
  @ApiQuery({ name: 'stage', required: false })
  async list(@Query('stage') stage?: string) {
    const where: any = {};
    if (stage) where.stage = stage;

    return this.prisma.taskTemplate.findMany({
      where,
      orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a task template' })
  async create(@Body() dto: CreateTaskTemplateDto) {
    return this.prisma.taskTemplate.create({
      data: {
        stage: dto.stage,
        title: dto.title,
        description: dto.description,
        defaultAssigneeRole: dto.defaultAssigneeRole,
        defaultAssigneeEmail: dto.defaultAssigneeEmail,
        subtasks: dto.subtasks ?? undefined,
        conditions: dto.conditions ?? undefined,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a task template' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskTemplateDto,
  ) {
    const existing = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task template not found');

    const data: any = {};
    if (dto.stage !== undefined) data.stage = dto.stage;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.defaultAssigneeRole !== undefined) data.defaultAssigneeRole = dto.defaultAssigneeRole;
    if (dto.defaultAssigneeEmail !== undefined) data.defaultAssigneeEmail = dto.defaultAssigneeEmail;
    if (dto.subtasks !== undefined) data.subtasks = dto.subtasks;
    if (dto.conditions !== undefined) data.conditions = dto.conditions;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.taskTemplate.update({
      where: { id },
      data,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a task template' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const existing = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task template not found');

    return this.prisma.taskTemplate.delete({ where: { id } });
  }
}
