import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadStage } from '@loop/shared';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { LeadStageChangedPayload } from '../events/lead-events.types';

export class ChangeLeadStageCommand {
  constructor(
    public readonly leadId: string,
    public readonly stage: LeadStage,
    public readonly userId: string,
  ) {}
}

@CommandHandler(ChangeLeadStageCommand)
export class ChangeLeadStageHandler implements ICommandHandler<ChangeLeadStageCommand> {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly emitter: EventEmitter2,
  ) {}

  async execute(command: ChangeLeadStageCommand): Promise<unknown> {
    const { leadId, stage, userId } = command;

    const existing = await this.leadRepo.findById(leadId);
    if (!existing) throw new NotFoundException('Lead not found');

    const fromStage = existing.currentStage;
    const updated = await this.leadRepo.updateStage(leadId, stage);

    await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'STAGE_CHANGE',
      description: `Stage changed from ${fromStage} to ${stage}`,
      metadata: { fromStage, toStage: stage },
    });

    const leadWithCustomer = await this.leadRepo.findByIdWithCustomer(leadId);

    if (leadWithCustomer) {
      const payload: LeadStageChangedPayload = {
        leadId,
        customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
        previousStage: fromStage,
        newStage: stage,
      };
      this.emitter.emit('lead.stageChanged', payload);
    }

    return updated;
  }
}
