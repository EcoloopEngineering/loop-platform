import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@loop/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { FormService, CreateFormDto, UpdateFormDto } from '../application/form.service';

@ApiTags('forms')
@ApiBearerAuth()
@Controller('forms')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all forms' })
  async listForms() {
    return this.formService.listForms();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new form' })
  async createForm(
    @Body() dto: CreateFormDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formService.createForm(dto, user.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a form' })
  async updateForm(
    @Param('id') id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.formService.updateForm(id, dto);
  }

  @Get('public/:slug')
  @SetMetadata('isPublic', true)
  @ApiOperation({ summary: 'Get a published form by slug (public, no auth)' })
  async getPublicForm(@Param('slug') slug: string) {
    return this.formService.getPublicForm(slug);
  }

  @Post('public/:slug/submit')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @SetMetadata('isPublic', true)
  @ApiOperation({ summary: 'Submit a form response (public, no auth)' })
  async submitPublicForm(
    @Param('slug') slug: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.formService.submitPublicForm(slug, data);
  }
}
