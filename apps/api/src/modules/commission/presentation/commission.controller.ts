import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@loop/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CommissionCalculatorDomainService } from '../domain/services/commission-calculator.domain-service';
import { CommissionQueryService } from '../application/services/commission-query.service';
import { CalculateCommissionCommand } from '../application/commands/calculate-commission.handler';

@ApiTags('commissions')
@ApiBearerAuth()
@Controller()
export class CommissionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly commissionQuery: CommissionQueryService,
    private readonly calculator: CommissionCalculatorDomainService,
  ) {}

  @Get('commissions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'List all commissions for the current user' })
  async listCommissions(@CurrentUser() user: AuthenticatedUser) {
    return this.commissionQuery.findByUserId(user.id);
  }

  @Get('leads/:leadId/commissions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get commissions for a specific lead' })
  async getCommissionsByLead(@Param('leadId') leadId: string) {
    return this.commissionQuery.findByLeadId(leadId);
  }

  @Get('leads/:leadId/commission/calculate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Preview commission calculation without saving' })
  async calculatePreview(
    @Param('leadId') leadId: string,
    @Query('epc') epc: string,
    @Query('buildCost') buildCost: string,
    @Query('kw') kw: string,
    @Query('quoteDeductions') quoteDeductions: string,
    @Query('splitPct') splitPct: string,
  ) {
    return this.calculator.calculate({
      epc: parseFloat(epc),
      buildCost: parseFloat(buildCost),
      kw: parseFloat(kw),
      quoteDeductions: parseFloat(quoteDeductions),
      splitPct: parseFloat(splitPct),
    });
  }

  @Post('leads/:leadId/commission/finalize')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Calculate and finalize commission for a lead' })
  async finalizeCommission(
    @Param('leadId') leadId: string,
    @Body()
    dto: {
      epc: number;
      buildCost: number;
      kw: number;
      quoteDeductions: number;
      splitPct: number;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new CalculateCommissionCommand(
        leadId,
        user.id,
        dto.epc,
        dto.buildCost,
        dto.kw,
        dto.quoteDeductions,
        dto.splitPct,
        true,
      ),
    );
  }
}
