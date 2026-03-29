import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { DocumentController } from './presentation/document.controller';
import { DocumentGenerationController } from './presentation/document-generation.controller';
import { DocumentService } from './application/document.service';
import { DocumentGenerationService } from './application/document-generation.service';
import { DocumentDeliveryService } from './application/services/document-delivery.service';
import { UploadDocumentHandler } from './application/commands/upload-document.handler';
import { DOCUMENT_REPOSITORY } from './application/ports/document.repository.port';
import { PrismaDocumentRepository } from './infrastructure/repositories/prisma-document.repository';

const CommandHandlers = [UploadDocumentHandler];

@Module({
  imports: [CqrsModule, PrismaModule, IntegrationsModule],
  controllers: [DocumentController, DocumentGenerationController],
  providers: [
    DocumentService,
    DocumentDeliveryService,
    DocumentGenerationService,
    ...CommandHandlers,
    { provide: DOCUMENT_REPOSITORY, useClass: PrismaDocumentRepository },
  ],
  exports: [DocumentService],
})
export class DocumentModule {}
