import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommissionPaymentController } from './commission-payment.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';

describe('CommissionPaymentController', () => {
  let controller: CommissionPaymentController;
  let prisma: MockPrismaService;

  const adminUser = { id: 'admin-1', role: 'ADMIN' };
  const salesUser = { id: 'sales-1', role: 'SALES_REP' };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module = await Test.createTestingModule({
      controllers: [CommissionPaymentController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CommissionPaymentController);
  });

  describe('listPayments', () => {
    it('should return all payments for admin without userId filter', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([
        { id: 'cp-1' },
        { id: 'cp-2' },
      ]);

      const result = await controller.listPayments(adminUser);

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by userId for admin when provided', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([{ id: 'cp-1' }]);

      await controller.listPayments(adminUser, 'user-x');

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-x' } }),
      );
    });

    it('should only return own payments for non-admin users', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([]);

      await controller.listPayments(salesUser);

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'sales-1' } }),
      );
    });
  });

  describe('getPaymentsByLead', () => {
    it('should return payments for a specific lead', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([
        { id: 'cp-1', leadId: 'lead-1' },
      ]);

      const result = await controller.getPaymentsByLead('lead-1', adminUser);

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { leadId: 'lead-1' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('approvePayment', () => {
    it('should approve a PENDING payment', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING',
      });
      prisma.commissionPayment.update.mockResolvedValue({
        id: 'cp-1',
        status: 'APPROVED',
      });

      const result = await controller.approvePayment('cp-1');

      expect(result.status).toBe('APPROVED');
      expect(prisma.commissionPayment.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'APPROVED' },
      });
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue(null);

      await expect(controller.approvePayment('no-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if payment is not PENDING', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({
        id: 'cp-1',
        status: 'PAID',
      });

      await expect(controller.approvePayment('cp-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markAsPaid', () => {
    it('should mark an APPROVED payment as PAID', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({
        id: 'cp-1',
        status: 'APPROVED',
      });
      prisma.commissionPayment.update.mockResolvedValue({
        id: 'cp-1',
        status: 'PAID',
        paidAt: expect.any(Date),
      });

      const result = await controller.markAsPaid('cp-1');

      expect(prisma.commissionPayment.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'PAID', paidAt: expect.any(Date) },
      });
    });

    it('should throw ForbiddenException if payment is not APPROVED', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING',
      });

      await expect(controller.markAsPaid('cp-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a PENDING payment', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({
        id: 'cp-1',
        status: 'PENDING',
      });
      prisma.commissionPayment.update.mockResolvedValue({
        id: 'cp-1',
        status: 'CANCELLED',
      });

      const result = await controller.cancelPayment('cp-1', salesUser);

      expect(prisma.commissionPayment.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should throw ForbiddenException if payment is already PAID', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({
        id: 'cp-1',
        status: 'PAID',
      });

      await expect(
        controller.cancelPayment('cp-1', salesUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if payment is already CANCELLED', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({
        id: 'cp-1',
        status: 'CANCELLED',
      });

      await expect(
        controller.cancelPayment('cp-1', salesUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
