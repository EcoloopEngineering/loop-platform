import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export interface IntegrationStatus {
  name: string;
  description: string;
  icon: string;
  connected: boolean;
}

export interface SettingValue {
  [key: string]: unknown;
}

const INTEGRATIONS: { name: string; description: string; icon: string; envVars: string[] }[] = [
  { name: 'Aurora Solar', description: 'AI solar design', icon: 'solar_power', envVars: ['AURORA_SERVICE_URL', 'AURORA_SERVICE_TOKEN'] },
  { name: 'Stripe', description: 'Payment processing', icon: 'payments', envVars: ['STRIPE_SECRET_KEY'] },
  { name: 'ZapSign', description: 'E-signatures', icon: 'draw', envVars: ['ZAPSIGN_API_TOKEN'] },
  { name: 'Nodemailer', description: 'Transactional email (Gmail)', icon: 'email', envVars: ['NODEMAILER_USER', 'NODEMAILER_PASS'] },
  { name: 'AWS S3', description: 'File storage', icon: 'cloud_upload', envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] },
  { name: 'Firebase', description: 'Google Login + Push', icon: 'firebase', envVars: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL'] },
  { name: 'Google Chat', description: 'Team notifications', icon: 'chat', envVars: ['GOOGLE_ADMIN_CREDENTIALS'] },
  { name: 'Jobber', description: 'Field scheduling', icon: 'construction', envVars: ['JOBBER_SERVICE_URL', 'JOBBER_SERVICE_TOKEN'] },
];

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getIntegrationsStatus(): IntegrationStatus[] {
    return INTEGRATIONS.map(({ name, description, icon, envVars }) => ({
      name,
      description,
      icon,
      connected: envVars.every((v) => !!this.config.get(v)),
    }));
  }

  async getAll(): Promise<Record<string, SettingValue>> {
    const settings = await this.prisma.appSetting.findMany();
    const result: Record<string, SettingValue> = {};
    for (const s of settings) {
      result[s.key] = s.value as SettingValue;
    }
    return result;
  }

  async getByKey(key: string): Promise<SettingValue> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    return (setting?.value as SettingValue) ?? {};
  }

  async upsert(key: string, value: SettingValue, userId: string): Promise<SettingValue> {
    const existing = await this.prisma.appSetting.findUnique({ where: { key } });
    const current = (existing?.value as SettingValue) ?? {};
    const merged = { ...current, ...value };

    const updated = await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value: merged as any, updatedBy: userId, updatedAt: new Date() },
      update: { value: merged as any, updatedBy: userId, updatedAt: new Date() },
    });

    return updated.value as SettingValue;
  }
}
