import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@loop/shared';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { UpdateUserFinanceDto } from '../application/dto/user-finance.dto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@ApiTags('user-finance')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('users/me/finance')
export class UserFinanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP, UserRole.REFERRAL)
  @ApiOperation({ summary: 'Get current user finance info' })
  async getFinance(@CurrentUser() user: AuthenticatedUser) {
    const finance = await this.prisma.userFinance.findUnique({
      where: { userId: user.id },
    });

    return finance ?? { bankName: null, routingNumber: null, accountNumber: null };
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP, UserRole.REFERRAL)
  @ApiOperation({ summary: 'Update current user finance info' })
  async updateFinance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserFinanceDto,
  ) {
    return this.prisma.userFinance.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        bankName: dto.bankName,
        routingNumber: dto.routingNumber,
        accountNumber: dto.accountNumber,
      },
      update: {
        bankName: dto.bankName,
        routingNumber: dto.routingNumber,
        accountNumber: dto.accountNumber,
      },
    });
  }
}
