import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommissionPaymentService } from './commission-payment.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('CommissionPaymentService', () => {
  let service: CommissionPaymentService;
  let prisma: MockPrismaService;

  const adminUser: any = { id: 'admin-1', role: 'ADMIN' };
  const salesUser: any = { id: 'sales-1', role: 'SALES_REP' };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module = await Test.createTestingModule({
      providers: [
        CommissionPaymentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CommissionPaymentService);
  });

  describe('listPayments', () => {
    it('should return all payments for admin without userId filter', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([{ id: 'cp-1' }, { id: 'cp-2' }]);

      const result = await service.listPayments(adminUser);

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by userId for admin when provided', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([{ id: 'cp-1' }]);

      await service.listPayments(adminUser, 'user-x');

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-x' } }),
      );
    });

    it('should only return own payments for non-admin users', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([]);

      await service.listPayments(salesUser);

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'sales-1' } }),
      );
    });
  });

  describe('getPaymentsByLead', () => {
    it('should return payments for a specific lead', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([{ id: 'cp-1', leadId: 'lead-1' }]);

      const result = await service.getPaymentsByLead('lead-1');

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { leadId: 'lead-1' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('approvePayment', () => {
    it('should approve a PENDING payment', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PENDING' });
      prisma.commissionPayment.update.mockResolvedValue({ id: 'cp-1', status: 'APPROVED' });

      const result = await service.approvePayment('cp-1');

      expect(result.status).toBe('APPROVED');
      expect(prisma.commissionPayment.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'APPROVED' },
      });
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue(null);

      await expect(service.approvePayment('no-exist')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if payment is not PENDING', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PAID' });

      await expect(service.approvePayment('cp-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if payment is CANCELLED', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' });

      await expect(service.approvePayment('cp-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsPaid', () => {
    it('should mark an APPROVED payment as PAID', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'APPROVED' });
      prisma.commissionPayment.update.mockResolvedValue({
        id: 'cp-1',
        status: 'PAID',
        paidAt: expect.any(Date),
      });

      const result = await service.markAsPaid('cp-1');

      expect(prisma.commissionPayment.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'PAID', paidAt: expect.any(Date) },
      });
    });

    it('should throw ForbiddenException if payment is not APPROVED', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PENDING' });

      await expect(service.markAsPaid('cp-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if payment is already PAID', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PAID' });

      await expect(service.markAsPaid('cp-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a PENDING payment', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PENDING' });
      prisma.commissionPayment.update.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' });

      const result = await service.cancelPayment('cp-1');

      expect(prisma.commissionPayment.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should cancel an APPROVED payment', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'APPROVED' });
      prisma.commissionPayment.update.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' });

      const result = await service.cancelPayment('cp-1');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw ForbiddenException if payment is already PAID', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'PAID' });

      await expect(service.cancelPayment('cp-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if payment is already CANCELLED', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' });

      await expect(service.cancelPayment('cp-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
