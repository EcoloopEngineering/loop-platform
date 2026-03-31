import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CUSTOMER_REPOSITORY } from '../application/ports/customer.repository.port';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('CustomersController', () => {
  let controller: CustomersController;
  let customerRepo: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    customerRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CUSTOMER_REPOSITORY, useValue: customerRepo },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  describe('list', () => {
    it('should return paginated customers', async () => {
      const customers = [{ id: 'c1', firstName: 'John' }];
      customerRepo.findAll.mockResolvedValue({ data: customers, total: 1 });

      const result = await controller.list({ page: 1, limit: 20, skip: 0 } as any);

      expect(result.data).toEqual(customers);
      expect(result.meta.total).toBe(1);
      expect(customerRepo.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        type: undefined,
      });
    });

    it('should filter by type PROSPECT', async () => {
      customerRepo.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.list({ page: 1, limit: 20, skip: 0 } as any, 'PROSPECT');

      expect(customerRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PROSPECT' }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      const customer = { id: 'c1', firstName: 'John' };
      customerRepo.findById.mockResolvedValue(customer);

      const result = await controller.findOne('c1');

      expect(result).toEqual(customer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerRepo.findById.mockResolvedValue(null);

      await expect(controller.findOne('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new customer', async () => {
      const body = { firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com' };
      const created = { id: 'c2', ...body };
      customerRepo.create.mockResolvedValue(created);

      const result = await controller.create(body);

      expect(result).toEqual(created);
      expect(customerRepo.create).toHaveBeenCalledWith(body);
    });

    it('should create a prospect with socialLink', async () => {
      const body = {
        firstName: 'Jane',
        lastName: 'Doe',
        type: 'PROSPECT' as const,
        socialLink: 'https://instagram.com/ecoloop',
      };
      const created = { id: 'c3', ...body };
      customerRepo.create.mockResolvedValue(created);

      const result = await controller.create(body);

      expect(result).toEqual(created);
      expect(customerRepo.create).toHaveBeenCalledWith(body);
    });
  });

  describe('update', () => {
    it('should update and return the customer', async () => {
      const existing = { id: 'c1', firstName: 'John', lastName: 'Doe' };
      const updated = { ...existing, firstName: 'Johnny' };
      customerRepo.findById.mockResolvedValue(existing);
      customerRepo.update.mockResolvedValue(updated);

      const result = await controller.update('c1', { firstName: 'Johnny' });

      expect(result).toEqual(updated);
      expect(customerRepo.update).toHaveBeenCalledWith('c1', { firstName: 'Johnny' });
    });

    it('should throw NotFoundException when updating non-existent customer', async () => {
      customerRepo.findById.mockResolvedValue(null);

      await expect(controller.update('not-found', { firstName: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('convertToLead', () => {
    it('should convert prospect to lead type', async () => {
      const prospect = { id: 'c1', firstName: 'John', type: 'PROSPECT' };
      const converted = { ...prospect, type: 'LEAD' };
      customerRepo.findById.mockResolvedValue(prospect);
      customerRepo.update.mockResolvedValue(converted);

      const result = await controller.convertToLead('c1');

      expect(result.type).toBe('LEAD');
      expect(customerRepo.update).toHaveBeenCalledWith('c1', { type: 'LEAD' });
    });

    it('should return customer as-is if already LEAD', async () => {
      const lead = { id: 'c1', firstName: 'John', type: 'LEAD' };
      customerRepo.findById.mockResolvedValue(lead);

      const result = await controller.convertToLead('c1');

      expect(result.type).toBe('LEAD');
      expect(customerRepo.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when customer not found', async () => {
      customerRepo.findById.mockResolvedValue(null);

      await expect(controller.convertToLead('not-found')).rejects.toThrow(NotFoundException);
    });
  });
});
