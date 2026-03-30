import { Test, TestingModule } from '@nestjs/testing';
import { WebhookEventService } from './webhook-event.service';
import { PrismaService } from '../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.helper';

describe('WebhookEventService', () => {
  let service: WebhookEventService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookEventService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WebhookEventService);
  });

  describe('recordEvent', () => {
    it('should upsert a new webhook event', async () => {
      const record = {
        id: 'wh-1',
        provider: 'stripe',
        externalId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        payload: { id: 'pi_123' },
        status: 'PENDING',
        errorMessage: null,
        attempts: 0,
        processedAt: null,
        createdAt: new Date(),
      };
      prisma.webhookEvent.upsert.mockResolvedValue(record);

      const result = await service.recordEvent({
        provider: 'stripe',
        externalId: 'evt_123',
        eventType: 'payment_intent.succeeded',
        payload: { id: 'pi_123' },
      });

      expect(result).toEqual(record);
      expect(prisma.webhookEvent.upsert).toHaveBeenCalledWith({
        where: {
          provider_externalId: { provider: 'stripe', externalId: 'evt_123' },
        },
        update: {},
        create: {
          provider: 'stripe',
          externalId: 'evt_123',
          eventType: 'payment_intent.succeeded',
          payload: { id: 'pi_123' },
          status: 'PENDING',
          attempts: 0,
        },
      });
    });
  });

  describe('isAlreadyProcessed', () => {
    it('should return true when event is PROCESSED', async () => {
      prisma.webhookEvent.findUnique.mockResolvedValue({ status: 'PROCESSED' });

      const result = await service.isAlreadyProcessed('stripe', 'evt_123');

      expect(result).toBe(true);
    });

    it('should return false when event is PENDING', async () => {
      prisma.webhookEvent.findUnique.mockResolvedValue({ status: 'PENDING' });

      const result = await service.isAlreadyProcessed('stripe', 'evt_123');

      expect(result).toBe(false);
    });

    it('should return false when event does not exist', async () => {
      prisma.webhookEvent.findUnique.mockResolvedValue(null);

      const result = await service.isAlreadyProcessed('stripe', 'evt_unknown');

      expect(result).toBe(false);
    });
  });

  describe('markProcessed', () => {
    it('should update status to PROCESSED with timestamp', async () => {
      prisma.webhookEvent.update.mockResolvedValue({});

      await service.markProcessed('wh-1');

      expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: {
          status: 'PROCESSED',
          processedAt: expect.any(Date),
          attempts: { increment: 1 },
        },
      });
    });
  });

  describe('markFailed', () => {
    it('should update status to FAILED with error message', async () => {
      prisma.webhookEvent.update.mockResolvedValue({});

      await service.markFailed('wh-1', 'Processing error');

      expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: {
          status: 'FAILED',
          errorMessage: 'Processing error',
          attempts: { increment: 1 },
        },
      });
    });
  });

  describe('findFailedEvents', () => {
    it('should return failed events with fewer than maxAttempts', async () => {
      const events = [
        { id: 'wh-1', status: 'FAILED', attempts: 2 },
        { id: 'wh-2', status: 'FAILED', attempts: 1 },
      ];
      prisma.webhookEvent.findMany.mockResolvedValue(events);

      const result = await service.findFailedEvents('stripe', 5, 50);

      expect(result).toEqual(events);
      expect(prisma.webhookEvent.findMany).toHaveBeenCalledWith({
        where: {
          status: 'FAILED',
          attempts: { lt: 5 },
          provider: 'stripe',
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
    });

    it('should work without provider filter', async () => {
      prisma.webhookEvent.findMany.mockResolvedValue([]);

      await service.findFailedEvents();

      expect(prisma.webhookEvent.findMany).toHaveBeenCalledWith({
        where: {
          status: 'FAILED',
          attempts: { lt: 5 },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
    });
  });
});
