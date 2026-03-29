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
}
