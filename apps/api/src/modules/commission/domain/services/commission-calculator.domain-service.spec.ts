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
    expect(result.netBeforeSplit).toBe(14000);
  });
});
