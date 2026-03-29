import { Test, TestingModule } from '@nestjs/testing';
import { PrismaDocumentRepository } from './prisma-document.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaDocumentRepository', () => {
  let repository: PrismaDocumentRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaDocumentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaDocumentRepository>(PrismaDocumentRepository);
  });

  describe('findLeadById', () => {
    it('should return lead by id', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });

      const result = await repository.findLeadById('lead-1');

      expect(result).toEqual({ id: 'lead-1' });
      expect(prisma.lead.findUnique).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
    });

    it('should return null when lead not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      const result = await repository.findLeadById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createDocument', () => {
    it('should create a document', async () => {
      const data = {
        leadId: 'lead-1',
        type: 'CHANGE_ORDER',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        fileKey: 'uploads/doc.pdf',
        uploadedById: 'user-1',
        metadata: {},
      };
      prisma.document.create.mockResolvedValue({ id: 'doc-1', ...data });

      const result = await repository.createDocument(data);

      expect(result).toEqual(expect.objectContaining({ id: 'doc-1' }));
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: 'lead-1',
          fileName: 'doc.pdf',
        }),
      });
    });
  });

  describe('createLeadActivity', () => {
    it('should create a lead activity', async () => {
      const data = {
        leadId: 'lead-1',
        userId: 'user-1',
        type: 'DOCUMENT_UPLOADED',
        description: 'Document uploaded',
        metadata: { fileName: 'doc.pdf' },
      };
      prisma.leadActivity.create.mockResolvedValue({ id: 'act-1', ...data });

      const result = await repository.createLeadActivity(data);

      expect(result).toEqual(expect.objectContaining({ id: 'act-1' }));
    });
  });

  describe('findDocumentsByLead', () => {
    it('should return documents for a lead', async () => {
      const docs = [{ id: 'doc-1' }, { id: 'doc-2' }];
      prisma.document.findMany.mockResolvedValue(docs);

      const result = await repository.findDocumentsByLead('lead-1');

      expect(result).toEqual(docs);
      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findDocumentById', () => {
    it('should return document by id', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc-1' });

      const result = await repository.findDocumentById('doc-1');

      expect(result).toEqual({ id: 'doc-1' });
      expect(prisma.document.findUnique).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      prisma.document.delete.mockResolvedValue({ id: 'doc-1' });

      await repository.deleteDocument('doc-1');

      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });
  });

  describe('updateLeadStage', () => {
    it('should update lead stage', async () => {
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', currentStage: 'DESIGN_READY' });

      const result = await repository.updateLeadStage('lead-1', 'DESIGN_READY');

      expect(result).toEqual(expect.objectContaining({ currentStage: 'DESIGN_READY' }));
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { currentStage: 'DESIGN_READY' },
      });
    });
  });

  describe('findLeadWithCustomerAndProperty', () => {
    it('should return lead with customer and property', async () => {
      const lead = { id: 'lead-1', customer: { id: 'c1' }, property: { id: 'p1' } };
      prisma.lead.findUnique.mockResolvedValue(lead);

      const result = await repository.findLeadWithCustomerAndProperty('lead-1');

      expect(result).toEqual(lead);
      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        include: { customer: true, property: true },
      });
    });
  });
});
