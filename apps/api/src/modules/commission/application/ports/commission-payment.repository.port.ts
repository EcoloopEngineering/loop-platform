export const COMMISSION_PAYMENT_REPOSITORY = Symbol('COMMISSION_PAYMENT_REPOSITORY');

export interface CommissionPaymentRepositoryPort {
  findMany(where: Record<string, unknown>, include?: Record<string, unknown>): Promise<any[]>;
  findUnique(id: string): Promise<any | null>;
  updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<any>;

  // Commission queries (commission table, not commissionPayment)
  findCommissionsByUserId(userId: string, limit?: number): Promise<any[]>;
  findCommissionsByLeadId(leadId: string, limit?: number): Promise<any[]>;

  // ── Used by CalculateCommissionHandler ──────────────────────────────────
  findLeadById(leadId: string): Promise<{ id: string } | null>;
  upsertCommission(data: {
    leadId: string;
    userId: string;
    splitPct: number;
    amount: number;
    breakdown: unknown;
    status: string;
    type: string;
  }): Promise<any>;

  // ── Used by StageCommissionListener ────────────────────────────────────
  findPaidCommissionPayment(leadId: string, type: string): Promise<{ id: string } | null>;
  findSettingByKey(key: string): Promise<{ key: string; value: unknown } | null>;
}
