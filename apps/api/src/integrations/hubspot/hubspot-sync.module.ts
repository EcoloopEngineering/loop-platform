import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HubSpotSyncService } from './hubspot-sync.service';
import { HubSpotWebhookController } from './hubspot-webhook.controller';

@Module({
  imports: [HttpModule],
  controllers: [HubSpotWebhookController],
  providers: [HubSpotSyncService],
  exports: [HubSpotSyncService],
})
export class HubSpotSyncModule {}
