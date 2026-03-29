import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommissionPaymentService } from './commission-payment.service';
import { COMMISSION_PAYMENT_REPOSITORY } from '../ports/commission-payment.repository.port';

describe('CommissionPaymentService', () => {
  let service: CommissionPaymentService;
  let mockRepo: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    updateStatus: jest.Mock;
  };

  const adminUser: any = { id: 'admin-1', role: 'ADMIN' };
  const salesUser: any = { id: 'sales-1', role: 'SALES_REP' };

  beforeEach(async () => {
    mockRepo = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CommissionPaymentService,
        { provide: COMMISSION_PAYMENT_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(CommissionPaymentService);
  });

  describe('listPayments', () => {
    it('should return all payments for admin without userId filter', async () => {
      mockRepo.findMany.mockResolvedValue([{ id: 'cp-1' }, { id: 'cp-2' }]);

      const result = await service.listPayments(adminUser);

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        {},
        expect.any(Object),
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by userId for admin when provided', async () => {
      mockRepo.findMany.mockResolvedValue([{ id: 'cp-1' }]);

      await service.listPayments(adminUser, 'user-x');

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        { userId: 'user-x' },
        expect.any(Object),
      );
    });

    it('should only return own payments for non-admin users', async () => {
      mockRepo.findMany.mockResolvedValue([]);

      await service.listPayments(salesUser);

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        { userId: 'sales-1' },
        expect.any(Object),
      );
    });
  });

  describe('getPaymentsByLead', () => {
    it('should return payments for a specific lead', async () => {
      mockRepo.findMany.mockResolvedValue([{ id: 'cp-1', leadId: 'lead-1' }]);

      const result = await service.getPaymentsByLead('lead-1');

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        { leadId: 'lead-1' },
        expect.any(Object),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('approvePayment', () => {
    it('should approve a PENDING payment', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PENDING' });
      mockRepo.updateStatus.mockResolvedValue({ id: 'cp-1', status: 'APPROVED' });

      const result = await service.approvePayment('cp-1');

      expect(result.status).toBe('APPROVED');
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('cp-1', 'APPROVED');
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      mockRepo.findUnique.mockResolvedValue(null);

      await expect(service.approvePayment('no-exist')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if payment is not PENDING', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PAID' });

      await expect(service.approvePayment('cp-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if payment is CANCELLED', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' });

      await expect(service.approvePayment('cp-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsPaid', () => {
    it('should mark an APPROVED payment as PAID', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'APPROVED' });
      mockRepo.updateStatus.mockResolvedValue({
        id: 'cp-1',
        status: 'PAID',
        paidAt: expect.any(Date),
      });

      const result = await service.markAsPaid('cp-1');

      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        'cp-1',
        'PAID',
        { paidAt: expect.any(Date) },
      );
    });

    it('should throw ForbiddenException if payment is not APPROVED', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PENDING' });

      await expect(service.markAsPaid('cp-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if payment is already PAID', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PAID' });

      await expect(service.markAsPaid('cp-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a PENDING payment', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PENDING' });
      mockRepo.updateStatus.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' });

      const result = await service.cancelPayment('cp-1');

      expect(mockRepo.updateStatus).toHaveBeenCalledWith('cp-1', 'CANCELLED');
    });

    it('should cancel an APPROVED payment', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'APPROVED' });
      mockRepo.updateStatus.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' });

      const result = await service.cancelPayment('cp-1');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw ForbiddenException if payment is already PAID', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PAID' });

      await expect(service.cancelPayment('cp-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if payment is already CANCELLED', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' });

      await expect(service.cancelPayment('cp-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
