import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { LeadNoteAddedPayload } from '../events/lead-events.types';

@Injectable()
export class LeadNoteService {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly emitter: EventEmitter2,
  ) {}

  async addNote(leadId: string, content: string, userId: string) {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    const activity = await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'NOTE_ADDED',
      description: content,
    });

    const [leadWithCustomer, currentUser] = await Promise.all([
      this.leadRepo.findByIdWithCustomer(leadId),
      this.leadRepo.findUserNameById(userId),
    ]);

    if (!leadWithCustomer || !currentUser) return activity;

    const preview = content.length > 80 ? content.substring(0, 80) + '...' : content;
    const payload: LeadNoteAddedPayload = {
      leadId,
      customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
      addedByName: `${currentUser.firstName} ${currentUser.lastName}`,
      notePreview: preview,
    };
    this.emitter.emit('lead.noteAdded', payload);

    return activity;
  }

  async updateNote(noteId: string, content: string, leadId: string, userId: string) {
    const existing = await this.leadRepo.findActivityByIdAndLead(noteId, leadId, 'NOTE_ADDED');
    if (!existing) throw new NotFoundException('Note not found');

    const oldContent = existing.description;
    const updated = await this.leadRepo.updateActivity(noteId, {
      description: content,
      metadata: { editedAt: new Date().toISOString(), previousContent: oldContent },
    });

    await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'NOTE_ADDED',
      description: `Note edited (was: "${oldContent?.substring(0, 50)}...")`,
      metadata: { action: 'note_edited', noteId, oldContent, newContent: content },
    });

    return updated;
  }

  async deleteNote(noteId: string, leadId: string, userId: string): Promise<{ success: boolean }> {
    const existing = await this.leadRepo.findActivityByIdAndLead(noteId, leadId, 'NOTE_ADDED');
    if (!existing) throw new NotFoundException('Note not found');

    await this.leadRepo.updateActivity(noteId, {
      description: '[deleted]',
      metadata: {
        deleted: true,
        deletedContent: existing.description,
        deletedAt: new Date().toISOString(),
      },
    });

    await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'NOTE_ADDED',
      description: `Note deleted (was: "${existing.description?.substring(0, 50)}...")`,
      metadata: { action: 'note_deleted', noteId, deletedContent: existing.description },
    });

    return { success: true };
  }

  async getNotes(leadId: string) {
    return this.leadRepo.findActivities({
      leadId,
      type: 'NOTE_ADDED',
      orderBy: { createdAt: 'desc' },
    });
  }
}
