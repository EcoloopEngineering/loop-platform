import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../../infrastructure/email/email.service';

interface StageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

@Injectable()
export class StageEmailListener {
  private readonly logger = new Logger(StageEmailListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: StageChangedPayload): Promise<void> {
    if (!this.emailService.isConfigured()) return;

    const lead = await this.prisma.lead.findUnique({
      where: { id: payload.leadId },
      include: {
        customer: true,
        assignments: {
          where: { isPrimary: true },
          include: { user: { select: { email: true, firstName: true } } },
        },
        projectManager: { select: { email: true, firstName: true } },
      },
    });

    if (!lead) return;

    const ownerEmail = lead.assignments?.[0]?.user?.email;
    const ownerName = lead.assignments?.[0]?.user?.firstName ?? 'Team Member';
    const pmEmail = lead.projectManager?.email;
    const stageName = this.formatStage(payload.newStage);

    // Determine which emails to send based on stage
    switch (payload.newStage) {
      case 'INSTALL_READY':
        if (ownerEmail) {
          await this.emailService.send({
            to: ownerEmail,
            subject: `⚠️ Install Ready: ${payload.customerName}`,
            html: `
              <h2>Install Ready - Action Required</h2>
              <p>Hi ${ownerName},</p>
              <p>The installation for <strong>${payload.customerName}</strong> is ready to be scheduled.</p>
              <p style="color: #DC2626; font-weight: bold;">⚠️ Reminder: A $1,000 no-show charge applies if the customer is not present at the scheduled installation time.</p>
              <p>Please confirm with the customer and schedule the installation.</p>
              <br>
              <p style="color: #6B7280; font-size: 12px;">— ecoLoop CRM</p>
            `,
          });
        }
        break;

      case 'WON':
        // Email the owner
        if (ownerEmail) {
          await this.emailService.send({
            to: ownerEmail,
            subject: `🎉 Deal Won: ${payload.customerName}`,
            html: `
              <h2>Congratulations!</h2>
              <p>Hi ${ownerName},</p>
              <p>The deal for <strong>${payload.customerName}</strong> has been marked as <strong>WON</strong>! 🎉</p>
              <p>Great work closing this deal!</p>
              <br>
              <p style="color: #6B7280; font-size: 12px;">— ecoLoop CRM</p>
            `,
          });
        }
        // Email the customer
        if (lead.customer?.email) {
          await this.emailService.send({
            to: lead.customer.email,
            subject: 'Welcome to ecoLoop Solar! ☀️',
            html: `
              <h2>Welcome to the ecoLoop Family!</h2>
              <p>Hi ${lead.customer.firstName},</p>
              <p>Thank you for choosing ecoLoop for your solar energy project!</p>
              <p>Your project is now being processed and our team will be in touch shortly with next steps.</p>
              <p>If you have any questions, reply to this email or contact us at support@ecoloop.us.</p>
              <br>
              <p style="color: #6B7280; font-size: 12px;">— The ecoLoop Team</p>
            `,
          });
        }
        break;

      case 'LOST':
      case 'CANCELLED':
        // Don't email on lost/cancelled
        break;

      default:
        // Generic stage change email to owner + PM
        const recipients = [ownerEmail, pmEmail].filter(Boolean) as string[];
        if (recipients.length > 0) {
          await this.emailService.send({
            to: recipients,
            subject: `Lead Update: ${payload.customerName} → ${stageName}`,
            html: `
              <h2>Lead Stage Updated</h2>
              <p>The lead for <strong>${payload.customerName}</strong> has moved to <strong>${stageName}</strong>.</p>
              <p>Previous stage: ${this.formatStage(payload.previousStage)}</p>
              <br>
              <p style="color: #6B7280; font-size: 12px;">— ecoLoop CRM</p>
            `,
          });
        }
        break;
    }

    this.logger.log(`Stage email sent for ${payload.leadId}: ${payload.newStage}`);
  }

  private formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
