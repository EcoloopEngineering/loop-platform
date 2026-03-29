import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadAssignmentsController } from './lead-assignments.controller';
import { LEAD_REPOSITORY } from '../application/ports/lead.repository.port';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';

describe('LeadAssignmentsController', () => {
  let controller: LeadAssignmentsController;
  let leadRepo: Record<string, jest.Mock>;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = { findById: jest.fn() };
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadAssignmentsController],
      providers: [
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(LeadAssignmentsController);
  });

  describe('assign', () => {
    it('should upsert assignment and emit event', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      prisma.leadAssignment.upsert.mockResolvedValue({ leadId: 'lead-1', userId: 'user-2', isPrimary: true });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      const result = await controller.assign('lead-1', 'user-2', 100, true, 'manager-1');

      expect(prisma.leadAssignment.upsert).toHaveBeenCalled();
      expect(emitter.emit).toHaveBeenCalledWith('lead.assigned', expect.objectContaining({ assigneeId: 'user-2' }));
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(controller.assign('bad-id', 'user-2', 100, true, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignPM', () => {
    it('should assign PM and emit pmAssigned event', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: null });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        projectManager: { firstName: 'PM', lastName: 'One' },
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      await controller.assignPM('lead-1', 'pm-1', 'user-1');

      expect(emitter.emit).toHaveBeenCalledWith('lead.pmAssigned', expect.objectContaining({ pmId: 'pm-1' }));
    });

    it('should emit pmRemoved when PM is removed', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: 'pm-old' });
      prisma.lead.update.mockResolvedValue({
        id: 'lead-1',
        projectManager: null,
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      prisma.leadActivity.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Manager', lastName: 'One' });

      await controller.assignPM('lead-1', null, 'user-1');

      expect(emitter.emit).toHaveBeenCalledWith('lead.pmRemoved', expect.objectContaining({ pmId: 'pm-old' }));
    });
  });
});
