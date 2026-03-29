import { Inject, Injectable } from '@nestjs/common';
import {
  COMMISSION_PAYMENT_REPOSITORY,
  CommissionPaymentRepositoryPort,
} from '../ports/commission-payment.repository.port';

@Injectable()
export class CommissionQueryService {
  constructor(
    @Inject(COMMISSION_PAYMENT_REPOSITORY)
    private readonly repo: CommissionPaymentRepositoryPort,
  ) {}

  async findByUserId(userId: string) {
    return this.repo.findCommissionsByUserId(userId, 100);
  }

  async findByLeadId(leadId: string) {
    return this.repo.findCommissionsByLeadId(leadId, 100);
  }
}
