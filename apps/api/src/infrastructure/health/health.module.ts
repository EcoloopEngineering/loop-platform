import { Module, OnModuleInit } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../database/prisma.module';
import { HealthController } from './health.controller';
import { IntegrationHealthService } from './integration-health.service';
import { ModuleRef } from '@nestjs/core';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [IntegrationHealthService],
  exports: [IntegrationHealthService],
})
export class HealthModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly integrationHealth: IntegrationHealthService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Dynamically register integration services that are available
    const integrationNames: Array<{ name: string; serviceToken: string }> = [
      { name: 'aurora', serviceToken: 'AuroraService' },
      { name: 'jobber', serviceToken: 'JobberService' },
      { name: 'stripe', serviceToken: 'StripeService' },
      { name: 'zapsign', serviceToken: 'ZapSignService' },
      { name: 'googleChat', serviceToken: 'GoogleChatService' },
    ];

    for (const { name, serviceToken } of integrationNames) {
      try {
        const service = this.moduleRef.get(serviceToken, { strict: false });
        if (service && typeof service.isConfigured === 'function' && typeof service.getCircuitState === 'function') {
          this.integrationHealth.register({
            name,
            isConfigured: () => service.isConfigured(),
            getCircuitState: () => service.getCircuitState(),
          });
        }
      } catch {
        // Integration module not loaded — skip
      }
    }
  }
}
