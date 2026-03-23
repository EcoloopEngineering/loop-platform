import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  const mockSendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  function createService(envVars: Record<string, string | undefined>): EmailService {
    const configGet = jest.fn((key: string, defaultValue?: string) => envVars[key] ?? defaultValue);
    const configService = { get: configGet } as unknown as ConfigService;

    // We need to instantiate directly because Test.createTestingModule
    // calls constructor at module compile time
    return new EmailService(configService);
  }

  describe('constructor', () => {
    it('should configure transporter when credentials are provided', () => {
      const service = createService({ NODEMAILER_USER: 'user@test.com', NODEMAILER_PASS: 'pass123' });

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: { user: 'user@test.com', pass: 'pass123' },
      });
      expect(service.isConfigured()).toBe(true);
    });

    it('should not configure transporter when credentials are missing', () => {
      const service = createService({});

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('send', () => {
    it('should send email successfully and return true', async () => {
      const service = createService({ NODEMAILER_USER: 'user@test.com', NODEMAILER_PASS: 'pass' });
      mockSendMail.mockResolvedValue({ messageId: '123' });

      const result = await service.send({
        to: 'recipient@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"ecoLoop" <user@test.com>',
        to: 'recipient@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        attachments: undefined,
      });
    });

    it('should return false when transporter is not configured', async () => {
      const service = createService({});

      const result = await service.send({
        to: 'recipient@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result).toBe(false);
    });

    it('should return false when sendMail throws', async () => {
      const service = createService({ NODEMAILER_USER: 'u@t.com', NODEMAILER_PASS: 'p' });
      mockSendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.send({
        to: 'recipient@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result).toBe(false);
    });

    it('should join array of recipients with comma', async () => {
      const service = createService({ NODEMAILER_USER: 'u@t.com', NODEMAILER_PASS: 'p' });
      mockSendMail.mockResolvedValue({});

      await service.send({
        to: ['a@test.com', 'b@test.com'],
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@test.com, b@test.com' }),
      );
    });

    it('should use custom from address when provided', async () => {
      const service = createService({ NODEMAILER_USER: 'u@t.com', NODEMAILER_PASS: 'p' });
      mockSendMail.mockResolvedValue({});

      await service.send({
        to: 'a@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        from: 'custom@sender.com',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'custom@sender.com' }),
      );
    });
  });

  describe('isConfigured', () => {
    it('should return true when transporter exists', () => {
      const service = createService({ NODEMAILER_USER: 'u@t.com', NODEMAILER_PASS: 'p' });
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when transporter is null', () => {
      const service = createService({});
      expect(service.isConfigured()).toBe(false);
    });
  });
});
