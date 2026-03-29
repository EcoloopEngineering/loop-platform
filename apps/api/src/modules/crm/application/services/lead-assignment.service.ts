import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import {
  LeadAssignedPayload,
  LeadPmAssignedPayload,
  LeadPmRemovedPayload,
} from '../events/lead-events.types';

@Injectable()
export class LeadAssignmentService {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async getAssignments(leadId: string) {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.leadAssignment.findMany({
      where: { leadId },
    });
  }

  async setAssignments(
    leadId: string,
    assignment: { assigneeId: string; splitPct?: number; isPrimary?: boolean },
    userId: string,
  ) {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    const { assigneeId, splitPct = 100, isPrimary = false } = assignment;

    const result = await this.prisma.leadAssignment.upsert({
      where: { leadId_userId: { leadId, userId: assigneeId } },
      update: { splitPct, isPrimary },
      create: { leadId, userId: assigneeId, splitPct, isPrimary },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: 'ASSIGNMENT_CHANGED',
        description: `User ${assigneeId} assigned to lead`,
        metadata: { assigneeId, splitPct, isPrimary },
      },
    });

    const [leadWithCustomer, currentUser] = await Promise.all([
      this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    if (!leadWithCustomer || !currentUser) return result;

    const payload: LeadAssignedPayload = {
      leadId,
      assigneeId,
      customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
      assignedByName: `${currentUser.firstName} ${currentUser.lastName}`,
      isPrimary,
    };
    this.emitter.emit('lead.assigned', payload);

    return result;
  }

  async setPm(leadId: string, pmId: string | null, userId: string) {
    const previousLead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { projectManagerId: true },
    });
    if (!previousLead) throw new NotFoundException('Lead not found');

    const lead = await this.prisma.lead.update({
      where: { id: leadId },
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
        leadId,
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
    if (!currentUser) return lead;

    const customerName = `${lead.customer.firstName} ${lead.customer.lastName}`;

    if (pmId) {
      const payload: LeadPmAssignedPayload = {
        leadId,
        pmId,
        pmName: `${lead.projectManager?.firstName} ${lead.projectManager?.lastName}`,
        customerName,
        assignedByName: `${currentUser.firstName} ${currentUser.lastName}`,
      };
      this.emitter.emit('lead.pmAssigned', payload);
    } else if (previousLead.projectManagerId) {
      const payload: LeadPmRemovedPayload = {
        leadId,
        pmId: previousLead.projectManagerId,
        customerName,
        removedByName: `${currentUser.firstName} ${currentUser.lastName}`,
      };
      this.emitter.emit('lead.pmRemoved', payload);
    }

    return lead;
  }
}
