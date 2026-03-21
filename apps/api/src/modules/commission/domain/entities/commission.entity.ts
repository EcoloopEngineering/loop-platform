export enum CommissionStatus {
  PENDING = 'PENDING',
  CALCULATED = 'CALCULATED',
  FINALIZED = 'FINALIZED',
  PAID = 'PAID',
}

export class CommissionEntity {
  id: string;
  leadId: string;
  userId: string;
  epc: number;
  buildCost: number;
  kw: number;
  quoteDeductions: number;
  splitPct: number;
  calculatedAmount: number;
  status: CommissionStatus;
  finalizedAt: Date | null;
  finalizedBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CommissionEntity>) {
    Object.assign(this, partial);
  }

  finalize(finalizedBy: string): void {
    this.status = CommissionStatus.FINALIZED;
    this.finalizedAt = new Date();
    this.finalizedBy = finalizedBy;
    this.updatedAt = new Date();
  }

  markPaid(): void {
    this.status = CommissionStatus.PAID;
    this.updatedAt = new Date();
  }
}
