import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { LeadStatusChangedPayload } from '../events/lead-events.types';

export class MarkLeadCancelledCommand {
  constructor(
    public readonly leadId: string,
    public readonly reason: string | undefined,
    public readonly userId: string,
  ) {}
}

@CommandHandler(MarkLeadCancelledCommand)
export class MarkLeadCancelledHandler implements ICommandHandler<MarkLeadCancelledCommand> {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly emitter: EventEmitter2,
  ) {}

  async execute(command: MarkLeadCancelledCommand): Promise<unknown> {
    const { leadId, reason, userId } = command;

    const lead = await this.leadRepo.findByIdWithCustomerName(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.leadRepo.updateStatus(leadId, {
      status: 'CANCELLED',
      lostAt: new Date(),
      lostReason: reason ?? null,
    });

    await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'STAGE_CHANGE',
      description: `Lead cancelled${reason ? `: ${reason}` : ''}`,
      metadata: { status: 'CANCELLED', stage: lead.currentStage, reason },
    });

    const payload: LeadStatusChangedPayload = {
      leadId,
      customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
      newStatus: 'CANCELLED',
      previousStage: lead.currentStage,
    };
    this.emitter.emit('lead.statusChanged', payload);

    return updated;
  }
}
