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
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import {
  PaginationDto,
  PaginatedResponse,
} from '../../../common/dto/pagination.dto';
import { ReferralEntity } from '../domain/entities/referral.entity';
import { ReferralService } from '../application/services/referral.service';

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
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  @ApiOperation({ summary: 'List referrals for the current user' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<ReferralEntity>> {
    return this.referralService.getMyReferrals(user, pagination);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Create a referral invitation' })
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReferralInviteDto,
  ): Promise<ReferralEntity> {
    return this.referralService.createReferral(user, dto.tempId);
  }

  @Put(':id/commission-split')
  @ApiOperation({ summary: 'Update commission split for a referral' })
  async updateCommissionSplit(
    @Param('id') id: string,
    @Body() dto: UpdateCommissionSplitDto,
  ): Promise<ReferralEntity> {
    return this.referralService.updateCommissionSplit(id, dto.commissionSplit);
  }
}
