import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('SettingsController', () => {
  let controller: SettingsController;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      appSetting: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  describe('getAll', () => {
    it('should return all settings as key-value map', async () => {
      prisma.appSetting.findMany.mockResolvedValue([
        { key: 'theme', value: { color: 'blue' } },
        { key: 'notifications', value: { enabled: true } },
      ]);

      const result = await controller.getAll();

      expect(result).toEqual({
        theme: { color: 'blue' },
        notifications: { enabled: true },
      });
    });

    it('should return empty object when no settings exist', async () => {
      prisma.appSetting.findMany.mockResolvedValue([]);
      const result = await controller.getAll();
      expect(result).toEqual({});
    });
  });

  describe('getByKey', () => {
    it('should return the value for an existing key', async () => {
      prisma.appSetting.findUnique.mockResolvedValue({
        key: 'theme',
        value: { color: 'blue' },
      });

      const result = await controller.getByKey('theme');
      expect(result).toEqual({ color: 'blue' });
    });

    it('should return empty object when key not found', async () => {
      prisma.appSetting.findUnique.mockResolvedValue(null);
      const result = await controller.getByKey('nonexistent');
      expect(result).toEqual({});
    });
  });

  describe('update', () => {
    it('should merge new values with existing setting', async () => {
      prisma.appSetting.findUnique.mockResolvedValue({
        key: 'theme',
        value: { color: 'blue', font: 'Inter' },
      });
      prisma.appSetting.upsert.mockResolvedValue({
        key: 'theme',
        value: { color: 'red', font: 'Inter' },
      });

      const result = await controller.update('theme', { color: 'red' }, 'user-1');

      expect(prisma.appSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'theme' },
          create: expect.objectContaining({ key: 'theme', value: { color: 'red', font: 'Inter' } }),
          update: expect.objectContaining({ value: { color: 'red', font: 'Inter' } }),
        }),
      );
      expect(result).toEqual({ color: 'red', font: 'Inter' });
    });

    it('should create a new setting when key does not exist', async () => {
      prisma.appSetting.findUnique.mockResolvedValue(null);
      prisma.appSetting.upsert.mockResolvedValue({
        key: 'newKey',
        value: { foo: 'bar' },
      });

      const result = await controller.update('newKey', { foo: 'bar' }, 'user-1');
      expect(result).toEqual({ foo: 'bar' });
    });
  });
});
