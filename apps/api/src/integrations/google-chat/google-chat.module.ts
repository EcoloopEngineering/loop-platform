import { Module } from '@nestjs/common';
import { GoogleChatService } from './google-chat.service';

@Module({
  providers: [GoogleChatService],
  exports: [GoogleChatService],
})
export class GoogleChatModule {}
