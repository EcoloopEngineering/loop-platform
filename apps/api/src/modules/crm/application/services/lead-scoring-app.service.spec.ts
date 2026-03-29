import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeadScoringAppService } from './lead-scoring-app.service';
import { LeadScoringDomainService } from '../../domain/services/lead-scoring.domain-service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('LeadScoringAppService', () => {
  let service: LeadScoringAppService;
  let prisma: MockPrismaService;
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
    prisma = createMockPrismaService();
    scoringService = { calculate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadScoringAppService,
        { provide: PrismaService, useValue: prisma },
        { provide: LeadScoringDomainService, useValue: scoringService },
      ],
    }).compile();

    service = module.get<LeadScoringAppService>(LeadScoringAppService);
  });

  describe('recalculateScore', () => {
    it('should recalculate score, upsert it, and log activity', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      scoringService.calculate.mockReturnValue(mockScoreBreakdown);
      const upsertedScore = { id: 'score-1', leadId: 'lead-1', ...mockScoreBreakdown };
      prisma.leadScore.upsert.mockResolvedValue(upsertedScore);
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await service.recalculateScore('lead-1', 'user-1');

      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        include: { customer: true, property: true },
      });
      expect(scoringService.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          phone: '555-0100',
          roofCondition: 'GOOD',
          monthlyBill: 250,
        }),
      );
      expect(prisma.leadScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leadId: 'lead-1' },
          update: expect.objectContaining({ totalScore: 78 }),
          create: expect.objectContaining({ leadId: 'lead-1', totalScore: 78 }),
        }),
      );
      expect(prisma.leadActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: 'lead-1',
          userId: 'user-1',
          type: 'SCORE_UPDATED',
          description: 'Score recalculated: 78',
        }),
      });
      expect(result).toEqual(upsertedScore);
    });

    it('should throw NotFoundException when lead not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.recalculateScore('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(scoringService.calculate).not.toHaveBeenCalled();
    });
  });

  describe('getTimeline', () => {
    it('should return lead activities ordered by createdAt desc', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      const activities = [
        { id: 'a1', type: 'STAGE_CHANGED', createdAt: new Date() },
        { id: 'a2', type: 'NOTE_ADDED', createdAt: new Date() },
      ];
      prisma.leadActivity.findMany.mockResolvedValue(activities);

      const result = await service.getTimeline('lead-1');

      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
      });
      expect(prisma.leadActivity.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, profileImage: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(activities);
    });

    it('should throw NotFoundException when lead not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.getTimeline('bad-id')).rejects.toThrow(NotFoundException);
      expect(prisma.leadActivity.findMany).not.toHaveBeenCalled();
    });
  });
});
