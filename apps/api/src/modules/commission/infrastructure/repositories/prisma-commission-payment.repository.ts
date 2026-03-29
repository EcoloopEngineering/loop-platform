import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CommissionPaymentRepositoryPort } from '../../application/ports/commission-payment.repository.port';

@Injectable()
export class PrismaCommissionPaymentRepository implements CommissionPaymentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(where: Record<string, unknown>, include?: Record<string, unknown>): Promise<any[]> {
    return this.prisma.commissionPayment.findMany({
      where: where as any,
      include: include as any,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUnique(id: string): Promise<any | null> {
    return this.prisma.commissionPayment.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<any> {
    return this.prisma.commissionPayment.update({
      where: { id },
      data: { status, ...extra } as any,
    });
  }

  async findCommissionsByUserId(userId: string, limit = 100): Promise<any[]> {
    return this.prisma.commission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findCommissionsByLeadId(leadId: string, limit = 100): Promise<any[]> {
    return this.prisma.commission.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Used by CalculateCommissionHandler ──────────────────────────────────

  async findLeadById(leadId: string): Promise<{ id: string } | null> {
    return this.prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  }

  async upsertCommission(data: {
    leadId: string;
    userId: string;
    splitPct: number;
    amount: number;
    breakdown: unknown;
    status: string;
    type: string;
  }): Promise<any> {
    const existing = await this.prisma.commission.findFirst({
      where: { leadId: data.leadId, userId: data.userId },
    });

    if (existing) {
      return this.prisma.commission.update({
        where: { id: existing.id },
        data: {
          splitPct: data.splitPct,
          amount: data.amount,
          breakdown: data.breakdown as any,
          status: data.status as any,
        },
      });
    }

    return this.prisma.commission.create({
      data: {
        lead: { connect: { id: data.leadId } },
        user: { connect: { id: data.userId } },
        type: data.type as any,
        splitPct: data.splitPct,
        amount: data.amount,
        breakdown: data.breakdown as any,
        status: data.status as any,
      },
    });
  }

  // ── Used by StageCommissionListener ────────────────────────────────────

  async findPaidCommissionPayment(leadId: string, type: string): Promise<{ id: string } | null> {
    return this.prisma.commissionPayment.findFirst({
      where: { leadId, type: type as any, status: 'PAID' },
      select: { id: true },
    });
  }

  async findSettingByKey(key: string): Promise<{ key: string; value: unknown } | null> {
    return this.prisma.appSetting.findUnique({ where: { key } });
  }
}
