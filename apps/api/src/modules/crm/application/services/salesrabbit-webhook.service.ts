import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PROPERTY_REPOSITORY, PropertyRepositoryPort } from '../ports/property.repository.port';

export interface SalesRabbitLead {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  statusId?: number;
  salesRabbitId?: string;
  userId?: string;
  notes?: string;
  pool?: boolean;
  electricVehicle?: boolean;
  electricalService?: string;
  roofAge?: string;
}

export const DISQUALIFIED_STATUSES = [14, 15, 16]; // NEEDS_ROOF, EXISTING_SOLAR, RENTER

@Injectable()
export class SalesRabbitWebhookService {
  private readonly logger = new Logger(SalesRabbitWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: PropertyRepositoryPort,
  ) {}

  async processEvent(
    event: string,
    data: SalesRabbitLead,
  ): Promise<{
    received?: boolean;
    skipped?: boolean;
    leadId?: string;
    customerId?: string;
    deleted?: boolean;
    error?: string;
    reason?: string;
  }> {
    this.logger.log(`Processing SalesRabbit event: ${event}`);

    if (event === 'lead.created' || event === 'lead.updated') {
      return this.handleLeadCreateOrUpdate(data);
    }

    if (event === 'lead.deleted') {
      return this.handleLeadDelete(data);
    }

    if (event === 'form.submitted') {
      return this.handleLeadCreateOrUpdate(data);
    }

    return { received: true };
  }

  private async handleLeadCreateOrUpdate(data: SalesRabbitLead) {
    if (!data.email && !data.phone) {
      this.logger.warn('SalesRabbit lead missing email and phone — skipping');
      return { skipped: true, reason: 'no contact info' };
    }

    if (data.statusId && DISQUALIFIED_STATUSES.includes(data.statusId)) {
      this.logger.log(`SalesRabbit lead disqualified: status ${data.statusId}`);
      return { skipped: true, reason: 'disqualified' };
    }

    const customer = await this.findOrCreateCustomer(data);

    const property = data.address
      ? await this.propertyRepo.create({
          customerId: customer.id,
          streetAddress: data.address,
          city: data.city ?? '',
          state: data.state ?? '',
          zip: data.zip ?? '',
          propertyType: 'RESIDENTIAL',
          roofCondition: this.mapRoofAge(data.roofAge),
          electricalService: data.electricalService,
          hasPool: data.pool ?? false,
          hasEV: data.electricVehicle ?? false,
        })
      : null;

    const pipeline = await this.prisma.pipeline.findFirst({ where: { isDefault: true } });
    if (!pipeline) {
      this.logger.error('No default pipeline found');
      return { error: 'no pipeline' };
    }

    const lead = await this.prisma.lead.create({
      data: {
        customer: { connect: { id: customer.id } },
        pipeline: { connect: { id: pipeline.id } },
        source: 'PUBLIC_FORM',
        currentStage: 'NEW_LEAD',
        ...(property ? { property: { connect: { id: property.id } } } : {}),
      } as any,
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: lead.createdById ?? customer.id,
        type: 'STAGE_CHANGE',
        description: `Lead created from SalesRabbit (ID: ${data.salesRabbitId ?? 'unknown'})`,
        metadata: { source: 'salesrabbit', salesRabbitId: data.salesRabbitId },
      },
    });

    this.emitter.emit('lead.created', {
      leadId: lead.id,
      assignedTo: lead.createdById ?? customer.id,
      customerName: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    });

    this.logger.log(`SalesRabbit lead created: ${lead.id}`);
    return { leadId: lead.id, customerId: customer.id };
  }

  private async findOrCreateCustomer(data: SalesRabbitLead) {
    if (data.email) {
      const existing = await this.prisma.customer.findFirst({ where: { email: data.email } });
      if (existing) return existing;
    }

    return this.prisma.customer.create({
      data: {
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        email: data.email ?? `sr-${data.salesRabbitId}@noemail.com`,
        phone: data.phone,
        source: 'PUBLIC_FORM',
      },
    });
  }

  private async handleLeadDelete(data: SalesRabbitLead) {
    if (!data.email) return { skipped: true };

    const customer = await this.prisma.customer.findFirst({ where: { email: data.email } });
    if (!customer) return { skipped: true, reason: 'customer not found' };

    await this.prisma.lead.updateMany({
      where: { customerId: customer.id, isActive: true },
      data: { isActive: false, lostReason: 'Deleted from SalesRabbit' },
    });

    this.logger.log(`SalesRabbit lead deleted for customer: ${customer.id}`);
    return { deleted: true };
  }

  private mapRoofAge(age?: string): string {
    if (!age) return 'UNKNOWN';
    const years = parseInt(age);
    if (isNaN(years)) return 'UNKNOWN';
    if (years < 5) return 'GOOD';
    if (years <= 15) return 'FAIR';
    return 'POOR';
  }
}
