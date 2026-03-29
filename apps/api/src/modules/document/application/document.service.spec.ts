import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentService } from './document.service';
import { S3Service } from '../../../infrastructure/storage/s3.service';
import { DOCUMENT_REPOSITORY } from './ports/document.repository.port';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('DocumentService', () => {
  let service: DocumentService;
  let mockRepo: Record<string, jest.Mock>;
  let s3Service: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      findLeadById: jest.fn(),
      createDocument: jest.fn(),
      createLeadActivity: jest.fn(),
      findDocumentsByLead: jest.fn(),
      findDocumentById: jest.fn(),
      deleteDocument: jest.fn(),
    };
    s3Service = {
      isConfigured: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: DOCUMENT_REPOSITORY, useValue: mockRepo },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  describe('uploadDocument', () => {
    const mockUser = { id: 'user-1', email: 'test@ecoloop.us', firstName: 'Test', lastName: 'User', phone: null, role: 'ADMIN' as any, isActive: true, profileImage: null };
    const mockFile = {
      originalname: 'proposal.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('fake-pdf'),
    };

    it('should upload file locally when S3 is not configured', async () => {
      s3Service.isConfigured.mockReturnValue(false);
      mockRepo.findLeadById.mockResolvedValue({ id: 'lead-1' });
      mockRepo.createDocument.mockResolvedValue({
        id: 'doc-1',
        fileName: 'proposal.pdf',
        type: 'OTHER',
        fileSize: 1024,
        createdAt: new Date('2026-01-01'),
      });
      mockRepo.createLeadActivity.mockResolvedValue({});

      const result = await service.uploadDocument(mockFile, 'lead-1', '', mockUser);

      expect(result.id).toBe('doc-1');
      expect(result.name).toBe('proposal.pdf');
      expect(result.url).toBe('/api/v1/documents/doc-1/download');
      expect(mockRepo.createDocument).toHaveBeenCalled();
      expect(mockRepo.createLeadActivity).toHaveBeenCalled();
    });

    it('should upload file to S3 when configured', async () => {
      s3Service.isConfigured.mockReturnValue(true);
      s3Service.upload.mockResolvedValue('https://s3.example.com/file.pdf');
      mockRepo.findLeadById.mockResolvedValue({ id: 'lead-1' });
      mockRepo.createDocument.mockResolvedValue({
        id: 'doc-1',
        fileName: 'proposal.pdf',
        type: 'PROPOSAL',
        fileSize: 1024,
        createdAt: new Date('2026-01-01'),
      });
      mockRepo.createLeadActivity.mockResolvedValue({});

      const result = await service.uploadDocument(mockFile, 'lead-1', 'PROPOSAL', mockUser);

      expect(s3Service.upload).toHaveBeenCalled();
      expect(result.url).toBe('https://s3.example.com/file.pdf');
    });

    it('should throw NotFoundException when no file provided', async () => {
      await expect(
        service.uploadDocument(null as any, 'lead-1', '', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockRepo.findLeadById.mockResolvedValue(null);

      await expect(
        service.uploadDocument(mockFile, 'bad-lead', '', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDocumentsByLead', () => {
    it('should return mapped documents for a lead', async () => {
      mockRepo.findDocumentsByLead.mockResolvedValue([
        {
          id: 'doc-1',
          fileName: 'proposal.pdf',
          type: 'PROPOSAL',
          fileSize: 1024,
          metadata: { downloadUrl: 'https://s3.example.com/file.pdf' },
          createdAt: new Date('2026-01-01'),
        },
      ]);

      const result = await service.getDocumentsByLead('lead-1');

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
      mockRepo.findDocumentsByLead.mockResolvedValue([
        {
          id: 'doc-2',
          fileName: 'contract.pdf',
          type: 'CONTRACT',
          fileSize: 2048,
          metadata: {},
          createdAt: new Date('2026-01-02'),
        },
      ]);

      const result = await service.getDocumentsByLead('lead-1');
      expect(result[0].url).toBe('/api/v1/documents/doc-2/download');
    });

    it('should return empty array when no documents', async () => {
      mockRepo.findDocumentsByLead.mockResolvedValue([]);
      const result = await service.getDocumentsByLead('lead-1');
      expect(result).toEqual([]);
    });
  });

  describe('getDownloadInfo', () => {
    it('should return redirect info for S3-stored docs', async () => {
      mockRepo.findDocumentById.mockResolvedValue({
        id: 'doc-1',
        fileKey: 'documents/lead-1/file.pdf',
        mimeType: 'application/pdf',
        fileName: 'file.pdf',
        metadata: { storage: 's3' },
      });
      s3Service.isConfigured.mockReturnValue(true);
      s3Service.getSignedUrl.mockResolvedValue('https://signed-url.example.com');

      const result = await service.getDownloadInfo('doc-1');

      expect(result.mode).toBe('redirect');
      expect(result.redirectUrl).toBe('https://signed-url.example.com');
      expect(s3Service.getSignedUrl).toHaveBeenCalledWith('documents/lead-1/file.pdf');
    });

    it('should return local file info when storage is local', async () => {
      const fsModule = require('fs');
      fsModule.existsSync.mockReturnValue(true);

      mockRepo.findDocumentById.mockResolvedValue({
        id: 'doc-2',
        fileKey: 'documents/lead-1/local.pdf',
        mimeType: 'application/pdf',
        fileName: 'local.pdf',
        metadata: { storage: 'local' },
      });

      const result = await service.getDownloadInfo('doc-2');

      expect(result.mode).toBe('local');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileName).toBe('local.pdf');
    });

    it('should throw NotFoundException when document not found', async () => {
      mockRepo.findDocumentById.mockResolvedValue(null);
      await expect(service.getDownloadInfo('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when local file does not exist', async () => {
      const fsModule = require('fs');
      fsModule.existsSync.mockImplementation((p: string) => {
        if (p.includes('local-missing')) return false;
        return true;
      });

      mockRepo.findDocumentById.mockResolvedValue({
        id: 'doc-3',
        fileKey: 'documents/lead-1/local-missing.pdf',
        mimeType: 'application/pdf',
        fileName: 'missing.pdf',
        metadata: { storage: 'local' },
      });

      await expect(service.getDownloadInfo('doc-3')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDocument', () => {
    const mockUser = { id: 'user-1', email: 'test@ecoloop.us', firstName: 'Test', lastName: 'User', phone: null, role: 'ADMIN' as any, isActive: true, profileImage: null };

    it('should delete S3 doc and DB record', async () => {
      mockRepo.findDocumentById.mockResolvedValue({
        id: 'doc-1',
        leadId: 'lead-1',
        fileKey: 'documents/lead-1/file.pdf',
        fileName: 'file.pdf',
        metadata: { storage: 's3' },
      });
      mockRepo.deleteDocument.mockResolvedValue(undefined);
      mockRepo.createLeadActivity.mockResolvedValue({});

      const result = await service.deleteDocument('doc-1', mockUser);

      expect(s3Service.delete).toHaveBeenCalledWith('documents/lead-1/file.pdf');
      expect(mockRepo.deleteDocument).toHaveBeenCalledWith('doc-1');
      expect(result).toEqual({ deleted: true });
    });

    it('should delete local file and DB record', async () => {
      const fsModule = require('fs');
      fsModule.existsSync.mockReturnValue(true);

      mockRepo.findDocumentById.mockResolvedValue({
        id: 'doc-2',
        leadId: 'lead-1',
        fileKey: 'documents/lead-1/local.pdf',
        fileName: 'local.pdf',
        metadata: { storage: 'local' },
      });
      mockRepo.deleteDocument.mockResolvedValue(undefined);
      mockRepo.createLeadActivity.mockResolvedValue({});

      const result = await service.deleteDocument('doc-2', mockUser);

      expect(fsModule.unlinkSync).toHaveBeenCalled();
      expect(mockRepo.deleteDocument).toHaveBeenCalledWith('doc-2');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when document not found', async () => {
      mockRepo.findDocumentById.mockResolvedValue(null);
      await expect(service.deleteDocument('bad-id', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should skip activity log when document has no leadId', async () => {
      mockRepo.findDocumentById.mockResolvedValue({
        id: 'doc-3',
        leadId: null,
        fileKey: 'documents/orphan/file.pdf',
        fileName: 'orphan.pdf',
        metadata: { storage: 'local' },
      });
      mockRepo.deleteDocument.mockResolvedValue(undefined);

      await service.deleteDocument('doc-3', mockUser);

      expect(mockRepo.createLeadActivity).not.toHaveBeenCalled();
      expect(mockRepo.deleteDocument).toHaveBeenCalledWith('doc-3');
    });
  });
});
