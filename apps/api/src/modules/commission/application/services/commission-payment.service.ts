import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@loop/shared';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import {
  COMMISSION_PAYMENT_REPOSITORY,
  CommissionPaymentRepositoryPort,
} from '../ports/commission-payment.repository.port';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

@Injectable()
export class CommissionPaymentService {
  constructor(
    @Inject(COMMISSION_PAYMENT_REPOSITORY)
    private readonly commissionPaymentRepo: CommissionPaymentRepositoryPort,
  ) {}

  async listPayments(user: AuthenticatedUser, userId?: string) {
    const isAdmin = user.role === UserRole.ADMIN;
    const filterUserId = isAdmin && userId ? userId : isAdmin ? undefined : user.id;

    const where = filterUserId ? { userId: filterUserId } : {};
    const include = {
      lead: {
        select: {
          id: true,
          currentStage: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    };

    return this.commissionPaymentRepo.findMany(where, include);
  }

  async getPaymentsByLead(leadId: string) {
    const include = {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    };

    return this.commissionPaymentRepo.findMany({ leadId }, include);
  }

  async approvePayment(id: string) {
    const payment = await this.findPaymentOrFail(id);
    this.assertTransition(payment.status, 'APPROVED');

    return this.commissionPaymentRepo.updateStatus(id, 'APPROVED');
  }

  async markAsPaid(id: string) {
    const payment = await this.findPaymentOrFail(id);
    this.assertTransition(payment.status, 'PAID');

    return this.commissionPaymentRepo.updateStatus(id, 'PAID', { paidAt: new Date() });
  }

  async requestAdvance(
    leadId: string,
    type: 'M1' | 'M2' | 'M3',
    amount: number,
    user: AuthenticatedUser,
  ) {
    // Check if there's already a paid/pending advance for this lead+type
    const existing = await this.commissionPaymentRepo.findPaidCommissionPayment(leadId, type);
    if (existing) {
      throw new ForbiddenException(
        `${type} commission payment already exists for this lead`,
      );
    }

    // Find the lead to get the assigned sales rep
    const lead = await this.commissionPaymentRepo.findLeadById(leadId);
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    // Upsert the commission as advance
    const commission = await this.commissionPaymentRepo.upsertCommission({
      leadId,
      userId: (lead as { assignments?: Array<{ userId: string; isPrimary: boolean }> }).assignments?.find(
        (a) => a.isPrimary,
      )?.userId ?? user.id,
      type,
      amount,
      status: 'PENDING',
      isAdvance: true,
    });

    return commission;
  }

  async cancelPayment(id: string) {
    const payment = await this.findPaymentOrFail(id);
    this.assertTransition(payment.status, 'CANCELLED');

    return this.commissionPaymentRepo.updateStatus(id, 'CANCELLED');
  }

  private async findPaymentOrFail(id: string) {
    const payment = await this.commissionPaymentRepo.findUnique(id);
    if (!payment) {
      throw new NotFoundException(`Commission payment ${id} not found`);
    }
    return payment;
  }

  private assertTransition(currentStatus: string, targetStatus: string): void {
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new ForbiddenException(
        `Cannot transition from ${currentStatus} to ${targetStatus}`,
      );
    }
  }
}
