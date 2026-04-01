import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ReferralRepositoryPort,
  ReferralRecord,
} from '../../application/ports/referral.repository.port';

@Injectable()
export class PrismaReferralRepository implements ReferralRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByInviter(
    inviterId: string,
    params: { skip: number; take: number },
  ): Promise<ReferralRecord[]> {
    const referrals = await this.prisma.referral.findMany({
      where: { inviterId },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        invitee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            _count: { select: { leadAssignments: true } },
          },
        },
      },
    });
    return referrals as unknown as ReferralRecord[];
  }

  async countByInviter(inviterId: string): Promise<number> {
    return this.prisma.referral.count({ where: { inviterId } });
  }

  async findFirstByInvitee(inviteeId: string): Promise<ReferralRecord | null> {
    const referral = await this.prisma.referral.findFirst({
      where: { inviteeId },
      orderBy: { createdAt: 'desc' },
    });
    return referral as unknown as ReferralRecord | null;
  }

  async create(data: {
    inviterId: string;
    inviteeId?: string;
    tempId?: string | null;
    hierarchyPath: string;
    hierarchyLevel: number;
    status: string;
  }): Promise<ReferralRecord> {
    const referral = await this.prisma.referral.create({
      data: {
        inviterId: data.inviterId,
        inviteeId: data.inviteeId ?? null,
        tempId: data.tempId ?? null,
        hierarchyPath: data.hierarchyPath,
        hierarchyLevel: data.hierarchyLevel,
        status: data.status,
      },
    });
    return referral as unknown as ReferralRecord;
  }

  async update(
    id: string,
    data: { commissionSplit?: Record<string, number> },
  ): Promise<ReferralRecord> {
    const referral = await this.prisma.referral.update({
      where: { id },
      data,
    });
    return referral as unknown as ReferralRecord;
  }

  async findManyByHierarchyPath(userId: string): Promise<ReferralRecord[]> {
    const referrals = await this.prisma.referral.findMany({
      where: {
        hierarchyPath: { contains: userId },
      },
      orderBy: { hierarchyLevel: 'asc' },
    });
    return referrals as unknown as ReferralRecord[];
  }
}
