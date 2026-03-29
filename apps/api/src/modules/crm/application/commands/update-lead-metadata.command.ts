import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export class UpdateLeadMetadataCommand {
  constructor(
    public readonly leadId: string,
    public readonly data: Record<string, unknown>,
    public readonly userId: string,
  ) {}
}

@CommandHandler(UpdateLeadMetadataCommand)
export class UpdateLeadMetadataHandler implements ICommandHandler<UpdateLeadMetadataCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateLeadMetadataCommand): Promise<unknown> {
    const { leadId, data, userId } = command;

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const currentMeta = (lead.metadata as Record<string, unknown>) ?? {};
    const merged = { ...currentMeta, ...data };

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { metadata: merged },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: 'STAGE_CHANGE',
        description: `Updated fields: ${Object.keys(data).join(', ')}`,
        metadata: { fields: Object.keys(data), values: data },
      },
    }).catch(() => {});

    return updated;
  }
}
