import {
  Controller,
  Post,
  Put,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@loop/shared';
import { LeadNoteService } from '../application/services/lead-note.service';

@ApiTags('Lead Notes')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadNotesController {
  constructor(private readonly leadNoteService: LeadNoteService) {}

  @Post(':id/notes')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Add a note to lead' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.leadNoteService.addNote(id, content, userId);
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
    return this.leadNoteService.updateNote(noteId, content, id, userId);
  }

  @Patch(':id/notes/:noteId/delete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Delete a note from lead (soft — logged in activity)' })
  async deleteNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    return this.leadNoteService.deleteNote(noteId, id, userId);
  }
}
