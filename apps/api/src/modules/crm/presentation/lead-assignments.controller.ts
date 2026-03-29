import {
  Controller,
  Post,
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
import { LeadAssignedPayload, LeadPmAssignedPayload, LeadPmRemovedPayload } from '../application/events/lead-events.types';

@ApiTags('Lead Assignments')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadAssignmentsController {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

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
    const lead = await this.leadRepo.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');

    const assignment = await this.prisma.leadAssignment.upsert({
      where: { leadId_userId: { leadId: id, userId: assigneeId } },
      update: { splitPct: splitPct ?? 100, isPrimary: isPrimary ?? false },
      create: { leadId: id, userId: assigneeId, splitPct: splitPct ?? 100, isPrimary: isPrimary ?? false },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'ASSIGNMENT_CHANGED',
        description: `User ${assigneeId} assigned to lead`,
        metadata: { assigneeId, splitPct, isPrimary },
      },
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
      const payload: LeadAssignedPayload = {
        leadId: id,
        assigneeId,
        customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
        assignedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        isPrimary: isPrimary ?? false,
      };
      this.emitter.emit('lead.assigned', payload);
    }

    return assignment;
  }

  @Post(':id/assign-pm')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign or remove a Project Manager from a lead' })
  async assignPM(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('projectManagerId') pmId: string | null,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const previousLead = await this.prisma.lead.findUnique({
      where: { id },
      select: { projectManagerId: true },
    });

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { projectManagerId: pmId || null },
      include: {
        projectManager: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    const desc = pmId
      ? `Project Manager assigned: ${lead.projectManager?.firstName} ${lead.projectManager?.lastName}`
      : 'Project Manager removed';

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'ASSIGNMENT_CHANGED',
        description: desc,
        metadata: { projectManagerId: pmId },
      },
    });

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const customerName = `${lead.customer.firstName} ${lead.customer.lastName}`;

    if (currentUser) {
      if (pmId) {
        const payload: LeadPmAssignedPayload = {
          leadId: id,
          pmId,
          pmName: `${lead.projectManager?.firstName} ${lead.projectManager?.lastName}`,
          customerName,
          assignedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        };
        this.emitter.emit('lead.pmAssigned', payload);
      } else if (previousLead?.projectManagerId) {
        const payload: LeadPmRemovedPayload = {
          leadId: id,
          pmId: previousLead.projectManagerId,
          customerName,
          removedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        };
        this.emitter.emit('lead.pmRemoved', payload);
      }
    }

    return lead;
  }
}
