import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
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

@Injectable()
export class AuroraService {
  private readonly logger = new Logger(AuroraService.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('AURORA_SERVICE_URL', '');
    this.token = this.config.get<string>('AURORA_SERVICE_TOKEN', '');
  }

  async createProject(input: AuroraCreateProjectPayload): Promise<AuroraProject> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<AuroraProjectResponse>(
          `${this.baseUrl}/projects`,
          input,
          { headers: this.headers() },
        ),
      );
      return AuroraMapper.toProject(data);
    } catch (error) {
      this.logger.error('Failed to create Aurora project', error);
      throw error;
    }
  }

  async getDesigns(projectId: string): Promise<AuroraDesign[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<AuroraDesignResponse[]>(
          `${this.baseUrl}/projects/${projectId}/designs`,
          { headers: this.headers() },
        ),
      );
      return data.map(AuroraMapper.toDesign);
    } catch (error) {
      this.logger.error(`Failed to get designs for project ${projectId}`, error);
      throw error;
    }
  }

  async getDesignStatus(projectId: string): Promise<AuroraDesignStatus> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<AuroraDesignStatusResponse>(
          `${this.baseUrl}/projects/${projectId}/status`,
          { headers: this.headers() },
        ),
      );
      return AuroraMapper.toDesignStatus(data);
    } catch (error) {
      this.logger.error(`Failed to get design status for project ${projectId}`, error);
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
