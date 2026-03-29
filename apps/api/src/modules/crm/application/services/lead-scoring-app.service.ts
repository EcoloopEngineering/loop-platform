import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { LeadScoringDomainService } from '../../domain/services/lead-scoring.domain-service';

@Injectable()
export class LeadScoringAppService {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepo: LeadRepositoryPort,
    private readonly scoringService: LeadScoringDomainService,
  ) {}

  async recalculateScore(leadId: string, userId: string) {
    const lead = await this.leadRepo.findByIdWithCustomerAndProperty(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    const scoreBreakdown = this.scoringService.calculate({
      email: lead.customer.email,
      phone: lead.customer.phone,
      firstName: lead.customer.firstName,
      lastName: lead.customer.lastName,
      source: lead.source,
      streetAddress: lead.property.streetAddress,
      latitude: lead.property.latitude,
      longitude: lead.property.longitude,
      electricalService: lead.property.electricalService,
      hasPool: lead.property.hasPool ?? undefined,
      hasEV: lead.property.hasEV ?? undefined,
      propertyType: lead.property.propertyType,
      roofCondition: lead.property.roofCondition,
      monthlyBill: lead.property.monthlyBill ? Number(lead.property.monthlyBill) : null,
      annualKwhUsage: lead.property.annualKwhUsage ? Number(lead.property.annualKwhUsage) : null,
      utilityProvider: lead.property.utilityProvider,
    });

    const score = await this.leadRepo.upsertScore(
      leadId,
      {
        totalScore: scoreBreakdown.totalScore,
        roofScore: scoreBreakdown.roofScore,
        energyScore: scoreBreakdown.energyScore,
        contactScore: scoreBreakdown.contactScore,
        propertyScore: scoreBreakdown.propertyScore,
        calculatedAt: new Date(),
      },
      {
        leadId,
        totalScore: scoreBreakdown.totalScore,
        roofScore: scoreBreakdown.roofScore,
        energyScore: scoreBreakdown.energyScore,
        contactScore: scoreBreakdown.contactScore,
        propertyScore: scoreBreakdown.propertyScore,
      },
    );

    await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'SCORE_UPDATED',
      description: `Score recalculated: ${scoreBreakdown.totalScore}`,
      metadata: { ...scoreBreakdown },
    });

    return score;
  }

  async getTimeline(leadId: string) {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    return this.leadRepo.findActivitiesWithUser(leadId);
  }
}
