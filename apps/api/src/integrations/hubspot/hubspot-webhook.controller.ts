import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
} from '@nestjs/common';

interface HubSpotWebhookEvent {
  subscriptionType: string;
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
  eventId: number;
  portalId: number;
  occurredAt: number;
}

@Controller('webhooks/hubspot')
export class HubSpotWebhookController {
  private readonly logger = new Logger(HubSpotWebhookController.name);

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() events: HubSpotWebhookEvent[],
  ): Promise<{ received: boolean }> {
    for (const event of events) {
      this.logger.log(
        `HubSpot event: ${event.subscriptionType} – object ${event.objectId}`,
      );

      switch (event.subscriptionType) {
        case 'deal.propertyChange':
          this.logger.log(
            `Deal ${event.objectId} property "${event.propertyName}" changed to "${event.propertyValue}"`,
          );
          // TODO: dispatch domain event to sync deal changes back
          break;
        case 'deal.creation':
          this.logger.log(`New deal created: ${event.objectId}`);
          break;
        case 'contact.creation':
          this.logger.log(`New contact created: ${event.objectId}`);
          break;
        default:
          this.logger.debug(`Unhandled HubSpot event: ${event.subscriptionType}`);
      }
    }

    return { received: true };
  }
}
