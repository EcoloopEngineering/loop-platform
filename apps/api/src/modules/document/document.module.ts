import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { DocumentController } from './presentation/document.controller';
import { DocumentGenerationController } from './presentation/document-generation.controller';
import { DocumentService } from './application/document.service';
import { UploadDocumentHandler } from './application/commands/upload-document.handler';

const CommandHandlers = [UploadDocumentHandler];

@Module({
  imports: [CqrsModule, PrismaModule, IntegrationsModule],
  controllers: [DocumentController, DocumentGenerationController],
  providers: [DocumentService, ...CommandHandlers],
  exports: [DocumentService],
})
export class DocumentModule {}
