import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  function buildService(envMap: Record<string, string | undefined> = {}) {
    return Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => envMap[key] ?? defaultVal),
          },
        },
      ],
    }).compile();
  }

  it('should initialize without stripe when key is missing', async () => {
    const module = await buildService({});
    const service = module.get(StripeService);

    await expect(service.createPayment(1000, 'u1')).rejects.toThrow('Stripe not configured');
  });

  it('should throw on getPayment when stripe is not configured', async () => {
    const module = await buildService({});
    const service = module.get(StripeService);

    await expect(service.getPayment('pi_123')).rejects.toThrow('Stripe not configured');
  });

  it('should throw on constructEvent when stripe is not configured', async () => {
    const module = await buildService({});
    const service = module.get(StripeService);

    expect(() => service.constructEvent(Buffer.from(''), 'sig')).toThrow('Stripe not configured');
  });

  it('should retry on transient failure in createPayment', async () => {
    const module = await buildService({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    });
    const service = module.get(StripeService);

    // Access the private stripe instance and mock paymentIntents.create
    const stripeClient = (service as any).stripe;
    let callCount = 0;
    stripeClient.paymentIntents = {
      create: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Connection timeout'));
        }
        return Promise.resolve({
          id: 'pi_retried',
          status: 'succeeded',
          amount: 1000,
          currency: 'usd',
          created: Math.floor(Date.now() / 1000),
        });
      }),
      retrieve: jest.fn(),
    };

    const result = await service.createPayment(1000, 'u1');

    expect(callCount).toBe(2);
    expect(result.paymentId).toBe('pi_retried');
  }, 15000);

  it('should initialize circuit breaker', async () => {
    const module = await buildService({
      STRIPE_SECRET_KEY: 'sk_test_123',
    });
    const service = module.get(StripeService);

    const breaker = (service as any).circuitBreaker;
    expect(breaker).toBeDefined();
    expect(breaker.getState()).toBe('CLOSED');
  });
});
