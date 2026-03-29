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
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private readonly processedEvents = new Map<string, number>();
  private readonly EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly stripeService: StripeService,
    private readonly emitter: EventEmitter2,
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

    // Idempotency: skip already-processed events
    if (this.isEventProcessed(event.id)) {
      this.logger.debug(`Skipping already-processed Stripe event: ${event.id}`);
      return { received: true };
    }

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

    this.markEventProcessed(event.id);
    return { received: true };
  }

  private isEventProcessed(eventId: string): boolean {
    const timestamp = this.processedEvents.get(eventId);
    if (!timestamp) return false;

    // Expire old entries
    if (Date.now() - timestamp > this.EVENT_TTL_MS) {
      this.processedEvents.delete(eventId);
      return false;
    }
    return true;
  }

  private markEventProcessed(eventId: string): void {
    this.processedEvents.set(eventId, Date.now());

    // Periodic cleanup of old entries (every 100 events)
    if (this.processedEvents.size % 100 === 0) {
      const now = Date.now();
      for (const [id, ts] of this.processedEvents) {
        if (now - ts > this.EVENT_TTL_MS) {
          this.processedEvents.delete(id);
        }
      }
    }
  }
}
