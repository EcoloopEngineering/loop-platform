import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  SetMetadata,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FormField } from '../domain/entities/form.entity';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('forms')
export class FormController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all forms' })
  async listForms() {
    return this.prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new form' })
  async createForm(
    @Body()
    dto: {
      name: string;
      slug: string;
      description?: string;
      fields: FormField[];
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prisma.form.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        config: dto.fields as any,
        userId: user.id,
      },
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a form' })
  async updateForm(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      slug?: string;
      description?: string;
      fields?: FormField[];
      status?: string;
    },
  ) {
    return this.prisma.form.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.fields !== undefined && { config: dto.fields as any }),
        ...(dto.status !== undefined && { isActive: dto.status === 'PUBLISHED' }),
      },
    });
  }

  @Get('public/:slug')
  @SetMetadata('isPublic', true)
  @ApiOperation({ summary: 'Get a published form by slug (public, no auth)' })
  async getPublicForm(@Param('slug') slug: string) {
    const form = await this.prisma.form.findFirst({
      where: { slug, isActive: true },
    });
    if (!form) {
      throw new NotFoundException(`Form with slug "${slug}" not found`);
    }
    return form;
  }

  @Post('public/:slug/submit')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @SetMetadata('isPublic', true)
  @ApiOperation({ summary: 'Submit a form response (public, no auth)' })
  async submitPublicForm(
    @Param('slug') slug: string,
    @Body() data: Record<string, any>,
  ) {
    const form = await this.prisma.form.findFirst({
      where: { slug, isActive: true },
    });
    if (!form) {
      throw new NotFoundException(`Form with slug "${slug}" not found`);
    }

    return this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        data: data as any,
      },
    });
  }
}
