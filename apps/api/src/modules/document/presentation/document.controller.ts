import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UploadDocumentCommand } from '../application/commands/upload-document.handler';
import { DocumentType } from '../domain/entities/document.entity';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class DocumentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload document metadata' })
  async uploadDocument(
    @Body()
    dto: {
      leadId: string;
      type: DocumentType;
      fileName: string;
      mimeType: string;
      fileSize: number;
      storagePath: string;
      downloadUrl?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.commandBus.execute(
      new UploadDocumentCommand(
        dto.leadId,
        dto.type,
        dto.fileName,
        dto.mimeType,
        dto.fileSize,
        dto.storagePath,
        dto.downloadUrl ?? null,
        user.id,
      ),
    );
  }

  @Get('leads/:leadId/documents')
  @ApiOperation({ summary: 'Get all documents for a lead' })
  async getDocumentsByLead(@Param('leadId') leadId: string) {
    return this.prisma.document.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Get document download URL' })
  async getDownloadUrl(@Param('id') id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return { downloadUrl: doc.downloadUrl, storagePath: doc.storagePath };
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(@Param('id') id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }
}
