import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  NotFoundException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { S3Service } from '../../../infrastructure/storage/s3.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class DocumentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload a file for a lead' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: any,
    @Body('leadId') leadId: string,
    @Body('documentType') documentType: string,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new NotFoundException('No file provided');

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${file.originalname}`;
    const fileKey = `documents/${leadId}/${safeFileName}`;
    let downloadUrl: string | null = null;

    // Upload to S3 if configured, otherwise save locally
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
        type: (documentType as any) || 'OTHER',
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileKey,
        uploadedById: user.id,
        metadata: downloadUrl ? { downloadUrl, storage: 's3' } : { storage: 'local' },
      },
    });

    // Log activity
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

  @Get('leads/:leadId/documents')
  @ApiOperation({ summary: 'Get all documents for a lead' })
  async getDocumentsByLead(@Param('leadId', ParseUUIDPipe) leadId: string) {
    const docs = await this.prisma.document.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => {
      const meta = (d.metadata as any) ?? {};
      return {
        id: d.id,
        name: d.fileName,
        url: meta.downloadUrl || `/api/v1/documents/${d.id}/download`,
        type: d.type,
        size: d.fileSize,
        createdAt: d.createdAt,
      };
    });
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download a document' })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const meta = (doc.metadata as any) ?? {};

    // If stored on S3, redirect to signed URL
    if (meta.storage === 's3' && this.s3.isConfigured()) {
      const signedUrl = await this.s3.getSignedUrl(doc.fileKey);
      return res.redirect(signedUrl);
    }

    // Local file fallback
    const filePath = path.join(UPLOAD_DIR, doc.fileKey);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
      return res.sendFile(path.resolve(filePath));
    }

    throw new NotFoundException('File not found');
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    // Delete from storage
    const meta = (doc.metadata as any) ?? {};
    if (meta.storage === 's3') {
      await this.s3.delete(doc.fileKey);
    } else {
      const filePath = path.join(UPLOAD_DIR, doc.fileKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Log activity
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
