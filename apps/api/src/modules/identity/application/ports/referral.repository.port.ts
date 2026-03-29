export const REFERRAL_REPOSITORY = Symbol('REFERRAL_REPOSITORY');

export interface ReferralRecord {
  id: string;
  inviterId: string;
  inviteeId: string | null;
  tempId: string | null;
  hierarchyPath: string;
  hierarchyLevel: number;
  commissionSplit: Record<string, number> | null;
  status: string;
  createdAt: Date;
}

export interface ReferralRepositoryPort {
  findManyByInviter(
    inviterId: string,
    params: { skip: number; take: number },
  ): Promise<ReferralRecord[]>;

  countByInviter(inviterId: string): Promise<number>;

  findFirstByInvitee(inviteeId: string): Promise<ReferralRecord | null>;

  create(data: {
    inviterId: string;
    inviteeId?: string;
    tempId?: string | null;
    hierarchyPath: string;
    hierarchyLevel: number;
    status: string;
  }): Promise<ReferralRecord>;

  update(
    id: string,
    data: { commissionSplit?: Record<string, number> },
  ): Promise<ReferralRecord>;

  findManyByHierarchyPath(userId: string): Promise<ReferralRecord[]>;
}
