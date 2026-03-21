import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface PaymentResult {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: Date;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(
      this.config.getOrThrow<string>('STRIPE_SECRET_KEY'),
      { apiVersion: '2024-12-18.acacia' },
    );
  }

  async createPayment(amount: number, userId: string): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: { userId },
      });

      return {
        paymentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        createdAt: new Date(paymentIntent.created * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe payment', error);
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      return {
        paymentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        createdAt: new Date(paymentIntent.created * 1000),
      };
    } catch (error) {
      this.logger.error(`Failed to get Stripe payment ${paymentId}`, error);
      throw error;
    }
  }

  /**
   * Construct and verify a Stripe webhook event from the raw body + signature.
   */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
