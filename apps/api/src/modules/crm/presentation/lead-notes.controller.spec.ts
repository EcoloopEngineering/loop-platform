import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeadNotesController } from './lead-notes.controller';
import { LeadNoteService } from '../application/services/lead-note.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('LeadNotesController', () => {
  let controller: LeadNotesController;
  let leadNoteService: Record<string, jest.Mock>;

  beforeEach(async () => {
    leadNoteService = {
      addNote: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
      getNotes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadNotesController],
      providers: [{ provide: LeadNoteService, useValue: leadNoteService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(LeadNotesController);
  });

  describe('addNote', () => {
    it('should delegate to LeadNoteService.addNote', async () => {
      leadNoteService.addNote.mockResolvedValue({ id: 'activity-1', description: 'Test note' });

      const result = await controller.addNote('lead-1', 'Test note', 'user-1');

      expect(leadNoteService.addNote).toHaveBeenCalledWith('lead-1', 'Test note', 'user-1');
      expect(result).toEqual({ id: 'activity-1', description: 'Test note' });
    });

    it('should propagate NotFoundException from service', async () => {
      leadNoteService.addNote.mockRejectedValue(new NotFoundException('Lead not found'));
      await expect(controller.addNote('bad-id', 'note', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('editNote', () => {
    it('should delegate to LeadNoteService.updateNote', async () => {
      leadNoteService.updateNote.mockResolvedValue({ id: 'note-1', description: 'New content' });

      const result = await controller.editNote('lead-1', 'note-1', 'New content', 'user-1');

      expect(leadNoteService.updateNote).toHaveBeenCalledWith(
        'note-1',
        'New content',
        'lead-1',
        'user-1',
      );
      expect(result).toEqual({ id: 'note-1', description: 'New content' });
    });

    it('should propagate NotFoundException from service', async () => {
      leadNoteService.updateNote.mockRejectedValue(new NotFoundException('Note not found'));
      await expect(
        controller.editNote('lead-1', 'bad-id', 'content', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNote', () => {
    it('should delegate to LeadNoteService.deleteNote', async () => {
      leadNoteService.deleteNote.mockResolvedValue({ success: true });

      const result = await controller.deleteNote('lead-1', 'note-1', 'user-1');

      expect(leadNoteService.deleteNote).toHaveBeenCalledWith('note-1', 'lead-1', 'user-1');
      expect(result).toEqual({ success: true });
    });

    it('should propagate NotFoundException from service', async () => {
      leadNoteService.deleteNote.mockRejectedValue(new NotFoundException('Note not found'));
      await expect(controller.deleteNote('lead-1', 'bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
