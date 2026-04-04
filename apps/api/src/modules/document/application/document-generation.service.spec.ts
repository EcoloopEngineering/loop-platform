import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentGenerationService } from './document-generation.service';
import { DOCUMENT_REPOSITORY } from './ports/document.repository.port';
import { PdfService } from '../../../infrastructure/pdf/pdf.service';
import { DocumentDeliveryService } from './services/document-delivery.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('DocumentGenerationService', () => {
  let service: DocumentGenerationService;
  let documentRepo: {
    findLeadWithCustomerAndProperty: jest.Mock;
    createDocument: jest.Mock;
    createLeadActivity: jest.Mock;
  };
  let pdfService: { generateChangeOrder: jest.Mock; generateCAP: jest.Mock };
  let deliveryService: { handleCAPDelivery: jest.Mock };
  let emitter: { emit: jest.Mock };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'rep@ecoloop.us',
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
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
    documentRepo = {
      findLeadWithCustomerAndProperty: jest.fn(),
      createDocument: jest.fn(),
      createLeadActivity: jest.fn(),
    };
    pdfService = {
      generateChangeOrder: jest.fn().mockResolvedValue(mockPdfBuffer),
      generateCAP: jest.fn().mockResolvedValue(mockPdfBuffer),
    };
    deliveryService = {
      handleCAPDelivery: jest.fn().mockResolvedValue(null),
    };
    emitter = {
      emit: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        DocumentGenerationService,
        { provide: DOCUMENT_REPOSITORY, useValue: documentRepo },
        { provide: PdfService, useValue: pdfService },
        { provide: DocumentDeliveryService, useValue: deliveryService },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(DocumentGenerationService);
  });

  describe('generateChangeOrder', () => {
    it('should generate a change order PDF and return document info', async () => {
      documentRepo.findLeadWithCustomerAndProperty.mockResolvedValue(mockLead);
      documentRepo.createDocument.mockResolvedValue({ id: 'doc-1' });
      documentRepo.createLeadActivity.mockResolvedValue({});

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

      expect(documentRepo.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          type: 'CONTRACT',
          uploadedById: 'user-1',
        }),
      );

      expect(documentRepo.createLeadActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          userId: 'user-1',
          type: 'DOCUMENT_UPLOADED',
        }),
      );

      expect(emitter.emit).toHaveBeenCalledWith('lead.changeOrderCreated', {
        leadId: 'lead-1',
        changes: ['Panel upgrade'],
        userId: 'user-1',
        customerName: 'Jane Smith',
      });
    });

    it('should throw NotFoundException when lead is not found', async () => {
      documentRepo.findLeadWithCustomerAndProperty.mockResolvedValue(null);

      await expect(
        service.generateChangeOrder('nonexistent', { changes: [] }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateCAP', () => {
    it('should delegate delivery to DocumentDeliveryService for approval mode', async () => {
      documentRepo.findLeadWithCustomerAndProperty.mockResolvedValue(mockLead);
      documentRepo.createDocument.mockResolvedValue({ id: 'doc-2' });
      documentRepo.createLeadActivity.mockResolvedValue({});
      deliveryService.handleCAPDelivery.mockResolvedValue({
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
      expect(deliveryService.handleCAPDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'approval',
          customerName: 'Jane Smith',
        }),
      );
    });

    it('should delegate delivery to DocumentDeliveryService for informative mode', async () => {
      documentRepo.findLeadWithCustomerAndProperty.mockResolvedValue(mockLead);
      documentRepo.createDocument.mockResolvedValue({ id: 'doc-3' });
      documentRepo.createLeadActivity.mockResolvedValue({});
      deliveryService.handleCAPDelivery.mockResolvedValue(null);

      const result = await service.generateCAP(
        'lead-1',
        { mode: 'informative' },
        mockUser,
      );

      expect(result.zapSign).toBeNull();
      expect(deliveryService.handleCAPDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'informative',
        }),
      );
    });

    it('should throw NotFoundException when lead is not found', async () => {
      documentRepo.findLeadWithCustomerAndProperty.mockResolvedValue(null);

      await expect(
        service.generateCAP('nonexistent', { mode: 'approval' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
