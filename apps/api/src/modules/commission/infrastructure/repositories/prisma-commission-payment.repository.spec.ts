import { Test, TestingModule } from '@nestjs/testing';
import { PrismaCommissionPaymentRepository } from './prisma-commission-payment.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaCommissionPaymentRepository', () => {
  let repository: PrismaCommissionPaymentRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaCommissionPaymentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaCommissionPaymentRepository>(PrismaCommissionPaymentRepository);
  });

  describe('findMany', () => {
    it('should return commission payments with filters', async () => {
      const payments = [{ id: 'cp-1', status: 'PENDING' }];
      prisma.commissionPayment.findMany.mockResolvedValue(payments);

      const result = await repository.findMany({ status: 'PENDING' });

      expect(result).toEqual(payments);
      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        include: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should apply include when provided', async () => {
      prisma.commissionPayment.findMany.mockResolvedValue([]);

      await repository.findMany({}, { user: true });

      expect(prisma.commissionPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { user: true },
        }),
      );
    });
  });

  describe('findUnique', () => {
    it('should return payment by id', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue({ id: 'cp-1' });

      const result = await repository.findUnique('cp-1');

      expect(result).toEqual({ id: 'cp-1' });
      expect(prisma.commissionPayment.findUnique).toHaveBeenCalledWith({ where: { id: 'cp-1' } });
    });

    it('should return null when not found', async () => {
      prisma.commissionPayment.findUnique.mockResolvedValue(null);

      const result = await repository.findUnique('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update payment status', async () => {
      prisma.commissionPayment.update.mockResolvedValue({ id: 'cp-1', status: 'PAID' });

      const result = await repository.updateStatus('cp-1', 'PAID');

      expect(result).toEqual(expect.objectContaining({ status: 'PAID' }));
      expect(prisma.commissionPayment.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'PAID' },
      });
    });

    it('should include extra data in update', async () => {
      prisma.commissionPayment.update.mockResolvedValue({ id: 'cp-1', status: 'PAID' });

      await repository.updateStatus('cp-1', 'PAID', { paidAt: '2026-03-29' });

      expect(prisma.commissionPayment.update).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
        data: { status: 'PAID', paidAt: '2026-03-29' },
      });
    });
  });

  describe('findCommissionsByUserId', () => {
    it('should return commissions for a user', async () => {
      const commissions = [{ id: 'c1', userId: 'u1' }];
      prisma.commission.findMany.mockResolvedValue(commissions);

      const result = await repository.findCommissionsByUserId('u1');

      expect(result).toEqual(commissions);
      expect(prisma.commission.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('should respect custom limit', async () => {
      prisma.commission.findMany.mockResolvedValue([]);

      await repository.findCommissionsByUserId('u1', 50);

      expect(prisma.commission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('findCommissionsByLeadId', () => {
    it('should return commissions for a lead', async () => {
      const commissions = [{ id: 'c1', leadId: 'lead-1' }];
      prisma.commission.findMany.mockResolvedValue(commissions);

      const result = await repository.findCommissionsByLeadId('lead-1');

      expect(result).toEqual(commissions);
      expect(prisma.commission.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });
  });
});
