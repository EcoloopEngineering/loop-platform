import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  JobberCreateBookingInput,
  JobberAvailabilityResponse,
  JobberBookingResponse,
  JobberRescheduleResponse,
  JobberCancelResponse,
  AvailabilitySlot,
  Booking,
  VisitResult,
} from './jobber.types';
import { JobberMapper } from './jobber.mapper';

@Injectable()
export class JobberService {
  private readonly logger = new Logger(JobberService.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('JOBBER_SERVICE_URL');
    this.token = this.config.getOrThrow<string>('JOBBER_SERVICE_TOKEN');
  }

  async getAvailabilitySlots(
    type: string,
    lat: number,
    lng: number,
    start: string,
    end: string,
  ): Promise<AvailabilitySlot[]> {
    try {
      const query = `
        query AvailabilitySlots($type: String!, $lat: Float!, $lng: Float!, $start: DateTime!, $end: DateTime!) {
          availabilitySlots(type: $type, latitude: $lat, longitude: $lng, startAfter: $start, endBefore: $end) {
            nodes { start end available }
          }
        }
      `;
      const { data } = await firstValueFrom(
        this.http.post<JobberAvailabilityResponse>(
          this.baseUrl,
          { query, variables: { type, lat, lng, start, end } },
          { headers: this.headers() },
        ),
      );
      return data.data.availabilitySlots.nodes.map(JobberMapper.toAvailabilitySlot);
    } catch (error) {
      this.logger.error('Failed to fetch Jobber availability slots', error);
      throw error;
    }
  }

  async createBooking(input: JobberCreateBookingInput): Promise<Booking> {
    try {
      const mutation = `
        mutation JobCreate($input: JobCreateInput!) {
          jobCreate(input: $input) {
            job { id title status startAt endAt visitId }
          }
        }
      `;
      const { data } = await firstValueFrom(
        this.http.post<JobberBookingResponse>(
          this.baseUrl,
          { query: mutation, variables: { input } },
          { headers: this.headers() },
        ),
      );
      return JobberMapper.toBooking(data);
    } catch (error) {
      this.logger.error('Failed to create Jobber booking', error);
      throw error;
    }
  }

  async rescheduleVisit(
    visitId: string,
    startDate: string,
    endDate: string,
  ): Promise<VisitResult> {
    try {
      const mutation = `
        mutation VisitUpdate($visitId: ID!, $startAt: DateTime!, $endAt: DateTime!) {
          visitUpdate(visitId: $visitId, input: { startAt: $startAt, endAt: $endAt }) {
            visit { id startAt endAt status }
          }
        }
      `;
      const { data } = await firstValueFrom(
        this.http.post<JobberRescheduleResponse>(
          this.baseUrl,
          { query: mutation, variables: { visitId, startAt: startDate, endAt: endDate } },
          { headers: this.headers() },
        ),
      );
      return JobberMapper.toVisitResultFromReschedule(data);
    } catch (error) {
      this.logger.error(`Failed to reschedule Jobber visit ${visitId}`, error);
      throw error;
    }
  }

  async cancelVisit(visitId: string): Promise<VisitResult> {
    try {
      const mutation = `
        mutation VisitCancel($visitId: ID!) {
          visitCancel(visitId: $visitId) {
            visit { id status }
          }
        }
      `;
      const { data } = await firstValueFrom(
        this.http.post<JobberCancelResponse>(
          this.baseUrl,
          { query: mutation, variables: { visitId } },
          { headers: this.headers() },
        ),
      );
      return JobberMapper.toVisitResultFromCancel(data);
    } catch (error) {
      this.logger.error(`Failed to cancel Jobber visit ${visitId}`, error);
      throw error;
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}
