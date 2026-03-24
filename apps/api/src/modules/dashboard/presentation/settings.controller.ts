import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all app settings' })
  async getAll() {
    const settings = await this.prisma.appSetting.findMany();
    const result: Record<string, any> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  @Get(':key')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get a specific setting by key' })
  async getByKey(@Param('key') key: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    return setting?.value ?? {};
  }

  @Put(':key')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a setting (merge)' })
  async update(
    @Param('key') key: string,
    @Body() value: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    const existing = await this.prisma.appSetting.findUnique({ where: { key } });
    const current = (existing?.value as Record<string, any>) ?? {};
    const merged = { ...current, ...value };

    const updated = await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value: merged, updatedBy: userId, updatedAt: new Date() },
      update: { value: merged, updatedBy: userId, updatedAt: new Date() },
    });

    return updated.value;
  }
}
