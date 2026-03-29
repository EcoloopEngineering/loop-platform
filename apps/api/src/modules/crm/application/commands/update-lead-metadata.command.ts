import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';

export class UpdateLeadMetadataCommand {
  constructor(
    public readonly leadId: string,
    public readonly data: Record<string, unknown>,
    public readonly userId: string,
  ) {}
}

@CommandHandler(UpdateLeadMetadataCommand)
export class UpdateLeadMetadataHandler implements ICommandHandler<UpdateLeadMetadataCommand> {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
  ) {}

  async execute(command: UpdateLeadMetadataCommand): Promise<unknown> {
    const { leadId, data, userId } = command;

    const lead = await this.leadRepo.findLeadMetadata(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    const currentMeta = (lead.metadata as Record<string, unknown>) ?? {};
    const merged = { ...currentMeta, ...data };

    const updated = await this.leadRepo.updateMetadata(leadId, merged);

    await this.leadRepo.createActivity({
      leadId,
      userId,
      type: 'STAGE_CHANGE',
      description: `Updated fields: ${Object.keys(data).join(', ')}`,
      metadata: { fields: Object.keys(data), values: data },
    }).catch(() => {});

    return updated;
  }
}
