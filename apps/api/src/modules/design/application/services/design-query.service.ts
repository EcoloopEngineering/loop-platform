import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DESIGN_REPOSITORY,
  DesignRepositoryPort,
} from '../ports/design.repository.port';
import { AuroraFinancingData } from '../../../../integrations/aurora/aurora.types';

@Injectable()
export class DesignQueryService {
  private readonly logger = new Logger(DesignQueryService.name);

  constructor(
    @Inject(DESIGN_REPOSITORY)
    private readonly designRepo: DesignRepositoryPort,
  ) {}

  async getDesignsByLead(leadId: string) {
    return this.designRepo.findByLead(leadId);
  }

  async getDesignById(id: string) {
    return this.designRepo.findById(id);
  }

  async persistFinancingData(leadId: string, financing: AuroraFinancingData): Promise<void> {
    try {
      const lead = await this.designRepo.findLeadMetadata(leadId);
      const existingMeta = (lead?.metadata as Record<string, unknown>) ?? {};

      const financingMeta: Record<string, unknown> = {};
      if (financing.contractCost != null) financingMeta.contractCost = financing.contractCost;
      if (financing.escalator != null) financingMeta.escalator = financing.escalator;
      if (financing.solarRate != null) financingMeta.solarRate = financing.solarRate;
      if (financing.monthlyPayment != null) financingMeta.monthlyPayment = financing.monthlyPayment;
      if (financing.systemProduction != null) financingMeta.systemProduction = financing.systemProduction;

      await this.designRepo.updateLeadFinancing(leadId, {
        kw: financing.kw ?? undefined,
        epc: financing.epc ?? undefined,
        metadata: { ...existingMeta, ...financingMeta },
      });
    } catch (err) {
      this.logger.warn(`Failed to persist financing data for lead ${leadId}: ${err}`);
    }
  }
}
