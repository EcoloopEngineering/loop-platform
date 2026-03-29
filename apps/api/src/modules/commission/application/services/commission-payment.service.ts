import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

@Injectable()
export class CommissionPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async listPayments(user: AuthenticatedUser, userId?: string) {
    const isAdmin = user.role === UserRole.ADMIN;
    const filterUserId = isAdmin && userId ? userId : isAdmin ? undefined : user.id;

    return this.prisma.commissionPayment.findMany({
      where: filterUserId ? { userId: filterUserId } : {},
      include: {
        lead: {
          select: {
            id: true,
            currentStage: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentsByLead(leadId: string) {
    return this.prisma.commissionPayment.findMany({
      where: { leadId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approvePayment(id: string) {
    const payment = await this.findPaymentOrFail(id);
    this.assertTransition(payment.status, 'APPROVED');

    return this.prisma.commissionPayment.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async markAsPaid(id: string) {
    const payment = await this.findPaymentOrFail(id);
    this.assertTransition(payment.status, 'PAID');

    return this.prisma.commissionPayment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async cancelPayment(id: string) {
    const payment = await this.findPaymentOrFail(id);
    this.assertTransition(payment.status, 'CANCELLED');

    return this.prisma.commissionPayment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  private async findPaymentOrFail(id: string) {
    const payment = await this.prisma.commissionPayment.findUnique({ where: { id } });
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
