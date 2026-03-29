import { DesignProcessor, DesignJobData } from './design.processor';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';

describe('DesignProcessor', () => {
  let processor: DesignProcessor;
  let prisma: MockPrismaService;
  let auroraService: { createProject: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    auroraService = { createProject: jest.fn() };
    processor = new DesignProcessor(prisma as any, auroraService as any);

    // Default: lead lookup returns no property coordinates
    prisma.lead.findUnique.mockResolvedValue(null);
  });

  const basePayload: DesignJobData = {
    designRequestId: 'dr-1',
    leadId: 'lead-1',
    propertyAddress: '123 Main St, Austin, TX 78701',
    customerName: 'John Doe',
    monthlyBill: 200,
    annualKwhUsage: 12000,
    roofCondition: 'GOOD',
    propertyType: 'RESIDENTIAL',
    userId: 'user-1',
  };

  const makeJob = (data: DesignJobData, id = 'job-1') =>
    ({ data, id } as any);

  it('should call auroraService.createProject with parsed address', async () => {
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-123' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const job = makeJob(basePayload);
    await processor.process(job);

    expect(auroraService.createProject).toHaveBeenCalledWith({
      name: 'John Doe - 123 Main St',
      address: {
        street: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
      },
      latitude: 0,
      longitude: 0,
      utilityBillKwh: 12000,
      roofType: 'GOOD',
      notes: 'Property type: RESIDENTIAL',
    });
  });

  it('should use property coordinates when available', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      property: { latitude: 30.2672, longitude: -97.7431 },
    });
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-geo' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const job = makeJob(basePayload);
    await processor.process(job);

    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 30.2672,
        longitude: -97.7431,
      }),
    );
  });

  it('should fall back to 0,0 when property has no coordinates', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      property: { latitude: null, longitude: null },
    });
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-no-geo' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const job = makeJob(basePayload);
    await processor.process(job);

    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 0,
        longitude: 0,
      }),
    );
  });

  it('should fall back to 0,0 when coordinate lookup fails', async () => {
    prisma.lead.findUnique.mockRejectedValue(new Error('DB down'));
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-err' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const job = makeJob(basePayload);
    await processor.process(job);

    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 0,
        longitude: 0,
      }),
    );
  });

  it('should update design request with Aurora project data', async () => {
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-456' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const job = makeJob(basePayload);
    await processor.process(job);

    expect(prisma.designRequest.update).toHaveBeenCalledWith({
      where: { id: 'dr-1' },
      data: {
        auroraProjectId: 'aurora-456',
        auroraProjectUrl:
          'https://app.aurorasolar.com/projects/aurora-456',
      },
    });
  });

  it('should create activity log', async () => {
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-789' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const job = makeJob(basePayload);
    await processor.process(job);

    expect(prisma.leadActivity.create).toHaveBeenCalledWith({
      data: {
        leadId: 'lead-1',
        userId: 'user-1',
        type: 'DESIGN_COMPLETED',
        description: 'Aurora project linked: aurora-789',
        metadata: {
          auroraProjectId: 'aurora-789',
          auroraUrl:
            'https://app.aurorasolar.com/projects/aurora-789',
        },
      },
    });
  });

  it('should estimate kWh from monthlyBill when annualKwhUsage is absent', async () => {
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-est' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const payload: DesignJobData = {
      ...basePayload,
      annualKwhUsage: undefined,
      monthlyBill: 200,
    };

    const job = makeJob(payload);
    await processor.process(job);

    // Estimated: Math.round((200 / 0.16) * 12) = 15000
    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ utilityBillKwh: 15000 }),
    );
  });

  it('should pass undefined kWh when both annualKwhUsage and monthlyBill are absent', async () => {
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-no-kwh' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const payload: DesignJobData = {
      ...basePayload,
      annualKwhUsage: undefined,
      monthlyBill: undefined,
    };

    const job = makeJob(payload);
    await processor.process(job);

    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ utilityBillKwh: undefined }),
    );
  });

  it('should prefer annualKwhUsage over monthlyBill estimate', async () => {
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-prefer' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const payload: DesignJobData = {
      ...basePayload,
      annualKwhUsage: 9000,
      monthlyBill: 200,
    };

    const job = makeJob(payload);
    await processor.process(job);

    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ utilityBillKwh: 9000 }),
    );
  });

  it('should handle address with missing parts gracefully', async () => {
    auroraService.createProject.mockResolvedValue({ projectId: 'aurora-partial' });
    prisma.designRequest.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    const payload: DesignJobData = {
      ...basePayload,
      propertyAddress: '456 Oak Ave',
    };

    const job = makeJob(payload);
    await processor.process(job);

    expect(auroraService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe - 456 Oak Ave',
        address: {
          street: '456 Oak Ave',
          city: '',
          state: '',
          zip: '',
        },
      }),
    );
  });

  it('should propagate Aurora API errors', async () => {
    auroraService.createProject.mockRejectedValue(
      new Error('Aurora API unavailable'),
    );

    const job = makeJob(basePayload);

    await expect(processor.process(job)).rejects.toThrow(
      'Aurora API unavailable',
    );

    expect(prisma.designRequest.update).not.toHaveBeenCalled();
    expect(prisma.leadActivity.create).not.toHaveBeenCalled();
  });
});
