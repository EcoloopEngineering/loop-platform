import { Controller, Post, Param, Body, UseGuards, Logger, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PdfService } from '../../../infrastructure/pdf/pdf.service';
import { ZapSignService } from '../../../integrations/zapsign/zapsign.service';
import { EmailService } from '../../../infrastructure/email/email.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('leads')
export class DocumentGenerationController {
  private readonly logger = new Logger(DocumentGenerationController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly zapSignService: ZapSignService,
    private readonly emailService: EmailService,
  ) {}

  @Post(':id/change-order')
  @ApiOperation({ summary: 'Generate a Change Order PDF for a lead' })
  async generateChangeOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { changes: string[]; notes?: string },
    @CurrentUser() user: any,
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: true, property: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const address = lead.property
      ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state} ${lead.property.zip}`
      : '--';

    const pdfBuffer = await this.pdfService.generateChangeOrder({
      customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
      address,
      systemSize: lead.systemSize?.toString() ?? undefined,
      monthlyPayment: lead.property?.monthlyBill ? `$${lead.property.monthlyBill}` : undefined,
      changes: dto.changes,
      notes: dto.notes,
    });

    // Save PDF locally
    const fileName = `change-order-${id}-${Date.now()}.pdf`;
    const dirPath = path.join(UPLOAD_DIR, id);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, fileName), pdfBuffer);

    // Save to documents table
    const doc = await this.prisma.document.create({
      data: {
        leadId: id,
        type: 'CONTRACT',
        fileName,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        fileKey: `${id}/${fileName}`,
        uploadedById: user.id,
      },
    });

    // Log activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId: user.id,
        type: 'DOCUMENT_UPLOADED',
        description: `Change Order generated`,
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

  @Post(':id/cap')
  @ApiOperation({ summary: 'Generate a CAP document and optionally send for e-signature' })
  async generateCAP(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: {
      mode: 'approval' | 'informative';
      upgrades?: { roof?: boolean; electrical?: boolean; tree?: boolean; battery?: boolean; evCharger?: boolean };
      systemSize?: string;
      monthlyPayment?: string;
      escalator?: string;
      rate?: string;
      offset?: string;
    },
    @CurrentUser() user: any,
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: true, property: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');

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

    // Save PDF
    const fileName = `cap-${id}-${Date.now()}.pdf`;
    const dirPath = path.join(UPLOAD_DIR, id);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, fileName), pdfBuffer);

    const doc = await this.prisma.document.create({
      data: {
        leadId: id,
        type: 'CONTRACT',
        fileName,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        fileKey: `${id}/${fileName}`,
        uploadedById: user.id,
      },
    });

    let zapSignResult: any = null;

    if (dto.mode === 'approval' && this.zapSignService.isConfigured() && lead.customer.email) {
      // Send for e-signature via ZapSign
      try {
        const base64Pdf = pdfBuffer.toString('base64');
        zapSignResult = await this.zapSignService.createDocument({
          name: `CAP - ${customerName}`,
          base64_pdf: base64Pdf,
          send_automatic_email: true,
          signers: [
            { name: customerName, email: lead.customer.email, send_automatic_email: true, lock_name: true, lock_email: true },
          ],
        });
        this.logger.log(`ZapSign CAP document created: ${zapSignResult.token}`);
      } catch (error: any) {
        this.logger.error(`ZapSign failed: ${error.message}`);
      }
    } else if (dto.mode === 'informative' && lead.customer.email) {
      // Send PDF directly via email
      await this.emailService.send({
        to: lead.customer.email,
        subject: `Your Solar Project Approval - ecoLoop`,
        html: `
          <h2>Client Approval of Project</h2>
          <p>Hi ${lead.customer.firstName},</p>
          <p>Please find attached your Client Approval of Project (CAP) document for review.</p>
          <p>If you have any questions, please contact your ecoLoop representative.</p>
          <br>
          <p style="color: #6B7280; font-size: 12px;">— The ecoLoop Team</p>
        `,
        attachments: [{ filename: fileName, content: pdfBuffer, contentType: 'application/pdf' }],
      });

      // Move to ENG_DESIGN stage
      await this.prisma.lead.update({
        where: { id },
        data: { currentStage: 'ENGINEERING_DESIGN' },
      });
    }

    // Log activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId: user.id,
        type: 'DOCUMENT_UPLOADED',
        description: `CAP generated (${dto.mode}) ${zapSignResult ? '— sent for e-signature' : ''}`,
        metadata: { documentId: doc.id, type: 'cap', mode: dto.mode, zapSignToken: zapSignResult?.token },
      },
    });

    return {
      id: doc.id,
      name: fileName,
      url: `/api/v1/documents/${doc.id}/download`,
      size: pdfBuffer.length,
      zapSign: zapSignResult ? { token: zapSignResult.token, status: zapSignResult.status } : null,
    };
  }
}
