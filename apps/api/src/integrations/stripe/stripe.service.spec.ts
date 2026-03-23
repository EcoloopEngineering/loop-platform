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
            get: jest.fn((key: string) => envMap[key]),
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
});
