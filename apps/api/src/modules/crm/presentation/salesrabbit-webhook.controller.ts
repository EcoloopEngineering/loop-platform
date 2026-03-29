import { Controller, Post, Body, Logger, Headers, UnauthorizedException, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PROPERTY_REPOSITORY, PropertyRepositoryPort } from '../application/ports/property.repository.port';

interface SalesRabbitLead {
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
  // Property details
  pool?: boolean;
  electricVehicle?: boolean;
  electricalService?: string;
  roofAge?: string;
}

const DISQUALIFIED_STATUSES = [14, 15, 16]; // NEEDS_ROOF, EXISTING_SOLAR, RENTER

@Controller('webhooks/salesrabbit')
@ApiTags('Webhooks')
export class SalesRabbitWebhookController {
  private readonly logger = new Logger(SalesRabbitWebhookController.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
    private readonly config: ConfigService,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: PropertyRepositoryPort,
  ) {
    this.webhookSecret = this.config.get<string>('SALESRABBIT_WEBHOOK_SECRET');
    if (!this.webhookSecret) {
      this.logger.warn('SALESRABBIT_WEBHOOK_SECRET not set — webhook endpoint is unauthenticated');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Receive SalesRabbit webhook events' })
  async handleWebhook(
    @Body() body: { event: string; data: SalesRabbitLead },
    @Headers('x-salesrabbit-secret') secret?: string,
  ): Promise<{ received?: boolean; skipped?: boolean; leadId?: string; customerId?: string; deleted?: boolean; error?: string; reason?: string }> {
    if (this.webhookSecret && secret !== this.webhookSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    this.logger.log(`SalesRabbit webhook: ${body.event}`);

    const { event, data } = body;

    if (event === 'lead.created' || event === 'lead.updated') {
      return this.handleLeadCreateOrUpdate(data);
    }

    if (event === 'lead.deleted') {
      return this.handleLeadDelete(data);
    }

    if (event === 'form.submitted') {
      return this.handleFormSubmit(data);
    }

    return { received: true };
  }

  private async handleLeadCreateOrUpdate(data: SalesRabbitLead) {
    if (!data.email && !data.phone) {
      this.logger.warn('SalesRabbit lead missing email and phone — skipping');
      return { skipped: true, reason: 'no contact info' };
    }

    // Check if disqualified
    if (data.statusId && DISQUALIFIED_STATUSES.includes(data.statusId)) {
      this.logger.log(`SalesRabbit lead disqualified: status ${data.statusId}`);
      return { skipped: true, reason: 'disqualified' };
    }

    // Find or create customer
    let customer = data.email
      ? await this.prisma.customer.findFirst({ where: { email: data.email } })
      : null;

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email ?? `sr-${data.salesRabbitId}@noemail.com`,
          phone: data.phone,
          source: 'PUBLIC_FORM',
        },
      });
    }

    // Find or create property
    let property = null;
    if (data.address) {
      property = await this.propertyRepo.create({
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
      });
    }

    // Find default pipeline
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
        ...(property && { property: { connect: { id: property.id } } }),
      },
    });

    // Log activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: lead.createdById ?? customer.id,
        type: 'STAGE_CHANGE',
        description: `Lead created from SalesRabbit (ID: ${data.salesRabbitId ?? 'unknown'})`,
        metadata: { source: 'salesrabbit', salesRabbitId: data.salesRabbitId },
      },
    });

    // Emit event for notifications
    this.emitter.emit('lead.created', {
      leadId: lead.id,
      assignedTo: lead.createdById ?? customer.id,
      customerName: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    });

    this.logger.log(`SalesRabbit lead created: ${lead.id}`);
    return { leadId: lead.id, customerId: customer.id };
  }

  private async handleFormSubmit(data: SalesRabbitLead) {
    // Form submit follows same flow as create
    return this.handleLeadCreateOrUpdate(data);
  }

  private async handleLeadDelete(data: SalesRabbitLead) {
    if (!data.email) return { skipped: true };

    const customer = await this.prisma.customer.findFirst({ where: { email: data.email } });
    if (!customer) return { skipped: true, reason: 'customer not found' };

    // Soft delete — deactivate leads
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
