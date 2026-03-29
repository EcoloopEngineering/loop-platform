import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import {
  APPOINTMENT_REPOSITORY,
  AppointmentRepositoryPort,
} from '../ports/appointment.repository.port';

export interface LeadStatusChangedPayload {
  leadId: string;
  customerName: string;
  newStatus: string;
  previousStage: string;
}

/** Statuses that trigger the cancellation workflow */
const CANCELLATION_STATUSES = ['LOST', 'CANCELLED'];

@Injectable()
export class CancellationService {
  private readonly logger = new Logger(CancellationService.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepo: AppointmentRepositoryPort,
    private readonly jobberService: JobberService,
    private readonly emailService: EmailService,
    private readonly googleChatService: GoogleChatService,
  ) {}

  async handleStatusChanged(payload: LeadStatusChangedPayload): Promise<void> {
    if (!CANCELLATION_STATUSES.includes(payload.newStatus)) {
      return;
    }

    this.logger.log(
      `Cancellation workflow triggered for lead ${payload.leadId} (status: ${payload.newStatus})`,
    );

    await Promise.allSettled([
      this.cancelJobberAppointment(payload),
      this.sendCancellationEmail(payload),
      this.createActivityLog(payload),
      this.sendGoogleChatMessage(payload),
    ]);
  }

  private async cancelJobberAppointment(
    payload: LeadStatusChangedPayload,
  ): Promise<void> {
    const appointment = await this.appointmentRepo.findActiveByLeadId(payload.leadId);
    if (!appointment?.jobberVisitId) {
      this.logger.debug(`No active Jobber appointment for lead ${payload.leadId}`);
      return;
    }

    await this.jobberService.cancelVisit(appointment.jobberVisitId);

    await this.appointmentRepo.update(appointment.id, { status: 'CANCELLED' });

    this.logger.log(
      `Jobber visit ${appointment.jobberVisitId} cancelled for lead ${payload.leadId}`,
    );
  }

  private async sendCancellationEmail(
    payload: LeadStatusChangedPayload,
  ): Promise<void> {
    const lead = await this.appointmentRepo.findLeadWithStakeholders(payload.leadId);
    if (!lead) return;

    const recipients: string[] = [];
    for (const assignment of lead.assignments ?? []) {
      if (assignment.user?.email) recipients.push(assignment.user.email);
    }
    if (lead.projectManager?.email) {
      recipients.push(lead.projectManager.email);
    }

    if (!recipients.length) return;

    const statusLabel = payload.newStatus === 'CANCELLED' ? 'Cancelled' : 'Lost';

    await this.emailService.send({
      to: recipients,
      subject: `Lead ${statusLabel}: ${payload.customerName}`,
      html: `
        <h2>Lead ${statusLabel}</h2>
        <p>The lead for <strong>${payload.customerName}</strong> has been marked as <strong>${statusLabel}</strong>.</p>
        <p>Last stage: ${payload.previousStage.replace(/_/g, ' ')}</p>
        <p>Please review and take any necessary follow-up actions.</p>
      `,
    });

    this.logger.log(`Cancellation email sent for lead ${payload.leadId}`);
  }

  private async createActivityLog(
    payload: LeadStatusChangedPayload,
  ): Promise<void> {
    await this.appointmentRepo.createLeadActivity({
      leadId: payload.leadId,
      userId: '',
      type: 'STAGE_CHANGE',
      description: `Lead marked as ${payload.newStatus} — cancellation workflow triggered`,
      metadata: {
        previousStage: payload.previousStage,
        newStatus: payload.newStatus,
        workflow: 'cancellation',
      },
    });
  }

  private async sendGoogleChatMessage(
    payload: LeadStatusChangedPayload,
  ): Promise<void> {
    if (!this.googleChatService.isConfigured()) return;

    const lead = await this.appointmentRepo.findLeadMetadata(payload.leadId);
    const spaceName = (lead?.metadata as Record<string, unknown>)?.googleChatSpaceName as
      | string
      | undefined;
    if (!spaceName) return;

    const statusLabel = payload.newStatus === 'CANCELLED' ? 'Cancelled' : 'Lost';

    await this.googleChatService.sendMessage(
      spaceName,
      `*${statusLabel}*: ${payload.customerName} has been marked as *${statusLabel}*. Appointments have been cancelled.`,
    );
  }
}
