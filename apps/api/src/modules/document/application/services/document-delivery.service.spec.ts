import { Test } from '@nestjs/testing';
import { DocumentDeliveryService } from './document-delivery.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ZapSignService } from '../../../../integrations/zapsign/zapsign.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('DocumentDeliveryService', () => {
  let service: DocumentDeliveryService;
  let prisma: MockPrismaService;
  let zapSignService: { isConfigured: jest.Mock; createDocument: jest.Mock };
  let emailService: { send: jest.Mock };

  const mockPdfBuffer = Buffer.from('fake-pdf-content');

  beforeEach(async () => {
    prisma = createMockPrismaService();
    zapSignService = {
      isConfigured: jest.fn().mockReturnValue(false),
      createDocument: jest.fn(),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        DocumentDeliveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: ZapSignService, useValue: zapSignService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(DocumentDeliveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCAPDelivery', () => {
    it('should send for e-signature in approval mode when ZapSign is configured', async () => {
      zapSignService.isConfigured.mockReturnValue(true);
      zapSignService.createDocument.mockResolvedValue({
        token: 'zap-token-123',
        status: 'pending',
      });

      const result = await service.handleCAPDelivery({
        mode: 'approval',
        lead: { id: 'lead-1', customer: { firstName: 'Jane', email: 'jane@example.com' } },
        customerName: 'Jane Smith',
        fileName: 'cap.pdf',
        pdfBuffer: mockPdfBuffer,
      });

      expect(result).toEqual({ token: 'zap-token-123', status: 'pending' });
      expect(zapSignService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'CAP - Jane Smith',
          send_automatic_email: true,
          signers: [
            expect.objectContaining({
              name: 'Jane Smith',
              email: 'jane@example.com',
            }),
          ],
        }),
      );
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should send email and move to ENGINEERING in informative mode', async () => {
      prisma.lead.update.mockResolvedValue({});

      const result = await service.handleCAPDelivery({
        mode: 'informative',
        lead: { id: 'lead-1', customer: { firstName: 'Jane', email: 'jane@example.com' } },
        customerName: 'Jane Smith',
        fileName: 'cap.pdf',
        pdfBuffer: mockPdfBuffer,
      });

      expect(result).toBeNull();
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          subject: 'Your Solar Project Approval - ecoLoop',
        }),
      );
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { currentStage: 'ENGINEERING' },
      });
    });

    it('should return null when approval mode but ZapSign not configured', async () => {
      zapSignService.isConfigured.mockReturnValue(false);

      const result = await service.handleCAPDelivery({
        mode: 'approval',
        lead: { id: 'lead-1', customer: { firstName: 'Jane', email: 'jane@example.com' } },
        customerName: 'Jane Smith',
        fileName: 'cap.pdf',
        pdfBuffer: mockPdfBuffer,
      });

      expect(result).toBeNull();
      expect(zapSignService.createDocument).not.toHaveBeenCalled();
    });

    it('should return null when customer has no email', async () => {
      const result = await service.handleCAPDelivery({
        mode: 'informative',
        lead: { id: 'lead-1', customer: { firstName: 'Jane', email: null } },
        customerName: 'Jane Smith',
        fileName: 'cap.pdf',
        pdfBuffer: mockPdfBuffer,
      });

      expect(result).toBeNull();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('sendForESignature', () => {
    it('should return null on ZapSign failure', async () => {
      zapSignService.createDocument.mockRejectedValue(new Error('API error'));

      const result = await service.sendForESignature('Jane Smith', 'jane@example.com', mockPdfBuffer);

      expect(result).toBeNull();
    });
  });

  describe('sendInformativeEmail', () => {
    it('should send email with PDF attachment', async () => {
      await service.sendInformativeEmail('jane@example.com', 'Jane', 'cap.pdf', mockPdfBuffer);

      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          attachments: [
            expect.objectContaining({
              filename: 'cap.pdf',
              contentType: 'application/pdf',
            }),
          ],
        }),
      );
    });
  });
});
