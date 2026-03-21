import {
  Controller,
  Post,
  Req,
  Headers,
  Logger,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post()
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

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(
          `Payment succeeded: ${paymentIntent.id} – amount ${paymentIntent.amount}`,
        );
        // TODO: dispatch domain event / update order status
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }
}
