import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';

interface LeadStatusChangedPayload {
  leadId: string;
  customerName: string;
  newStatus: string;
  previousStage: string;
}

/** Statuses that trigger the cancellation workflow */
const CANCELLATION_STATUSES = ['LOST', 'CANCELLED'];

@Injectable()
export class CancellationListener {
  private readonly logger = new Logger(CancellationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobberService: JobberService,
    private readonly emailService: EmailService,
    private readonly googleChatService: GoogleChatService,
  ) {}

  @OnEvent('lead.statusChanged')
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

  /**
   * Cancel any active Jobber appointment associated with the lead.
   */
  private async cancelJobberAppointment(
    payload: LeadStatusChangedPayload,
  ): Promise<void> {
    try {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          leadId: payload.leadId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          jobberVisitId: { not: null },
        },
      });

      if (!appointment?.jobberVisitId) {
        this.logger.debug(`No active Jobber appointment for lead ${payload.leadId}`);
        return;
      }

      await this.jobberService.cancelVisit(appointment.jobberVisitId);

      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELLED' },
      });

      this.logger.log(
        `Jobber visit ${appointment.jobberVisitId} cancelled for lead ${payload.leadId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to cancel Jobber appointment for lead ${payload.leadId}: ${message}`,
      );
    }
  }

  /**
   * Send cancellation email to stakeholders.
   */
  private async sendCancellationEmail(
    payload: LeadStatusChangedPayload,
  ): Promise<void> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        include: {
          assignments: {
            where: { isPrimary: true },
            include: { user: { select: { email: true, firstName: true } } },
          },
          projectManager: { select: { email: true, firstName: true } },
        },
      });

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send cancellation email for lead ${payload.leadId}: ${message}`,
      );
    }
  }

  /**
   * Log cancellation as a lead activity.
   */
  private async createActivityLog(
    payload: LeadStatusChangedPayload,
  ): Promise<void> {
    try {
      await this.prisma.leadActivity.create({
        data: {
          leadId: payload.leadId,
          userId: '',
          type: 'STAGE_CHANGE',
          description: `Lead marked as ${payload.newStatus} — cancellation workflow triggered`,
          metadata: {
            previousStage: payload.previousStage,
            newStatus: payload.newStatus,
            workflow: 'cancellation',
          },
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create activity log for lead ${payload.leadId}: ${message}`,
      );
    }
  }

  /**
   * Send cancellation notification to Google Chat space.
   */
  private async sendGoogleChatMessage(
    payload: LeadStatusChangedPayload,
  ): Promise<void> {
    if (!this.googleChatService.isConfigured()) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        select: { metadata: true },
      });

      const spaceName = (lead?.metadata as Record<string, unknown>)?.googleChatSpaceName as string | undefined;
      if (!spaceName) return;

      const statusLabel = payload.newStatus === 'CANCELLED' ? 'Cancelled' : 'Lost';

      await this.googleChatService.sendMessage(
        spaceName,
        `*${statusLabel}*: ${payload.customerName} has been marked as *${statusLabel}*. Appointments have been cancelled.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to send Google Chat cancellation message for lead ${payload.leadId}: ${message}`,
      );
    }
  }
}
