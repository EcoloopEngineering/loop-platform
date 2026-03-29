import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  UploadDocumentHandler,
  UploadDocumentCommand,
} from './upload-document.handler';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';
import { DocumentType } from '../../domain/entities/document.entity';

describe('UploadDocumentHandler', () => {
  let handler: UploadDocumentHandler;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module = await Test.createTestingModule({
      providers: [
        UploadDocumentHandler,
        { provide: PrismaService, useValue: prisma },
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
    prisma.lead.findUnique.mockResolvedValue(null);

    await expect(handler.execute(baseCommand)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it('should create a document record when lead exists', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });

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
    prisma.document.create.mockResolvedValue(createdDoc);

    const result = await handler.execute(baseCommand);

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        leadId: 'lead-1',
        type: 'CONTRACT',
        fileName: 'contract.pdf',
        mimeType: 'application/pdf',
        fileSize: 102400,
        fileKey: '/uploads/contract.pdf',
        uploadedById: 'user-1',
      },
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

    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
    prisma.document.create.mockResolvedValue({ id: 'doc-2' });

    await handler.execute(commandNoUrl);

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      }),
    });
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

    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
    prisma.document.create.mockResolvedValue({ id: 'doc-3' });

    await handler.execute(permitCommand);

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'PERMIT',
        uploadedById: 'user-2',
      }),
    });
  });
});
