import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ZapSignService } from './zapsign.service';

describe('ZapSignService', () => {
  let service: ZapSignService;
  let httpService: { post: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const configGet = jest.fn((key: string, defaultValue?: string) => {
      const env: Record<string, string> = {
        ZAPSIGN_API_URL: 'https://api.zapsign.com.br/api',
        ZAPSIGN_API_TOKEN: 'test-token-123',
      };
      return env[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZapSignService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<ZapSignService>(ZapSignService);
  });

  describe('createDocument', () => {
    it('should create a document and return response', async () => {
      const docResponse = {
        open_id: 1,
        token: 'doc-token-abc',
        status: 'pending',
        name: 'Test Doc',
        signers: [{ token: 'signer-token', name: 'John', email: 'john@test.com', status: 'pending' }],
        created_at: '2026-01-01',
      };
      httpService.post.mockReturnValue(of({ data: docResponse }));

      const result = await service.createDocument({
        name: 'Test Doc',
        base64_pdf: 'base64data',
        signers: [{ name: 'John', email: 'john@test.com' }],
      });

      expect(result).toEqual(docResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.zapsign.com.br/api/v1/docs',
        { name: 'Test Doc', base64_pdf: 'base64data', signers: [{ name: 'John', email: 'john@test.com' }] },
        { headers: { Authorization: 'Bearer test-token-123', 'Content-Type': 'application/json' } },
      );
    });

    it('should throw when API call fails', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(
        service.createDocument({ name: 'Doc', base64_pdf: 'data', signers: [] }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('signDocument', () => {
    it('should sign a document and return response', async () => {
      const signResponse = { status: 'signed', signed_at: '2026-01-01T12:00:00Z' };
      httpService.post.mockReturnValue(of({ data: signResponse }));

      const result = await service.signDocument('signer-token-123');

      expect(result).toEqual(signResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.zapsign.com.br/api/v1/sign',
        { token: 'signer-token-123' },
        { headers: { Authorization: 'Bearer test-token-123', 'Content-Type': 'application/json' } },
      );
    });

    it('should throw when signing fails', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Forbidden')));

      await expect(service.signDocument('bad-token')).rejects.toThrow('Forbidden');
    });
  });

  describe('getDocumentStatus', () => {
    it('should return document status', async () => {
      const docResponse = {
        open_id: 1,
        token: 'doc-token',
        status: 'signed',
        name: 'Doc',
        signers: [],
        created_at: '2026-01-01',
      };
      httpService.get.mockReturnValue(of({ data: docResponse }));

      const result = await service.getDocumentStatus('doc-token');

      expect(result).toEqual(docResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.zapsign.com.br/api/v1/docs/doc-token',
        { headers: { Authorization: 'Bearer test-token-123', 'Content-Type': 'application/json' } },
      );
    });
  });

  describe('isConfigured', () => {
    it('should return true when apiToken is set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when apiToken is empty', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ZapSignService,
          { provide: HttpService, useValue: httpService },
          { provide: ConfigService, useValue: { get: jest.fn((key: string, def?: string) => def) } },
        ],
      }).compile();

      const unconfiguredService = module.get<ZapSignService>(ZapSignService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });
});
