export interface LeadCreatedPayload {
  leadId: string;
  assignedTo: string;
  customerName: string;
}

export interface LeadStageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

export interface LeadUpdatedPayload {
  leadId: string;
  customerName: string;
  updatedByName: string;
  changes: string;
}

export interface LeadStatusChangedPayload {
  leadId: string;
  customerName: string;
  newStatus: string;
  previousStage: string;
}

export interface LeadAssignedPayload {
  leadId: string;
  assigneeId: string;
  customerName: string;
  assignedByName: string;
  isPrimary: boolean;
}

export interface LeadPmAssignedPayload {
  leadId: string;
  pmId: string;
  pmName: string;
  customerName: string;
  assignedByName: string;
}

export interface LeadPmRemovedPayload {
  leadId: string;
  pmId: string;
  customerName: string;
  removedByName: string;
}

export interface LeadNoteAddedPayload {
  leadId: string;
  customerName: string;
  addedByName: string;
  notePreview: string;
}

export interface AiDesignRequestedPayload {
  designRequestId: string;
  leadId: string;
  propertyAddress: string;
  customerName: string;
  monthlyBill: number | null | undefined;
  annualKwhUsage: number | null | undefined;
  roofCondition: string | null | undefined;
  propertyType: string | null | undefined;
  userId: string;
}
