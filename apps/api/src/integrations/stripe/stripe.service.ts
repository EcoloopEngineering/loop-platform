import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { withRetry, CircuitBreaker } from '../../common/utils/resilience';

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
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    const env = this.config.get<string>('NODE_ENV', 'development');

    if (env === 'production' && (!key || !webhookSecret)) {
      this.logger.error(
        'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be configured in production',
      );
    }

    if (key) {
      this.stripe = new Stripe(key);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured — Stripe disabled');
      this.stripe = null;
    }

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeMs: 30_000,
      name: 'stripe',
    });
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  getCircuitState(): import('../../common/utils/resilience').CircuitState {
    return this.circuitBreaker.getState();
  }

  async createPayment(amount: number, userId: string): Promise<PaymentResult> {
    if (!this.stripe) throw new Error('Stripe not configured');

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const paymentIntent = await this.stripe!.paymentIntents.create({
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
        },
        { maxAttempts: 3, initialDelayMs: 500 },
        this.logger,
      ),
    );
  }

  async getPayment(paymentId: string): Promise<PaymentResult> {
    if (!this.stripe) throw new Error('Stripe not configured');

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const paymentIntent =
            await this.stripe!.paymentIntents.retrieve(paymentId);

          return {
            paymentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            createdAt: new Date(paymentIntent.created * 1000),
          };
        },
        { maxAttempts: 3, initialDelayMs: 500 },
        this.logger,
      ),
    );
  }

  /**
   * Construct and verify a Stripe webhook event from the raw body + signature.
   * No retry needed — this is a local cryptographic verification.
   */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) throw new Error('Stripe not configured');
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
