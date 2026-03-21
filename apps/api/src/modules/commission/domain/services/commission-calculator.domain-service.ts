import { Injectable } from '@nestjs/common';

export interface CommissionInput {
  epc: number;        // Earnings per capacity ($/W)
  buildCost: number;  // Build cost ($/W)
  kw: number;         // System size in kW
  quoteDeductions: number; // Deductions from quote
  splitPct: number;   // Split percentage (0-1)
}

export interface CommissionResult {
  grossMargin: number;
  grossRevenue: number;
  netBeforeSplit: number;
  calculatedAmount: number;
}

@Injectable()
export class CommissionCalculatorDomainService {
  /**
   * Commission formula:
   * ((EPC - buildCost) * KW * 1000 - quoteDeductions) * 0.7 * splitPct
   */
  calculate(input: CommissionInput): CommissionResult {
    const grossMargin = input.epc - input.buildCost;
    const grossRevenue = grossMargin * input.kw * 1000;
    const netBeforeSplit = (grossRevenue - input.quoteDeductions) * 0.7;
    const calculatedAmount = netBeforeSplit * input.splitPct;

    return {
      grossMargin,
      grossRevenue,
      netBeforeSplit,
      calculatedAmount: Math.round(calculatedAmount * 100) / 100,
    };
  }
}
