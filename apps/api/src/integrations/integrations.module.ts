import { Module } from '@nestjs/common';
import { AuroraModule } from './aurora/aurora.module';
import { JobberModule } from './jobber/jobber.module';
import { StripeModule } from './stripe/stripe.module';
import { HubSpotSyncModule } from './hubspot/hubspot-sync.module';
import { ZapSignModule } from './zapsign/zapsign.module';
import { GoogleChatModule } from './google-chat/google-chat.module';

@Module({
  imports: [AuroraModule, JobberModule, StripeModule, HubSpotSyncModule, ZapSignModule, GoogleChatModule],
  exports: [AuroraModule, JobberModule, StripeModule, HubSpotSyncModule, ZapSignModule, GoogleChatModule],
})
export class IntegrationsModule {}
