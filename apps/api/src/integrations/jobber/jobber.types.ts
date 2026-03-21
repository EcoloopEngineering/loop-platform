// ---------------------------------------------------------------------------
// Jobber API – external payload & response types (GraphQL-style)
// ---------------------------------------------------------------------------

export interface JobberAvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
}

export interface JobberAvailabilityResponse {
  data: {
    availabilitySlots: {
      nodes: JobberAvailabilitySlot[];
    };
  };
}

export interface JobberCreateBookingInput {
  appointmentType: string;
  startAt: string;
  endAt: string;
  clientId?: string;
  propertyAddress?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface JobberBookingResponse {
  data: {
    jobCreate: {
      job: {
        id: string;
        title: string;
        status: string;
        startAt: string;
        endAt: string;
        visitId: string;
      };
    };
  };
}

export interface JobberRescheduleResponse {
  data: {
    visitUpdate: {
      visit: {
        id: string;
        startAt: string;
        endAt: string;
        status: string;
      };
    };
  };
}

export interface JobberCancelResponse {
  data: {
    visitCancel: {
      visit: {
        id: string;
        status: string;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Domain-facing return types
// ---------------------------------------------------------------------------

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface Booking {
  jobId: string;
  title: string;
  status: string;
  startAt: Date;
  endAt: Date;
  visitId: string;
}

export interface VisitResult {
  visitId: string;
  startAt: Date;
  endAt: Date;
  status: string;
}
