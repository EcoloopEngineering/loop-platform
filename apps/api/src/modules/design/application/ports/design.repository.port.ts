export const DESIGN_REPOSITORY = Symbol('DESIGN_REPOSITORY');

export interface DesignRepositoryPort {
  findByLead(leadId: string): Promise<any[]>;
  findById(id: string): Promise<any>;
}
