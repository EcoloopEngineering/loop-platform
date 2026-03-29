import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { AuroraService } from '../../../integrations/aurora/aurora.service';
import { QUEUE_DESIGN } from '../queue.module';

export interface DesignJobData {
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

@Processor(QUEUE_DESIGN)
export class DesignProcessor extends WorkerHost {
  private readonly logger = new Logger(DesignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auroraService: AuroraService,
  ) {
    super();
  }

  async process(job: Job<DesignJobData>): Promise<void> {
    const payload = job.data;
    this.logger.log(`Processing Aurora design job ${job.id} for lead ${payload.leadId}`);

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

    this.logger.log(`Aurora design job ${job.id} completed for lead ${payload.leadId}`);
  }
}
