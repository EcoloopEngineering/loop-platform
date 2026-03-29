import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepositoryPort } from '../ports/document.repository.port';
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
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repo: DocumentRepositoryPort,
  ) {}

  async execute(command: UploadDocumentCommand) {
    const lead = await this.repo.findLeadById(command.leadId);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${command.leadId} not found`);
    }

    return this.repo.createDocument({
      leadId: command.leadId,
      type: command.type as string,
      fileName: command.fileName,
      mimeType: command.mimeType,
      fileSize: command.fileSize,
      fileKey: command.storagePath,
      uploadedById: command.uploadedBy,
      metadata: {},
    });
  }
}
