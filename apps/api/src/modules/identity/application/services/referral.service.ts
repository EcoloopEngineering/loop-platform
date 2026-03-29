import { Injectable, Inject } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import {
  PaginationDto,
  PaginatedResponse,
} from '../../../../common/dto/pagination.dto';
import { ReferralEntity } from '../../domain/entities/referral.entity';
import {
  REFERRAL_REPOSITORY,
  ReferralRepositoryPort,
} from '../ports/referral.repository.port';

@Injectable()
export class ReferralService {
  constructor(
    @Inject(REFERRAL_REPOSITORY)
    private readonly referralRepo: ReferralRepositoryPort,
  ) {}

  async getMyReferrals(
    user: AuthenticatedUser,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<ReferralEntity>> {
    const [referrals, total] = await Promise.all([
      this.referralRepo.findManyByInviter(user.id, {
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.referralRepo.countByInviter(user.id),
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
    const parentReferral = await this.referralRepo.findFirstByInvitee(user.id);

    const hierarchyPath = parentReferral
      ? `${parentReferral.hierarchyPath}.${user.id}`
      : user.id;
    const hierarchyLevel = parentReferral
      ? parentReferral.hierarchyLevel + 1
      : 0;

    const referral = await this.referralRepo.create({
      inviterId: user.id,
      tempId: tempId ?? null,
      hierarchyPath,
      hierarchyLevel,
      status: 'pending',
    });

    return new ReferralEntity(referral as unknown as Partial<ReferralEntity>);
  }

  async updateCommissionSplit(
    referralId: string,
    commissionSplit: Record<string, number>,
  ): Promise<ReferralEntity> {
    const referral = await this.referralRepo.update(referralId, { commissionSplit });

    return new ReferralEntity(referral as unknown as Partial<ReferralEntity>);
  }

  async getReferralHierarchy(userId: string): Promise<ReferralEntity[]> {
    const referrals = await this.referralRepo.findManyByHierarchyPath(userId);

    return referrals.map((r) => new ReferralEntity(r as unknown as Partial<ReferralEntity>));
  }
}
