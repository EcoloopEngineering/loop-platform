import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentGenerationService } from './document-generation.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PdfService } from '../../../infrastructure/pdf/pdf.service';
import { ZapSignService } from '../../../integrations/zapsign/zapsign.service';
import { EmailService } from '../../../infrastructure/email/email.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('DocumentGenerationService', () => {
  let service: DocumentGenerationService;
  let prisma: MockPrismaService;
  let pdfService: { generateChangeOrder: jest.Mock; generateCAP: jest.Mock };
  let zapSignService: { isConfigured: jest.Mock; createDocument: jest.Mock };
  let emailService: { send: jest.Mock };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'rep@ecoloop.us',
    firstName: 'John',
    lastName: 'Doe',
    role: 'SALES_REP' as any,
    isActive: true,
    profileImage: null,
  };

  const mockLead = {
    id: 'lead-1',
    systemSize: 8.5,
    customer: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
    property: {
      streetAddress: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      monthlyBill: 150,
    },
  };

  const mockPdfBuffer = Buffer.from('fake-pdf-content');

  beforeEach(async () => {
    prisma = createMockPrismaService();
    pdfService = {
      generateChangeOrder: jest.fn().mockResolvedValue(mockPdfBuffer),
      generateCAP: jest.fn().mockResolvedValue(mockPdfBuffer),
    };
    zapSignService = {
      isConfigured: jest.fn().mockReturnValue(false),
      createDocument: jest.fn(),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        DocumentGenerationService,
        { provide: PrismaService, useValue: prisma },
        { provide: PdfService, useValue: pdfService },
        { provide: ZapSignService, useValue: zapSignService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(DocumentGenerationService);
  });

  describe('generateChangeOrder', () => {
    it('should generate a change order PDF and return document info', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.document.create.mockResolvedValue({ id: 'doc-1' });
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await service.generateChangeOrder(
        'lead-1',
        { changes: ['Panel upgrade'], notes: 'Rush' },
        mockUser,
      );

      expect(result.id).toBe('doc-1');
      expect(result.name).toContain('change-order-lead-1');
      expect(result.url).toBe('/api/v1/documents/doc-1/download');
      expect(result.size).toBe(mockPdfBuffer.length);

      expect(pdfService.generateChangeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Jane Smith',
          address: '123 Main St, Austin, TX 78701',
          systemSize: '8.5',
          monthlyPayment: '$150',
          changes: ['Panel upgrade'],
          notes: 'Rush',
        }),
      );

      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'lead-1',
            type: 'CONTRACT',
            uploadedById: 'user-1',
          }),
        }),
      );

      expect(prisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'lead-1',
            userId: 'user-1',
            type: 'DOCUMENT_UPLOADED',
          }),
        }),
      );
    });

    it('should throw NotFoundException when lead is not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.generateChangeOrder('nonexistent', { changes: [] }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateCAP', () => {
    it('should send for e-signature in approval mode when ZapSign is configured', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.document.create.mockResolvedValue({ id: 'doc-2' });
      prisma.leadActivity.create.mockResolvedValue({});
      zapSignService.isConfigured.mockReturnValue(true);
      zapSignService.createDocument.mockResolvedValue({
        token: 'zap-token-123',
        status: 'pending',
      });

      const result = await service.generateCAP(
        'lead-1',
        { mode: 'approval' },
        mockUser,
      );

      expect(result.zapSign).toEqual({
        token: 'zap-token-123',
        status: 'pending',
      });
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
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('should send email and move to ENGINEERING in informative mode', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.document.create.mockResolvedValue({ id: 'doc-3' });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.lead.update.mockResolvedValue({});

      const result = await service.generateCAP(
        'lead-1',
        { mode: 'informative' },
        mockUser,
      );

      expect(result.zapSign).toBeNull();
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

    it('should throw NotFoundException when lead is not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCAP('nonexistent', { mode: 'approval' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
