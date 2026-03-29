import { Test, TestingModule } from '@nestjs/testing';
import { SalesRabbitWebhookService } from './salesrabbit-webhook.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';
import { CUSTOMER_REPOSITORY } from '../ports/customer.repository.port';
import { PROPERTY_REPOSITORY } from '../ports/property.repository.port';

describe('SalesRabbitWebhookService', () => {
  let service: SalesRabbitWebhookService;
  let leadRepo: Record<string, jest.Mock>;
  let customerRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      findById: jest.fn(),
      createLeadRaw: jest.fn(),
      createActivity: jest.fn(),
      findDefaultPipeline: jest.fn(),
      deactivateByCustomerId: jest.fn(),
    };
    customerRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    propertyRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
      update: jest.fn(),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesRabbitWebhookService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: CUSTOMER_REPOSITORY, useValue: customerRepo },
        { provide: EventEmitter2, useValue: emitter },
        { provide: PROPERTY_REPOSITORY, useValue: propertyRepo },
      ],
    }).compile();

    service = module.get<SalesRabbitWebhookService>(SalesRabbitWebhookService);
  });

  describe('processEvent - lead.created', () => {
    it('should create customer, property, lead and emit event', async () => {
      customerRepo.findByEmail.mockResolvedValue(null);
      customerRepo.create.mockResolvedValue({ id: 'cust-1' });
      propertyRepo.create.mockResolvedValue({ id: 'prop-1' });
      leadRepo.findDefaultPipeline.mockResolvedValue({ id: 'pipe-1' });
      leadRepo.createLeadRaw.mockResolvedValue({ id: 'lead-1', createdById: null });
      leadRepo.createActivity.mockResolvedValue({});

      const result = await service.processEvent('lead.created', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        salesRabbitId: 'sr-1',
      });

      expect(result).toEqual({ leadId: 'lead-1', customerId: 'cust-1' });
      expect(customerRepo.create).toHaveBeenCalled();
      expect(propertyRepo.create).toHaveBeenCalled();
      expect(leadRepo.createLeadRaw).toHaveBeenCalled();
      expect(emitter.emit).toHaveBeenCalledWith(
        'lead.created',
        expect.objectContaining({ leadId: 'lead-1' }),
      );
    });

    it('should skip lead with no email and no phone', async () => {
      const result = await service.processEvent('lead.created', {
        firstName: 'Ghost',
      });

      expect(result).toEqual({ skipped: true, reason: 'no contact info' });
      expect(customerRepo.create).not.toHaveBeenCalled();
    });

    it('should skip disqualified leads (statusId in DISQUALIFIED_STATUSES)', async () => {
      const result = await service.processEvent('lead.created', {
        email: 'test@test.com',
        statusId: 14,
      });

      expect(result).toEqual({ skipped: true, reason: 'disqualified' });
    });

    it('should use existing customer if found by email', async () => {
      customerRepo.findByEmail.mockResolvedValue({ id: 'existing-cust' });
      leadRepo.findDefaultPipeline.mockResolvedValue({ id: 'pipe-1' });
      leadRepo.createLeadRaw.mockResolvedValue({ id: 'lead-2', createdById: null });
      leadRepo.createActivity.mockResolvedValue({});

      const result = await service.processEvent('lead.created', {
        email: 'existing@example.com',
        firstName: 'Jane',
      });

      expect(result).toEqual({ leadId: 'lead-2', customerId: 'existing-cust' });
      expect(customerRepo.create).not.toHaveBeenCalled();
    });

    it('should return error when no default pipeline exists', async () => {
      customerRepo.findByEmail.mockResolvedValue(null);
      customerRepo.create.mockResolvedValue({ id: 'cust-1' });
      leadRepo.findDefaultPipeline.mockResolvedValue(null);

      const result = await service.processEvent('lead.created', {
        email: 'test@test.com',
      });

      expect(result).toEqual({ error: 'no pipeline' });
    });
  });

  describe('processEvent - lead.deleted', () => {
    it('should soft-delete leads for the customer', async () => {
      customerRepo.findByEmail.mockResolvedValue({ id: 'cust-1' });
      leadRepo.deactivateByCustomerId.mockResolvedValue(undefined);

      const result = await service.processEvent('lead.deleted', {
        email: 'john@example.com',
      });

      expect(result).toEqual({ deleted: true });
      expect(leadRepo.deactivateByCustomerId).toHaveBeenCalledWith('cust-1');
    });

    it('should skip deletion when email is missing', async () => {
      const result = await service.processEvent('lead.deleted', {});

      expect(result).toEqual({ skipped: true });
    });
  });

  describe('processEvent - unknown event', () => {
    it('should return received: true for unknown events', async () => {
      const result = await service.processEvent('unknown.event', {});

      expect(result).toEqual({ received: true });
    });
  });
});
