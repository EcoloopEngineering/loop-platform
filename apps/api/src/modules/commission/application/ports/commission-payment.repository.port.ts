export const COMMISSION_PAYMENT_REPOSITORY = Symbol('COMMISSION_PAYMENT_REPOSITORY');

export interface CommissionPaymentRepositoryPort {
  findMany(where: Record<string, unknown>, include?: Record<string, unknown>): Promise<any[]>;
  findUnique(id: string): Promise<any | null>;
  updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<any>;
}
