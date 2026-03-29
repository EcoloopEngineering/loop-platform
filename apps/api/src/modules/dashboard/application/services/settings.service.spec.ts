import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { SETTINGS_REPOSITORY } from '../ports/settings.repository.port';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockRepo: {
    findAll: jest.Mock;
    findByKey: jest.Mock;
    upsert: jest.Mock;
  };
  let configGet: jest.Mock;

  beforeEach(async () => {
    mockRepo = {
      findAll: jest.fn(),
      findByKey: jest.fn(),
      upsert: jest.fn(),
    };
    configGet = jest.fn().mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: SETTINGS_REPOSITORY, useValue: mockRepo },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('getIntegrationsStatus', () => {
    it('should return all integrations as disconnected when no env vars set', () => {
      const result = service.getIntegrationsStatus();

      expect(result).toHaveLength(8);
      expect(result.every((i) => i.connected === false)).toBe(true);
      expect(result[0]).toEqual({
        name: 'Aurora Solar',
        description: 'AI solar design',
        icon: 'solar_power',
        connected: false,
      });
    });

    it('should mark integration as connected when all env vars are present', () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_xxx';
        return undefined;
      });

      const result = service.getIntegrationsStatus();
      const stripe = result.find((i) => i.name === 'Stripe');

      expect(stripe?.connected).toBe(true);
    });

    it('should mark integration as disconnected when only some env vars are present', () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'AURORA_SERVICE_URL') return 'http://aurora';
        return undefined;
      });

      const result = service.getIntegrationsStatus();
      const aurora = result.find((i) => i.name === 'Aurora Solar');

      expect(aurora?.connected).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all settings as key-value map', async () => {
      mockRepo.findAll.mockResolvedValue([
        { key: 'theme', value: { color: 'blue' } },
        { key: 'notifications', value: { enabled: true } },
      ]);

      const result = await service.getAll();

      expect(result).toEqual({
        theme: { color: 'blue' },
        notifications: { enabled: true },
      });
    });

    it('should return empty object when no settings exist', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      const result = await service.getAll();
      expect(result).toEqual({});
    });
  });

  describe('getByKey', () => {
    it('should return the value for an existing key', async () => {
      mockRepo.findByKey.mockResolvedValue({
        key: 'theme',
        value: { color: 'blue' },
      });

      const result = await service.getByKey('theme');
      expect(result).toEqual({ color: 'blue' });
    });

    it('should return empty object when key not found', async () => {
      mockRepo.findByKey.mockResolvedValue(null);
      const result = await service.getByKey('nonexistent');
      expect(result).toEqual({});
    });
  });

  describe('upsert', () => {
    it('should merge new values with existing setting', async () => {
      mockRepo.findByKey.mockResolvedValue({
        key: 'theme',
        value: { color: 'blue', font: 'Inter' },
      });
      mockRepo.upsert.mockResolvedValue({
        key: 'theme',
        value: { color: 'red', font: 'Inter' },
      });

      const result = await service.upsert('theme', { color: 'red' }, 'user-1');

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        'theme',
        { color: 'red', font: 'Inter' },
        'user-1',
      );
      expect(result).toEqual({ color: 'red', font: 'Inter' });
    });

    it('should create a new setting when key does not exist', async () => {
      mockRepo.findByKey.mockResolvedValue(null);
      mockRepo.upsert.mockResolvedValue({
        key: 'newKey',
        value: { foo: 'bar' },
      });

      const result = await service.upsert('newKey', { foo: 'bar' }, 'user-1');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should pass userId to upsert', async () => {
      mockRepo.findByKey.mockResolvedValue(null);
      mockRepo.upsert.mockResolvedValue({
        key: 'k',
        value: { a: 1 },
      });

      await service.upsert('k', { a: 1 }, 'user-42');

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        'k',
        { a: 1 },
        'user-42',
      );
    });
  });
});
