export const COMMISSION_PAYMENT_REPOSITORY = Symbol('COMMISSION_PAYMENT_REPOSITORY');

export interface CommissionPaymentRepositoryPort {
  findMany(where: Record<string, unknown>, include?: Record<string, unknown>): Promise<any[]>;
  findUnique(id: string): Promise<any | null>;
  updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<any>;

  // Commission queries (commission table, not commissionPayment)
  findCommissionsByUserId(userId: string, limit?: number): Promise<any[]>;
  findCommissionsByLeadId(leadId: string, limit?: number): Promise<any[]>;
}
