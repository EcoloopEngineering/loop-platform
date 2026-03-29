import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    private readonly emitter: EventEmitter2,
  ) {}

  async getAssignments(leadId: string) {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    return this.leadRepo.findAssignments(leadId);
  }

  async setAssignments(
    leadId: string,
    assignment: { assigneeId: string; splitPct?: number; isPrimary?: boolean },
    userId: string,
  ) {
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    const { assigneeId, splitPct = 100, isPrimary = false } = assignment;

    const result = await this.leadRepo.upsertAssignment({
      leadId,
      userId: assigneeId,
      splitPct,
      isPrimary,
    });

    await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'ASSIGNMENT_CHANGED',
      description: `User ${assigneeId} assigned to lead`,
      metadata: { assigneeId, splitPct, isPrimary },
    });

    const [leadWithCustomer, currentUser] = await Promise.all([
      this.leadRepo.findByIdWithCustomer(leadId),
      this.leadRepo.findUserNameById(userId),
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
    const previousLead = await this.leadRepo.findById(leadId);
    if (!previousLead) throw new NotFoundException('Lead not found');

    const previousPmId = previousLead.projectManagerId;

    const lead = await this.leadRepo.updatePm(leadId, pmId);

    const desc = pmId
      ? `Project Manager assigned: ${lead.projectManager?.firstName} ${lead.projectManager?.lastName}`
      : 'Project Manager removed';

    await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'ASSIGNMENT_CHANGED',
      description: desc,
      metadata: { projectManagerId: pmId },
    });

    const currentUser = await this.leadRepo.findUserNameById(userId);
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
    } else if (previousPmId) {
      const payload: LeadPmRemovedPayload = {
        leadId,
        pmId: previousPmId,
        customerName,
        removedByName: `${currentUser.firstName} ${currentUser.lastName}`,
      };
      this.emitter.emit('lead.pmRemoved', payload);
    }

    return lead;
  }
}
