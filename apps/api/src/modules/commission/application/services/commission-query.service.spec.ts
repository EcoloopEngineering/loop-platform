import { Test, TestingModule } from '@nestjs/testing';
import { CommissionQueryService } from './commission-query.service';
import {
  COMMISSION_PAYMENT_REPOSITORY,
  CommissionPaymentRepositoryPort,
} from '../ports/commission-payment.repository.port';

describe('CommissionQueryService', () => {
  let service: CommissionQueryService;
  let repo: jest.Mocked<CommissionPaymentRepositoryPort>;

  beforeEach(async () => {
    repo = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateStatus: jest.fn(),
      findCommissionsByUserId: jest.fn(),
      findCommissionsByLeadId: jest.fn(),
      findLeadById: jest.fn(),
      upsertCommission: jest.fn(),
      findPaidCommissionPayment: jest.fn(),
      findSettingByKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionQueryService,
        { provide: COMMISSION_PAYMENT_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = module.get<CommissionQueryService>(CommissionQueryService);
  });

  describe('findByUserId', () => {
    it('should return commissions for the given user', async () => {
      const commissions = [{ id: 'c-1', amount: 1500 }, { id: 'c-2', amount: 2000 }];
      repo.findCommissionsByUserId.mockResolvedValue(commissions);

      const result = await service.findByUserId('user-1');

      expect(repo.findCommissionsByUserId).toHaveBeenCalledWith('user-1', 100);
      expect(result).toEqual(commissions);
    });

    it('should return empty array when no commissions exist', async () => {
      repo.findCommissionsByUserId.mockResolvedValue([]);

      const result = await service.findByUserId('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('findByLeadId', () => {
    it('should return commissions for the given lead', async () => {
      const commissions = [{ id: 'c-1', leadId: 'lead-1', amount: 1500 }];
      repo.findCommissionsByLeadId.mockResolvedValue(commissions);

      const result = await service.findByLeadId('lead-1');

      expect(repo.findCommissionsByLeadId).toHaveBeenCalledWith('lead-1', 100);
      expect(result).toEqual(commissions);
    });
  });
});
