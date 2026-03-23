import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { ChatGateway } from './presentation/chat.gateway';
import { ChatService } from './application/services/chat.service';
import { FaqService } from './application/services/faq.service';
import { ChatController } from './presentation/chat.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, FaqService],
  exports: [ChatService],
})
export class ChatModule {}
