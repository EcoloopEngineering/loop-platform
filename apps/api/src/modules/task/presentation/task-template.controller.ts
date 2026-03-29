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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@loop/shared';
import { TaskTemplateService } from '../application/services/task-template.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from '../application/dto/create-task-template.dto';

@ApiTags('Task Templates')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('task-templates')
export class TaskTemplateController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List task templates' })
  @ApiQuery({ name: 'stage', required: false })
  async list(@Query('stage') stage?: string) {
    return this.taskTemplateService.list({ stage });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a task template' })
  async create(@Body() dto: CreateTaskTemplateDto) {
    return this.taskTemplateService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a task template' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskTemplateDto,
  ) {
    return this.taskTemplateService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a task template' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskTemplateService.delete(id);
  }
}
