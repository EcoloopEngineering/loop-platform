import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PdfService } from '../../../infrastructure/pdf/pdf.service';
import { ZapSignService } from '../../../integrations/zapsign/zapsign.service';
import { EmailService } from '../../../infrastructure/email/email.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export interface ChangeOrderDto {
  changes: string[];
  notes?: string;
}

export interface CAPDto {
  mode: 'approval' | 'informative';
  upgrades?: {
    roof?: boolean;
    electrical?: boolean;
    tree?: boolean;
    battery?: boolean;
    evCharger?: boolean;
  };
  systemSize?: string;
  monthlyPayment?: string;
  escalator?: string;
  rate?: string;
  offset?: string;
}

export interface DocumentResult {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface CAPResult extends DocumentResult {
  zapSign: { token: string; status: string } | null;
}

@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly zapSignService: ZapSignService,
    private readonly emailService: EmailService,
  ) {}

  async generateChangeOrder(
    leadId: string,
    dto: ChangeOrderDto,
    user: AuthenticatedUser,
  ): Promise<DocumentResult> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { customer: true, property: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const address = lead.property
      ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state} ${lead.property.zip}`
      : '--';

    const pdfBuffer = await this.pdfService.generateChangeOrder({
      customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
      address,
      systemSize: lead.systemSize?.toString() ?? undefined,
      monthlyPayment: lead.property?.monthlyBill
        ? `$${lead.property.monthlyBill}`
        : undefined,
      changes: dto.changes,
      notes: dto.notes,
    });

    const fileName = `change-order-${leadId}-${Date.now()}.pdf`;
    this.savePdfLocally(leadId, fileName, pdfBuffer);

    const doc = await this.prisma.document.create({
      data: {
        leadId,
        type: 'CONTRACT',
        fileName,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        fileKey: `${leadId}/${fileName}`,
        uploadedById: user.id,
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId: user.id,
        type: 'DOCUMENT_UPLOADED',
        description: 'Change Order generated',
        metadata: { documentId: doc.id, type: 'change_order' },
      },
    });

    return {
      id: doc.id,
      name: fileName,
      url: `/api/v1/documents/${doc.id}/download`,
      size: pdfBuffer.length,
    };
  }

  async generateCAP(
    leadId: string,
    dto: CAPDto,
    user: AuthenticatedUser,
  ): Promise<CAPResult> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { customer: true, property: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const customerName = `${lead.customer.firstName} ${lead.customer.lastName}`;
    const address = lead.property
      ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state} ${lead.property.zip}`
      : '--';

    const pdfBuffer = await this.pdfService.generateCAP({
      customerName,
      address,
      systemSize: dto.systemSize,
      monthlyPayment: dto.monthlyPayment,
      escalator: dto.escalator,
      rate: dto.rate,
      offset: dto.offset,
      upgrades: dto.upgrades,
    });

    const fileName = `cap-${leadId}-${Date.now()}.pdf`;
    this.savePdfLocally(leadId, fileName, pdfBuffer);

    const doc = await this.prisma.document.create({
      data: {
        leadId,
        type: 'CONTRACT',
        fileName,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        fileKey: `${leadId}/${fileName}`,
        uploadedById: user.id,
      },
    });

    const zapSignResult = await this.handleCAPDelivery(
      dto,
      lead,
      customerName,
      fileName,
      pdfBuffer,
    );

    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId: user.id,
        type: 'DOCUMENT_UPLOADED',
        description: `CAP generated (${dto.mode}) ${zapSignResult ? '-- sent for e-signature' : ''}`,
        metadata: {
          documentId: doc.id,
          type: 'cap',
          mode: dto.mode,
          zapSignToken: zapSignResult?.token ?? null,
        },
      },
    });

    return {
      id: doc.id,
      name: fileName,
      url: `/api/v1/documents/${doc.id}/download`,
      size: pdfBuffer.length,
      zapSign: zapSignResult
        ? { token: zapSignResult.token, status: zapSignResult.status }
        : null,
    };
  }

  private async handleCAPDelivery(
    dto: CAPDto,
    lead: { id: string; customer: { firstName: string; email: string | null } },
    customerName: string,
    fileName: string,
    pdfBuffer: Buffer,
  ): Promise<{ token: string; status: string } | null> {
    if (
      dto.mode === 'approval' &&
      this.zapSignService.isConfigured() &&
      lead.customer.email
    ) {
      return this.sendForESignature(customerName, lead.customer.email, pdfBuffer);
    }

    if (dto.mode === 'informative' && lead.customer.email) {
      await this.sendInformativeEmail(
        lead.customer.email,
        lead.customer.firstName,
        fileName,
        pdfBuffer,
      );
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { currentStage: 'ENGINEERING' },
      });
    }

    return null;
  }

  private async sendForESignature(
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
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`ZapSign failed: ${message}`);
      return null;
    }
  }

  private async sendInformativeEmail(
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

  private savePdfLocally(
    leadId: string,
    fileName: string,
    pdfBuffer: Buffer,
  ): void {
    const dirPath = path.join(UPLOAD_DIR, leadId);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(path.join(dirPath, fileName), pdfBuffer);
  }
}
