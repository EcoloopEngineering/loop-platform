import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from '../application/services/settings.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: jest.Mocked<SettingsService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<SettingsService>> = {
      getIntegrationsStatus: jest.fn(),
      getAll: jest.fn(),
      getByKey: jest.fn(),
      upsert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get(SettingsService);
  });

  describe('getIntegrationsStatus', () => {
    it('should delegate to SettingsService', () => {
      const expected = [{ name: 'Stripe', description: 'Payment processing', icon: 'payments', connected: true }];
      service.getIntegrationsStatus.mockReturnValue(expected);

      const result = controller.getIntegrationsStatus();

      expect(service.getIntegrationsStatus).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('getAll', () => {
    it('should delegate to SettingsService', async () => {
      const expected = { theme: { color: 'blue' } };
      service.getAll.mockResolvedValue(expected);

      const result = await controller.getAll();

      expect(service.getAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('getByKey', () => {
    it('should delegate to SettingsService with key', async () => {
      const expected = { color: 'blue' };
      service.getByKey.mockResolvedValue(expected);

      const result = await controller.getByKey('theme');

      expect(service.getByKey).toHaveBeenCalledWith('theme');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should delegate to SettingsService with key, value, and userId', async () => {
      const expected = { color: 'red', font: 'Inter' };
      service.upsert.mockResolvedValue(expected);

      const result = await controller.update('theme', { color: 'red' }, 'user-1');

      expect(service.upsert).toHaveBeenCalledWith('theme', { color: 'red' }, 'user-1');
      expect(result).toEqual(expected);
    });
  });
});
