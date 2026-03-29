import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadNoteService } from './lead-note.service';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('LeadNoteService', () => {
  let service: LeadNoteService;
  let leadRepo: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      findById: jest.fn(),
      createActivity: jest.fn(),
      findActivityByIdAndLead: jest.fn(),
      updateActivity: jest.fn(),
      findActivities: jest.fn(),
      findByIdWithCustomer: jest.fn(),
      findUserNameById: jest.fn(),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadNoteService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(LeadNoteService);
  });

  describe('addNote', () => {
    it('should create note activity and emit event', async () => {
      leadRepo.findById.mockResolvedValue({ id: 'lead-1' });
      leadRepo.createActivity.mockResolvedValue({ id: 'activity-1', description: 'Test note' });
      leadRepo.findByIdWithCustomer.mockResolvedValue({
        id: 'lead-1',
        customer: { firstName: 'John', lastName: 'Doe' },
      });
      leadRepo.findUserNameById.mockResolvedValue({ firstName: 'Agent', lastName: 'Smith' });

      const result = await service.addNote('lead-1', 'Test note', 'user-1');

      expect(leadRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          type: 'NOTE_ADDED',
          description: 'Test note',
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
      leadRepo.createActivity.mockResolvedValue({ id: 'activity-1', description: 'Test' });
      leadRepo.findByIdWithCustomer.mockResolvedValue(null);
      leadRepo.findUserNameById.mockResolvedValue(null);

      const result = await service.addNote('lead-1', 'Test', 'user-1');

      expect(emitter.emit).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'activity-1', description: 'Test' });
    });
  });

  describe('updateNote', () => {
    it('should update note content and log edit activity', async () => {
      leadRepo.findActivityByIdAndLead.mockResolvedValue({
        id: 'note-1',
        leadId: 'lead-1',
        type: 'NOTE_ADDED',
        description: 'Old content',
      });
      leadRepo.updateActivity.mockResolvedValue({ id: 'note-1', description: 'New content' });
      leadRepo.createActivity.mockResolvedValue({});

      const result = await service.updateNote('note-1', 'New content', 'lead-1', 'user-1');

      expect(leadRepo.updateActivity).toHaveBeenCalledWith(
        'note-1',
        expect.objectContaining({ description: 'New content' }),
      );
      expect(leadRepo.createActivity).toHaveBeenCalled();
      expect(result).toEqual({ id: 'note-1', description: 'New content' });
    });

    it('should throw NotFoundException when note not found', async () => {
      leadRepo.findActivityByIdAndLead.mockResolvedValue(null);
      await expect(service.updateNote('bad-id', 'content', 'lead-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteNote', () => {
    it('should soft-delete note and log deletion', async () => {
      leadRepo.findActivityByIdAndLead.mockResolvedValue({
        id: 'note-1',
        leadId: 'lead-1',
        type: 'NOTE_ADDED',
        description: 'Original content',
      });
      leadRepo.updateActivity.mockResolvedValue({});
      leadRepo.createActivity.mockResolvedValue({});

      const result = await service.deleteNote('note-1', 'lead-1', 'user-1');

      expect(leadRepo.updateActivity).toHaveBeenCalledWith(
        'note-1',
        expect.objectContaining({ description: '[deleted]' }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when note not found', async () => {
      leadRepo.findActivityByIdAndLead.mockResolvedValue(null);
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
      leadRepo.findActivities.mockResolvedValue(notes);

      const result = await service.getNotes('lead-1');

      expect(leadRepo.findActivities).toHaveBeenCalledWith({
        leadId: 'lead-1',
        type: 'NOTE_ADDED',
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(notes);
    });
  });
});
