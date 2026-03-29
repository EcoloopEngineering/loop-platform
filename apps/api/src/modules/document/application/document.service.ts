import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { S3Service } from '../../../infrastructure/storage/s3.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface DocumentResponse {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: Date;
}

export interface DownloadResult {
  mode: 'redirect' | 'local';
  redirectUrl?: string;
  filePath?: string;
  mimeType?: string;
  fileName?: string;
}

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async uploadDocument(
    file: UploadedFile,
    leadId: string,
    documentType: string,
    user: AuthenticatedUser,
  ): Promise<DocumentResponse> {
    if (!file) throw new NotFoundException('No file provided');

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${file.originalname}`;
    const fileKey = `documents/${leadId}/${safeFileName}`;
    let downloadUrl: string | null = null;

    if (this.s3.isConfigured()) {
      downloadUrl = await this.s3.upload({
        key: fileKey,
        body: file.buffer,
        contentType: file.mimetype,
      });
    } else {
      const dirPath = path.join(UPLOAD_DIR, leadId);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(path.join(dirPath, safeFileName), file.buffer);
    }

    const doc = await this.prisma.document.create({
      data: {
        leadId,
        type: (documentType as import('@prisma/client').DocumentType) || 'OTHER',
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileKey,
        uploadedById: user.id,
        metadata: downloadUrl ? { downloadUrl, storage: 's3' } : { storage: 'local' },
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId: user.id,
        type: 'DOCUMENT_UPLOADED',
        description: `File uploaded: ${file.originalname}`,
        metadata: { documentId: doc.id, fileName: file.originalname, fileSize: file.size },
      },
    });

    return {
      id: doc.id,
      name: doc.fileName,
      url: downloadUrl || `/api/v1/documents/${doc.id}/download`,
      type: doc.type,
      size: doc.fileSize,
      createdAt: doc.createdAt,
    };
  }

  async getDocumentsByLead(leadId: string): Promise<DocumentResponse[]> {
    const docs = await this.prisma.document.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => {
      const meta = (d.metadata as Record<string, unknown>) ?? {};
      return {
        id: d.id,
        name: d.fileName,
        url: (meta.downloadUrl as string) || `/api/v1/documents/${d.id}/download`,
        type: d.type,
        size: d.fileSize,
        createdAt: d.createdAt,
      };
    });
  }

  async getDownloadInfo(id: string): Promise<DownloadResult> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const meta = (doc.metadata as Record<string, unknown>) ?? {};

    if (meta.storage === 's3' && this.s3.isConfigured()) {
      const signedUrl = await this.s3.getSignedUrl(doc.fileKey);
      return { mode: 'redirect', redirectUrl: signedUrl };
    }

    const filePath = path.join(UPLOAD_DIR, doc.fileKey);
    if (fs.existsSync(filePath)) {
      return {
        mode: 'local',
        filePath: path.resolve(filePath),
        mimeType: doc.mimeType,
        fileName: doc.fileName,
      };
    }

    throw new NotFoundException('File not found');
  }

  async deleteDocument(id: string, user: AuthenticatedUser): Promise<{ deleted: boolean }> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const meta = (doc.metadata as Record<string, unknown>) ?? {};
    if (meta.storage === 's3') {
      await this.s3.delete(doc.fileKey);
    } else {
      const filePath = path.join(UPLOAD_DIR, doc.fileKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    if (doc.leadId) {
      await this.prisma.leadActivity.create({
        data: {
          leadId: doc.leadId,
          userId: user.id,
          type: 'DOCUMENT_UPLOADED',
          description: `File deleted: ${doc.fileName}`,
          metadata: { action: 'document_deleted', documentId: doc.id, fileName: doc.fileName },
        },
      });
    }

    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }
}
