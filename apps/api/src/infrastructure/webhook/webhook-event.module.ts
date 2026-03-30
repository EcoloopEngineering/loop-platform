import { Module, Global } from '@nestjs/common';
import { WebhookEventService } from './webhook-event.service';

@Global()
@Module({
  providers: [WebhookEventService],
  exports: [WebhookEventService],
})
export class WebhookEventModule {}
