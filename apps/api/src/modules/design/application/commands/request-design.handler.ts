import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { DESIGN_REPOSITORY, DesignRepositoryPort } from '../ports/design.repository.port';
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
    @Inject(DESIGN_REPOSITORY) private readonly repo: DesignRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RequestDesignCommand) {
    const designRequest = await this.repo.createDesignRequest({
      leadId: command.leadId,
      designType: command.designType as string,
      treeRemoval: command.treeRemoval,
      notes: command.notes,
      status: 'PENDING',
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
