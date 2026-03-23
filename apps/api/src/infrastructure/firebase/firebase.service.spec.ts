import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from './firebase.service';

describe('FirebaseService', () => {
  let service: FirebaseService;
  let configGet: jest.Mock;

  function buildModule(envMap: Record<string, string | undefined> = {}) {
    configGet = jest.fn((key: string) => envMap[key] ?? undefined);
    return Test.createTestingModule({
      providers: [
        FirebaseService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();
  }

  it('should not configure firebase when credentials are missing', async () => {
    const module = await buildModule({});
    service = module.get(FirebaseService);
    service.onModuleInit();

    expect(service.isConfigured()).toBe(false);
  });

  it('should report isConfigured() false when no app is set', async () => {
    const module = await buildModule({ FIREBASE_PROJECT_ID: 'proj' });
    service = module.get(FirebaseService);
    service.onModuleInit(); // missing clientEmail + privateKey

    expect(service.isConfigured()).toBe(false);
  });

  it('should request all three env vars during init', async () => {
    const module = await buildModule({});
    service = module.get(FirebaseService);
    service.onModuleInit();

    expect(configGet).toHaveBeenCalledWith('FIREBASE_PROJECT_ID');
    expect(configGet).toHaveBeenCalledWith('FIREBASE_PRIVATE_KEY');
    expect(configGet).toHaveBeenCalledWith('FIREBASE_CLIENT_EMAIL');
  });
});
