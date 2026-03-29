import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadScoringDomainService } from '../../domain/services/lead-scoring.domain-service';

@Injectable()
export class LeadScoringAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: LeadScoringDomainService,
  ) {}

  async recalculateScore(leadId: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { customer: true, property: true },
    });
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
      hasPool: lead.property.hasPool,
      hasEV: lead.property.hasEV,
      propertyType: lead.property.propertyType,
      roofCondition: lead.property.roofCondition,
      monthlyBill: lead.property.monthlyBill ? Number(lead.property.monthlyBill) : null,
      annualKwhUsage: lead.property.annualKwhUsage ? Number(lead.property.annualKwhUsage) : null,
      utilityProvider: lead.property.utilityProvider,
    });

    const score = await this.prisma.leadScore.upsert({
      where: { leadId },
      update: {
        totalScore: scoreBreakdown.totalScore,
        roofScore: scoreBreakdown.roofScore,
        energyScore: scoreBreakdown.energyScore,
        contactScore: scoreBreakdown.contactScore,
        propertyScore: scoreBreakdown.propertyScore,
        calculatedAt: new Date(),
      },
      create: {
        leadId,
        totalScore: scoreBreakdown.totalScore,
        roofScore: scoreBreakdown.roofScore,
        energyScore: scoreBreakdown.energyScore,
        contactScore: scoreBreakdown.contactScore,
        propertyScore: scoreBreakdown.propertyScore,
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: 'SCORE_UPDATED',
        description: `Score recalculated: ${scoreBreakdown.totalScore}`,
        metadata: { ...scoreBreakdown },
      },
    });

    return score;
  }

  async getTimeline(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.leadActivity.findMany({
      where: { leadId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
