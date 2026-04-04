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
  AuroraFinancingData,
  AuroraProjectResponse,
  AuroraDesignResponse,
  AuroraDesignStatusResponse,
  AuroraDesignSummaryResponse,
  AuroraFinancingsResponse,
  AuroraFinancingDetailResponse,
  AuroraPricingResponse,
} from './aurora.types';
import { AuroraMapper } from './aurora.mapper';
import { withRetry, CircuitBreaker } from '../../common/utils/resilience';

const AURORA_TIMEOUT_MS = 10_000;

@Injectable()
export class AuroraService {
  private readonly logger = new Logger(AuroraService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly tenantId: string;
  private readonly configured: boolean;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('AURORA_SERVICE_URL', '');
    this.token = this.config.get<string>('AURORA_SERVICE_TOKEN', '');
    this.tenantId = this.config.get<string>('AURORA_TENANT_ID', '');

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

  async getDesignFinancing(designId: string): Promise<AuroraFinancingData> {
    this.assertConfigured();

    if (!this.tenantId) {
      throw new Error('Aurora tenant not configured — missing AURORA_TENANT_ID');
    }

    const tenantBase = `${this.baseUrl}/tenants/${this.tenantId}/designs/${designId}`;

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          // 1) Design summary
          const { data: summaryData } = await firstValueFrom(
            this.http
              .get<AuroraDesignSummaryResponse>(
                `${tenantBase}/summary`,
                { headers: this.headers() },
              )
              .pipe(timeout(AURORA_TIMEOUT_MS)),
          );

          // 2) List financings → find selected one
          const { data: financingsData } = await firstValueFrom(
            this.http
              .get<AuroraFinancingsResponse>(
                `${tenantBase}/financings`,
                { headers: this.headers() },
              )
              .pipe(timeout(AURORA_TIMEOUT_MS)),
          );

          const financings = financingsData.financings ?? [];
          const selected = financings.find((f) => f.selected_in_sales_mode);
          const financingId = selected?.id ?? financings[0]?.id;

          // 3) Financing detail (if available)
          let financing: AuroraFinancingDetailResponse['financing'] | null = null;
          if (financingId) {
            const { data: financingData } = await firstValueFrom(
              this.http
                .get<AuroraFinancingDetailResponse>(
                  `${tenantBase}/financings/${financingId}`,
                  { headers: this.headers() },
                )
                .pipe(timeout(AURORA_TIMEOUT_MS)),
            );
            financing = financingData.financing;
          }

          // 4) Pricing
          const { data: pricingData } = await firstValueFrom(
            this.http
              .get<AuroraPricingResponse>(
                `${tenantBase}/pricing`,
                { headers: this.headers() },
              )
              .pipe(timeout(AURORA_TIMEOUT_MS)),
          );

          const design = summaryData.design;
          const pricing = pricingData.pricing;

          return {
            kw: design?.system_size_stc
              ? Math.round(design.system_size_stc / 10) / 100
              : null,
            epc: pricing?.price_per_watt
              ? parseFloat(pricing.price_per_watt.toFixed(2))
              : null,
            contractCost: pricing?.system_price ?? null,
            escalator: financing?.escalation ?? null,
            solarRate: financing?.solar_rate ?? null,
            monthlyPayment: financing?.monthly_payment ?? null,
            systemProduction: design?.energy_production?.annual
              ? Math.round(design.energy_production.annual)
              : null,
          };
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
