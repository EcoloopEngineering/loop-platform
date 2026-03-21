import { Injectable } from '@nestjs/common';
import {
  SCORING_WEIGHTS,
  ROOF_SCORE_MAP,
  ENERGY_SCORE_THRESHOLDS,
  RoofCondition,
} from '@loop/shared';
import { ScoreBreakdown } from '../value-objects/score-breakdown.vo';

export interface LeadScoringInput {
  // Contact data
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  source?: string | null;

  // Property data
  streetAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  electricalService?: string | null;
  hasPool?: boolean;
  hasEV?: boolean;
  isInsideServiceArea?: boolean | null;
  propertyType?: string | null;

  // Roof data
  roofCondition?: RoofCondition | string | null;

  // Energy data
  monthlyBill?: number | null;
  annualKwhUsage?: number | null;
  utilityProvider?: string | null;
}

@Injectable()
export class LeadScoringDomainService {
  calculate(input: LeadScoringInput): ScoreBreakdown {
    const roofScore = this.calculateRoofScore(input);
    const energyScore = this.calculateEnergyScore(input);
    const contactScore = this.calculateContactScore(input);
    const propertyScore = this.calculatePropertyScore(input);

    const totalScore = Math.round(
      roofScore * SCORING_WEIGHTS.roof +
      energyScore * SCORING_WEIGHTS.energy +
      contactScore * SCORING_WEIGHTS.contact +
      propertyScore * SCORING_WEIGHTS.property,
    );

    return new ScoreBreakdown({
      totalScore,
      roofScore,
      energyScore,
      contactScore,
      propertyScore,
    });
  }

  private calculateRoofScore(input: LeadScoringInput): number {
    const condition = (input.roofCondition as RoofCondition) || 'UNKNOWN';
    return ROOF_SCORE_MAP[condition] ?? ROOF_SCORE_MAP.UNKNOWN;
  }

  private calculateEnergyScore(input: LeadScoringInput): number {
    let score = 0;

    // Monthly bill scoring
    const bill = input.monthlyBill ?? 0;
    if (bill > 0) {
      const threshold = ENERGY_SCORE_THRESHOLDS.find((t) => bill >= t.min);
      score = threshold?.score ?? 0;
    }

    // Bonus for annual kWh usage
    if (input.annualKwhUsage && input.annualKwhUsage > 0) {
      score = Math.min(100, score + 10);
    }

    // Bonus for utility provider
    if (input.utilityProvider) {
      score = Math.min(100, score + 5);
    }

    return score;
  }

  private calculateContactScore(input: LeadScoringInput): number {
    let score = 0;

    if (input.email) score += 30;
    if (input.phone) score += 30;
    if (input.firstName && input.lastName) score += 20;
    if (input.source) score += 20;

    return Math.min(100, score);
  }

  private calculatePropertyScore(input: LeadScoringInput): number {
    let score = 0;

    if (input.streetAddress) score += 30;
    if (input.latitude != null && input.longitude != null) score += 15;
    if (input.electricalService) score += 15;
    if (input.hasPool || input.hasEV) score += 10;
    if (input.isInsideServiceArea) score += 20;
    if (input.propertyType) score += 10;

    return Math.min(100, score);
  }
}
