import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SalesRabbitWebhookController } from './salesrabbit-webhook.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('SalesRabbitWebhookController', () => {
  let controller: SalesRabbitWebhookController;
  let prisma: any;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      customer: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      property: {
        create: jest.fn(),
      },
      pipeline: {
        findFirst: jest.fn(),
      },
      lead: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      leadActivity: {
        create: jest.fn(),
      },
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesRabbitWebhookController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();

    controller = module.get<SalesRabbitWebhookController>(SalesRabbitWebhookController);
  });

  describe('handleWebhook - lead.created', () => {
    it('should create customer, property, lead and emit event', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({ id: 'cust-1' });
      prisma.property.create.mockResolvedValue({ id: 'prop-1' });
      prisma.pipeline.findFirst.mockResolvedValue({ id: 'pipe-1' });
      prisma.lead.create.mockResolvedValue({ id: 'lead-1', createdById: null });
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await controller.handleWebhook({
        event: 'lead.created',
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          address: '123 Main St',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          salesRabbitId: 'sr-1',
        },
      });

      expect(result).toEqual({ leadId: 'lead-1', customerId: 'cust-1' });
      expect(prisma.customer.create).toHaveBeenCalled();
      expect(prisma.property.create).toHaveBeenCalled();
      expect(prisma.lead.create).toHaveBeenCalled();
      expect(emitter.emit).toHaveBeenCalledWith('lead.created', expect.objectContaining({ leadId: 'lead-1' }));
    });

    it('should skip lead with no email and no phone', async () => {
      const result = await controller.handleWebhook({
        event: 'lead.created',
        data: { firstName: 'Ghost' },
      });

      expect(result).toEqual({ skipped: true, reason: 'no contact info' });
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('should skip disqualified leads (statusId in DISQUALIFIED_STATUSES)', async () => {
      const result = await controller.handleWebhook({
        event: 'lead.created',
        data: { email: 'test@test.com', statusId: 14 },
      });

      expect(result).toEqual({ skipped: true, reason: 'disqualified' });
    });

    it('should use existing customer if found by email', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'existing-cust' });
      prisma.pipeline.findFirst.mockResolvedValue({ id: 'pipe-1' });
      prisma.lead.create.mockResolvedValue({ id: 'lead-2', createdById: null });
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await controller.handleWebhook({
        event: 'lead.created',
        data: { email: 'existing@example.com', firstName: 'Jane' },
      });

      expect(result).toEqual({ leadId: 'lead-2', customerId: 'existing-cust' });
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('should return error when no default pipeline exists', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({ id: 'cust-1' });
      prisma.pipeline.findFirst.mockResolvedValue(null);

      const result = await controller.handleWebhook({
        event: 'lead.created',
        data: { email: 'test@test.com' },
      });

      expect(result).toEqual({ error: 'no pipeline' });
    });
  });

  describe('handleWebhook - lead.deleted', () => {
    it('should soft-delete leads for the customer', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
      prisma.lead.updateMany.mockResolvedValue({ count: 2 });

      const result = await controller.handleWebhook({
        event: 'lead.deleted',
        data: { email: 'john@example.com' },
      });

      expect(result).toEqual({ deleted: true });
      expect(prisma.lead.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', isActive: true },
        data: { isActive: false, lostReason: 'Deleted from SalesRabbit' },
      });
    });

    it('should skip deletion when email is missing', async () => {
      const result = await controller.handleWebhook({
        event: 'lead.deleted',
        data: {},
      });

      expect(result).toEqual({ skipped: true });
    });
  });

  describe('handleWebhook - unknown event', () => {
    it('should return received: true for unknown events', async () => {
      const result = await controller.handleWebhook({
        event: 'unknown.event',
        data: {},
      });

      expect(result).toEqual({ received: true });
    });
  });
});
