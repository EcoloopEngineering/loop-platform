import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@loop/shared';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CommissionPaymentService } from '../application/services/commission-payment.service';

@ApiTags('commission-payments')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller()
export class CommissionPaymentController {
  constructor(private readonly commissionPaymentService: CommissionPaymentService) {}

  @Get('commissions/payments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'List all commission payments (admin) or own payments' })
  @ApiQuery({ name: 'userId', required: false })
  async listPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
  ) {
    return this.commissionPaymentService.listPayments(user, userId);
  }

  @Get('leads/:leadId/commission/payments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get commission payments for a specific lead' })
  async getPaymentsByLead(@Param('leadId') leadId: string) {
    return this.commissionPaymentService.getPaymentsByLead(leadId);
  }

  @Patch('commissions/payments/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a commission payment (admin only)' })
  async approvePayment(@Param('id') id: string) {
    return this.commissionPaymentService.approvePayment(id);
  }

  @Patch('commissions/payments/:id/pay')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark a commission payment as paid (admin only)' })
  async markAsPaid(@Param('id') id: string) {
    return this.commissionPaymentService.markAsPaid(id);
  }

  @Patch('commissions/payments/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a commission payment' })
  async cancelPayment(@Param('id') id: string) {
    return this.commissionPaymentService.cancelPayment(id);
  }
}
