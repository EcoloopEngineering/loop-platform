import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
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
    private readonly prisma: PrismaService,
    private readonly calculator: CommissionCalculatorDomainService,
  ) {}

  async execute(command: CalculateCommissionCommand) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: command.leadId },
    });

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

    const commission = await this.prisma.commission.upsert({
      where: {
        leadId_userId: {
          leadId: command.leadId,
          userId: command.userId,
        },
      },
      update: {
        epc: command.epc,
        buildCost: command.buildCost,
        kw: command.kw,
        quoteDeductions: command.quoteDeductions,
        splitPct: command.splitPct,
        calculatedAmount: result.calculatedAmount,
        status: command.finalize ? 'FINALIZED' : 'CALCULATED',
        finalizedAt: command.finalize ? new Date() : null,
        finalizedBy: command.finalize ? command.userId : null,
      },
      create: {
        leadId: command.leadId,
        userId: command.userId,
        epc: command.epc,
        buildCost: command.buildCost,
        kw: command.kw,
        quoteDeductions: command.quoteDeductions,
        splitPct: command.splitPct,
        calculatedAmount: result.calculatedAmount,
        status: command.finalize ? 'FINALIZED' : 'CALCULATED',
        finalizedAt: command.finalize ? new Date() : null,
        finalizedBy: command.finalize ? command.userId : null,
      },
    });

    return { ...commission, breakdown: result };
  }
}
