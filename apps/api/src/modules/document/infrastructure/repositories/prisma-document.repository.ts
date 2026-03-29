import { Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { DocumentRepositoryPort } from '../../application/ports/document.repository.port';

@Injectable()
export class PrismaDocumentRepository implements DocumentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findLeadById(leadId: string): Promise<any | null> {
    return this.prisma.lead.findUnique({ where: { id: leadId } });
  }

  async createDocument(data: {
    leadId: string;
    type: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileKey: string;
    uploadedById: string;
    metadata: Record<string, unknown>;
  }): Promise<any> {
    return this.prisma.document.create({
      data: {
        leadId: data.leadId,
        type: (data.type as DocumentType) || 'OTHER',
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        fileKey: data.fileKey,
        uploadedById: data.uploadedById,
        metadata: data.metadata as any,
      },
    });
  }

  async createLeadActivity(data: {
    leadId: string;
    userId: string;
    type: string;
    description: string;
    metadata: Record<string, unknown>;
  }): Promise<any> {
    return this.prisma.leadActivity.create({
      data: {
        leadId: data.leadId,
        userId: data.userId,
        type: data.type as any,
        description: data.description,
        metadata: data.metadata as any,
      },
    });
  }

  async findDocumentsByLead(leadId: string): Promise<any[]> {
    return this.prisma.document.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDocumentById(id: string): Promise<any | null> {
    return this.prisma.document.findUnique({ where: { id } });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.prisma.document.delete({ where: { id } });
  }
}
