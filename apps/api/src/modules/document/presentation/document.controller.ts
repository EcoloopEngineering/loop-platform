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
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class DocumentController {
  constructor(private readonly prisma: PrismaService) {
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

    // Save file locally
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${file.originalname}`;
    const fileKey = `${leadId}/${safeFileName}`;
    const dirPath = path.join(UPLOAD_DIR, leadId);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(path.join(dirPath, safeFileName), file.buffer);

    const doc = await this.prisma.document.create({
      data: {
        leadId,
        type: (documentType as any) || 'OTHER',
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileKey,
        uploadedById: user.id,
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
      url: `/api/v1/documents/${doc.id}/download`,
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
    return docs.map((d) => ({
      id: d.id,
      name: d.fileName,
      url: `/api/v1/documents/${d.id}/download`,
      type: d.type,
      size: d.fileSize,
      createdAt: d.createdAt,
    }));
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download a document' })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const filePath = path.join(UPLOAD_DIR, doc.fileKey);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
      return res.sendFile(path.resolve(filePath));
    }

    throw new NotFoundException('File not found on disk');
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    // Delete from disk
    const filePath = path.join(UPLOAD_DIR, doc.fileKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
