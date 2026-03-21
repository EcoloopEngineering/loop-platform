// ---------------------------------------------------------------------------
// HubSpot API – external payload & response types
// ---------------------------------------------------------------------------

export interface HubSpotDealProperties {
  dealname: string;
  dealstage: string;
  amount?: string;
  pipeline?: string;
  closedate?: string;
  lead_id?: string;
  system_size_kw?: string;
  epc?: string;
  [key: string]: string | undefined;
}

export interface HubSpotDealResponse {
  id: string;
  properties: HubSpotDealProperties;
  createdAt: string;
  updatedAt: string;
}

export interface HubSpotContactProperties {
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
  [key: string]: string | undefined;
}

export interface HubSpotContactResponse {
  id: string;
  properties: HubSpotContactProperties;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Domain-facing return types
// ---------------------------------------------------------------------------

export interface HubSpotDeal {
  hubspotDealId: string;
  name: string;
  stage: string;
  amount: number | null;
  pipeline: string | null;
  closeDate: Date | null;
  leadId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HubSpotContact {
  hubspotContactId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}
