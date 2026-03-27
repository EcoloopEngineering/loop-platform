import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@ApiTags('commission-payments')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller()
export class CommissionPaymentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('commissions/payments')
  @ApiOperation({ summary: 'List all commission payments (admin) or own payments' })
  @ApiQuery({ name: 'userId', required: false })
  async listPayments(
    @CurrentUser() user: any,
    @Query('userId') userId?: string,
  ) {
    const isAdmin = user.role === 'ADMIN';

    // Non-admins can only see their own payments
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

  @Get('leads/:leadId/commission/payments')
  @ApiOperation({ summary: 'Get commission payments for a specific lead' })
  async getPaymentsByLead(
    @Param('leadId') leadId: string,
    @CurrentUser() _user: any,
  ) {
    return this.prisma.commissionPayment.findMany({
      where: { leadId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('commissions/payments/:id/approve')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: 'Approve a commission payment (admin only)' })
  async approvePayment(@Param('id') id: string) {
    const payment = await this.prisma.commissionPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Commission payment ${id} not found`);
    }

    if (payment.status !== 'PENDING') {
      throw new ForbiddenException(
        `Cannot approve payment with status ${payment.status}`,
      );
    }

    return this.prisma.commissionPayment.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  @Patch('commissions/payments/:id/pay')
  @Roles('ADMIN' as any)
  @ApiOperation({ summary: 'Mark a commission payment as paid (admin only)' })
  async markAsPaid(@Param('id') id: string) {
    const payment = await this.prisma.commissionPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Commission payment ${id} not found`);
    }

    if (payment.status !== 'APPROVED') {
      throw new ForbiddenException(
        `Cannot mark as paid — payment must be APPROVED first (current: ${payment.status})`,
      );
    }

    return this.prisma.commissionPayment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  @Patch('commissions/payments/:id/cancel')
  @ApiOperation({ summary: 'Cancel a commission payment' })
  async cancelPayment(
    @Param('id') id: string,
    @CurrentUser() _user: any,
  ) {
    const payment = await this.prisma.commissionPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Commission payment ${id} not found`);
    }

    if (payment.status === 'PAID') {
      throw new ForbiddenException('Cannot cancel a payment that has already been paid');
    }

    if (payment.status === 'CANCELLED') {
      throw new ForbiddenException('Payment is already cancelled');
    }

    return this.prisma.commissionPayment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
