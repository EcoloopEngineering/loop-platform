// ---------------------------------------------------------------------------
// Aurora Solar API – external payload & response types
// ---------------------------------------------------------------------------

/** Input sent to Aurora to create a new project */
export interface AuroraCreateProjectPayload {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  latitude: number;
  longitude: number;
  utilityBillKwh?: number;
  utilityRate?: number;
  roofType?: string;
  notes?: string;
}

/** Aurora project representation returned by the API */
export interface AuroraProjectResponse {
  project_id: string;
  name: string;
  status: string;
  created_at: string;
}

/** Single design object coming back from Aurora */
export interface AuroraDesignResponse {
  design_id: string;
  project_id: string;
  system_size_kw: number;
  annual_production_kwh: number;
  panel_count: number;
  image_url: string | null;
  status: string;
  created_at: string;
}

/** Light-weight status check response */
export interface AuroraDesignStatusResponse {
  project_id: string;
  status: string;
  progress_pct: number;
}

// ---------------------------------------------------------------------------
// Domain-facing return types
// ---------------------------------------------------------------------------

export interface AuroraProject {
  projectId: string;
  name: string;
  status: string;
  createdAt: Date;
}

export interface AuroraDesign {
  designId: string;
  projectId: string;
  systemSizeKw: number;
  annualProductionKwh: number;
  panelCount: number;
  imageUrl: string | null;
  status: string;
  createdAt: Date;
}

export interface AuroraDesignStatus {
  projectId: string;
  status: string;
  progressPct: number;
}

export interface AuroraFinancingData {
  kw: number | null;
  epc: number | null;
  contractCost: number | null;
  escalator: number | null;
  solarRate: number | null;
  monthlyPayment: number | null;
  systemProduction: number | null;
}

// ---------------------------------------------------------------------------
// Aurora API raw response types for financing endpoints
// ---------------------------------------------------------------------------

export interface AuroraDesignSummaryResponse {
  design: {
    system_size_stc?: number;
    energy_production?: {
      annual?: number;
    };
  };
}

export interface AuroraFinancingEntry {
  id: string;
  selected_in_sales_mode?: boolean;
}

export interface AuroraFinancingsResponse {
  financings: AuroraFinancingEntry[];
}

export interface AuroraFinancingDetailResponse {
  financing: {
    escalation?: number;
    solar_rate?: number;
    monthly_payment?: number;
  };
}

export interface AuroraPricingResponse {
  pricing: {
    price_per_watt?: number;
    system_price?: number;
  };
}
