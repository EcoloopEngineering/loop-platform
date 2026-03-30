import {
  Controller,
  Post,
  Req,
  Headers,
  Logger,
  HttpCode,
  BadRequestException,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StripeService } from './stripe.service';
import { WebhookEventService } from '../../infrastructure/webhook/webhook-event.service';
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly emitter: EventEmitter2,
    private readonly webhookEventService: WebhookEventService,
  ) {}

  @Post()
  @SetMetadata('isPublic', true)
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    let event: Stripe.Event;

    try {
      event = this.stripeService.constructEvent(
        req.body as Buffer,
        signature,
      );
    } catch (error) {
      this.logger.error('Stripe webhook signature verification failed', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotency: skip already-processed events (DB-backed)
    if (await this.webhookEventService.isAlreadyProcessed('stripe', event.id)) {
      this.logger.debug(`Skipping already-processed Stripe event: ${event.id}`);
      return { received: true };
    }

    // Persist event before processing
    const record = await this.webhookEventService.recordEvent({
      provider: 'stripe',
      externalId: event.id,
      eventType: event.type,
      payload: event.data.object,
    });

    try {
      await this.processEvent(event);
      await this.webhookEventService.markProcessed(record.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process Stripe event ${event.id}: ${message}`);
      await this.webhookEventService.markFailed(record.id, message);
    }

    return { received: true };
  }

  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(
          `Payment succeeded: ${paymentIntent.id} — amount ${paymentIntent.amount}`,
        );
        this.emitter.emit('payment.succeeded', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          stripeEventId: event.id,
        });
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const failureMessage =
          paymentIntent.last_payment_error?.message ?? 'Unknown failure';
        this.logger.warn(
          `Payment failed: ${paymentIntent.id} — ${failureMessage}`,
        );
        this.emitter.emit('payment.failed', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          failureMessage,
          stripeEventId: event.id,
        });
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }
}
