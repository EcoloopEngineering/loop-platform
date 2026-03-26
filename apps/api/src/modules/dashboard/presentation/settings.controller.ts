import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('integrations-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get integration health status' })
  getIntegrationsStatus() {
    const check = (vars: string[]) => vars.every((v) => !!this.config.get(v));
    return [
      {
        name: 'Aurora Solar',
        description: 'AI solar design',
        icon: 'solar_power',
        connected: check(['AURORA_SERVICE_URL', 'AURORA_SERVICE_TOKEN']),
      },
      {
        name: 'Stripe',
        description: 'Payment processing',
        icon: 'payments',
        connected: check(['STRIPE_SECRET_KEY']),
      },
      {
        name: 'ZapSign',
        description: 'E-signatures',
        icon: 'draw',
        connected: check(['ZAPSIGN_API_TOKEN']),
      },
      {
        name: 'Nodemailer',
        description: 'Transactional email (Gmail)',
        icon: 'email',
        connected: check(['NODEMAILER_USER', 'NODEMAILER_PASS']),
      },
      {
        name: 'AWS S3',
        description: 'File storage',
        icon: 'cloud_upload',
        connected: check(['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']),
      },
      {
        name: 'Firebase',
        description: 'Google Login + Push',
        icon: 'firebase',
        connected: check(['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL']),
      },
      {
        name: 'Google Chat',
        description: 'Team notifications',
        icon: 'chat',
        connected: check(['GOOGLE_ADMIN_CREDENTIALS']),
      },
      {
        name: 'Jobber',
        description: 'Field scheduling',
        icon: 'construction',
        connected: check(['JOBBER_SERVICE_URL', 'JOBBER_SERVICE_TOKEN']),
      },
    ];
  }

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
