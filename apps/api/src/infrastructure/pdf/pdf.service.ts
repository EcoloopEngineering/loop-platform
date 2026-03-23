import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateChangeOrder(data: {
    customerName: string;
    address: string;
    systemSize?: string;
    panelCount?: number;
    monthlyPayment?: string;
    totalCost?: string;
    changes: string[];
    notes?: string;
  }): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { height } = page.getSize();
    let y = height - 50;

    // Header
    page.drawText('CHANGE ORDER', { x: 50, y, size: 22, font: boldFont, color: rgb(0, 0.34, 0.3) });
    y -= 30;
    page.drawText('ecoLoop Solar Energy', { x: 50, y, size: 12, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 25;
    page.drawText(`Date: ${new Date().toLocaleDateString('en-US')}`, { x: 50, y, size: 10, font });
    y -= 30;

    // Customer info
    page.drawText('Customer Information', { x: 50, y, size: 14, font: boldFont });
    y -= 20;
    page.drawText(`Name: ${data.customerName}`, { x: 50, y, size: 11, font });
    y -= 16;
    page.drawText(`Address: ${data.address}`, { x: 50, y, size: 11, font });
    y -= 25;

    // System details
    if (data.systemSize || data.panelCount) {
      page.drawText('System Details', { x: 50, y, size: 14, font: boldFont });
      y -= 20;
      if (data.systemSize) { page.drawText(`System Size: ${data.systemSize} kW`, { x: 50, y, size: 11, font }); y -= 16; }
      if (data.panelCount) { page.drawText(`Panel Count: ${data.panelCount}`, { x: 50, y, size: 11, font }); y -= 16; }
      if (data.monthlyPayment) { page.drawText(`Monthly Payment: ${data.monthlyPayment}`, { x: 50, y, size: 11, font }); y -= 16; }
      if (data.totalCost) { page.drawText(`Total Cost: ${data.totalCost}`, { x: 50, y, size: 11, font }); y -= 16; }
      y -= 15;
    }

    // Changes
    page.drawText('Changes Requested', { x: 50, y, size: 14, font: boldFont });
    y -= 20;
    for (const change of data.changes) {
      page.drawText(`• ${change}`, { x: 60, y, size: 11, font });
      y -= 16;
    }
    y -= 15;

    if (data.notes) {
      page.drawText('Notes', { x: 50, y, size: 14, font: boldFont });
      y -= 20;
      page.drawText(data.notes, { x: 50, y, size: 11, font });
      y -= 30;
    }

    // Signature lines
    y -= 30;
    page.drawText('Customer Signature: ____________________________    Date: __________', { x: 50, y, size: 11, font });
    y -= 25;
    page.drawText('ecoLoop Rep Signature: _________________________    Date: __________', { x: 50, y, size: 11, font });

    // Footer
    page.drawText('ecoLoop Solar Energy | www.ecoloop.us | support@ecoloop.us', {
      x: 150, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async generateCAP(data: {
    customerName: string;
    address: string;
    systemSize?: string;
    monthlyPayment?: string;
    escalator?: string;
    rate?: string;
    offset?: string;
    upgrades?: { roof?: boolean; electrical?: boolean; tree?: boolean; battery?: boolean; evCharger?: boolean };
    signerNames?: string[];
  }): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([612, 792]);
    const { height } = page.getSize();
    let y = height - 50;

    // Header
    page.drawText('CLIENT APPROVAL OF PROJECT (CAP)', { x: 50, y, size: 18, font: boldFont, color: rgb(0, 0.34, 0.3) });
    y -= 30;
    page.drawText(`Date: ${new Date().toLocaleDateString('en-US')}`, { x: 50, y, size: 10, font });
    y -= 30;

    // Customer
    page.drawText('Customer Details', { x: 50, y, size: 14, font: boldFont });
    y -= 20;
    page.drawText(`Name: ${data.customerName}`, { x: 50, y, size: 11, font });
    y -= 16;
    page.drawText(`Address: ${data.address}`, { x: 50, y, size: 11, font });
    y -= 25;

    // System specs
    page.drawText('System Specifications', { x: 50, y, size: 14, font: boldFont });
    y -= 20;
    const specs = [
      ['System Size', `${data.systemSize ?? '--'} kW`],
      ['Monthly Payment', data.monthlyPayment ?? '--'],
      ['Escalator', data.escalator ?? '--'],
      ['Rate', data.rate ?? '--'],
      ['Offset', data.offset ?? '--'],
    ];
    for (const [label, value] of specs) {
      page.drawText(`${label}:`, { x: 60, y, size: 11, font: boldFont });
      page.drawText(value, { x: 200, y, size: 11, font });
      y -= 18;
    }
    y -= 15;

    // Upgrades
    if (data.upgrades) {
      page.drawText('Upgrades Included', { x: 50, y, size: 14, font: boldFont });
      y -= 20;
      const upgrades = [
        ['Roof', data.upgrades.roof],
        ['Electrical', data.upgrades.electrical],
        ['Tree Removal', data.upgrades.tree],
        ['Battery', data.upgrades.battery],
        ['EV Charger', data.upgrades.evCharger],
      ];
      for (const [label, included] of upgrades) {
        const check = included ? '☑' : '☐';
        page.drawText(`${check} ${label}`, { x: 60, y, size: 11, font });
        y -= 16;
      }
      y -= 15;
    }

    // Approval section
    page.drawText('By signing below, the customer approves the project as described above.', {
      x: 50, y, size: 10, font, color: rgb(0.3, 0.3, 0.3),
    });
    y -= 30;

    // Signers
    const signers = data.signerNames ?? [data.customerName];
    for (const signer of signers) {
      page.drawText(`${signer}: ____________________________    Date: __________`, { x: 50, y, size: 11, font });
      y -= 25;
    }

    // ecoLoop rep
    y -= 10;
    page.drawText('ecoLoop Representative: ____________________________    Date: __________', { x: 50, y, size: 11, font });

    // Footer
    page.drawText('ecoLoop Solar Energy | www.ecoloop.us | support@ecoloop.us', {
      x: 150, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
