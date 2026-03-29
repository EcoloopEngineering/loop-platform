import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { PM_STAGE_ORDER } from '../config/pipeline-stages.config';

export interface StageAdvancePayload {
  leadId: string;
  currentStage?: string;
  suggestedStage?: string;
  suggestedNextStage?: string;
}

@Injectable()
export class StageAdvanceService {
  private readonly logger = new Logger(StageAdvanceService.name);

  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepo: LeadRepositoryPort,
    private readonly emitter: EventEmitter2,
  ) {}

  async handleStageChange(payload: StageAdvancePayload): Promise<void> {
    const lead = await this.leadRepo.findByIdWithCustomer(payload.leadId);
    if (!lead) return;

    // Need currentStage from lead entity
    const fullLead = await this.leadRepo.findById(payload.leadId);
    if (!fullLead) return;

    const currentStage = fullLead.currentStage;

    // Determine next stage
    let nextStage = payload.suggestedStage ?? payload.suggestedNextStage;
    if (!nextStage) {
      const currentIndex = PM_STAGE_ORDER.indexOf(
        currentStage as (typeof PM_STAGE_ORDER)[number],
      );
      if (currentIndex >= 0 && currentIndex < PM_STAGE_ORDER.length - 1) {
        nextStage = PM_STAGE_ORDER[currentIndex + 1];
      }
    }

    if (!nextStage || nextStage === currentStage) return;

    const previousStage = currentStage;

    // Advance the stage
    await this.leadRepo.updateStage(payload.leadId, nextStage);

    // Log activity
    const userId =
      (fullLead as any).projectManagerId ??
      (fullLead as any).createdById ??
      payload.leadId;

    await this.leadRepo.createActivity({
      leadId: payload.leadId,
      userId,
      type: 'STAGE_CHANGE',
      description: `Auto-advanced from ${previousStage} to ${nextStage} (all tasks completed)`,
      metadata: { previousStage, newStage: nextStage, auto: true },
    });

    // Emit stage changed event
    const customerName =
      `${lead.customer?.firstName ?? ''} ${lead.customer?.lastName ?? ''}`.trim();
    this.emitter.emit('lead.stageChanged', {
      leadId: payload.leadId,
      customerName,
      previousStage,
      newStage: nextStage,
    });

    this.logger.log(
      `Lead ${payload.leadId} auto-advanced: ${previousStage} → ${nextStage}`,
    );
  }
}
