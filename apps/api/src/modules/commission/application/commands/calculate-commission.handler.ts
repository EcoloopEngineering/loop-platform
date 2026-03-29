import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CommissionStatus } from '@prisma/client';
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

    const existing = await this.prisma.commission.findFirst({
      where: {
        leadId: command.leadId,
        userId: command.userId,
      },
    });

    const status: CommissionStatus = command.finalize
      ? CommissionStatus.ACTIVE
      : CommissionStatus.PENDING;

    const commission = existing
      ? await this.prisma.commission.update({
          where: { id: existing.id },
          data: {
            splitPct: command.splitPct,
            amount: result.calculatedAmount,
            breakdown: result as unknown as import('@prisma/client').Prisma.InputJsonValue,
            status,
          },
        })
      : await this.prisma.commission.create({
          data: {
            lead: { connect: { id: command.leadId } },
            user: { connect: { id: command.userId } },
            type: 'M1',
            splitPct: command.splitPct,
            amount: result.calculatedAmount,
            breakdown: result as unknown as import('@prisma/client').Prisma.InputJsonValue,
            status,
          },
        });

    return { ...commission, breakdown: result };
  }
}
