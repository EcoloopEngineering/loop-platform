import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CommissionCalculatorDomainService } from '../domain/services/commission-calculator.domain-service';
import { CalculateCommissionCommand } from '../application/commands/calculate-commission.handler';

@ApiTags('commissions')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class CommissionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
    private readonly calculator: CommissionCalculatorDomainService,
  ) {}

  @Get('commissions')
  @ApiOperation({ summary: 'List all commissions for the current user' })
  async listCommissions(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.commission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('leads/:leadId/commissions')
  @ApiOperation({ summary: 'Get commissions for a specific lead' })
  async getCommissionsByLead(@Param('leadId') leadId: string) {
    return this.prisma.commission.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('leads/:leadId/commission/calculate')
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
