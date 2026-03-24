import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

// Mock the entire AWS SDK module
jest.mock('@aws-sdk/client-s3', () => {
  const sendMock = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    __sendMock: sendMock,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com'),
}));

describe('S3Service', () => {
  let service: S3Service;
  let sendMock: jest.Mock;

  describe('when configured', () => {
    beforeEach(async () => {
      const configValues: Record<string, string> = {
        AWS_ACCESS_KEY_ID: 'test-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret',
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'test-bucket',
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultVal?: string) => configValues[key] ?? defaultVal),
            },
          },
        ],
      }).compile();

      service = module.get<S3Service>(S3Service);
      // Access the shared sendMock from the mocked module
      const awsSdk = require('@aws-sdk/client-s3');
      sendMock = awsSdk.__sendMock;
      sendMock.mockReset();
      sendMock.mockResolvedValue({});
    });

    it('isConfigured should return true', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('upload should send PutObjectCommand and return URL', async () => {
      const url = await service.upload({
        key: 'docs/file.pdf',
        body: Buffer.from('hello'),
        contentType: 'application/pdf',
      });

      expect(sendMock).toHaveBeenCalled();
      expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/docs/file.pdf');
    });

    it('delete should send DeleteObjectCommand', async () => {
      await service.delete('docs/file.pdf');
      expect(sendMock).toHaveBeenCalled();
    });

    it('delete should not throw on error', async () => {
      sendMock.mockRejectedValue(new Error('AWS error'));
      await expect(service.delete('docs/file.pdf')).resolves.toBeUndefined();
    });

    it('getSignedUrl should return a signed URL', async () => {
      const url = await service.getSignedUrl('docs/file.pdf', 3600);
      expect(url).toBe('https://signed-url.example.com');
    });

    it('getPublicUrl should return constructed URL', () => {
      const url = service.getPublicUrl('docs/file.pdf');
      expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/docs/file.pdf');
    });
  });

  describe('when NOT configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultVal?: string) => {
                if (key === 'AWS_REGION') return defaultVal ?? 'us-east-2';
                if (key === 'AWS_S3_BUCKET') return defaultVal ?? 'loop-platform-uploads';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<S3Service>(S3Service);
    });

    it('isConfigured should return false', () => {
      expect(service.isConfigured()).toBe(false);
    });

    it('upload should throw when S3 not configured', async () => {
      await expect(
        service.upload({ key: 'test', body: Buffer.from('x'), contentType: 'text/plain' }),
      ).rejects.toThrow('S3 not configured');
    });

    it('delete should be a no-op when not configured', async () => {
      await expect(service.delete('test')).resolves.toBeUndefined();
    });

    it('getSignedUrl should throw when not configured', async () => {
      await expect(service.getSignedUrl('test')).rejects.toThrow('S3 not configured');
    });
  });
});
