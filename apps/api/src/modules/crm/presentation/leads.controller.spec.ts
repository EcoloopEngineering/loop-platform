import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus, EventBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadsController } from './leads.controller';
import { LEAD_REPOSITORY } from '../application/ports/lead.repository.port';
import { LeadScoringDomainService } from '../domain/services/lead-scoring.domain-service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';

describe('LeadsController', () => {
  let controller: LeadsController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let eventBus: { publish: jest.Mock };
  let leadRepo: Record<string, jest.Mock>;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };
  let scoringService: { calculate: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    eventBus = { publish: jest.fn() };
    leadRepo = {
      findById: jest.fn(),
      findByIdWithRelations: jest.fn(),
      update: jest.fn(),
      updateStage: jest.fn(),
    };
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };
    scoringService = { calculate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: EventBus, useValue: eventBus },
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: LeadScoringDomainService, useValue: scoringService },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LeadsController>(LeadsController);
  });

  describe('create', () => {
    it('should execute CreateLeadCommand via command bus', async () => {
      const dto = { firstName: 'John', lastName: 'Doe' } as any;
      commandBus.execute.mockResolvedValue({ id: 'lead-1' });

      const result = await controller.create(dto, 'user-1');

      expect(commandBus.execute).toHaveBeenCalled();
      expect(result).toEqual({ id: 'lead-1' });
    });
  });

  describe('list', () => {
    it('should execute ListLeadsQuery via query bus', async () => {
      const filter = { page: 1, limit: 10 } as any;
      queryBus.execute.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.list(filter);

      expect(queryBus.execute).toHaveBeenCalled();
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findOne', () => {
    it('should return lead with relations', async () => {
      const lead = { id: 'lead-1', customer: { firstName: 'John' } };
      leadRepo.findByIdWithRelations.mockResolvedValue(lead);

      const result = await controller.findOne('lead-1');
      expect(result).toEqual(lead);
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findByIdWithRelations.mockResolvedValue(null);
      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update lead and emit event', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      leadRepo.update.mockResolvedValue({ id: 'lead-1', source: 'WEB' });
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Agent', lastName: 'Smith' });

      const result = await controller.update('lead-1', { source: 'WEB' }, 'user-1');

      expect(leadRepo.update).toHaveBeenCalledWith('lead-1', { source: 'WEB' });
      expect(emitter.emit).toHaveBeenCalledWith('lead.updated', expect.any(Object));
      expect(result).toEqual({ id: 'lead-1', source: 'WEB' });
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(controller.update('bad-id', {}, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMetadata', () => {
    it('should merge metadata and log activity', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        metadata: { existingKey: 'old' },
      });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        metadata: { existingKey: 'old', newKey: 'new' },
      });
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await controller.updateMetadata('lead-1', { newKey: 'new' }, 'user-1');

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { metadata: { existingKey: 'old', newKey: 'new' } },
      });
    });

    it('should throw NotFoundException when lead not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(controller.updateMetadata('bad-id', {}, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeStage', () => {
    it('should update stage, log activity, and publish event', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1', currentStage: 'NEW_LEAD' });
      leadRepo.updateStage.mockResolvedValue({ id: 'lead-1', currentStage: 'DESIGN_READY' });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'John', lastName: 'Doe' },
      });

      const result = await controller.changeStage('lead-1', 'DESIGN_READY' as any, 'user-1');

      expect(leadRepo.updateStage).toHaveBeenCalledWith('lead-1', 'DESIGN_READY');
      expect(eventBus.publish).toHaveBeenCalled();
      expect(emitter.emit).toHaveBeenCalledWith('lead.stageChanged', expect.any(Object));
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(controller.changeStage('bad-id', 'WON' as any, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addNote', () => {
    it('should create note activity and emit event', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      prisma.leadActivity.create.mockResolvedValue({ id: 'activity-1', description: 'Test note' });
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Agent', lastName: 'Smith' });

      const result = await controller.addNote('lead-1', 'Test note', 'user-1');

      expect(prisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'lead-1',
            type: 'NOTE_ADDED',
            description: 'Test note',
          }),
        }),
      );
      expect(emitter.emit).toHaveBeenCalledWith('lead.noteAdded', expect.any(Object));
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(controller.addNote('bad-id', 'note', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
