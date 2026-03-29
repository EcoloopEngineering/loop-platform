import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TtlCache } from '../../../../common/utils/ttl-cache';
import {
  SETTINGS_REPOSITORY,
  SettingsRepositoryPort,
} from '../ports/settings.repository.port';

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
  private readonly settingsCache = new TtlCache<Record<string, SettingValue>>(2 * 60 * 1000); // 2 min

  constructor(
    @Inject(SETTINGS_REPOSITORY)
    private readonly settingsRepo: SettingsRepositoryPort,
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
    const cached = this.settingsCache.get();
    if (cached) return cached;

    const settings = await this.settingsRepo.findAll();
    const result: Record<string, SettingValue> = {};
    for (const s of settings) {
      result[s.key] = s.value as SettingValue;
    }
    this.settingsCache.set(result);
    return result;
  }

  async getByKey(key: string): Promise<SettingValue> {
    const setting = await this.settingsRepo.findByKey(key);
    return (setting?.value as SettingValue) ?? {};
  }

  async upsert(key: string, value: SettingValue, userId: string): Promise<SettingValue> {
    const existing = await this.settingsRepo.findByKey(key);
    const current = (existing?.value as SettingValue) ?? {};
    const merged = { ...current, ...value };

    const updated = await this.settingsRepo.upsert(key, merged, userId);

    this.settingsCache.invalidate();
    return updated.value as SettingValue;
  }
}
