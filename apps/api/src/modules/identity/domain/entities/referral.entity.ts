export class ReferralEntity {
  id: string;
  inviterId: string;
  inviteeId: string | null;
  tempId: string | null;
  hierarchyPath: string;
  hierarchyLevel: number;
  commissionSplit: Record<string, number> | null;
  status: string;
  createdAt: Date;

  constructor(partial: Partial<ReferralEntity>) {
    Object.assign(this, partial);
  }

  /**
   * Returns ancestor IDs from the hierarchy path.
   * Path format: "rootId.parentId.currentId"
   */
  getAncestorIds(): string[] {
    return this.hierarchyPath.split('.').filter(Boolean);
  }

  /**
   * Checks whether a given user ID is an ancestor in this referral chain.
   */
  isAncestor(userId: string): boolean {
    return this.getAncestorIds().includes(userId);
  }

  /**
   * Builds the hierarchy path for a new child referral.
   */
  buildChildPath(childId: string): string {
    return `${this.hierarchyPath}.${childId}`;
  }

  /**
   * Returns the next hierarchy level for a child referral.
   */
  get nextLevel(): number {
    return this.hierarchyLevel + 1;
  }

  accept(inviteeId: string): void {
    this.inviteeId = inviteeId;
    this.status = 'accepted';
  }

  updateCommissionSplit(split: Record<string, number>): void {
    this.commissionSplit = split;
  }
}
