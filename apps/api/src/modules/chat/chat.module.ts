import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { ChatGateway } from './presentation/chat.gateway';
import { ChatService } from './application/services/chat.service';
import { FaqService } from './application/services/faq.service';
import { ChatController } from './presentation/chat.controller';
import { CHAT_REPOSITORY } from './application/ports/chat.repository.port';
import { FAQ_REPOSITORY } from './application/ports/faq.repository.port';
import { PrismaChatRepository } from './infrastructure/repositories/prisma-chat.repository';
import { PrismaFaqRepository } from './infrastructure/repositories/prisma-faq.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatService,
    FaqService,
    { provide: CHAT_REPOSITORY, useClass: PrismaChatRepository },
    { provide: FAQ_REPOSITORY, useClass: PrismaFaqRepository },
  ],
  exports: [ChatService],
})
export class ChatModule {}
