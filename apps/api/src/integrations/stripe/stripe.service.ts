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
  private readonly stripe: Stripe | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured — Stripe disabled');
      this.stripe = null;
    }
  }

  async createPayment(amount: number, userId: string): Promise<PaymentResult> {
    if (!this.stripe) throw new Error('Stripe not configured');
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
    if (!this.stripe) throw new Error('Stripe not configured');
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
    if (!this.stripe) throw new Error('Stripe not configured');
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
