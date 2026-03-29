import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleChatService } from './google-chat.service';

describe('GoogleChatService', () => {
  let service: GoogleChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleChatService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(GoogleChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('isConfigured returns false when no credentials', () => {
    expect(service.isConfigured()).toBe(false);
  });

  it('sendMessage does nothing when not configured', async () => {
    await expect(service.sendMessage('space/123', 'hello')).resolves.toBeUndefined();
  });

  it('sendMessage does nothing when no spaceName', async () => {
    await expect(service.sendMessage('', 'hello')).resolves.toBeUndefined();
  });

  it('createSpace throws when not configured', async () => {
    await expect(
      service.createSpace({ displayName: 'Test' }),
    ).rejects.toThrow('Google Chat not configured');
  });

  it('sendCard does nothing when not configured', async () => {
    await expect(
      service.sendCard('space/123', 'Title', 'Sub', []),
    ).resolves.toBeUndefined();
  });

  it('deleteSpace does nothing when not configured', async () => {
    await expect(service.deleteSpace('space/123')).resolves.toBeUndefined();
  });

  describe('configured service', () => {
    it('should report isConfigured true when valid credentials provided', async () => {
      const creds = Buffer.from(JSON.stringify({ type: 'service_account' })).toString('base64');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleChatService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(creds),
            },
          },
        ],
      }).compile();

      const configuredService = module.get(GoogleChatService);
      expect(configuredService.isConfigured()).toBe(true);
    });

    it('should handle invalid base64 credentials gracefully', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleChatService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue('not-valid-json-base64'),
            },
          },
        ],
      }).compile();

      const svc = module.get(GoogleChatService);
      expect(svc.isConfigured()).toBe(false);
    });
  });
});
