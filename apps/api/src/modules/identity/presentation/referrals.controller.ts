import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  PaginationDto,
  PaginatedResponse,
} from '../../../common/dto/pagination.dto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ReferralEntity } from '../domain/entities/referral.entity';
import { UserEntity } from '../domain/entities/user.entity';

class CreateReferralInviteDto {
  @ApiPropertyOptional({ example: 'temp-uuid-for-tracking' })
  @IsOptional()
  @IsString()
  tempId?: string;

  @ApiPropertyOptional({ example: 'invitee@example.com' })
  @IsOptional()
  @IsString()
  inviteeEmail?: string;
}

class UpdateCommissionSplitDto {
  @ApiProperty({
    example: { inviter: 70, invitee: 30 },
    description: 'Commission split percentages',
  })
  @IsNotEmpty()
  @IsObject()
  commissionSplit: Record<string, number>;
}

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List referrals for the current user' })
  async findAll(
    @CurrentUser() user: UserEntity,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<ReferralEntity>> {
    const where = {
      OR: [{ inviterId: user.id }, { inviteeId: user.id }],
    };

    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return new PaginatedResponse(
      referrals.map((r) => new ReferralEntity(r)),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  @Post('invite')
  @ApiOperation({ summary: 'Create a referral invitation' })
  async invite(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateReferralInviteDto,
  ): Promise<ReferralEntity> {
    // Find the parent referral to build hierarchy
    const parentReferral = await this.prisma.referral.findFirst({
      where: { inviteeId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const hierarchyPath = parentReferral
      ? `${parentReferral.hierarchyPath}.${user.id}`
      : user.id;
    const hierarchyLevel = parentReferral
      ? parentReferral.hierarchyLevel + 1
      : 0;

    const referral = await this.prisma.referral.create({
      data: {
        inviterId: user.id,
        tempId: dto.tempId ?? null,
        hierarchyPath,
        hierarchyLevel,
        status: 'pending',
      },
    });

    return new ReferralEntity(referral);
  }

  @Put(':id/commission-split')
  @ApiOperation({ summary: 'Update commission split for a referral' })
  async updateCommissionSplit(
    @Param('id') id: string,
    @Body() dto: UpdateCommissionSplitDto,
  ): Promise<ReferralEntity> {
    const referral = await this.prisma.referral.update({
      where: { id },
      data: { commissionSplit: dto.commissionSplit },
    });

    return new ReferralEntity(referral);
  }
}
