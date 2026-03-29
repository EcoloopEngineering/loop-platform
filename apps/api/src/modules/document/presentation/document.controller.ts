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
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { DocumentService } from '../application/document.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload a file for a lead' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    @Body('leadId') leadId: string,
    @Body('documentType') documentType: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentService.uploadDocument(file, leadId, documentType, user);
  }

  @Get('leads/:leadId/documents')
  @ApiOperation({ summary: 'Get all documents for a lead' })
  async getDocumentsByLead(@Param('leadId', ParseUUIDPipe) leadId: string) {
    return this.documentService.getDocumentsByLead(leadId);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download a document' })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.documentService.getDownloadInfo(id);

    if (result.mode === 'redirect') {
      return res.redirect(result.redirectUrl!);
    }

    res.setHeader('Content-Type', result.mimeType!);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    return res.sendFile(result.filePath!);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentService.deleteDocument(id, user);
  }
}
