import {
  Controller,
  Post,
  Put,
  Patch,
  Param,
  Body,
  UseGuards,
  Inject,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@loop/shared';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../application/ports/lead.repository.port';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LeadNoteAddedPayload } from '../application/events/lead-events.types';

@ApiTags('Lead Notes')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadNotesController {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @Post(':id/notes')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Add a note to lead' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const lead = await this.leadRepo.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');

    const activity = await this.prisma.leadActivity.create({
      data: { leadId: id, userId, type: 'NOTE_ADDED', description: content },
    });

    const [leadWithCustomer, currentUser] = await Promise.all([
      this.prisma.lead.findUnique({
        where: { id },
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    if (leadWithCustomer && currentUser) {
      const preview = content.length > 80 ? content.substring(0, 80) + '...' : content;
      const payload: LeadNoteAddedPayload = {
        leadId: id,
        customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
        addedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        notePreview: preview,
      };
      this.emitter.emit('lead.noteAdded', payload);
    }

    return activity;
  }

  @Put(':id/notes/:noteId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Edit a note on lead' })
  async editNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body('content') content: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const existing = await this.prisma.leadActivity.findFirst({
      where: { id: noteId, leadId: id, type: 'NOTE_ADDED' },
    });
    if (!existing) throw new NotFoundException('Note not found');

    const oldContent = existing.description;
    const updated = await this.prisma.leadActivity.update({
      where: { id: noteId },
      data: {
        description: content,
        metadata: { editedAt: new Date().toISOString(), previousContent: oldContent },
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'NOTE_ADDED',
        description: `Note edited (was: "${oldContent?.substring(0, 50)}...")`,
        metadata: { action: 'note_edited', noteId, oldContent, newContent: content },
      },
    });

    return updated;
  }

  @Patch(':id/notes/:noteId/delete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Delete a note from lead (soft — logged in activity)' })
  async deleteNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.leadActivity.findFirst({
      where: { id: noteId, leadId: id, type: 'NOTE_ADDED' },
    });
    if (!existing) throw new NotFoundException('Note not found');

    await this.prisma.leadActivity.update({
      where: { id: noteId },
      data: {
        description: '[deleted]',
        metadata: {
          deleted: true,
          deletedContent: existing.description,
          deletedAt: new Date().toISOString(),
        },
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'NOTE_ADDED',
        description: `Note deleted (was: "${existing.description?.substring(0, 50)}...")`,
        metadata: { action: 'note_deleted', noteId, deletedContent: existing.description },
      },
    });

    return { success: true };
  }
}
