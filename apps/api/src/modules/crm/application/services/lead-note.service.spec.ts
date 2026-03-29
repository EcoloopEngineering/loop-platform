import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadNoteService } from './lead-note.service';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('LeadNoteService', () => {
  let service: LeadNoteService;
  let leadRepo: Record<string, jest.Mock>;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = { findById: jest.fn() };
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadNoteService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(LeadNoteService);
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

      const result = await service.addNote('lead-1', 'Test note', 'user-1');

      expect(prisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'lead-1',
            type: 'NOTE_ADDED',
            description: 'Test note',
          }),
        }),
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        'lead.noteAdded',
        expect.objectContaining({
          leadId: 'lead-1',
          customerName: 'John Doe',
          addedByName: 'Agent Smith',
          notePreview: 'Test note',
        }),
      );
      expect(result).toEqual({ id: 'activity-1', description: 'Test note' });
    });

    it('should throw NotFoundException when lead not found', async () => {
      leadRepo.findById.mockResolvedValue(null);
      await expect(service.addNote('bad-id', 'note', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should skip event emission when lead or user lookup fails', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      prisma.leadActivity.create.mockResolvedValue({ id: 'activity-1', description: 'Test' });
      prisma.lead.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.addNote('lead-1', 'Test', 'user-1');

      expect(emitter.emit).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'activity-1', description: 'Test' });
    });
  });

  describe('updateNote', () => {
    it('should update note content and log edit activity', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue({
        id: 'note-1',
        leadId: 'lead-1',
        type: 'NOTE_ADDED',
        description: 'Old content',
      });
      prisma.leadActivity.update.mockResolvedValue({ id: 'note-1', description: 'New content' });
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await service.updateNote('note-1', 'New content', 'lead-1', 'user-1');

      expect(prisma.leadActivity.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'note-1' } }),
      );
      expect(prisma.leadActivity.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'note-1', description: 'New content' });
    });

    it('should throw NotFoundException when note not found', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue(null);
      await expect(service.updateNote('bad-id', 'content', 'lead-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
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

      const result = await service.deleteNote('note-1', 'lead-1', 'user-1');

      expect(prisma.leadActivity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: '[deleted]' }),
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when note not found', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue(null);
      await expect(service.deleteNote('bad-id', 'lead-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getNotes', () => {
    it('should return notes for a lead ordered by createdAt desc', async () => {
      const notes = [
        { id: 'n1', description: 'Note 1', createdAt: new Date() },
        { id: 'n2', description: 'Note 2', createdAt: new Date() },
      ];
      prisma.leadActivity.findMany.mockResolvedValue(notes);

      const result = await service.getNotes('lead-1');

      expect(prisma.leadActivity.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1', type: 'NOTE_ADDED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(notes);
    });
  });
});
