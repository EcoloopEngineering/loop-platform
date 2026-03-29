import { LeadStage, LeadSource, LeadStatus } from '@loop/shared';

export class LeadEntity {
  id: string;
  customerId: string;
  propertyId: string;
  pipelineId: string;
  currentStage: LeadStage;
  status: LeadStatus;
  source: LeadSource;
  kw: number | null;
  epc: number | null;
  financier: string | null;
  systemSize: number | null;
  baseline: number | null;
  isActive: boolean;
  wonAt: Date | null;
  lostAt: Date | null;
  lostReason: string | null;
  hubspotDealId: string | null;
  createdById: string | null;
  projectManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<LeadEntity>) {
    Object.assign(this, partial);
  }

  changeStage(newStage: LeadStage): { fromStage: LeadStage; toStage: LeadStage } {
    const fromStage = this.currentStage;
    this.currentStage = newStage;
    this.updatedAt = new Date();

    if (newStage === LeadStage.WON) {
      this.wonAt = new Date();
    }

    return { fromStage, toStage: newStage };
  }

  markAsLost(reason?: string): void {
    this.status = LeadStatus.LOST;
    this.lostAt = new Date();
    this.lostReason = reason ?? null;
    this.updatedAt = new Date();
  }

  markAsCancelled(reason?: string): void {
    this.status = LeadStatus.CANCELLED;
    this.lostAt = new Date();
    this.lostReason = reason ?? null;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }
}
