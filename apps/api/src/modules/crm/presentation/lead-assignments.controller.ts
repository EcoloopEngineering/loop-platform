import {
  Controller,
  Post,
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
import { LeadAssignmentService } from '../application/services/lead-assignment.service';

@ApiTags('Lead Assignments')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadAssignmentsController {
  constructor(private readonly leadAssignmentService: LeadAssignmentService) {}

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign a user to a lead' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId', ParseUUIDPipe) assigneeId: string,
    @Body('splitPct') splitPct: number,
    @Body('isPrimary') isPrimary: boolean,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.leadAssignmentService.setAssignments(
      id,
      { assigneeId, splitPct, isPrimary },
      userId,
    );
  }

  @Post(':id/assign-pm')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign or remove a Project Manager from a lead' })
  async assignPM(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('projectManagerId') pmId: string | null,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.leadAssignmentService.setPm(id, pmId, userId);
  }
}
