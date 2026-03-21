import { LeadStage, LeadSource } from '@loop/shared';

export class LeadEntity {
  id: string;
  customerId: string;
  propertyId: string;
  pipelineId: string;
  currentStage: LeadStage;
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
    } else if (newStage === LeadStage.LOST || newStage === LeadStage.CANCELLED) {
      this.lostAt = new Date();
    }

    return { fromStage, toStage: newStage };
  }

  assignUser(_userId: string): void {
    this.updatedAt = new Date();
  }

  updateScore(): void {
    this.updatedAt = new Date();
  }

  markAsLost(reason?: string): void {
    this.currentStage = LeadStage.LOST;
    this.lostAt = new Date();
    this.lostReason = reason ?? null;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }
}
