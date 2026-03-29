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
}
