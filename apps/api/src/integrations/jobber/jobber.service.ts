import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
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
import { withRetry, CircuitBreaker } from '../../common/utils/resilience';

const JOBBER_TIMEOUT_MS = 8_000;

@Injectable()
export class JobberService {
  private readonly logger = new Logger(JobberService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly configured: boolean;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('JOBBER_SERVICE_URL', '');
    this.token = this.config.get<string>('JOBBER_SERVICE_TOKEN', '');

    if (!this.baseUrl || !this.token) {
      this.logger.warn(
        'Jobber integration not configured — missing JOBBER_SERVICE_URL or JOBBER_SERVICE_TOKEN',
      );
      this.configured = false;
    } else {
      this.configured = true;
    }

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeMs: 30_000,
      name: 'jobber',
    });
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getCircuitState(): import('../../common/utils/resilience').CircuitState {
    return this.circuitBreaker.getState();
  }

  async getAvailabilitySlots(
    type: string,
    lat: number,
    lng: number,
    start: string,
    end: string,
  ): Promise<AvailabilitySlot[]> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const query = `
            query AvailabilitySlots($type: String!, $lat: Float!, $lng: Float!, $start: DateTime!, $end: DateTime!) {
              availabilitySlots(type: $type, latitude: $lat, longitude: $lng, startAfter: $start, endBefore: $end) {
                nodes { start end available }
              }
            }
          `;
          const { data } = await firstValueFrom(
            this.http
              .post<JobberAvailabilityResponse>(
                this.baseUrl,
                { query, variables: { type, lat, lng, start, end } },
                { headers: this.headers() },
              )
              .pipe(timeout(JOBBER_TIMEOUT_MS)),
          );
          return data.data.availabilitySlots.nodes.map(JobberMapper.toAvailabilitySlot);
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 8_000 },
        this.logger,
      ),
    );
  }

  async createBooking(input: JobberCreateBookingInput): Promise<Booking> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const mutation = `
            mutation JobCreate($input: JobCreateInput!) {
              jobCreate(input: $input) {
                job { id title status startAt endAt visitId }
              }
            }
          `;
          const { data } = await firstValueFrom(
            this.http
              .post<JobberBookingResponse>(
                this.baseUrl,
                { query: mutation, variables: { input } },
                { headers: this.headers() },
              )
              .pipe(timeout(JOBBER_TIMEOUT_MS)),
          );
          return JobberMapper.toBooking(data);
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 8_000 },
        this.logger,
      ),
    );
  }

  async rescheduleVisit(
    visitId: string,
    startDate: string,
    endDate: string,
  ): Promise<VisitResult> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const mutation = `
            mutation VisitUpdate($visitId: ID!, $startAt: DateTime!, $endAt: DateTime!) {
              visitUpdate(visitId: $visitId, input: { startAt: $startAt, endAt: $endAt }) {
                visit { id startAt endAt status }
              }
            }
          `;
          const { data } = await firstValueFrom(
            this.http
              .post<JobberRescheduleResponse>(
                this.baseUrl,
                { query: mutation, variables: { visitId, startAt: startDate, endAt: endDate } },
                { headers: this.headers() },
              )
              .pipe(timeout(JOBBER_TIMEOUT_MS)),
          );
          return JobberMapper.toVisitResultFromReschedule(data);
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 8_000 },
        this.logger,
      ),
    );
  }

  async cancelVisit(visitId: string): Promise<VisitResult> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const mutation = `
            mutation VisitCancel($visitId: ID!) {
              visitCancel(visitId: $visitId) {
                visit { id status }
              }
            }
          `;
          const { data } = await firstValueFrom(
            this.http
              .post<JobberCancelResponse>(
                this.baseUrl,
                { query: mutation, variables: { visitId } },
                { headers: this.headers() },
              )
              .pipe(timeout(JOBBER_TIMEOUT_MS)),
          );
          return JobberMapper.toVisitResultFromCancel(data);
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 8_000 },
        this.logger,
      ),
    );
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new Error('Jobber integration is not configured');
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}
