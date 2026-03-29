import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuroraService } from '../../../../integrations/aurora/aurora.service';

interface AiDesignRequestedPayload {
  designRequestId: string;
  leadId: string;
  propertyAddress: string;
  customerName: string;
  monthlyBill?: number;
  annualKwhUsage?: number;
  roofCondition?: string;
  propertyType?: string;
  userId: string;
}

@Injectable()
export class AuroraDesignListener {
  private readonly logger = new Logger(AuroraDesignListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auroraService: AuroraService,
  ) {}

  @OnEvent('design.requested.ai')
  async handleAiDesignRequested(payload: AiDesignRequestedPayload): Promise<void> {
    this.logger.log(`Aurora enrichment for lead ${payload.leadId} (already DESIGN_READY)`);

    try {
      // 1. Parse address for Aurora API
      const addressParts = payload.propertyAddress.split(',').map((s) => s.trim());
      const street = addressParts[0] || '';
      const city = addressParts[1] || '';
      const stateZip = (addressParts[2] || '').split(' ').filter(Boolean);
      const state = stateZip[0] || '';
      const zip = stateZip[1] || '';

      // 2. Estimate kWh from monthly bill
      const estimatedKwh = payload.annualKwhUsage
        ?? (payload.monthlyBill ? Math.round((payload.monthlyBill / 0.16) * 12) : undefined);

      // 3. Call Aurora API to create project
      const auroraProject = await this.auroraService.createProject({
        name: `${payload.customerName} - ${street}`,
        address: { street, city, state, zip },
        latitude: 0,
        longitude: 0,
        utilityBillKwh: estimatedKwh,
        roofType: payload.roofCondition,
        notes: `Property type: ${payload.propertyType ?? 'N/A'}`,
      });

      this.logger.log(`Aurora project created: ${auroraProject.projectId}`);

      // 4. Save Aurora project ID and URL on the design request
      await this.prisma.designRequest.update({
        where: { id: payload.designRequestId },
        data: {
          auroraProjectId: auroraProject.projectId,
          auroraProjectUrl: `https://app.aurorasolar.com/projects/${auroraProject.projectId}`,
        },
      });

      // 5. Log activity
      await this.prisma.leadActivity.create({
        data: {
          leadId: payload.leadId,
          userId: payload.userId,
          type: 'DESIGN_COMPLETED',
          description: `Aurora project linked: ${auroraProject.projectId}`,
          metadata: {
            auroraProjectId: auroraProject.projectId,
            auroraUrl: `https://app.aurorasolar.com/projects/${auroraProject.projectId}`,
          },
        },
      });

    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Aurora enrichment failed for lead ${payload.leadId}: ${errMessage}`, errStack);

      // Log failure but do NOT change lead stage — it's already DESIGN_READY
      await this.prisma.leadActivity.create({
        data: {
          leadId: payload.leadId,
          userId: payload.userId,
          type: 'DESIGN_REQUESTED',
          description: `Aurora integration failed: ${errMessage}. Design is still valid.`,
          metadata: { error: errMessage },
        },
      }).catch(() => {});
    }
  }

}
