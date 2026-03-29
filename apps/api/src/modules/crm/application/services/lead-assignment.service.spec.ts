import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadAssignmentService } from './lead-assignment.service';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('LeadAssignmentService', () => {
  let service: LeadAssignmentService;
  let leadRepo: Record<string, jest.Mock>;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = { findById: jest.fn() };
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadAssignmentService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(LeadAssignmentService);
  });

  describe('getAssignments', () => {
    it('should return assignments for a lead', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      const assignments = [{ leadId: 'lead-1', userId: 'user-1' }];
      prisma.leadAssignment.findMany.mockResolvedValue(assignments);

      const result = await service.getAssignments('lead-1');

      expect(result).toEqual(assignments);
      expect(prisma.leadAssignment.findMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } });
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(service.getAssignments('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setAssignments', () => {
    it('should upsert assignment and emit lead.assigned event', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      prisma.leadAssignment.upsert.mockResolvedValue({ leadId: 'lead-1', userId: 'user-2', isPrimary: true });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      const result = await service.setAssignments(
        'lead-1',
        { assigneeId: 'user-2', splitPct: 100, isPrimary: true },
        'manager-1',
      );

      expect(prisma.leadAssignment.upsert).toHaveBeenCalled();
      expect(prisma.leadActivity.create).toHaveBeenCalled();
      expect(emitter.emit).toHaveBeenCalledWith(
        'lead.assigned',
        expect.objectContaining({ leadId: 'lead-1', assigneeId: 'user-2', isPrimary: true }),
      );
      expect(result).toEqual({ leadId: 'lead-1', userId: 'user-2', isPrimary: true });
    });

    it('should not emit event when lead or user not found for enrichment', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      prisma.leadAssignment.upsert.mockResolvedValue({ leadId: 'lead-1', userId: 'user-2' });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.lead.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await service.setAssignments('lead-1', { assigneeId: 'user-2' }, 'manager-1');

      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(
        service.setAssignments('bad-id', { assigneeId: 'user-2' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setPm', () => {
    it('should assign PM and emit lead.pmAssigned event', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: null });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        projectManager: { firstName: 'PM', lastName: 'One' },
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      await service.setPm('lead-1', 'pm-1', 'user-1');

      expect(emitter.emit).toHaveBeenCalledWith(
        'lead.pmAssigned',
        expect.objectContaining({ pmId: 'pm-1', leadId: 'lead-1' }),
      );
    });

    it('should emit lead.pmRemoved when PM is removed', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: 'pm-old' });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        projectManager: null,
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      await service.setPm('lead-1', null, 'user-1');

      expect(emitter.emit).toHaveBeenCalledWith(
        'lead.pmRemoved',
        expect.objectContaining({ pmId: 'pm-old', leadId: 'lead-1' }),
      );
    });

    it('should throw NotFoundException when lead not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.setPm('bad-id', 'pm-1', 'user-1')).rejects.toThrow(NotFoundException);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('should not emit event when current user not found', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: null });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        projectManager: { firstName: 'PM', lastName: 'One' },
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.setPm('lead-1', 'pm-1', 'user-1');

      expect(emitter.emit).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
