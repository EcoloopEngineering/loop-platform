import { LeadScoringDomainService, LeadScoringInput } from './lead-scoring.domain-service';

describe('LeadScoringDomainService', () => {
  let service: LeadScoringDomainService;

  beforeEach(() => {
    service = new LeadScoringDomainService();
  });

  const fullInput: LeadScoringInput = {
    email: 'test@example.com',
    phone: '555-1234',
    firstName: 'John',
    lastName: 'Doe',
    source: 'REFERRAL',
    streetAddress: '123 Main St',
    latitude: 25.7617,
    longitude: -80.1918,
    electricalService: '200A',
    hasPool: true,
    hasEV: false,
    isInsideServiceArea: true,
    propertyType: 'RESIDENTIAL',
    roofCondition: 'GOOD',
    monthlyBill: 300,
    annualKwhUsage: 15000,
    utilityProvider: 'FPL',
  };

  describe('calculate()', () => {
    it('returns a ScoreBreakdown with all scores', () => {
      const result = service.calculate(fullInput);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.roofScore).toBeDefined();
      expect(result.energyScore).toBeDefined();
      expect(result.contactScore).toBeDefined();
      expect(result.propertyScore).toBeDefined();
    });

    it('returns high score for complete input', () => {
      const result = service.calculate(fullInput);
      expect(result.totalScore).toBeGreaterThanOrEqual(70);
    });

    it('returns low score for minimal empty input', () => {
      const result = service.calculate({});
      expect(result.totalScore).toBeLessThan(40);
    });
  });

  describe('roof scoring', () => {
    it('scores GOOD condition highest', () => {
      const good = service.calculate({ ...fullInput, roofCondition: 'GOOD' });
      const fair = service.calculate({ ...fullInput, roofCondition: 'FAIR' });
      expect(good.roofScore).toBeGreaterThanOrEqual(fair.roofScore);
    });

    it('scores POOR condition lowest', () => {
      const poor = service.calculate({ ...fullInput, roofCondition: 'POOR' });
      const fair = service.calculate({ ...fullInput, roofCondition: 'FAIR' });
      expect(poor.roofScore).toBeLessThanOrEqual(fair.roofScore);
    });

    it('handles UNKNOWN condition', () => {
      const result = service.calculate({ ...fullInput, roofCondition: 'UNKNOWN' });
      expect(result.roofScore).toBeGreaterThanOrEqual(0);
    });

    it('handles null/undefined condition', () => {
      const result = service.calculate({ ...fullInput, roofCondition: null });
      expect(result.roofScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('energy scoring', () => {
    it('scores high monthly bill higher', () => {
      const high = service.calculate({ monthlyBill: 300 });
      const low = service.calculate({ monthlyBill: 50 });
      expect(high.energyScore).toBeGreaterThanOrEqual(low.energyScore);
    });

    it('adds bonus for annualKwhUsage', () => {
      const without = service.calculate({ monthlyBill: 200 });
      const with_ = service.calculate({ monthlyBill: 200, annualKwhUsage: 15000 });
      expect(with_.energyScore).toBeGreaterThanOrEqual(without.energyScore);
    });

    it('adds bonus for utilityProvider', () => {
      const without = service.calculate({ monthlyBill: 200 });
      const with_ = service.calculate({ monthlyBill: 200, utilityProvider: 'FPL' });
      expect(with_.energyScore).toBeGreaterThanOrEqual(without.energyScore);
    });

    it('caps energy score at 100', () => {
      const result = service.calculate({
        monthlyBill: 500,
        annualKwhUsage: 20000,
        utilityProvider: 'FPL',
      });
      expect(result.energyScore).toBeLessThanOrEqual(100);
    });

    it('returns 0 for no energy data', () => {
      const result = service.calculate({});
      expect(result.energyScore).toBe(0);
    });
  });

  describe('contact scoring', () => {
    it('scores 100 with all contact fields', () => {
      const result = service.calculate({
        email: 'a@b.com',
        phone: '555',
        firstName: 'A',
        lastName: 'B',
        source: 'REFERRAL',
      });
      expect(result.contactScore).toBe(100);
    });

    it('scores 0 with no contact fields', () => {
      const result = service.calculate({});
      expect(result.contactScore).toBe(0);
    });

    it('scores partial with some fields', () => {
      const result = service.calculate({ email: 'a@b.com' });
      expect(result.contactScore).toBe(30);
    });
  });

  describe('property scoring', () => {
    it('scores high with all property fields', () => {
      const result = service.calculate({
        streetAddress: '123 Main',
        latitude: 25.0,
        longitude: -80.0,
        electricalService: '200A',
        hasPool: true,
        isInsideServiceArea: true,
        propertyType: 'RESIDENTIAL',
      });
      expect(result.propertyScore).toBe(100);
    });

    it('scores 0 with no property fields', () => {
      const result = service.calculate({});
      expect(result.propertyScore).toBe(0);
    });

    it('caps property score at 100', () => {
      const result = service.calculate({
        streetAddress: '123 Main',
        latitude: 25.0,
        longitude: -80.0,
        electricalService: '200A',
        hasPool: true,
        hasEV: true,
        isInsideServiceArea: true,
        propertyType: 'RESIDENTIAL',
      });
      expect(result.propertyScore).toBeLessThanOrEqual(100);
    });
  });
});
