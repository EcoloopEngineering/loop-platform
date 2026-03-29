import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from '../application/document.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';

describe('DocumentController', () => {
  let controller: DocumentController;
  let documentService: Record<string, jest.Mock>;

  beforeEach(async () => {
    documentService = {
      uploadDocument: jest.fn(),
      getDocumentsByLead: jest.fn(),
      getDownloadInfo: jest.fn(),
      deleteDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        { provide: DocumentService, useValue: documentService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentController>(DocumentController);
  });

  describe('uploadDocument', () => {
    it('should delegate to DocumentService.uploadDocument', async () => {
      const mockResult = { id: 'doc-1', name: 'file.pdf', url: '/api/v1/documents/doc-1/download', type: 'OTHER', size: 1024, createdAt: new Date() };
      documentService.uploadDocument.mockResolvedValue(mockResult);

      const file = { originalname: 'file.pdf', mimetype: 'application/pdf', size: 1024, buffer: Buffer.from('data') };
      const user = { id: 'user-1', email: 'test@ecoloop.us', firstName: 'Test', lastName: 'User', role: 'ADMIN', isActive: true, profileImage: null };

      const result = await controller.uploadDocument(file, 'lead-1', 'OTHER', user as any);

      expect(documentService.uploadDocument).toHaveBeenCalledWith(file, 'lead-1', 'OTHER', user);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDocumentsByLead', () => {
    it('should delegate to DocumentService.getDocumentsByLead', async () => {
      const mockDocs = [
        { id: 'doc-1', name: 'proposal.pdf', url: 'https://s3.example.com/file.pdf', type: 'PROPOSAL', size: 1024, createdAt: new Date('2026-01-01') },
      ];
      documentService.getDocumentsByLead.mockResolvedValue(mockDocs);

      const result = await controller.getDocumentsByLead('lead-1');

      expect(documentService.getDocumentsByLead).toHaveBeenCalledWith('lead-1');
      expect(result).toEqual(mockDocs);
    });

    it('should return empty array when no documents', async () => {
      documentService.getDocumentsByLead.mockResolvedValue([]);
      const result = await controller.getDocumentsByLead('lead-1');
      expect(result).toEqual([]);
    });
  });

  describe('downloadDocument', () => {
    it('should redirect to S3 signed URL for S3-stored docs', async () => {
      documentService.getDownloadInfo.mockResolvedValue({
        mode: 'redirect',
        redirectUrl: 'https://signed-url.example.com',
      });

      const res = { redirect: jest.fn(), setHeader: jest.fn(), sendFile: jest.fn() };
      await controller.downloadDocument('doc-1', res as any);

      expect(res.redirect).toHaveBeenCalledWith('https://signed-url.example.com');
    });

    it('should send local file when storage is local', async () => {
      documentService.getDownloadInfo.mockResolvedValue({
        mode: 'local',
        filePath: '/uploads/documents/lead-1/local.pdf',
        mimeType: 'application/pdf',
        fileName: 'local.pdf',
      });

      const res = { redirect: jest.fn(), setHeader: jest.fn(), sendFile: jest.fn() };
      await controller.downloadDocument('doc-2', res as any);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.sendFile).toHaveBeenCalledWith('/uploads/documents/lead-1/local.pdf');
    });

    it('should propagate NotFoundException from service', async () => {
      documentService.getDownloadInfo.mockRejectedValue(new NotFoundException('Document not found'));

      const res = { redirect: jest.fn(), setHeader: jest.fn(), sendFile: jest.fn() };
      await expect(controller.downloadDocument('bad-id', res as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDocument', () => {
    it('should delegate to DocumentService.deleteDocument', async () => {
      documentService.deleteDocument.mockResolvedValue({ deleted: true });
      const user = { id: 'user-1', email: 'test@ecoloop.us', firstName: 'Test', lastName: 'User', role: 'ADMIN', isActive: true, profileImage: null };

      const result = await controller.deleteDocument('doc-1', user as any);

      expect(documentService.deleteDocument).toHaveBeenCalledWith('doc-1', user);
      expect(result).toEqual({ deleted: true });
    });

    it('should propagate NotFoundException from service', async () => {
      documentService.deleteDocument.mockRejectedValue(new NotFoundException('Document not found'));
      const user = { id: 'user-1', email: 'test@ecoloop.us', firstName: 'Test', lastName: 'User', role: 'ADMIN', isActive: true, profileImage: null };

      await expect(controller.deleteDocument('bad-id', user as any)).rejects.toThrow(NotFoundException);
    });
  });
});
