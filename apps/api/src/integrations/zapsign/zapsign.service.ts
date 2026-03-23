import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ZapSignCreateDocInput, ZapSignDocResponse, ZapSignSignResponse } from './zapsign.types';

@Injectable()
export class ZapSignService {
  private readonly logger = new Logger(ZapSignService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiUrl = this.config.get<string>('ZAPSIGN_API_URL', 'https://api.zapsign.com.br/api');
    this.apiToken = this.config.get<string>('ZAPSIGN_API_TOKEN', '');
  }

  async createDocument(input: ZapSignCreateDocInput): Promise<ZapSignDocResponse> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<ZapSignDocResponse>(
          `${this.apiUrl}/v1/docs`,
          input,
          { headers: this.headers() },
        ),
      );
      this.logger.log(`ZapSign document created: ${data.token}`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to create ZapSign document: ${error.message}`);
      throw error;
    }
  }

  async signDocument(signerToken: string): Promise<ZapSignSignResponse> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<ZapSignSignResponse>(
          `${this.apiUrl}/v1/sign`,
          { token: signerToken },
          { headers: this.headers() },
        ),
      );
      this.logger.log(`ZapSign document signed: ${signerToken}`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to sign document: ${error.message}`);
      throw error;
    }
  }

  async getDocumentStatus(docToken: string): Promise<ZapSignDocResponse> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<ZapSignDocResponse>(
          `${this.apiUrl}/v1/docs/${docToken}`,
          { headers: this.headers() },
        ),
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to get document status: ${error.message}`);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.apiToken;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }
}
