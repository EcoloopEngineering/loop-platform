import { Controller, Post, Body, Logger, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SalesRabbitWebhookService, SalesRabbitLead } from '../application/services/salesrabbit-webhook.service';

@Controller('webhooks/salesrabbit')
@ApiTags('Webhooks')
export class SalesRabbitWebhookController {
  private readonly logger = new Logger(SalesRabbitWebhookController.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly salesRabbitService: SalesRabbitWebhookService,
  ) {
    this.webhookSecret = this.config.get<string>('SALESRABBIT_WEBHOOK_SECRET');
    if (!this.webhookSecret) {
      this.logger.warn('SALESRABBIT_WEBHOOK_SECRET not set — webhook endpoint is unauthenticated');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Receive SalesRabbit webhook events' })
  async handleWebhook(
    @Body() body: { event: string; data: SalesRabbitLead },
    @Headers('x-salesrabbit-secret') secret?: string,
  ) {
    if (this.webhookSecret && secret !== this.webhookSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    this.logger.log(`SalesRabbit webhook: ${body.event}`);
    return this.salesRabbitService.processEvent(body.event, body.data);
  }
}
