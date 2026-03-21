import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { DocumentController } from './presentation/document.controller';
import { UploadDocumentHandler } from './application/commands/upload-document.handler';

const CommandHandlers = [UploadDocumentHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [DocumentController],
  providers: [...CommandHandlers],
})
export class DocumentModule {}
