import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadAssignmentService } from './lead-assignment.service';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('LeadAssignmentService', () => {
  let service: LeadAssignmentService;
  let leadRepo: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      findById: jest.fn(),
      findAssignments: jest.fn(),
      upsertAssignment: jest.fn(),
      createActivity: jest.fn(),
      findByIdWithCustomer: jest.fn(),
      findUserNameById: jest.fn(),
      updatePm: jest.fn(),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadAssignmentService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(LeadAssignmentService);
  });

  describe('getAssignments', () => {
    it('should return assignments for a lead', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      const assignments = [{ leadId: 'lead-1', userId: 'user-1' }];
      leadRepo.findAssignments.mockResolvedValue(assignments);

      const result = await service.getAssignments('lead-1');

      expect(result).toEqual(assignments);
      expect(leadRepo.findAssignments).toHaveBeenCalledWith('lead-1');
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(service.getAssignments('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setAssignments', () => {
    it('should upsert assignment and emit lead.assigned event', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      leadRepo.upsertAssignment.mockResolvedValue({ leadId: 'lead-1', userId: 'user-2', isPrimary: true });
      leadRepo.createActivity.mockResolvedValue({});
      leadRepo.findByIdWithCustomer.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      leadRepo.findUserNameById.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      const result = await service.setAssignments(
        'lead-1',
        { assigneeId: 'user-2', splitPct: 100, isPrimary: true },
        'manager-1',
      );

      expect(leadRepo.upsertAssignment).toHaveBeenCalledWith({
        leadId: 'lead-1',
        userId: 'user-2',
        splitPct: 100,
        isPrimary: true,
      });
      expect(leadRepo.createActivity).toHaveBeenCalled();
      expect(emitter.emit).toHaveBeenCalledWith(
        'lead.assigned',
        expect.objectContaining({ leadId: 'lead-1', assigneeId: 'user-2', isPrimary: true }),
      );
      expect(result).toEqual({ leadId: 'lead-1', userId: 'user-2', isPrimary: true });
    });

    it('should not emit event when lead or user not found for enrichment', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      leadRepo.upsertAssignment.mockResolvedValue({ leadId: 'lead-1', userId: 'user-2' });
      leadRepo.createActivity.mockResolvedValue({});
      leadRepo.findByIdWithCustomer.mockResolvedValue(null);
      leadRepo.findUserNameById.mockResolvedValue(null);

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
      leadRepo.findById.mockResolvedValue({ id: 'lead-1', projectManagerId: null });
      leadRepo.updatePm.mockResolvedValue({
        id: 'lead-1',
        projectManagerId: 'pm-1',
        projectManager: { firstName: 'PM', lastName: 'One' },
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      leadRepo.createActivity.mockResolvedValue({});
      leadRepo.findUserNameById.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      await service.setPm('lead-1', 'pm-1', 'user-1');

      expect(emitter.emit).toHaveBeenCalledWith(
        'lead.pmAssigned',
        expect.objectContaining({ pmId: 'pm-1', leadId: 'lead-1' }),
      );
    });

    it('should emit lead.pmRemoved when PM is removed', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1', projectManagerId: 'pm-old' });
      leadRepo.updatePm.mockResolvedValue({
        id: 'lead-1',
        projectManagerId: null,
        projectManager: null,
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      leadRepo.createActivity.mockResolvedValue({});
      leadRepo.findUserNameById.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      await service.setPm('lead-1', null, 'user-1');

      expect(emitter.emit).toHaveBeenCalledWith(
        'lead.pmRemoved',
        expect.objectContaining({ pmId: 'pm-old', leadId: 'lead-1' }),
      );
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);

      await expect(service.setPm('bad-id', 'pm-1', 'user-1')).rejects.toThrow(NotFoundException);
      expect(leadRepo.updatePm).not.toHaveBeenCalled();
    });

    it('should not emit event when current user not found', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1', projectManagerId: null });
      leadRepo.updatePm.mockResolvedValue({
        id: 'lead-1',
        projectManagerId: 'pm-1',
        projectManager: { firstName: 'PM', lastName: 'One' },
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      leadRepo.createActivity.mockResolvedValue({});
      leadRepo.findUserNameById.mockResolvedValue(null);

      const result = await service.setPm('lead-1', 'pm-1', 'user-1');

      expect(emitter.emit).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
