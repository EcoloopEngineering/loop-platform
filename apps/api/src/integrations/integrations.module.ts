import { Module } from '@nestjs/common';
import { AuroraModule } from './aurora/aurora.module';
import { JobberModule } from './jobber/jobber.module';
import { StripeModule } from './stripe/stripe.module';
import { HubSpotSyncModule } from './hubspot/hubspot-sync.module';
import { ZapSignModule } from './zapsign/zapsign.module';

@Module({
  imports: [AuroraModule, JobberModule, StripeModule, HubSpotSyncModule, ZapSignModule],
  exports: [AuroraModule, JobberModule, StripeModule, HubSpotSyncModule, ZapSignModule],
})
export class IntegrationsModule {}
