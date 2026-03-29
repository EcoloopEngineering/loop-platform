import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COMMISSION_PAYMENT_REPOSITORY, CommissionPaymentRepositoryPort } from '../ports/commission-payment.repository.port';
import { CommissionCalculatorDomainService } from '../../domain/services/commission-calculator.domain-service';

export class CalculateCommissionCommand {
  constructor(
    public readonly leadId: string,
    public readonly userId: string,
    public readonly epc: number,
    public readonly buildCost: number,
    public readonly kw: number,
    public readonly quoteDeductions: number,
    public readonly splitPct: number,
    public readonly finalize: boolean,
  ) {}
}

@CommandHandler(CalculateCommissionCommand)
@Injectable()
export class CalculateCommissionHandler
  implements ICommandHandler<CalculateCommissionCommand>
{
  constructor(
    @Inject(COMMISSION_PAYMENT_REPOSITORY) private readonly repo: CommissionPaymentRepositoryPort,
    private readonly calculator: CommissionCalculatorDomainService,
  ) {}

  async execute(command: CalculateCommissionCommand) {
    const lead = await this.repo.findLeadById(command.leadId);

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${command.leadId} not found`);
    }

    const result = this.calculator.calculate({
      epc: command.epc,
      buildCost: command.buildCost,
      kw: command.kw,
      quoteDeductions: command.quoteDeductions,
      splitPct: command.splitPct,
    });

    const status = command.finalize ? 'ACTIVE' : 'PENDING';

    const commission = await this.repo.upsertCommission({
      leadId: command.leadId,
      userId: command.userId,
      splitPct: command.splitPct,
      amount: result.calculatedAmount,
      breakdown: result as unknown as Record<string, unknown>,
      status,
      type: 'M1',
    });

    return { ...commission, breakdown: result };
  }
}
