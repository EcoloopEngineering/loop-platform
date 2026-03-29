import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  UploadDocumentHandler,
  UploadDocumentCommand,
} from './upload-document.handler';
import { DOCUMENT_REPOSITORY } from '../ports/document.repository.port';
import { DocumentType } from '../../domain/entities/document.entity';

describe('UploadDocumentHandler', () => {
  let handler: UploadDocumentHandler;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      findLeadById: jest.fn(),
      createDocument: jest.fn(),
      createLeadActivity: jest.fn(),
      findDocumentsByLead: jest.fn(),
      findDocumentById: jest.fn(),
      deleteDocument: jest.fn(),
      updateLeadStage: jest.fn(),
      findLeadWithCustomerAndProperty: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UploadDocumentHandler,
        { provide: DOCUMENT_REPOSITORY, useValue: repo },
      ],
    }).compile();

    handler = module.get(UploadDocumentHandler);
  });

  const baseCommand = new UploadDocumentCommand(
    'lead-1',
    DocumentType.CONTRACT,
    'contract.pdf',
    'application/pdf',
    102400,
    '/uploads/contract.pdf',
    'https://cdn.example.com/contract.pdf',
    'user-1',
  );

  it('should throw NotFoundException when lead does not exist', async () => {
    repo.findLeadById.mockResolvedValue(null);

    await expect(handler.execute(baseCommand)).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.createDocument).not.toHaveBeenCalled();
  });

  it('should create a document record when lead exists', async () => {
    repo.findLeadById.mockResolvedValue({ id: 'lead-1' });

    const createdDoc = {
      id: 'doc-1',
      leadId: 'lead-1',
      type: 'CONTRACT',
      fileName: 'contract.pdf',
      mimeType: 'application/pdf',
      fileSize: 102400,
      fileKey: '/uploads/contract.pdf',
      uploadedById: 'user-1',
    };
    repo.createDocument.mockResolvedValue(createdDoc);

    const result = await handler.execute(baseCommand);

    expect(repo.createDocument).toHaveBeenCalledWith({
      leadId: 'lead-1',
      type: 'CONTRACT',
      fileName: 'contract.pdf',
      mimeType: 'application/pdf',
      fileSize: 102400,
      fileKey: '/uploads/contract.pdf',
      uploadedById: 'user-1',
      metadata: {},
    });
    expect(result).toEqual(createdDoc);
  });

  it('should handle null downloadUrl', async () => {
    const commandNoUrl = new UploadDocumentCommand(
      'lead-1',
      DocumentType.PHOTO,
      'photo.jpg',
      'image/jpeg',
      50000,
      '/uploads/photo.jpg',
      null,
      'user-1',
    );

    repo.findLeadById.mockResolvedValue({ id: 'lead-1' });
    repo.createDocument.mockResolvedValue({ id: 'doc-2' });

    await handler.execute(commandNoUrl);

    expect(repo.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      }),
    );
  });

  it('should handle different document types', async () => {
    const permitCommand = new UploadDocumentCommand(
      'lead-1',
      DocumentType.PERMIT,
      'permit.pdf',
      'application/pdf',
      80000,
      '/uploads/permit.pdf',
      null,
      'user-2',
    );

    repo.findLeadById.mockResolvedValue({ id: 'lead-1' });
    repo.createDocument.mockResolvedValue({ id: 'doc-3' });

    await handler.execute(permitCommand);

    expect(repo.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PERMIT',
        uploadedById: 'user-2',
      }),
    );
  });
});
