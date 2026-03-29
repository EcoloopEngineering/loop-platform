import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Test } from '@nestjs/testing';
import { CommissionPaymentController } from './commission-payment.controller';
import { CommissionPaymentService } from '../application/services/commission-payment.service';

describe('CommissionPaymentController', () => {
  let controller: CommissionPaymentController;
  let service: jest.Mocked<CommissionPaymentService>;

  const adminUser: any = { id: 'admin-1', role: 'ADMIN' };
  const salesUser: any = { id: 'sales-1', role: 'SALES_REP' };

  beforeEach(async () => {
    const mockService = {
      listPayments: jest.fn(),
      getPaymentsByLead: jest.fn(),
      approvePayment: jest.fn(),
      markAsPaid: jest.fn(),
      cancelPayment: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [CommissionPaymentController],
      providers: [{ provide: CommissionPaymentService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CommissionPaymentController);
    service = module.get(CommissionPaymentService);
  });

  describe('listPayments', () => {
    it('should delegate to service with user and optional userId', async () => {
      service.listPayments.mockResolvedValue([{ id: 'cp-1' }, { id: 'cp-2' }] as any);

      const result = await controller.listPayments(adminUser);

      expect(service.listPayments).toHaveBeenCalledWith(adminUser, undefined);
      expect(result).toHaveLength(2);
    });

    it('should pass userId filter to service', async () => {
      service.listPayments.mockResolvedValue([{ id: 'cp-1' }] as any);

      await controller.listPayments(adminUser, 'user-x');

      expect(service.listPayments).toHaveBeenCalledWith(adminUser, 'user-x');
    });
  });

  describe('getPaymentsByLead', () => {
    it('should delegate to service with leadId', async () => {
      service.getPaymentsByLead.mockResolvedValue([{ id: 'cp-1', leadId: 'lead-1' }] as any);

      const result = await controller.getPaymentsByLead('lead-1');

      expect(service.getPaymentsByLead).toHaveBeenCalledWith('lead-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('approvePayment', () => {
    it('should delegate to service', async () => {
      service.approvePayment.mockResolvedValue({ id: 'cp-1', status: 'APPROVED' } as any);

      const result = await controller.approvePayment('cp-1');

      expect(service.approvePayment).toHaveBeenCalledWith('cp-1');
      expect(result.status).toBe('APPROVED');
    });
  });

  describe('markAsPaid', () => {
    it('should delegate to service', async () => {
      service.markAsPaid.mockResolvedValue({ id: 'cp-1', status: 'PAID' } as any);

      const result = await controller.markAsPaid('cp-1');

      expect(service.markAsPaid).toHaveBeenCalledWith('cp-1');
      expect(result.status).toBe('PAID');
    });
  });

  describe('cancelPayment', () => {
    it('should delegate to service', async () => {
      service.cancelPayment.mockResolvedValue({ id: 'cp-1', status: 'CANCELLED' } as any);

      const result = await controller.cancelPayment('cp-1');

      expect(service.cancelPayment).toHaveBeenCalledWith('cp-1');
      expect(result.status).toBe('CANCELLED');
    });
  });
});
