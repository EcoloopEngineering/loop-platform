import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { S3Service } from '../../../infrastructure/storage/s3.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';

// Mock fs module to avoid real filesystem operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('DocumentController', () => {
  let controller: DocumentController;
  let prisma: MockPrismaService;
  let s3Service: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    s3Service = {
      isConfigured: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3Service },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentController>(DocumentController);
  });

  describe('getDocumentsByLead', () => {
    it('should return mapped documents for a lead', async () => {
      prisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          fileName: 'proposal.pdf',
          type: 'PROPOSAL',
          fileSize: 1024,
          metadata: { downloadUrl: 'https://s3.example.com/file.pdf' },
          createdAt: new Date('2026-01-01'),
        },
      ]);

      const result = await controller.getDocumentsByLead('lead-1');

      expect(result).toEqual([
        {
          id: 'doc-1',
          name: 'proposal.pdf',
          url: 'https://s3.example.com/file.pdf',
          type: 'PROPOSAL',
          size: 1024,
          createdAt: new Date('2026-01-01'),
        },
      ]);
    });

    it('should use fallback URL when no downloadUrl in metadata', async () => {
      prisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-2',
          fileName: 'contract.pdf',
          type: 'CONTRACT',
          fileSize: 2048,
          metadata: {},
          createdAt: new Date('2026-01-02'),
        },
      ]);

      const result = await controller.getDocumentsByLead('lead-1');
      expect(result[0].url).toBe('/api/v1/documents/doc-2/download');
    });

    it('should return empty array when no documents', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      const result = await controller.getDocumentsByLead('lead-1');
      expect(result).toEqual([]);
    });
  });

  describe('downloadDocument', () => {
    it('should redirect to S3 signed URL for S3-stored docs', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        fileKey: 'documents/lead-1/file.pdf',
        mimeType: 'application/pdf',
        fileName: 'file.pdf',
        metadata: { storage: 's3' },
      });
      s3Service.isConfigured.mockReturnValue(true);
      s3Service.getSignedUrl.mockResolvedValue('https://signed-url.example.com');

      const res = { redirect: jest.fn(), setHeader: jest.fn(), sendFile: jest.fn() };
      await controller.downloadDocument('doc-1', res as any);

      expect(s3Service.getSignedUrl).toHaveBeenCalledWith('documents/lead-1/file.pdf');
      expect(res.redirect).toHaveBeenCalledWith('https://signed-url.example.com');
    });

    it('should send local file when storage is local', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);

      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-2',
        fileKey: 'documents/lead-1/local.pdf',
        mimeType: 'application/pdf',
        fileName: 'local.pdf',
        metadata: { storage: 'local' },
      });

      const res = { redirect: jest.fn(), setHeader: jest.fn(), sendFile: jest.fn() };
      await controller.downloadDocument('doc-2', res as any);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.sendFile).toHaveBeenCalled();
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      const res = { redirect: jest.fn(), setHeader: jest.fn(), sendFile: jest.fn() };
      await expect(controller.downloadDocument('bad-id', res as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when local file does not exist', async () => {
      const fs = require('fs');
      fs.existsSync.mockImplementation((p: string) => {
        // Return true for UPLOAD_DIR check in constructor, false for file check
        if (p.includes('local-missing')) return false;
        return true;
      });

      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-3',
        fileKey: 'documents/lead-1/local-missing.pdf',
        mimeType: 'application/pdf',
        fileName: 'missing.pdf',
        metadata: { storage: 'local' },
      });

      const res = { redirect: jest.fn(), setHeader: jest.fn(), sendFile: jest.fn() };
      await expect(controller.downloadDocument('doc-3', res as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDocument', () => {
    it('should delete S3 doc and DB record', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        leadId: 'lead-1',
        fileKey: 'documents/lead-1/file.pdf',
        fileName: 'file.pdf',
        metadata: { storage: 's3' },
      });
      prisma.document.delete.mockResolvedValue({});
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await controller.deleteDocument('doc-1', { id: 'user-1' });

      expect(s3Service.delete).toHaveBeenCalledWith('documents/lead-1/file.pdf');
      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when document not found', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(controller.deleteDocument('bad-id', { id: 'user-1' })).rejects.toThrow(NotFoundException);
    });
  });
});
