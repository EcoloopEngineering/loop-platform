import { Injectable, Logger } from '@nestjs/common';
import { CircuitState } from '../../common/utils/resilience';

export interface IntegrationStatus {
  configured: boolean;
  circuitState: CircuitState;
  status: 'healthy' | 'degraded' | 'down' | 'not_configured';
}

export interface IntegrationInfo {
  name: string;
  isConfigured: () => boolean;
  getCircuitState: () => CircuitState;
}

@Injectable()
export class IntegrationHealthService {
  private readonly logger = new Logger(IntegrationHealthService.name);
  private readonly integrations = new Map<string, IntegrationInfo>();

  register(info: IntegrationInfo): void {
    this.integrations.set(info.name, info);
    this.logger.log(`Registered integration health: ${info.name}`);
  }

  checkIntegration(name: string): IntegrationStatus {
    const info = this.integrations.get(name);
    if (!info) {
      return { configured: false, circuitState: CircuitState.CLOSED, status: 'not_configured' };
    }

    const configured = info.isConfigured();
    if (!configured) {
      return { configured: false, circuitState: CircuitState.CLOSED, status: 'not_configured' };
    }

    const circuitState = info.getCircuitState();
    let status: IntegrationStatus['status'];

    switch (circuitState) {
      case CircuitState.CLOSED:
        status = 'healthy';
        break;
      case CircuitState.HALF_OPEN:
        status = 'degraded';
        break;
      case CircuitState.OPEN:
        status = 'down';
        break;
      default:
        status = 'healthy';
    }

    return { configured, circuitState, status };
  }

  checkAll(): Record<string, IntegrationStatus> {
    const result: Record<string, IntegrationStatus> = {};
    for (const name of this.integrations.keys()) {
      result[name] = this.checkIntegration(name);
    }
    return result;
  }

  getRegisteredNames(): string[] {
    return Array.from(this.integrations.keys());
  }
}
