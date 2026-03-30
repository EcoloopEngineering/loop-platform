import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeService } from './stripe.service';
import { WebhookEventService } from '../../infrastructure/webhook/webhook-event.service';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let stripeService: { constructEvent: jest.Mock };
  let emitter: { emit: jest.Mock };
  let webhookEventService: {
    isAlreadyProcessed: jest.Mock;
    recordEvent: jest.Mock;
    markProcessed: jest.Mock;
    markFailed: jest.Mock;
  };

  beforeEach(async () => {
    stripeService = { constructEvent: jest.fn() };
    emitter = { emit: jest.fn() };
    webhookEventService = {
      isAlreadyProcessed: jest.fn().mockResolvedValue(false),
      recordEvent: jest.fn().mockResolvedValue({ id: 'wh-record-1' }),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        { provide: StripeService, useValue: stripeService },
        { provide: EventEmitter2, useValue: emitter },
        { provide: WebhookEventService, useValue: webhookEventService },
      ],
    }).compile();

    controller = module.get(StripeWebhookController);
  });

  const fakeReq = (body = Buffer.from('{}')) => ({ body } as any);

  it('should throw BadRequestException on invalid signature', async () => {
    stripeService.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await expect(
      controller.handleWebhook(fakeReq(), 'bad-sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should emit payment.succeeded event and mark as processed', async () => {
    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          amount: 5000,
          currency: 'usd',
          metadata: { userId: 'u1' },
        },
      },
    };
    stripeService.constructEvent.mockReturnValue(event);

    const result = await controller.handleWebhook(fakeReq(), 'valid-sig');

    expect(result).toEqual({ received: true });
    expect(webhookEventService.recordEvent).toHaveBeenCalledWith({
      provider: 'stripe',
      externalId: 'evt_1',
      eventType: 'payment_intent.succeeded',
      payload: event.data.object,
    });
    expect(emitter.emit).toHaveBeenCalledWith('payment.succeeded', {
      paymentIntentId: 'pi_123',
      amount: 5000,
      currency: 'usd',
      metadata: { userId: 'u1' },
      stripeEventId: 'evt_1',
    });
    expect(webhookEventService.markProcessed).toHaveBeenCalledWith('wh-record-1');
  });

  it('should emit payment.failed event', async () => {
    const event = {
      id: 'evt_2',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_456',
          amount: 3000,
          currency: 'usd',
          metadata: {},
          last_payment_error: { message: 'Card declined' },
        },
      },
    };
    stripeService.constructEvent.mockReturnValue(event);

    const result = await controller.handleWebhook(fakeReq(), 'valid-sig');

    expect(result).toEqual({ received: true });
    expect(emitter.emit).toHaveBeenCalledWith('payment.failed', {
      paymentIntentId: 'pi_456',
      amount: 3000,
      currency: 'usd',
      metadata: {},
      failureMessage: 'Card declined',
      stripeEventId: 'evt_2',
    });
  });

  it('should handle payment_failed with no error message', async () => {
    const event = {
      id: 'evt_3',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_789',
          amount: 1000,
          currency: 'usd',
          metadata: {},
          last_payment_error: null,
        },
      },
    };
    stripeService.constructEvent.mockReturnValue(event);

    await controller.handleWebhook(fakeReq(), 'valid-sig');

    expect(emitter.emit).toHaveBeenCalledWith('payment.failed',
      expect.objectContaining({ failureMessage: 'Unknown failure' }),
    );
  });

  it('should handle unhandled event types without emitting', async () => {
    const event = {
      id: 'evt_4',
      type: 'charge.refunded',
      data: { object: {} },
    };
    stripeService.constructEvent.mockReturnValue(event);

    const result = await controller.handleWebhook(fakeReq(), 'valid-sig');

    expect(result).toEqual({ received: true });
    expect(emitter.emit).not.toHaveBeenCalled();
    expect(webhookEventService.markProcessed).toHaveBeenCalledWith('wh-record-1');
  });

  it('should skip duplicate events (idempotency via DB)', async () => {
    webhookEventService.isAlreadyProcessed.mockResolvedValue(true);

    const event = {
      id: 'evt_dup',
      type: 'payment_intent.succeeded',
      data: {
        object: { id: 'pi_dup', amount: 100, currency: 'usd', metadata: {} },
      },
    };
    stripeService.constructEvent.mockReturnValue(event);

    const result = await controller.handleWebhook(fakeReq(), 'sig');

    expect(result).toEqual({ received: true });
    expect(webhookEventService.recordEvent).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('should mark event as failed when processing throws', async () => {
    const event = {
      id: 'evt_fail',
      type: 'payment_intent.succeeded',
      data: {
        object: { id: 'pi_fail', amount: 100, currency: 'usd', metadata: {} },
      },
    };
    stripeService.constructEvent.mockReturnValue(event);
    emitter.emit.mockImplementation(() => {
      throw new Error('emit failed');
    });

    const result = await controller.handleWebhook(fakeReq(), 'sig');

    expect(result).toEqual({ received: true });
    expect(webhookEventService.markFailed).toHaveBeenCalledWith('wh-record-1', 'emit failed');
    expect(webhookEventService.markProcessed).not.toHaveBeenCalled();
  });
});
