import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { DesignRequestedEvent } from '../../domain/events/design-requested.event';
import { DesignType } from '../../domain/entities/design-request.entity';

export class RequestDesignCommand {
  constructor(
    public readonly leadId: string,
    public readonly designType: DesignType,
    public readonly treeRemoval: boolean,
    public readonly notes: string | null,
    public readonly createdBy: string,
  ) {}
}

@CommandHandler(RequestDesignCommand)
@Injectable()
export class RequestDesignHandler implements ICommandHandler<RequestDesignCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RequestDesignCommand) {
    const designRequest = await this.prisma.designRequest.create({
      data: {
        leadId: command.leadId,
        designType: command.designType as any,
        treeRemoval: command.treeRemoval,
        notes: command.notes,
        status: 'PENDING',
      },
    });

    this.eventBus.publish(
      new DesignRequestedEvent(
        designRequest.id,
        designRequest.leadId,
        designRequest.designType,
        command.createdBy,
      ),
    );

    return designRequest;
  }
}
