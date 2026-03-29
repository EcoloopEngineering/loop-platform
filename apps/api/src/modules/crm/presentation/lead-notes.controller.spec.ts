import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadNotesController } from './lead-notes.controller';
import { LEAD_REPOSITORY } from '../application/ports/lead.repository.port';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';

describe('LeadNotesController', () => {
  let controller: LeadNotesController;
  let leadRepo: Record<string, jest.Mock>;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = { findById: jest.fn() };
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadNotesController],
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

    controller = module.get(LeadNotesController);
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
      expect(result).toEqual({ id: 'activity-1', description: 'Test note' });
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(controller.addNote('bad-id', 'note', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('editNote', () => {
    it('should update note content and log edit activity', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue({
        id: 'note-1',
        leadId: 'lead-1',
        type: 'NOTE_ADDED',
        description: 'Old content',
      });
      prisma.leadActivity.update.mockResolvedValue({ id: 'note-1', description: 'New content' });
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await controller.editNote('lead-1', 'note-1', 'New content', 'user-1');

      expect(prisma.leadActivity.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'note-1' } }),
      );
      expect(prisma.leadActivity.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when note not found', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue(null);
      await expect(controller.editNote('lead-1', 'bad-id', 'content', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNote', () => {
    it('should soft-delete note and log deletion', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue({
        id: 'note-1',
        leadId: 'lead-1',
        type: 'NOTE_ADDED',
        description: 'Original content',
      });
      prisma.leadActivity.update.mockResolvedValue({});
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await controller.deleteNote('lead-1', 'note-1', 'user-1');

      expect(prisma.leadActivity.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ description: '[deleted]' }) }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when note not found', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue(null);
      await expect(controller.deleteNote('lead-1', 'bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
