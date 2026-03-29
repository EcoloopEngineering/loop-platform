import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeadScoringAppService } from './lead-scoring-app.service';
import { LeadScoringDomainService } from '../../domain/services/lead-scoring.domain-service';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';

describe('LeadScoringAppService', () => {
  let service: LeadScoringAppService;
  let leadRepo: jest.Mocked<Pick<
    LeadRepositoryPort,
    'findByIdWithCustomerAndProperty' | 'upsertScore' | 'createActivity' | 'findById' | 'findActivitiesWithUser'
  >>;
  let scoringService: { calculate: jest.Mock };

  const mockLead = {
    id: 'lead-1',
    source: 'WEB',
    customer: {
      email: 'john@example.com',
      phone: '555-0100',
      firstName: 'John',
      lastName: 'Doe',
    },
    property: {
      streetAddress: '123 Main St',
      latitude: 40.7,
      longitude: -74.0,
      electricalService: '200A',
      hasPool: false,
      hasEV: true,
      propertyType: 'SINGLE_FAMILY',
      roofCondition: 'GOOD',
      monthlyBill: 250,
      annualKwhUsage: 12000,
      utilityProvider: 'ConEd',
    },
  };

  const mockScoreBreakdown = {
    totalScore: 78,
    roofScore: 80,
    energyScore: 75,
    contactScore: 100,
    propertyScore: 60,
  };

  beforeEach(async () => {
    leadRepo = {
      findByIdWithCustomerAndProperty: jest.fn(),
      upsertScore: jest.fn(),
      createActivity: jest.fn(),
      findById: jest.fn(),
      findActivitiesWithUser: jest.fn(),
    };
    scoringService = { calculate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadScoringAppService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: LeadScoringDomainService, useValue: scoringService },
      ],
    }).compile();

    service = module.get<LeadScoringAppService>(LeadScoringAppService);
  });

  describe('recalculateScore', () => {
    it('should recalculate score, upsert it, and log activity', async () => {
      leadRepo.findByIdWithCustomerAndProperty.mockResolvedValue(mockLead);
      scoringService.calculate.mockReturnValue(mockScoreBreakdown);
      const upsertedScore = { id: 'score-1', leadId: 'lead-1', ...mockScoreBreakdown };
      leadRepo.upsertScore.mockResolvedValue(upsertedScore);
      leadRepo.createActivity.mockResolvedValue({} as any);

      const result = await service.recalculateScore('lead-1', 'user-1');

      expect(leadRepo.findByIdWithCustomerAndProperty).toHaveBeenCalledWith('lead-1');
      expect(scoringService.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          phone: '555-0100',
          roofCondition: 'GOOD',
          monthlyBill: 250,
        }),
      );
      expect(leadRepo.upsertScore).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({ totalScore: 78, calculatedAt: expect.any(Date) }),
        expect.objectContaining({ leadId: 'lead-1', totalScore: 78 }),
      );
      expect(leadRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          userId: 'user-1',
          type: 'SCORE_UPDATED',
          description: 'Score recalculated: 78',
        }),
      );
      expect(result).toEqual(upsertedScore);
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findByIdWithCustomerAndProperty.mockResolvedValue(null);

      await expect(service.recalculateScore('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(scoringService.calculate).not.toHaveBeenCalled();
    });
  });

  describe('getTimeline', () => {
    it('should return lead activities ordered by createdAt desc', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' } as any);
      const activities = [
        { id: 'a1', type: 'STAGE_CHANGED', createdAt: new Date() },
        { id: 'a2', type: 'NOTE_ADDED', createdAt: new Date() },
      ];
      leadRepo.findActivitiesWithUser.mockResolvedValue(activities as any);

      const result = await service.getTimeline('lead-1');

      expect(leadRepo.findById).toHaveBeenCalledWith('lead-1');
      expect(leadRepo.findActivitiesWithUser).toHaveBeenCalledWith('lead-1');
      expect(result).toEqual(activities);
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);

      await expect(service.getTimeline('bad-id')).rejects.toThrow(NotFoundException);
      expect(leadRepo.findActivitiesWithUser).not.toHaveBeenCalled();
    });
  });
});
