import { Test, TestingModule } from '@nestjs/testing';
import { PrismaSettingsRepository } from './prisma-settings.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaSettingsRepository', () => {
  let repository: PrismaSettingsRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaSettingsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaSettingsRepository>(PrismaSettingsRepository);
  });

  describe('findAll', () => {
    it('should return all settings', async () => {
      const settings = [
        { key: 'notifications', value: { email: true } },
        { key: 'theme', value: { primary: '#00897B' } },
      ];
      prisma.appSetting.findMany.mockResolvedValue(settings);

      const result = await repository.findAll();

      expect(result).toEqual(settings);
      expect(prisma.appSetting.findMany).toHaveBeenCalled();
    });
  });

  describe('findByKey', () => {
    it('should return setting by key', async () => {
      const setting = { key: 'notifications', value: { email: true } };
      prisma.appSetting.findUnique.mockResolvedValue(setting);

      const result = await repository.findByKey('notifications');

      expect(result).toEqual(setting);
      expect(prisma.appSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'notifications' },
      });
    });

    it('should return null when key not found', async () => {
      prisma.appSetting.findUnique.mockResolvedValue(null);

      const result = await repository.findByKey('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should upsert a setting', async () => {
      const result = { key: 'notifications', value: { email: false } };
      prisma.appSetting.upsert.mockResolvedValue(result);

      const output = await repository.upsert('notifications', { email: false }, 'user-1');

      expect(output).toEqual(result);
      expect(prisma.appSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'notifications' },
        create: expect.objectContaining({
          key: 'notifications',
          value: { email: false },
          updatedBy: 'user-1',
        }),
        update: expect.objectContaining({
          value: { email: false },
          updatedBy: 'user-1',
        }),
      });
    });
  });
});
