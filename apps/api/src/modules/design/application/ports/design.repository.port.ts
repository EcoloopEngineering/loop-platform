export const DESIGN_REPOSITORY = Symbol('DESIGN_REPOSITORY');

export interface DesignRepositoryPort {
  findByLead(leadId: string): Promise<any[]>;
  findById(id: string): Promise<any>;

  // ── Used by RequestDesignHandler ──────────────────────────────────────
  createDesignRequest(data: {
    leadId: string;
    designType: string;
    treeRemoval?: boolean;
    notes?: string | null;
    status: string;
  }): Promise<{ id: string; leadId: string; designType: string; status: string }>;

  // ── Used by DesignQueryService (financing persistence) ─────────────────
  findLeadMetadata(leadId: string): Promise<{ metadata: unknown } | null>;
  updateLeadFinancing(
    leadId: string,
    data: { kw?: number; epc?: number; metadata: Record<string, unknown> },
  ): Promise<void>;

  // ── Used by AuroraDesignListener ──────────────────────────────────────
  createLeadActivity(data: {
    leadId: string;
    userId: string;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<any>;
}
