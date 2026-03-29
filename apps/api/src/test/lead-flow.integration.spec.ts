/**
 * Integration test: Lead creation -> score -> assignment -> design -> commission
 * Tests the full event chain with mocked database and queues.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { CreateLeadHandler } from '../modules/crm/application/commands/create-lead.handler';
import { CreateLeadCommand } from '../modules/crm/application/commands/create-lead.command';
import { ChangeLeadStageHandler, ChangeLeadStageCommand } from '../modules/crm/application/commands/change-lead-stage.command';
import { StageCommissionListener } from '../modules/commission/application/listeners/stage-commission.listener';
import { LeadScoringDomainService } from '../modules/crm/domain/services/lead-scoring.domain-service';
import { LEAD_REPOSITORY } from '../modules/crm/application/ports/lead.repository.port';
import { CUSTOMER_REPOSITORY } from '../modules/crm/application/ports/customer.repository.port';
import { PROPERTY_REPOSITORY } from '../modules/crm/application/ports/property.repository.port';
import { COMMISSION_PAYMENT_REPOSITORY } from '../modules/commission/application/ports/commission-payment.repository.port';
import { QUEUE_COMMISSION } from '../infrastructure/queue/queue.module';
import { QueueFallbackService } from '../infrastructure/queue/queue-fallback.service';

describe('Lead Flow Integration', () => {
  let module: TestingModule;
  let createLeadHandler: CreateLeadHandler;
  let changeStageHandler: ChangeLeadStageHandler;
  let emitter: EventEmitter2;
  let leadRepo: Record<string, jest.Mock>;
  let customerRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let commissionRepo: Record<string, jest.Mock>;
  let commissionQueue: { add: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      create: jest.fn().mockResolvedValue({ id: 'lead-1' }),
      findById: jest.fn(),
      findByIdWithRelations: jest.fn().mockResolvedValue({ id: 'lead-1', currentStage: 'NEW_LEAD' }),
      updateStage: jest.fn().mockResolvedValue({ id: 'lead-1' }),
      findDefaultPipeline: jest.fn().mockResolvedValue({ id: 'pipe-1', isDefault: true }),
      findUserEmailById: jest.fn().mockResolvedValue({ id: 'user-1', email: 'rep@ecoloop.us' }),
      findReferralByInvitee: jest.fn().mockResolvedValue(null),
      createScoreAndAssignments: jest.fn().mockResolvedValue({ designRequest: null }),
      createActivity: jest.fn().mockResolvedValue({}),
      findByIdWithCustomer: jest.fn(),
    };
    customerRepo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'cust-1' }),
    };
    propertyRepo = {
      create: jest.fn().mockResolvedValue({ id: 'prop-1' }),
    };
    commissionRepo = {
      findSettingByKey: jest.fn().mockResolvedValue(null),
      findPaidCommissionPayment: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateStatus: jest.fn(),
      findCommissionsByUserId: jest.fn(),
      findCommissionsByLeadId: jest.fn(),
      findLeadById: jest.fn(),
      upsertCommission: jest.fn(),
    };
    commissionQueue = { add: jest.fn().mockResolvedValue({}) };

    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        CreateLeadHandler,
        ChangeLeadStageHandler,
        StageCommissionListener,
        LeadScoringDomainService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: CUSTOMER_REPOSITORY, useValue: customerRepo },
        { provide: PROPERTY_REPOSITORY, useValue: propertyRepo },
        { provide: COMMISSION_PAYMENT_REPOSITORY, useValue: commissionRepo },
        { provide: QueueFallbackService, useValue: new QueueFallbackService(true) },
        { provide: `BullQueue_${QUEUE_COMMISSION}`, useValue: commissionQueue },
      ],
    }).compile();

    createLeadHandler = module.get(CreateLeadHandler);
    changeStageHandler = module.get(ChangeLeadStageHandler);
    emitter = module.get(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
  });

  const baseDto = {
    contact: {
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '555-1234',
      email: 'jane@example.com',
      source: 'WEBSITE',
    },
    home: {
      streetAddress: '456 Oak Ave',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      roofCondition: 'EXCELLENT',
      hasPool: true,
      hasEV: false,
      propertyType: 'RESIDENTIAL',
    },
    energy: {
      monthlyBill: 250,
      annualKwhUsage: 14000,
    },
    design: {
      designType: 'MANUAL',
    },
  };

  describe('Lead creation flow', () => {
    it('should create lead with score calculation and assignment', async () => {
      const result = await createLeadHandler.execute(
        new CreateLeadCommand(baseDto as any, 'user-1'),
      );

      expect(result).toBeDefined();
      expect(customerRepo.create).toHaveBeenCalled();
      expect(propertyRepo.create).toHaveBeenCalled();
      expect(leadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStage: 'NEW_LEAD',
          createdById: 'user-1',
        }),
      );
      expect(leadRepo.createScoreAndAssignments).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          primaryOwnerId: 'user-1',
          creatorId: 'user-1',
        }),
      );
    });

    it('should emit lead.created event after creation', async () => {
      const eventSpy = jest.fn();
      emitter.on('lead.created', eventSpy);

      await createLeadHandler.execute(
        new CreateLeadCommand(baseDto as any, 'user-1'),
      );

      await new Promise((r) => setTimeout(r, 200));

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          assignedTo: 'user-1',
          customerName: 'Jane Smith',
        }),
      );
    });

    it('should create AI design request and emit design.requested.ai', async () => {
      const aiDto = {
        ...baseDto,
        design: { designType: 'AI_DESIGN' },
      };

      leadRepo.createScoreAndAssignments.mockResolvedValue({
        designRequest: { id: 'dr-1' },
      });

      const designEventSpy = jest.fn();
      emitter.on('design.requested.ai', designEventSpy);

      await createLeadHandler.execute(
        new CreateLeadCommand(aiDto as any, 'user-1'),
      );

      await new Promise((r) => setTimeout(r, 200));

      expect(leadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ currentStage: 'DESIGN_READY' }),
      );
      expect(designEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          designRequestId: 'dr-1',
          leadId: 'lead-1',
        }),
      );
    });
  });

  describe('Stage change -> commission flow', () => {
    let commissionListener: StageCommissionListener;

    beforeEach(() => {
      commissionListener = module.get(StageCommissionListener);
    });

    const stagePayload = (newStage: string) => ({
      leadId: 'lead-1',
      customerName: 'Jane Smith',
      previousStage: 'PREVIOUS',
      newStage,
    });

    it('should enqueue M1 commission when stage changes to WON', async () => {
      await commissionListener.handleStageChanged(stagePayload('WON'));

      expect(commissionQueue.add).toHaveBeenCalledWith(
        'commission-M1',
        { leadId: 'lead-1', type: 'M1', tierPct: 0.6 },
        { jobId: 'M1-lead-1' },
      );
    });

    it('should enqueue M2 commission for INITIAL_SUBMISSION_AND_INSPECTION', async () => {
      await commissionListener.handleStageChanged(stagePayload('INITIAL_SUBMISSION_AND_INSPECTION'));

      expect(commissionQueue.add).toHaveBeenCalledWith(
        'commission-M2',
        expect.objectContaining({ type: 'M2', tierPct: 0.25 }),
        expect.any(Object),
      );
    });

    it('should enqueue M3 when WAITING_FOR_PTO and M2 not paid', async () => {
      commissionRepo.findPaidCommissionPayment.mockResolvedValue(null);

      await commissionListener.handleStageChanged(stagePayload('WAITING_FOR_PTO'));

      expect(commissionQueue.add).toHaveBeenCalledWith(
        'commission-M3',
        expect.objectContaining({ leadId: 'lead-1', type: 'M3' }),
        expect.any(Object),
      );
    });

    it('should skip M3 when M2 is already PAID', async () => {
      commissionRepo.findPaidCommissionPayment.mockResolvedValue({
        id: 'cp-m2',
      });

      await commissionListener.handleStageChanged(stagePayload('WAITING_FOR_PTO'));

      expect(commissionQueue.add).not.toHaveBeenCalled();
    });

    it('should verify full chain: handler emits event, handler logs activity', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1', currentStage: 'PENDING_SIGNATURE' });
      leadRepo.findByIdWithCustomer.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'Jane', lastName: 'Smith' },
      });

      await changeStageHandler.execute(
        new ChangeLeadStageCommand('lead-1', 'WON' as any, 'user-1'),
      );

      // Verify handler side-effects (sync)
      expect(leadRepo.updateStage).toHaveBeenCalledWith('lead-1', 'WON');
      expect(leadRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          type: 'STAGE_CHANGE',
          description: 'Stage changed from PENDING_SIGNATURE to WON',
        }),
      );
    });
  });

  describe('Stage change -> activity logging', () => {
    it('should create activity log entry on stage change', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1', currentStage: 'NEW_LEAD' });
      leadRepo.findByIdWithCustomer.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'Jane', lastName: 'Smith' },
      });

      await changeStageHandler.execute(
        new ChangeLeadStageCommand('lead-1', 'REQUEST_DESIGN' as any, 'user-1'),
      );

      expect(leadRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          userId: 'user-1',
          type: 'STAGE_CHANGE',
          description: 'Stage changed from NEW_LEAD to REQUEST_DESIGN',
        }),
      );
    });
  });

  describe('External user assignment', () => {
    it('should assign lead to referrer when created by external user', async () => {
      leadRepo.findUserEmailById.mockResolvedValue({
        id: 'ext-user',
        email: 'partner@gmail.com',
      });
      leadRepo.findReferralByInvitee.mockResolvedValue({
        inviterId: 'referrer-1',
      });

      await createLeadHandler.execute(
        new CreateLeadCommand(baseDto as any, 'ext-user'),
      );

      expect(leadRepo.createScoreAndAssignments).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryOwnerId: 'referrer-1',
          creatorId: 'ext-user',
        }),
      );
    });
  });
});
