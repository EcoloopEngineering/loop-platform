import { CommissionCalculatorDomainService, CommissionInput } from './commission-calculator.domain-service';

describe('CommissionCalculatorDomainService', () => {
  let service: CommissionCalculatorDomainService;

  beforeEach(() => {
    service = new CommissionCalculatorDomainService();
  });

  it('should calculate commission with known inputs', () => {
    const input: CommissionInput = {
      epc: 4.0,
      buildCost: 2.5,
      kw: 10,
      quoteDeductions: 1000,
      splitPct: 1.0,
    };

    // grossMargin = 4.0 - 2.5 = 1.5
    // grossRevenue = 1.5 * 10 * 1000 = 15000
    // netBeforeSplit = (15000 - 1000) * 0.7 = 9800
    // calculatedAmount = 9800 * 1.0 = 9800

    const result = service.calculate(input);

    expect(result.grossMargin).toBe(1.5);
    expect(result.grossRevenue).toBe(15000);
    expect(result.netBeforeSplit).toBe(9800);
    expect(result.calculatedAmount).toBe(9800);
  });

  it('should apply split percentage correctly', () => {
    const input: CommissionInput = {
      epc: 3.0,
      buildCost: 2.0,
      kw: 8,
      quoteDeductions: 0,
      splitPct: 0.6, // 60% split (M1 tier)
    };

    // grossMargin = 1.0
    // grossRevenue = 1.0 * 8 * 1000 = 8000
    // netBeforeSplit = (8000 - 0) * 0.7 = 5600
    // calculatedAmount = 5600 * 0.6 = 3360

    const result = service.calculate(input);

    expect(result.calculatedAmount).toBe(3360);
  });

  it('should handle zero kw system size', () => {
    const input: CommissionInput = {
      epc: 4.0,
      buildCost: 2.0,
      kw: 0,
      quoteDeductions: 0,
      splitPct: 1.0,
    };

    const result = service.calculate(input);

    expect(result.grossRevenue).toBe(0);
    expect(result.netBeforeSplit).toBe(0);
    expect(result.calculatedAmount).toBe(0);
  });

  it('should handle negative margin (buildCost > epc)', () => {
    const input: CommissionInput = {
      epc: 2.0,
      buildCost: 3.0,
      kw: 10,
      quoteDeductions: 0,
      splitPct: 1.0,
    };

    const result = service.calculate(input);

    expect(result.grossMargin).toBe(-1.0);
    expect(result.grossRevenue).toBe(-10000);
    expect(result.calculatedAmount).toBe(-7000);
  });

  it('should round calculatedAmount to 2 decimal places', () => {
    const input: CommissionInput = {
      epc: 3.33,
      buildCost: 2.22,
      kw: 7,
      quoteDeductions: 333,
      splitPct: 0.25,
    };

    const result = service.calculate(input);
    const decimalPlaces = (result.calculatedAmount.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it('should handle zero split percentage', () => {
    const input: CommissionInput = {
      epc: 4.0,
      buildCost: 2.0,
      kw: 10,
      quoteDeductions: 0,
      splitPct: 0,
    };

    const result = service.calculate(input);
    expect(result.calculatedAmount).toBe(0);
    expect(result.netBeforeSplit).toBe(14000); // still calculated
  });
});
