import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SettingsRepositoryPort } from '../../application/ports/settings.repository.port';

@Injectable()
export class PrismaSettingsRepository implements SettingsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<{ key: string; value: unknown }[]> {
    return this.prisma.appSetting.findMany();
  }

  async findByKey(key: string): Promise<{ key: string; value: unknown } | null> {
    return this.prisma.appSetting.findUnique({ where: { key } });
  }

  async upsert(key: string, value: unknown, userId: string): Promise<{ key: string; value: unknown }> {
    return this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value: value as any, updatedBy: userId, updatedAt: new Date() },
      update: { value: value as any, updatedBy: userId, updatedAt: new Date() },
    });
  }
}
