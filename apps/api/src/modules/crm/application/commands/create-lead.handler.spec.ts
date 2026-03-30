import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateLeadHandler } from './create-lead.handler';
import { CreateLeadCommand } from './create-lead.command';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';
import { CUSTOMER_REPOSITORY } from '../ports/customer.repository.port';
import { PROPERTY_REPOSITORY } from '../ports/property.repository.port';
import { LeadScoringDomainService } from '../../domain/services/lead-scoring.domain-service';

describe('CreateLeadHandler', () => {
  let handler: CreateLeadHandler;
  let leadRepo: Record<string, jest.Mock>;
  let customerRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };
  let scoringService: { calculate: jest.Mock };

  const baseDto = {
    contact: { firstName: 'John', lastName: 'Doe', phone: '555', email: 'j@d.com', source: 'DOOR_KNOCK' },
    home: { streetAddress: '123 Main', city: 'Austin', state: 'TX', zip: '78701', roofCondition: 'GOOD', hasPool: false, hasEV: false, propertyType: 'RESIDENTIAL' },
    energy: { monthlyBill: 200 },
    design: { designType: 'MANUAL' },
  };

  beforeEach(async () => {
    leadRepo = {
      create: jest.fn().mockResolvedValue({ id: 'lead-1' }),
      findByIdWithRelations: jest.fn().mockResolvedValue({ id: 'lead-1' }),
      findDefaultPipeline: jest.fn().mockResolvedValue({ id: 'pipe-1', isDefault: true }),
      findUserEmailById: jest.fn().mockResolvedValue({ id: 'user-1', email: 'rep@ecoloop.us' }),
      findReferralByInvitee: jest.fn().mockResolvedValue(null),
      createScoreAndAssignments: jest.fn().mockResolvedValue({ designRequest: null }),
    };
    customerRepo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'cust-1' }),
    };
    propertyRepo = {
      create: jest.fn().mockResolvedValue({ id: 'prop-1' }),
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
      update: jest.fn(),
    };
    emitter = { emit: jest.fn() };
    scoringService = {
      calculate: jest.fn().mockReturnValue({
        totalScore: 75,
        roofScore: 80,
        energyScore: 70,
        contactScore: 90,
        propertyScore: 60,
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        CreateLeadHandler,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: CUSTOMER_REPOSITORY, useValue: customerRepo },
        { provide: PROPERTY_REPOSITORY, useValue: propertyRepo },
        { provide: LeadScoringDomainService, useValue: scoringService },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    handler = module.get(CreateLeadHandler);
  });

  it('should create a new customer when none exists', async () => {
    await handler.execute(new CreateLeadCommand(baseDto as any, 'user-1'));

    expect(customerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'John', email: 'j@d.com' }),
    );
  });

  it('should reuse existing customer if found by email', async () => {
    customerRepo.findByEmail.mockResolvedValue({ id: 'existing-cust' });

    await handler.execute(new CreateLeadCommand(baseDto as any, 'user-1'));

    expect(customerRepo.create).not.toHaveBeenCalled();
  });

  it('should throw when no default pipeline exists', async () => {
    leadRepo.findDefaultPipeline.mockResolvedValue(null);

    await expect(
      handler.execute(new CreateLeadCommand(baseDto as any, 'user-1')),
    ).rejects.toThrow(NotFoundException);
  });

  it('should set initial stage to DESIGN_READY for AI_DESIGN', async () => {
    const dto = { ...baseDto, design: { designType: 'AI_DESIGN' } };

    await handler.execute(new CreateLeadCommand(dto as any, 'user-1'));

    expect(leadRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ currentStage: 'DESIGN_READY' }),
    );
  });

  it('should set initial stage to NEW_LEAD for MANUAL design', async () => {
    await handler.execute(new CreateLeadCommand(baseDto as any, 'user-1'));

    expect(leadRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ currentStage: 'NEW_LEAD' }),
    );
  });

  it('should calculate and persist lead score via repository', async () => {
    await handler.execute(new CreateLeadCommand(baseDto as any, 'user-1'));

    expect(scoringService.calculate).toHaveBeenCalled();
    expect(leadRepo.createScoreAndAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        score: expect.objectContaining({ totalScore: 75 }),
      }),
    );
  });

  it('should assign lead to referrer for external users', async () => {
    leadRepo.findUserEmailById.mockResolvedValue({ id: 'ext-user', email: 'ext@gmail.com' });
    leadRepo.findReferralByInvitee.mockResolvedValue({ inviterId: 'referrer-1' });

    await handler.execute(new CreateLeadCommand(baseDto as any, 'ext-user'));

    // Primary assignment should be to the referrer
    expect(leadRepo.createScoreAndAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryOwnerId: 'referrer-1',
        creatorId: 'ext-user',
      }),
    );
  });

  it('should emit lead.created notification event', async () => {
    await handler.execute(new CreateLeadCommand(baseDto as any, 'user-1'));

    expect(emitter.emit).toHaveBeenCalledWith('lead.created', expect.objectContaining({ leadId: 'lead-1' }));
  });
});
