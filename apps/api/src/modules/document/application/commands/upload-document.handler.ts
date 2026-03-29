import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentType as PrismaDocumentType } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { DocumentType } from '../../domain/entities/document.entity';

export class UploadDocumentCommand {
  constructor(
    public readonly leadId: string,
    public readonly type: DocumentType,
    public readonly fileName: string,
    public readonly mimeType: string,
    public readonly fileSize: number,
    public readonly storagePath: string,
    public readonly downloadUrl: string | null,
    public readonly uploadedBy: string,
  ) {}
}

@CommandHandler(UploadDocumentCommand)
@Injectable()
export class UploadDocumentHandler implements ICommandHandler<UploadDocumentCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UploadDocumentCommand) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: command.leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${command.leadId} not found`);
    }

    return this.prisma.document.create({
      data: {
        leadId: command.leadId,
        type: command.type as unknown as PrismaDocumentType,
        fileName: command.fileName,
        mimeType: command.mimeType,
        fileSize: command.fileSize,
        fileKey: command.storagePath,
        uploadedById: command.uploadedBy,
      },
    });
  }
}
