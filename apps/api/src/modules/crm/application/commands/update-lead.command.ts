import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { LeadUpdatedPayload } from '../events/lead-events.types';
import { UpdateLeadData } from '../dto/lead-data.types';

export class UpdateLeadCommand {
  constructor(
    public readonly leadId: string,
    public readonly data: UpdateLeadData,
    public readonly userId: string,
  ) {}
}

@CommandHandler(UpdateLeadCommand)
export class UpdateLeadHandler implements ICommandHandler<UpdateLeadCommand> {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly emitter: EventEmitter2,
  ) {}

  async execute(command: UpdateLeadCommand): Promise<unknown> {
    const { leadId, data, userId } = command;

    const existing = await this.leadRepo.findById(leadId);
    if (!existing) throw new NotFoundException('Lead not found');

    const updated = await this.leadRepo.update(leadId, data);

    const [leadWithCustomer, currentUser] = await Promise.all([
      this.leadRepo.findByIdWithCustomer(leadId),
      this.leadRepo.findUserNameById(userId),
    ]);

    if (leadWithCustomer && currentUser) {
      const payload: LeadUpdatedPayload = {
        leadId,
        customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
        updatedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        changes: Object.keys(data).join(', '),
      };
      this.emitter.emit('lead.updated', payload);
    }

    return updated;
  }
}
