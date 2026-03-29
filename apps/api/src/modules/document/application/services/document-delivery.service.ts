import { Inject, Injectable, Logger } from '@nestjs/common';
import { DOCUMENT_REPOSITORY, DocumentRepositoryPort } from '../ports/document.repository.port';
import { ZapSignService } from '../../../../integrations/zapsign/zapsign.service';
import { EmailService } from '../../../../infrastructure/email/email.service';

export interface CAPDeliveryContext {
  mode: 'approval' | 'informative';
  lead: {
    id: string;
    customer: { firstName: string; email: string | null };
  };
  customerName: string;
  fileName: string;
  pdfBuffer: Buffer;
}

@Injectable()
export class DocumentDeliveryService {
  private readonly logger = new Logger(DocumentDeliveryService.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepo: DocumentRepositoryPort,
    private readonly zapSignService: ZapSignService,
    private readonly emailService: EmailService,
  ) {}

  async handleCAPDelivery(
    context: CAPDeliveryContext,
  ): Promise<{ token: string; status: string } | null> {
    const { mode, lead, customerName, fileName, pdfBuffer } = context;

    if (mode === 'approval' && this.zapSignService.isConfigured() && lead.customer.email) {
      return this.sendForESignature(customerName, lead.customer.email, pdfBuffer);
    }

    if (mode === 'informative' && lead.customer.email) {
      await this.sendInformativeEmail(lead.customer.email, lead.customer.firstName, fileName, pdfBuffer);
      await this.documentRepo.updateLeadStage(lead.id, 'ENGINEERING');
    }

    return null;
  }

  async sendForESignature(
    customerName: string,
    customerEmail: string,
    pdfBuffer: Buffer,
  ): Promise<{ token: string; status: string } | null> {
    try {
      const base64Pdf = pdfBuffer.toString('base64');
      const result = await this.zapSignService.createDocument({
        name: `CAP - ${customerName}`,
        base64_pdf: base64Pdf,
        send_automatic_email: true,
        signers: [
          {
            name: customerName,
            email: customerEmail,
            send_automatic_email: true,
            lock_name: true,
            lock_email: true,
          },
        ],
      });
      this.logger.log(`ZapSign CAP document created: ${result.token}`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`ZapSign failed: ${message}`);
      return null;
    }
  }

  async sendInformativeEmail(
    email: string,
    firstName: string,
    fileName: string,
    pdfBuffer: Buffer,
  ): Promise<void> {
    await this.emailService.send({
      to: email,
      subject: 'Your Solar Project Approval - ecoLoop',
      html: `
        <h2>Client Approval of Project</h2>
        <p>Hi ${firstName},</p>
        <p>Please find attached your Client Approval of Project (CAP) document for review.</p>
        <p>If you have any questions, please contact your ecoLoop representative.</p>
        <br>
        <p style="color: #6B7280; font-size: 12px;">-- The ecoLoop Team</p>
      `,
      attachments: [
        { filename: fileName, content: pdfBuffer, contentType: 'application/pdf' },
      ],
    });
  }
}
