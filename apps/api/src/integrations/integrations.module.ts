import { Module } from '@nestjs/common';
import { AuroraModule } from './aurora/aurora.module';
import { JobberModule } from './jobber/jobber.module';
import { StripeModule } from './stripe/stripe.module';
import { HubSpotSyncModule } from './hubspot/hubspot-sync.module';

@Module({
  imports: [AuroraModule, JobberModule, StripeModule, HubSpotSyncModule],
  exports: [AuroraModule, JobberModule, StripeModule, HubSpotSyncModule],
})
export class IntegrationsModule {}
