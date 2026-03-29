import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { SalesRabbitWebhookController } from './salesrabbit-webhook.controller';
import { SalesRabbitWebhookService } from '../application/services/salesrabbit-webhook.service';

describe('SalesRabbitWebhookController', () => {
  let controller: SalesRabbitWebhookController;
  let service: { processEvent: jest.Mock };

  describe('without webhook secret', () => {
    beforeEach(async () => {
      service = { processEvent: jest.fn() };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [SalesRabbitWebhookController],
        providers: [
          { provide: SalesRabbitWebhookService, useValue: service },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        ],
      }).compile();

      controller = module.get<SalesRabbitWebhookController>(SalesRabbitWebhookController);
    });

    it('should delegate lead.created to service', async () => {
      const data = { firstName: 'John', email: 'john@example.com' };
      service.processEvent.mockResolvedValue({ leadId: 'lead-1', customerId: 'cust-1' });

      const result = await controller.handleWebhook({ event: 'lead.created', data });

      expect(service.processEvent).toHaveBeenCalledWith('lead.created', data);
      expect(result).toEqual({ leadId: 'lead-1', customerId: 'cust-1' });
    });

    it('should delegate lead.deleted to service', async () => {
      const data = { email: 'john@example.com' };
      service.processEvent.mockResolvedValue({ deleted: true });

      const result = await controller.handleWebhook({ event: 'lead.deleted', data });

      expect(service.processEvent).toHaveBeenCalledWith('lead.deleted', data);
      expect(result).toEqual({ deleted: true });
    });

    it('should delegate unknown events to service', async () => {
      service.processEvent.mockResolvedValue({ received: true });

      const result = await controller.handleWebhook({ event: 'unknown.event', data: {} });

      expect(service.processEvent).toHaveBeenCalledWith('unknown.event', {});
      expect(result).toEqual({ received: true });
    });
  });

  describe('with webhook secret configured', () => {
    beforeEach(async () => {
      service = { processEvent: jest.fn() };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [SalesRabbitWebhookController],
        providers: [
          { provide: SalesRabbitWebhookService, useValue: service },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('my-secret') } },
        ],
      }).compile();

      controller = module.get<SalesRabbitWebhookController>(SalesRabbitWebhookController);
    });

    it('should reject requests with invalid secret', async () => {
      await expect(
        controller.handleWebhook({ event: 'lead.created', data: {} }, 'wrong-secret'),
      ).rejects.toThrow(UnauthorizedException);

      expect(service.processEvent).not.toHaveBeenCalled();
    });

    it('should accept requests with valid secret', async () => {
      service.processEvent.mockResolvedValue({ received: true });

      const result = await controller.handleWebhook(
        { event: 'lead.created', data: {} },
        'my-secret',
      );

      expect(service.processEvent).toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });
  });
});
