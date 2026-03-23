import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(() => {
    service = new PdfService();
  });

  describe('generateChangeOrder', () => {
    it('should return a Buffer that starts with %PDF', async () => {
      const result = await service.generateChangeOrder({
        customerName: 'John Doe',
        address: '123 Main St',
        changes: ['Added battery', 'Upgraded panels'],
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
    });

    it('should generate a PDF with optional system details', async () => {
      const result = await service.generateChangeOrder({
        customerName: 'Jane Smith',
        address: '456 Oak Ave',
        systemSize: '10.5',
        panelCount: 28,
        monthlyPayment: '$150',
        totalCost: '$25,000',
        changes: ['Roof upgrade required'],
        notes: 'Customer requested expedited install',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
    });

    it('should generate a PDF with minimal data', async () => {
      const result = await service.generateChangeOrder({
        customerName: 'Min Data',
        address: '1 St',
        changes: [],
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
    });
  });

  describe('generateCAP', () => {
    it('should return a Buffer that starts with %PDF', async () => {
      const result = await service.generateCAP({
        customerName: 'Alice Brown',
        address: '789 Elm Blvd',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
    });

    it('should generate a PDF with full data and multiple signers', async () => {
      const result = await service.generateCAP({
        customerName: 'Bob Wilson',
        address: '321 Pine Rd',
        systemSize: '12.0',
        monthlyPayment: '$180',
        escalator: '2.9%',
        rate: '$0.12/kWh',
        offset: '95%',
        signerNames: ['Bob Wilson', 'Carol Wilson'],
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
    });

    it('should produce a larger PDF when more content is provided', async () => {
      const minimal = await service.generateCAP({
        customerName: 'A',
        address: 'B',
      });
      const full = await service.generateCAP({
        customerName: 'Bob Wilson',
        address: '321 Pine Rd',
        systemSize: '12.0',
        monthlyPayment: '$180',
        escalator: '2.9%',
        rate: '$0.12/kWh',
        offset: '95%',
        signerNames: ['Bob Wilson', 'Carol Wilson'],
      });

      expect(full.length).toBeGreaterThan(minimal.length);
    });

    it('should generate a valid PDF with only required fields', async () => {
      const result = await service.generateCAP({
        customerName: 'Test User',
        address: 'Test Address',
      });

      expect(result).toBeInstanceOf(Buffer);
      // Verify it's a valid PDF by checking header
      expect(result.toString('ascii', 0, 5)).toBe('%PDF-');
    });
  });
});
