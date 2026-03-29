import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import {
  PaginationDto,
  PaginatedResponse,
} from '../../../../common/dto/pagination.dto';
import { ReferralEntity } from '../../domain/entities/referral.entity';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyReferrals(
    user: AuthenticatedUser,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<ReferralEntity>> {
    const where = { inviterId: user.id };

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
      referrals.map((r) => new ReferralEntity(r as unknown as Partial<ReferralEntity>)),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async createReferral(
    user: AuthenticatedUser,
    tempId?: string,
  ): Promise<ReferralEntity> {
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
        tempId: tempId ?? null,
        hierarchyPath,
        hierarchyLevel,
        status: 'pending',
      },
    });

    return new ReferralEntity(referral as unknown as Partial<ReferralEntity>);
  }

  async updateCommissionSplit(
    referralId: string,
    commissionSplit: Record<string, number>,
  ): Promise<ReferralEntity> {
    const referral = await this.prisma.referral.update({
      where: { id: referralId },
      data: { commissionSplit },
    });

    return new ReferralEntity(referral as unknown as Partial<ReferralEntity>);
  }

  async getReferralHierarchy(userId: string): Promise<ReferralEntity[]> {
    const referrals = await this.prisma.referral.findMany({
      where: {
        hierarchyPath: { contains: userId },
      },
      orderBy: { hierarchyLevel: 'asc' },
    });

    return referrals.map((r) => new ReferralEntity(r as unknown as Partial<ReferralEntity>));
  }
}
