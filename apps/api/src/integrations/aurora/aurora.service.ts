import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import {
  AuroraCreateProjectPayload,
  AuroraProject,
  AuroraDesign,
  AuroraDesignStatus,
  AuroraProjectResponse,
  AuroraDesignResponse,
  AuroraDesignStatusResponse,
} from './aurora.types';
import { AuroraMapper } from './aurora.mapper';
import { withRetry, CircuitBreaker } from '../../common/utils/resilience';

const AURORA_TIMEOUT_MS = 10_000;

@Injectable()
export class AuroraService {
  private readonly logger = new Logger(AuroraService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly configured: boolean;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('AURORA_SERVICE_URL', '');
    this.token = this.config.get<string>('AURORA_SERVICE_TOKEN', '');

    if (!this.baseUrl || !this.token) {
      this.logger.warn(
        'Aurora integration not configured — missing AURORA_SERVICE_URL or AURORA_SERVICE_TOKEN',
      );
      this.configured = false;
    } else {
      this.configured = true;
    }

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeMs: 30_000,
      name: 'aurora',
    });
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getCircuitState(): import('../../common/utils/resilience').CircuitState {
    return this.circuitBreaker.getState();
  }

  async createProject(input: AuroraCreateProjectPayload): Promise<AuroraProject> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const { data } = await firstValueFrom(
            this.http
              .post<AuroraProjectResponse>(
                `${this.baseUrl}/projects`,
                input,
                { headers: this.headers() },
              )
              .pipe(timeout(AURORA_TIMEOUT_MS)),
          );
          return AuroraMapper.toProject(data);
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10_000 },
        this.logger,
      ),
    );
  }

  async getDesigns(projectId: string): Promise<AuroraDesign[]> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const { data } = await firstValueFrom(
            this.http
              .get<AuroraDesignResponse[]>(
                `${this.baseUrl}/projects/${projectId}/designs`,
                { headers: this.headers() },
              )
              .pipe(timeout(AURORA_TIMEOUT_MS)),
          );
          return data.map(AuroraMapper.toDesign);
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10_000 },
        this.logger,
      ),
    );
  }

  async getDesignStatus(projectId: string): Promise<AuroraDesignStatus> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const { data } = await firstValueFrom(
            this.http
              .get<AuroraDesignStatusResponse>(
                `${this.baseUrl}/projects/${projectId}/status`,
                { headers: this.headers() },
              )
              .pipe(timeout(AURORA_TIMEOUT_MS)),
          );
          return AuroraMapper.toDesignStatus(data);
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10_000 },
        this.logger,
      ),
    );
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new Error('Aurora integration is not configured');
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}
