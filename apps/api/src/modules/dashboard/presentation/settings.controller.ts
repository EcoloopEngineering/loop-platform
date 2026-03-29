import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@loop/shared';
import { SettingsService, SettingValue } from '../application/services/settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('integrations-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get integration health status' })
  getIntegrationsStatus() {
    return this.settingsService.getIntegrationsStatus();
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all app settings' })
  getAll() {
    return this.settingsService.getAll();
  }

  @Get(':key')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get a specific setting by key' })
  getByKey(@Param('key') key: string) {
    return this.settingsService.getByKey(key);
  }

  @Put(':key')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a setting (merge)' })
  update(
    @Param('key') key: string,
    @Body() value: SettingValue,
    @CurrentUser('id') userId: string,
  ) {
    return this.settingsService.upsert(key, value, userId);
  }
}
