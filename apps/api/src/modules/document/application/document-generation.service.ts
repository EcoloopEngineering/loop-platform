import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';
import { DOCUMENT_REPOSITORY, DocumentRepositoryPort } from './ports/document.repository.port';
import { PdfService } from '../../../infrastructure/pdf/pdf.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { DocumentDeliveryService } from './services/document-delivery.service';

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
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepo: DocumentRepositoryPort,
    private readonly pdfService: PdfService,
    private readonly deliveryService: DocumentDeliveryService,
    private readonly emitter: EventEmitter2,
  ) {}

  async generateChangeOrder(
    leadId: string,
    dto: ChangeOrderDto,
    user: AuthenticatedUser,
  ): Promise<DocumentResult> {
    const lead = await this.documentRepo.findLeadWithCustomerAndProperty(leadId);
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

    const doc = await this.documentRepo.createDocument({
      leadId,
      type: 'CONTRACT',
      fileName,
      mimeType: 'application/pdf',
      fileSize: pdfBuffer.length,
      fileKey: `${leadId}/${fileName}`,
      uploadedById: user.id,
      metadata: {},
    });

    await this.documentRepo.createLeadActivity({
      leadId,
      userId: user.id,
      type: 'DOCUMENT_UPLOADED',
      description: 'Change Order generated',
      metadata: { documentId: doc.id, type: 'change_order' },
    });

    this.emitter.emit('lead.changeOrderCreated', {
      leadId,
      changes: dto.changes,
      userId: user.id,
      customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
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
    const lead = await this.documentRepo.findLeadWithCustomerAndProperty(leadId);
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

    const doc = await this.documentRepo.createDocument({
      leadId,
      type: 'CONTRACT',
      fileName,
      mimeType: 'application/pdf',
      fileSize: pdfBuffer.length,
      fileKey: `${leadId}/${fileName}`,
      uploadedById: user.id,
      metadata: {},
    });

    const zapSignResult = await this.deliveryService.handleCAPDelivery({
      mode: dto.mode,
      lead,
      customerName,
      fileName,
      pdfBuffer,
    });

    await this.documentRepo.createLeadActivity({
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
