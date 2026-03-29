import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ZapSignCreateDocInput, ZapSignDocResponse, ZapSignSignResponse } from './zapsign.types';
import { withRetry, CircuitBreaker } from '../../common/utils/resilience';

const ZAPSIGN_TIMEOUT_MS = 10_000;

@Injectable()
export class ZapSignService {
  private readonly logger = new Logger(ZapSignService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly configured: boolean;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiUrl = this.config.get<string>('ZAPSIGN_API_URL', 'https://api.zapsign.com.br/api');
    this.apiToken = this.config.get<string>('ZAPSIGN_API_TOKEN', '');

    if (!this.apiToken) {
      this.logger.warn('ZapSign integration not configured — missing ZAPSIGN_API_TOKEN');
      this.configured = false;
    } else {
      this.configured = true;
    }

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeMs: 30_000,
      name: 'zapsign',
    });
  }

  async createDocument(input: ZapSignCreateDocInput): Promise<ZapSignDocResponse> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const { data } = await firstValueFrom(
            this.http
              .post<ZapSignDocResponse>(
                `${this.apiUrl}/v1/docs`,
                input,
                { headers: this.headers() },
              )
              .pipe(timeout(ZAPSIGN_TIMEOUT_MS)),
          );
          this.logger.log(`ZapSign document created: ${data.token}`);
          return data;
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10_000 },
        this.logger,
      ),
    );
  }

  async signDocument(signerToken: string): Promise<ZapSignSignResponse> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const { data } = await firstValueFrom(
            this.http
              .post<ZapSignSignResponse>(
                `${this.apiUrl}/v1/sign`,
                { token: signerToken },
                { headers: this.headers() },
              )
              .pipe(timeout(ZAPSIGN_TIMEOUT_MS)),
          );
          this.logger.log(`ZapSign document signed: ${signerToken}`);
          return data;
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10_000 },
        this.logger,
      ),
    );
  }

  async getDocumentStatus(docToken: string): Promise<ZapSignDocResponse> {
    this.assertConfigured();

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const { data } = await firstValueFrom(
            this.http
              .get<ZapSignDocResponse>(
                `${this.apiUrl}/v1/docs/${docToken}`,
                { headers: this.headers() },
              )
              .pipe(timeout(ZAPSIGN_TIMEOUT_MS)),
          );
          return data;
        },
        { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10_000 },
        this.logger,
      ),
    );
  }

  isConfigured(): boolean {
    return this.configured;
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new Error('ZapSign integration is not configured');
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }
}
