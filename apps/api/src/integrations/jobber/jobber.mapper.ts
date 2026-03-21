import {
  JobberAvailabilitySlot,
  AvailabilitySlot,
  JobberBookingResponse,
  Booking,
  JobberRescheduleResponse,
  VisitResult,
  JobberCancelResponse,
} from './jobber.types';

export class JobberMapper {
  static toAvailabilitySlot(raw: JobberAvailabilitySlot): AvailabilitySlot {
    return {
      start: new Date(raw.start),
      end: new Date(raw.end),
      available: raw.available,
    };
  }

  static toBooking(raw: JobberBookingResponse): Booking {
    const job = raw.data.jobCreate.job;
    return {
      jobId: job.id,
      title: job.title,
      status: job.status,
      startAt: new Date(job.startAt),
      endAt: new Date(job.endAt),
      visitId: job.visitId,
    };
  }

  static toVisitResultFromReschedule(raw: JobberRescheduleResponse): VisitResult {
    const visit = raw.data.visitUpdate.visit;
    return {
      visitId: visit.id,
      startAt: new Date(visit.startAt),
      endAt: new Date(visit.endAt),
      status: visit.status,
    };
  }

  static toVisitResultFromCancel(raw: JobberCancelResponse): VisitResult {
    const visit = raw.data.visitCancel.visit;
    return {
      visitId: visit.id,
      startAt: new Date(),
      endAt: new Date(),
      status: visit.status,
    };
  }
}
